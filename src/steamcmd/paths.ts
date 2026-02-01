/**
 * SteamCMD and Valheim path utilities
 * Uses @caleb-collar/steamcmd package for path resolution
 */

import fs from "node:fs/promises";
import path from "node:path";
import steamcmd from "@caleb-collar/steamcmd";

/** All Steam-related paths for the current platform */
export type SteamPaths = {
  /** SteamCMD executable path */
  steamcmd: string;
  /** SteamCMD installation directory */
  steamcmdDir: string;
  /** Valheim dedicated server directory */
  valheimDir: string;
  /** Valheim server executable filename */
  executable: string;
};

/**
 * Gets all Steam-related paths for the current platform
 * @returns All SteamCMD and Valheim paths
 */
export function getSteamPaths(): SteamPaths {
  const info = steamcmd.getInfo();
  const platform = process.platform;

  const valheimDir = path.join(
    info.directory,
    "steamapps",
    "common",
    "Valheim dedicated server"
  );

  const executable =
    platform === "win32" ? "valheim_server.exe" : "valheim_server.x86_64";

  return {
    steamcmdDir: info.directory,
    steamcmd: info.executable ?? path.join(info.directory, "steamcmd.exe"),
    valheimDir,
    executable,
  };
}

/**
 * Gets the full path to the Valheim server executable
 * @returns Absolute path to valheim_server executable
 */
export function getValheimExecutablePath(): string {
  const paths = getSteamPaths();
  return path.join(paths.valheimDir, paths.executable);
}

/**
 * Checks if SteamCMD is installed
 * @returns True if SteamCMD executable exists
 */
export async function isSteamCmdInstalled(): Promise<boolean> {
  return steamcmd.isInstalled();
}

/**
 * Checks if Valheim dedicated server is installed
 * @returns True if Valheim server executable exists
 */
export async function isValheimInstalled(): Promise<boolean> {
  const executable = getValheimExecutablePath();
  try {
    const stat = await fs.stat(executable);
    return stat.isFile();
  } catch {
    return false;
  }
}
