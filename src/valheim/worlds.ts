/**
 * Valheim world file management
 * Handles discovering, importing, exporting, and deleting world saves
 */

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { getPlatform } from "../utils/platform.js";

/** Source folder identifier for world saves */
export type WorldSource = "server" | "local" | "cloud";

/** Information about a Valheim world */
export type WorldInfo = {
  name: string;
  dbPath: string;
  fwlPath: string;
  size: number;
  modified: Date;
  /** Source folder identifier: 'server' for worlds/, 'local' for worlds_local/, 'cloud' for worlds_local_cloud/ */
  source: WorldSource;
  /** True if the world only has .fwl but no .db file yet (needs server to save) */
  pendingSave: boolean;
  /** If this is a backup, the name of the parent world */
  backupOf?: string;
  /** Timestamp from backup name (for auto backups) */
  backupTimestamp?: string;
  /** Consolidated backups of this world (populated when grouping is enabled) */
  backups?: WorldInfo[];
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
 * Gets the Valheim base directory for the current platform
 * @returns Absolute path to the Valheim data directory
 */
function getValheimBaseDir(): string {
  const platform = getPlatform();
  const home = process.env.HOME ?? process.env.USERPROFILE ?? "";

  switch (platform) {
    case "windows":
      // Windows uses LocalLow for Valheim saves
      return path.join(home, "AppData", "LocalLow", "IronGate", "Valheim");
    case "darwin":
      return path.join(
        home,
        "Library",
        "Application Support",
        "unity.IronGate.Valheim"
      );
    default:
      return path.join(home, ".config", "unity3d", "IronGate", "Valheim");
  }
}

/**
 * Gets the dedicated server worlds directory
 * Dedicated servers save to "worlds/" not "worlds_local/"
 * @returns Absolute path to the dedicated server worlds directory
 */
export function getDedicatedServerWorldsDir(): string {
  return path.join(getValheimBaseDir(), "worlds");
}

/**
 * Gets the client worlds directory (for local/single-player saves)
 * @returns Absolute path to the client worlds directory
 */
export function getClientWorldsDir(): string {
  return path.join(getValheimBaseDir(), "worlds_local");
}

/**
 * Gets the cloud-synced worlds directory (Steam Cloud saves)
 * @returns Absolute path to the cloud worlds directory
 */
export function getCloudWorldsDir(): string {
  return path.join(getValheimBaseDir(), "worlds_local_cloud");
}

/**
 * Gets a human-readable label for a world source
 * @param source The world source type
 * @returns Human-readable label
 */
export function getSourceLabel(source: WorldSource): string {
  switch (source) {
    case "server":
      return "Server (Local)";
    case "local":
      return "Client (Local)";
    case "cloud":
      return "Client (Cloud)";
  }
}

/**
 * Gets the default Valheim worlds directory for the current platform
 * Returns the dedicated server worlds dir as primary
 * @returns Absolute path to the worlds directory
 */
export function getDefaultWorldsDir(): string {
  return getDedicatedServerWorldsDir();
}

/**
 * Pattern to detect auto-backup worlds: WorldName_backup_auto-YYYYMMDDHHMMSS
 */
const BACKUP_PATTERN = /^(.+)_backup_auto-(\d{14})$/;

/**
 * Parses a world name to detect if it's a backup
 * @param name World name to check
 * @returns Object with parent name and timestamp if it's a backup, null otherwise
 */
function parseBackupName(name: string): {
  parentName: string;
  timestamp: string;
} | null {
  const match = name.match(BACKUP_PATTERN);
  if (!match) return null;
  return {
    parentName: match[1],
    timestamp: match[2],
  };
}

/**
 * Lists worlds from a single directory
 * Finds worlds with both .db and .fwl files, as well as pending worlds with only .fwl
 * @param dir Directory to search
 * @param source Source identifier for the directory
 * @returns Array of world info objects
 */
async function listWorldsFromDir(
  dir: string,
  source: WorldSource
): Promise<WorldInfo[]> {
  const worlds: WorldInfo[] = [];
  const foundNames = new Set<string>();

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    // First pass: find complete worlds with .db files
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith(".db")) {
        // Skip backup files
        if (entry.name.includes(".db.")) continue;

        const name = entry.name.replace(".db", "");
        const dbPath = path.join(dir, entry.name);
        const fwlPath = path.join(dir, `${name}.fwl`);

        // Check if .fwl exists - both files are required for a complete world
        if (!(await exists(fwlPath))) continue;

        const dbStat = await fs.stat(dbPath);
        foundNames.add(name);

        // Check if this is an auto-backup
        const backupInfo = parseBackupName(name);

        worlds.push({
          name,
          dbPath,
          fwlPath,
          size: dbStat.size,
          modified: dbStat.mtime ?? new Date(),
          source,
          pendingSave: false,
          ...(backupInfo && {
            backupOf: backupInfo.parentName,
            backupTimestamp: backupInfo.timestamp,
          }),
        });
      }
    }

    // Second pass: find pending worlds with only .fwl files
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith(".fwl")) {
        // Skip backup files
        if (entry.name.includes(".fwl.")) continue;

        const name = entry.name.replace(".fwl", "");

        // Skip if we already found this world with a .db file
        if (foundNames.has(name)) continue;

        const fwlPath = path.join(dir, entry.name);
        const dbPath = path.join(dir, `${name}.db`);
        const fwlStat = await fs.stat(fwlPath);

        // Check if this is an auto-backup
        const backupInfo = parseBackupName(name);

        worlds.push({
          name,
          dbPath, // Path where .db would be (doesn't exist yet)
          fwlPath,
          size: 0, // No save data yet
          modified: fwlStat.mtime ?? new Date(),
          source,
          pendingSave: true,
          ...(backupInfo && {
            backupOf: backupInfo.parentName,
            backupTimestamp: backupInfo.timestamp,
          }),
        });
      }
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }

  return worlds;
}

