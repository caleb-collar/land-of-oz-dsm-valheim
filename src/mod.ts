/**
 * Land of OZ - Valheim Dedicated Server Manager
 * Public API exports
 */

// CLI
export * from "./cli/mod.js";

// Configuration
export * from "./config/mod.js";
// RCON
export * from "./rcon/mod.js";

// Server management
export * from "./server/mod.js";
// SteamCMD
export * from "./steamcmd/mod.js";
// TUI
export { launchTui, TUI_VERSION } from "./tui/mod.js";
// Utilities
export * from "./utils/mod.js";
// Valheim utilities (explicitly re-export to avoid naming conflicts with server module)
// Re-export valheim lists with different names to avoid conflict
export {
  addToList as addToValheimList,
  backupWorld,
  buildServerArgs,
  CombatOptions,
  clearList as clearValheimList,
  DeathPenaltyOptions,
  deleteWorld,
  exportWorld,
  formatInterval,
  getCombatLabel,
  getDeathPenaltyLabel,
  getDefaultWorldsDir,
  getListCount as getValheimListCount,
  getPortalLabel,
  getPresetLabel,
  getResourceLabel,
  getWorldInfo,
  importWorld,
  isInList as isInValheimList,
  type ListType as ValheimListType,
  listWorlds,
  PortalOptions,
  PresetOptions,
  parseServerArgs,
  RaidOptions,
  ResourceOptions,
  readList as readValheimList,
  removeFromList as removeFromValheimList,
  type SelectOption,
  type SettingDefinition,
  ValheimSettings,
  type WorldInfo,
  worldExists,
} from "./valheim/mod.js";

// Version info
export const VERSION = "1.6.1";
export const APP_NAME = "Land of OZ - Valheim DSM";
