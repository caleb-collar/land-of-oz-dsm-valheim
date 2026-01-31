/**
 * Valheim world file management
 * Handles discovering, importing, exporting, and deleting world saves
 */

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { getPlatform } from "../utils/platform.js";

/** Information about a Valheim world */
export type WorldInfo = {
  name: string;
  dbPath: string;
  fwlPath: string;
  size: number;
  modified: Date;
};

/**
 * Check if a file or directory exists
 */
async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Ensure a directory exists, creating it if needed
 */
async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

/**
 * Copy a file to a destination
 */
async function copyFile(src: string, dest: string): Promise<void> {
  await fs.copyFile(src, dest);
}

/**
 * Gets the default Valheim worlds directory for the current platform
 * @returns Absolute path to the worlds directory
 */
export function getDefaultWorldsDir(): string {
  const platform = getPlatform();
  const home = process.env.HOME ?? process.env.USERPROFILE ?? "";

  switch (platform) {
    case "windows":
      // Windows uses LocalLow for Valheim saves
      return path.join(
        home,
        "AppData",
        "LocalLow",
        "IronGate",
        "Valheim",
        "worlds_local"
      );
    case "darwin":
      return path.join(
        home,
        "Library",
        "Application Support",
        "unity.IronGate.Valheim",
        "worlds_local"
      );
    default:
      return path.join(
        home,
        ".config",
        "unity3d",
        "IronGate",
        "Valheim",
        "worlds_local"
      );
  }
}

/**
 * Lists all available worlds in a directory
 * @param worldsDir Optional directory to search (defaults to system worlds dir)
 * @returns Array of world info objects, sorted by modification date (newest first)
 */
export async function listWorlds(worldsDir?: string): Promise<WorldInfo[]> {
  const dir = worldsDir ?? getDefaultWorldsDir();
  const worlds: WorldInfo[] = [];

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith(".db")) {
        const name = entry.name.replace(".db", "");
        const dbPath = path.join(dir, entry.name);
        const fwlPath = path.join(dir, `${name}.fwl`);

        // Check if .fwl exists - both files are required for a valid world
        if (!(await exists(fwlPath))) continue;

        const dbStat = await fs.stat(dbPath);

        worlds.push({
          name,
          dbPath,
          fwlPath,
          size: dbStat.size,
          modified: dbStat.mtime ?? new Date(),
        });
      }
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }

  // Sort by modification date, newest first
  return worlds.sort((a, b) => b.modified.getTime() - a.modified.getTime());
}

/**
 * Imports a world from external files into the worlds directory
 * @param dbPath Path to the .db file
 * @param fwlPath Path to the .fwl file
 * @param targetDir Optional target directory (defaults to system worlds dir)
 * @returns Info about the imported world
 */
export async function importWorld(
  dbPath: string,
  fwlPath: string,
  targetDir?: string
): Promise<WorldInfo> {
  const dir = targetDir ?? getDefaultWorldsDir();
  await ensureDir(dir);

  const name = path.basename(dbPath).replace(".db", "");
  const targetDb = path.join(dir, `${name}.db`);
  const targetFwl = path.join(dir, `${name}.fwl`);

  await copyFile(dbPath, targetDb);
  await copyFile(fwlPath, targetFwl);

  const stat = await fs.stat(targetDb);

  return {
    name,
    dbPath: targetDb,
    fwlPath: targetFwl,
    size: stat.size,
    modified: stat.mtime ?? new Date(),
  };
}

/**
 * Exports a world to an external directory
 * @param worldName Name of the world to export
 * @param targetDir Target directory for the export
 * @param sourceDir Optional source directory (defaults to system worlds dir)
 */
export async function exportWorld(
  worldName: string,
  targetDir: string,
  sourceDir?: string
): Promise<void> {
  const dir = sourceDir ?? getDefaultWorldsDir();
  await ensureDir(targetDir);

  const dbPath = path.join(dir, `${worldName}.db`);
  const fwlPath = path.join(dir, `${worldName}.fwl`);

  // Verify source files exist
  if (!(await exists(dbPath))) {
    throw new Error(`World database not found: ${dbPath}`);
  }
  if (!(await exists(fwlPath))) {
    throw new Error(`World metadata not found: ${fwlPath}`);
  }

  await copyFile(dbPath, path.join(targetDir, `${worldName}.db`));
  await copyFile(fwlPath, path.join(targetDir, `${worldName}.fwl`));
}

/**
 * Deletes a world and its backup files
 * @param worldName Name of the world to delete
 * @param worldsDir Optional directory (defaults to system worlds dir)
 */
export async function deleteWorld(
  worldName: string,
  worldsDir?: string
): Promise<void> {
  const dir = worldsDir ?? getDefaultWorldsDir();

  const dbPath = path.join(dir, `${worldName}.db`);
  const fwlPath = path.join(dir, `${worldName}.fwl`);

  // Remove main world files
  await fs.unlink(dbPath);
  await fs.unlink(fwlPath);

  // Also remove any backup files (e.g., worldname.db.old, worldname.fwl.old)
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (
        entry.name.startsWith(`${worldName}.db.`) ||
        entry.name.startsWith(`${worldName}.fwl.`)
      ) {
        await fs.unlink(path.join(dir, entry.name));
      }
    }
  } catch {
    // Ignore errors when cleaning backups
  }
}

/**
 * Gets information about a specific world
 * @param worldName Name of the world to look up
 * @param worldsDir Optional directory (defaults to system worlds dir)
 * @returns World info or null if not found
 */
export async function getWorldInfo(
  worldName: string,
  worldsDir?: string
): Promise<WorldInfo | null> {
  const worlds = await listWorlds(worldsDir);
  return worlds.find((w) => w.name === worldName) ?? null;
}

/**
 * Checks if a world exists
 * @param worldName Name of the world to check
 * @param worldsDir Optional directory (defaults to system worlds dir)
 * @returns True if the world exists
 */
export async function worldExists(
  worldName: string,
  worldsDir?: string
): Promise<boolean> {
  const dir = worldsDir ?? getDefaultWorldsDir();
  const dbPath = path.join(dir, `${worldName}.db`);
  const fwlPath = path.join(dir, `${worldName}.fwl`);

  return (await exists(dbPath)) && (await exists(fwlPath));
}

/**
 * Creates a backup of a world
 * @param worldName Name of the world to backup
 * @param backupDir Directory to store the backup
 * @param worldsDir Optional source directory (defaults to system worlds dir)
 * @returns Path to the backup directory
 */
export async function backupWorld(
  worldName: string,
  backupDir: string,
  worldsDir?: string
): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(backupDir, `${worldName}_${timestamp}`);

  await exportWorld(worldName, backupPath, worldsDir);

  return backupPath;
}