/**
 * Consolidates backup worlds with their parent worlds
 * Backups are attached to their parent world's `backups` array and removed from the main list
 * @param worlds Array of worlds to consolidate
 * @returns Array with backups consolidated under their parent worlds
 */
function consolidateBackups(worlds: WorldInfo[]): WorldInfo[] {
  const parentMap = new Map<string, WorldInfo>();
  const standaloneBackups: WorldInfo[] = [];
  const result: WorldInfo[] = [];

  // First pass: identify parent worlds and standalone backups
  for (const world of worlds) {
    if (!world.backupOf) {
      // This is a regular world (not a backup)
      result.push({ ...world, backups: [] });
      parentMap.set(world.name, result[result.length - 1]);
    }
  }

  // Second pass: attach backups to parents or collect as standalone
  for (const world of worlds) {
    if (world.backupOf) {
      const parent = parentMap.get(world.backupOf);
      if (parent) {
        // Attach backup to parent
        parent.backups = parent.backups ?? [];
        parent.backups.push(world);
      } else {
        // Parent doesn't exist, keep as standalone backup
        standaloneBackups.push(world);
      }
    }
  }

  // Sort backups by timestamp (newest first)
  for (const world of result) {
    if (world.backups && world.backups.length > 0) {
      world.backups.sort((a, b) => {
        // Sort by timestamp descending (newest first)
        const tsA = a.backupTimestamp ?? "";
        const tsB = b.backupTimestamp ?? "";
        return tsB.localeCompare(tsA);
      });
    }
  }

  // Add standalone backups at the end
  result.push(...standaloneBackups);

  return result;
}

/**
 * Options for listing worlds
 */
export type ListWorldsOptions = {
  /** If true, consolidates backup worlds under their parent worlds */
  consolidateBackups?: boolean;
};

/**
 * Lists all available worlds, searching both dedicated server and client directories
 * @param worldsDir Optional specific directory to search (if provided, only searches that dir)
 * @param options Optional configuration for listing behavior
 * @returns Array of world info objects, sorted by modification date (newest first)
 */
