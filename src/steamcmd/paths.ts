/**
 * SteamCMD and Valheim path utilities
 * Platform-specific paths for SteamCMD and Valheim dedicated server
 */

import { join } from "@std/path";
import { getPlatform, getLocalDataDir, getHomeDir } from "../utils/platform.ts";

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
  const platform = getPlatform();
  const home = getHomeDir();

  switch (platform) {
    case "windows": {
      const localAppData = getLocalDataDir();
      const steamcmdDir = join(localAppData, "steamcmd");
      return {
        steamcmdDir,
        steamcmd: join(steamcmdDir, "steamcmd.exe"),
        valheimDir: join(
          steamcmdDir,
          "steamapps",
          "common",
          "Valheim dedicated server",
        ),
        executable: "valheim_server.exe",
      };
    }

    case "darwin": {
      const steamcmdDir = join(
        home,
        "Library",
        "Application Support",
        "steamcmd",
      );
      return {
        steamcmdDir,
        steamcmd: join(steamcmdDir, "steamcmd.sh"),
        valheimDir: join(
          steamcmdDir,
          "steamapps",
          "common",
          "Valheim dedicated server",
        ),
        executable: "valheim_server.x86_64",
      };
    }

    case "linux":
    default: {
      const steamcmdDir = join(home, ".local", "share", "steamcmd");
      return {
        steamcmdDir,
        steamcmd: join(steamcmdDir, "steamcmd.sh"),
        valheimDir: join(
          steamcmdDir,
          "steamapps",
          "common",
          "Valheim dedicated server",
        ),
        executable: "valheim_server.x86_64",
      };
    }
  }
}

/**
 * Gets the full path to the Valheim server executable
 * @returns Absolute path to valheim_server executable
 */
export function getValheimExecutablePath(): string {
  const paths = getSteamPaths();
  return join(paths.valheimDir, paths.executable);
}

/**
 * Checks if SteamCMD is installed
 * @returns True if SteamCMD executable exists
 */
export async function isSteamCmdInstalled(): Promise<boolean> {
  const { steamcmd } = getSteamPaths();
  try {
    const stat = await Deno.stat(steamcmd);
    return stat.isFile;
  } catch {
    return false;
  }
}

/**
 * Checks if Valheim dedicated server is installed
 * @returns True if Valheim server executable exists
 */
export async function isValheimInstalled(): Promise<boolean> {
  const executable = getValheimExecutablePath();
  try {
    const stat = await Deno.stat(executable);
    return stat.isFile;
  } catch {
    return false;
  }
}
