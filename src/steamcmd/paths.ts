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

/** Result of Valheim installation verification */
export type VerificationResult = {
  /** Whether the installation is valid */
  valid: boolean;
  /** Human-readable status message */
  message: string;
  /** List of missing files if any */
  missingFiles: string[];
  /** List of files that exist */
  foundFiles: string[];
  /** Installation path that was checked */
  installPath: string;
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

/**
 * Gets list of required Valheim server files for the current platform
 * @returns Array of relative file paths that should exist
 */
function getRequiredValheimFiles(): string[] {
  const platform = process.platform;

  if (platform === "win32") {
    return [
      "valheim_server.exe",
      "valheim_server_Data",
      "UnityPlayer.dll",
      "MonoBleedingEdge",
      "steam_appid.txt",
    ];
  }

  // Linux/macOS
  return [
    "valheim_server.x86_64",
    "valheim_server_Data",
    "UnityPlayer.so",
    "steam_appid.txt",
  ];
}

/**
 * Verifies the Valheim dedicated server installation
 * Checks that required files exist and the installation looks valid
 * @returns Verification result with details
 */
export async function verifyValheimInstallation(): Promise<VerificationResult> {
  const { valheimDir } = getSteamPaths();
  const requiredFiles = getRequiredValheimFiles();
  const missingFiles: string[] = [];
  const foundFiles: string[] = [];

  // First check if the installation directory exists
  try {
    const dirStat = await fs.stat(valheimDir);
    if (!dirStat.isDirectory()) {
      return {
        valid: false,
        message: "Valheim installation path exists but is not a directory",
        missingFiles: requiredFiles,
        foundFiles: [],
        installPath: valheimDir,
      };
    }
  } catch {
    return {
      valid: false,
      message: "Valheim dedicated server is not installed",
      missingFiles: requiredFiles,
      foundFiles: [],
      installPath: valheimDir,
    };
  }

  // Check each required file
  for (const file of requiredFiles) {
    const filePath = path.join(valheimDir, file);
    try {
      await fs.stat(filePath);
      foundFiles.push(file);
    } catch {
      missingFiles.push(file);
    }
  }

  if (missingFiles.length === 0) {
    return {
      valid: true,
      message: "Valheim installation verified successfully",
      missingFiles: [],
      foundFiles,
      installPath: valheimDir,
    };
  }

  // If the executable is missing, installation is invalid
  const executableFile =
    process.platform === "win32"
      ? "valheim_server.exe"
      : "valheim_server.x86_64";

  if (missingFiles.includes(executableFile)) {
    return {
      valid: false,
      message: `Valheim server executable not found. Missing: ${missingFiles.join(", ")}`,
      missingFiles,
      foundFiles,
      installPath: valheimDir,
    };
  }

  // Some files exist but not all - partial installation
  return {
    valid: false,
    message: `Valheim installation incomplete. Missing: ${missingFiles.join(", ")}`,
    missingFiles,
    foundFiles,
    installPath: valheimDir,
  };
}
