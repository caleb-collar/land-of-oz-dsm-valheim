/**
 * Platform detection and path utilities
 * Provides cross-platform support for Windows, macOS, and Linux
 */

import { join } from "@std/path";

/** Supported operating systems */
export type Platform = "windows" | "darwin" | "linux";

/**
 * Detects the current operating system
 * @returns The current platform identifier
 */
export function getPlatform(): Platform {
  const os = Deno.build.os;
  if (os === "windows") return "windows";
  if (os === "darwin") return "darwin";
  return "linux";
}

/**
 * Gets the user's home directory
 * @returns The absolute path to the home directory
 */
export function getHomeDir(): string {
  const platform = getPlatform();
  if (platform === "windows") {
    return (
      Deno.env.get("USERPROFILE") ??
        Deno.env.get("HOME") ??
        "C:\\Users\\Default"
    );
  }
  return Deno.env.get("HOME") ?? "/home";
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
      return Deno.env.get("APPDATA") ?? join(home, "AppData", "Roaming");
    case "darwin":
      return join(home, "Library", "Application Support");
    default:
      return Deno.env.get("XDG_CONFIG_HOME") ?? join(home, ".config");
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
      return Deno.env.get("LOCALAPPDATA") ?? join(home, "AppData", "Local");
    case "darwin":
      return join(home, "Library", "Application Support");
    default:
      return Deno.env.get("XDG_DATA_HOME") ?? join(home, ".local", "share");
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
      return join(
        Deno.env.get("APPDATA") ?? join(home, "AppData", "Roaming"),
        "IronGate",
        "Valheim",
        "worlds_local",
      );
    case "darwin":
      return join(
        home,
        "Library",
        "Application Support",
        "IronGate",
        "Valheim",
        "worlds_local",
      );
    default:
      return join(
        Deno.env.get("XDG_CONFIG_HOME") ?? join(home, ".config"),
        "unity3d",
        "IronGate",
        "Valheim",
        "worlds_local",
      );
  }
}

/**
 * Gets the oz-valheim application data directory
 * @returns The absolute path to the oz-valheim config directory
 */
export function getAppConfigDir(): string {
  return join(getConfigDir(), "oz-valheim");
}

/**
 * Gets the default SteamCMD installation directory
 * @returns The absolute path to the SteamCMD directory
 */
export function getSteamCmdDir(): string {
  return join(getLocalDataDir(), "steamcmd");
}

/**
 * Gets the default Valheim dedicated server installation directory
 * @returns The absolute path to the Valheim server directory
 */
export function getValheimServerDir(): string {
  return join(
    getSteamCmdDir(),
    "steamapps",
    "common",
    "Valheim dedicated server",
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
      return join(serverDir, "valheim_server.exe");
    case "darwin":
    case "linux":
      return join(serverDir, "valheim_server.x86_64");
  }
}

/**
 * Gets the SteamCMD executable path
 * @returns The absolute path to the SteamCMD executable
 */
export function getSteamCmdExecutable(): string {
  const platform = getPlatform();
  const steamCmdDir = getSteamCmdDir();

  switch (platform) {
    case "windows":
      return join(steamCmdDir, "steamcmd.exe");
    default:
      return join(steamCmdDir, "steamcmd.sh");
  }
}
