/**
 * SteamCMD module exports
 * Provides installation and update functionality for SteamCMD and Valheim
 * Uses @caleb-collar/steamcmd package for core functionality
 */

// Re-export error classes and utilities from the steamcmd package
// Re-export the package default for advanced usage
export {
  DownloadError,
  default as steamcmd,
  InstallError,
  SteamCmdError,
} from "@caleb-collar/steamcmd";
// SteamCMD installer
export {
  type InstallProgress,
  type InstallStage,
  installSteamCmd,
  type ProgressCallback,
} from "./installer.js";
// Path utilities
export {
  getSteamPaths,
  getValheimExecutablePath,
  isSteamCmdInstalled,
  isValheimInstalled,
  type SteamPaths,
} from "./paths.js";
// Valheim updater
export {
  checkForUpdates,
  getInstalledVersion,
  installValheim,
  type UpdateCallback,
  type UpdateStage,
  type UpdateStatus,
  updateValheim,
  VALHEIM_APP_ID,
} from "./updater.js";
