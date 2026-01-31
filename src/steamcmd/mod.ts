/**
 * SteamCMD module exports
 * Provides installation and update functionality for SteamCMD and Valheim
 */

// Path utilities
export {
  getSteamPaths,
  getValheimExecutablePath,
  isSteamCmdInstalled,
  isValheimInstalled,
  type SteamPaths,
} from "./paths.ts";

// SteamCMD installer
export {
  installSteamCmd,
  type InstallProgress,
  type InstallStage,
  type ProgressCallback,
} from "./installer.ts";

// Valheim updater
export {
  VALHEIM_APP_ID,
  installValheim,
  updateValheim,
  checkForUpdates,
  getInstalledVersion,
  type UpdateStatus,
  type UpdateStage,
  type UpdateCallback,
} from "./updater.ts";
