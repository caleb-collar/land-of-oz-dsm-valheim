/**
 * BepInEx path resolution and detection utilities
 * BepInEx installs inside the Valheim dedicated server folder
 */

import fs from "node:fs/promises";
import path from "node:path";
import { getSteamPaths } from "../steamcmd/paths.js";

/**
 * Gets the root BepInEx directory path
 * @param valheimPath Optional override for the Valheim server directory
 * @returns Absolute path to the BepInEx directory
 */
export function getBepInExPath(valheimPath?: string): string {
  // Use the steamcmd package path (source of truth) unless overridden
  const serverDir = valheimPath ?? getSteamPaths().valheimDir;
  return path.join(serverDir, "BepInEx");
}

/**
 * Gets the BepInEx plugins directory path
 * @param valheimPath Optional override for the Valheim server directory
 * @returns Absolute path to the plugins directory
 */
export function getPluginsPath(valheimPath?: string): string {
  return path.join(getBepInExPath(valheimPath), "plugins");
}

/**
 * Gets the BepInEx disabled plugins directory path
 * @param valheimPath Optional override for the Valheim server directory
 * @returns Absolute path to the disabled plugins directory
 */
export function getDisabledPluginsPath(valheimPath?: string): string {
  return path.join(getBepInExPath(valheimPath), "plugins_disabled");
}

/**
 * Gets the BepInEx config directory path
 * @param valheimPath Optional override for the Valheim server directory
 * @returns Absolute path to the config directory
 */
export function getConfigPath(valheimPath?: string): string {
  return path.join(getBepInExPath(valheimPath), "config");
}

/**
 * Gets the BepInEx core directory path
 * @param valheimPath Optional override for the Valheim server directory
 * @returns Absolute path to the core directory
 */
export function getCorePath(valheimPath?: string): string {
  return path.join(getBepInExPath(valheimPath), "core");
}

/**
 * Checks whether BepInEx is installed by looking for the core DLL
 * @param valheimPath Optional override for the Valheim server directory
 * @returns True if BepInEx core DLL exists
 */
export async function isBepInExInstalled(
  valheimPath?: string
): Promise<boolean> {
  try {
    const coreDll = path.join(getCorePath(valheimPath), "BepInEx.dll");
    await fs.access(coreDll);
    return true;
  } catch {
    return false;
  }
}

/**
 * Attempts to detect the installed BepInEx version
 * Reads from the changelog or README in the BepInEx directory
 * @param valheimPath Optional override for the Valheim server directory
 * @returns Version string or null if not determinable
 */
export async function getBepInExVersion(
  valheimPath?: string
): Promise<string | null> {
  try {
    const bepInExDir = getBepInExPath(valheimPath);

    // Try reading from changelog.txt which BepInExPack_Valheim includes
    const changelogPath = path.join(bepInExDir, "changelog.txt");
    try {
      const content = await fs.readFile(changelogPath, "utf-8");
      // First line typically has version info
      const versionMatch = content.match(
        /(?:version|v)\s*(\d+\.\d+\.\d+(?:\.\d+)?)/i
      );
      if (versionMatch) {
        return versionMatch[1];
      }
    } catch {
      // changelog.txt doesn't exist
    }

    // Try reading from the core directory for version info
    const corePath = getCorePath(valheimPath);
    const files = await fs.readdir(corePath);
    for (const file of files) {
      const versionMatch = file.match(
        /BepInEx[._-]?(\d+\.\d+\.\d+(?:\.\d+)?)/i
      );
      if (versionMatch) {
        return versionMatch[1];
      }
    }

    // If BepInEx is installed but version unknown, return a placeholder
    const installed = await isBepInExInstalled(valheimPath);
    if (installed) {
      return "unknown";
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Verifies the BepInEx installation integrity
 * @param valheimPath Optional override for the Valheim server directory
 * @returns Object with validation result and message
 */
export async function verifyBepInExInstallation(
  valheimPath?: string
): Promise<{ valid: boolean; message: string }> {
  const bepInExDir = getBepInExPath(valheimPath);

  try {
    // Check BepInEx directory exists
    await fs.access(bepInExDir);
  } catch {
    return { valid: false, message: "BepInEx directory not found" };
  }

  // Check core DLL
  const coreDll = path.join(getCorePath(valheimPath), "BepInEx.dll");
  try {
    await fs.access(coreDll);
  } catch {
    return { valid: false, message: "BepInEx core DLL not found" };
  }

  // Check plugins directory exists
  try {
    await fs.access(getPluginsPath(valheimPath));
  } catch {
    // Create plugins directory if it doesn't exist
    await fs.mkdir(getPluginsPath(valheimPath), { recursive: true });
  }

  // Check config directory exists
  try {
    await fs.access(getConfigPath(valheimPath));
  } catch {
    // Create config directory if missing
    await fs.mkdir(getConfigPath(valheimPath), { recursive: true });
  }

  return { valid: true, message: "BepInEx installation verified" };
}
