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
} from "./paths.js";

// SteamCMD installer
export {
  type InstallProgress,
  type InstallStage,
  installSteamCmd,
  type ProgressCallback,
} from "./installer.js";

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
