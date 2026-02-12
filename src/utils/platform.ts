/**
 * Platform detection and path utilities
 * Provides cross-platform support for Windows, macOS, and Linux
 */

import path from "node:path";
import process from "node:process";
import steamcmd from "@caleb-collar/steamcmd";

/** Supported operating systems */
export type Platform = "windows" | "darwin" | "linux";

/** SteamCMD platform types */
export type SteamPlatform = "windows" | "macos" | "linux";

/**
 * Detects the current operating system
 * @returns The current platform identifier
 */
export function getPlatform(): Platform {
  const os = process.platform;
  if (os === "win32") return "windows";
  if (os === "darwin") return "darwin";
  return "linux";
}

/**
 * Maps our platform type to SteamCMD platform type
 * @returns SteamCMD-compatible platform identifier
 */
export function getSteamPlatform(): SteamPlatform {
  const platform = getPlatform();
  if (platform === "darwin") return "macos";
  return platform; // "windows" and "linux" are the same
}

/**
 * Gets the user's home directory
 * @returns The absolute path to the home directory
 */
export function getHomeDir(): string {
  const platform = getPlatform();
  if (platform === "windows") {
    return process.env.USERPROFILE ?? process.env.HOME ?? "C:\\Users\\Default";
  }
  return process.env.HOME ?? "/home";
}

/**
 * Gets the platform-specific configuration directory
 * @returns The absolute path to the config directory
 */
export function getConfigDir(): string {
  const platform = getPlatform();
  const home = getHomeDir();

  switch (platform) {
    case "windows":
      return process.env.APPDATA ?? path.join(home, "AppData", "Roaming");
    case "darwin":
      return path.join(home, "Library", "Application Support");
    default:
      return process.env.XDG_CONFIG_HOME ?? path.join(home, ".config");
  }
}

/**
 * Gets the platform-specific local data directory
 * Used for SteamCMD installation
 * @returns The absolute path to the local data directory
 */
export function getLocalDataDir(): string {
  const platform = getPlatform();
  const home = getHomeDir();

  switch (platform) {
    case "windows":
      return process.env.LOCALAPPDATA ?? path.join(home, "AppData", "Local");
    case "darwin":
      return path.join(home, "Library", "Application Support");
    default:
      return process.env.XDG_DATA_HOME ?? path.join(home, ".local", "share");
  }
}

/**
 * Gets the default Valheim save/worlds directory
 * @returns The absolute path to Valheim worlds directory
 */
export function getValheimSaveDir(): string {
  const platform = getPlatform();
  const home = getHomeDir();

  switch (platform) {
    case "windows":
      // Valheim uses LocalLow for save data, not Roaming
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
        "IronGate",
        "Valheim",
        "worlds_local"
      );
    default:
      return path.join(
        process.env.XDG_CONFIG_HOME ?? path.join(home, ".config"),
        "unity3d",
        "IronGate",
        "Valheim",
        "worlds_local"
      );
  }
}

/**
 * Gets the oz-valheim application data directory
 * @returns The absolute path to the oz-valheim config directory
 */
export function getAppConfigDir(): string {
  return path.join(getConfigDir(), "oz-valheim");
}

/**
 * Gets the default SteamCMD installation directory
 * @returns The absolute path to the SteamCMD directory
 */
export function getSteamCmdDir(): string {
  // Use the @caleb-collar/steamcmd package as source of truth
  return steamcmd.getInfo().directory;
}

/**
 * Gets the default Valheim dedicated server installation directory
 * @returns The absolute path to the Valheim server directory
 */
export function getValheimServerDir(): string {
  return path.join(
    getSteamCmdDir(),
    "steamapps",
    "common",
    "Valheim dedicated server"
  );
}

/**
 * Gets the Valheim server executable path
 * @returns The absolute path to the Valheim server executable
 */
export function getValheimExecutable(): string {
  const platform = getPlatform();
  const serverDir = getValheimServerDir();

  switch (platform) {
    case "windows":
      return path.join(serverDir, "valheim_server.exe");
    case "darwin":
    case "linux":
      return path.join(serverDir, "valheim_server.x86_64");
  }
}

/**
 * Gets the SteamCMD executable path
 * @returns The absolute path to the SteamCMD executable
 */
export function getSteamCmdExecutable(): string {
  // Use the @caleb-collar/steamcmd package as source of truth
  const info = steamcmd.getInfo();
  return info.executable ?? path.join(info.directory, "steamcmd.exe");
}