export async function listWorlds(
  worldsDir?: string,
  options?: ListWorldsOptions
): Promise<WorldInfo[]> {
  // If a specific directory is provided, only search there
  if (worldsDir) {
    const worlds = await listWorldsFromDir(worldsDir, "server");
    const sorted = worlds.sort(
      (a, b) => b.modified.getTime() - a.modified.getTime()
    );
    return options?.consolidateBackups ? consolidateBackups(sorted) : sorted;
  }

  // Otherwise, search all world directories
  const [serverWorlds, localWorlds, cloudWorlds] = await Promise.all([
    listWorldsFromDir(getDedicatedServerWorldsDir(), "server"),
    listWorldsFromDir(getClientWorldsDir(), "local"),
    listWorldsFromDir(getCloudWorldsDir(), "cloud"),
  ]);

  // Merge and deduplicate by name (priority: server > cloud > local)
  const worldMap = new Map<string, WorldInfo>();

  // Add local worlds first (lowest priority)
  for (const world of localWorlds) {
    worldMap.set(world.name, world);
  }

  // Add cloud worlds (override local if same name)
  for (const world of cloudWorlds) {
    worldMap.set(world.name, world);
  }

  // Add server worlds (highest priority, override all)
  for (const world of serverWorlds) {
    worldMap.set(world.name, world);
  }

  const allWorlds = Array.from(worldMap.values());

  // Sort by modification date, newest first
  const sorted = allWorlds.sort(
    (a, b) => b.modified.getTime() - a.modified.getTime()
  );

  return options?.consolidateBackups ? consolidateBackups(sorted) : sorted;
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

  // Determine source based on target directory
  const serverDir = getDedicatedServerWorldsDir();
  const cloudDir = getCloudWorldsDir();
  const source: WorldSource =
    dir === serverDir ? "server" : dir === cloudDir ? "cloud" : "local";

  return {
    name,
    dbPath: targetDb,
    fwlPath: targetFwl,
    size: stat.size,
    modified: stat.mtime ?? new Date(),
    source,
    pendingSave: false,
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
 * Finds the directory containing a world by checking all world directories
 * @param worldName Name of the world to find
 * @returns The directory path if found, null otherwise
 */
async function findWorldDir(worldName: string): Promise<string | null> {
  const dirsToCheck = [
    getDedicatedServerWorldsDir(),
    getCloudWorldsDir(),
    getClientWorldsDir(),
  ];

  for (const dir of dirsToCheck) {
    const dbPath = path.join(dir, `${worldName}.db`);
    const fwlPath = path.join(dir, `${worldName}.fwl`);

    // World exists if at least .fwl exists (pending save counts)
    if ((await exists(dbPath)) || (await exists(fwlPath))) {
      return dir;
    }
  }

  return null;
}

/**
 * Deletes a world and its backup files
 * Handles both complete worlds (.db + .fwl) and pending worlds (only .fwl)
 * Searches all world directories if no specific directory is provided
 * @param worldName Name of the world to delete
 * @param worldsDir Optional directory (if not provided, searches all directories)
 */
export async function deleteWorld(
  worldName: string,
  worldsDir?: string
): Promise<void> {
  // Find the world's directory if not specified
  const dir = worldsDir ?? (await findWorldDir(worldName));

  if (!dir) {
    throw new Error(`World "${worldName}" not found`);
  }

  const dbPath = path.join(dir, `${worldName}.db`);
  const fwlPath = path.join(dir, `${worldName}.fwl`);

  // Remove main world files (handle pending worlds that only have .fwl)
  const dbExists = await exists(dbPath);
  const fwlExists = await exists(fwlPath);

  if (!dbExists && !fwlExists) {
    throw new Error(`World "${worldName}" not found`);
  }

  if (dbExists) {
    await fs.unlink(dbPath);
  }
  if (fwlExists) {
    await fs.unlink(fwlPath);
  }

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
 * Checks if a world exists in any of the world directories
 * A world is considered to exist if it has at least a .fwl file
 * (the .db file is created on first save)
 * @param worldName Name of the world to check
 * @param worldsDir Optional specific directory (defaults to checking all world dirs)
 * @returns True if the world exists (has at least .fwl file)
 */
export async function worldExists(
  worldName: string,
  worldsDir?: string
): Promise<boolean> {
  // If a specific directory is provided, only check there
  if (worldsDir) {
    const fwlPath = path.join(worldsDir, `${worldName}.fwl`);
    // World exists if at least .fwl exists (pending save counts as existing)
    return await exists(fwlPath);
  }

  // Check both dedicated server and client directories
  const serverDir = getDedicatedServerWorldsDir();
  const clientDir = getClientWorldsDir();

  const serverFwlPath = path.join(serverDir, `${worldName}.fwl`);
  const clientFwlPath = path.join(clientDir, `${worldName}.fwl`);

  // Check if .fwl exists in either directory
  const serverExists = await exists(serverFwlPath);
  if (serverExists) return true;

  const clientExists = await exists(clientFwlPath);
  return clientExists;
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
