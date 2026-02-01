/**
 * Land of OZ - Valheim Dedicated Server Manager
 * Public API exports
 */

// Utilities
export * from "./utils/mod.js";

// Configuration
export * from "./config/mod.js";

// SteamCMD
export * from "./steamcmd/mod.js";

// Server management
export * from "./server/mod.js";

// RCON
export * from "./rcon/mod.js";

// Valheim utilities (explicitly re-export to avoid naming conflicts with server module)
export {
  backupWorld,
  buildServerArgs,
  CombatOptions,
  DeathPenaltyOptions,
  deleteWorld,
  exportWorld,
  formatInterval,
  getCombatLabel,
  getDeathPenaltyLabel,
  getDefaultWorldsDir,
  getPortalLabel,
  getPresetLabel,
  getResourceLabel,
  getWorldInfo,
  importWorld,
  listWorlds,
  parseServerArgs,
  PortalOptions,
  PresetOptions,
  RaidOptions,
  ResourceOptions,
  type SelectOption,
  type SettingDefinition,
  ValheimSettings,
  worldExists,
  type WorldInfo,
} from "./valheim/mod.js";

// Re-export valheim lists with different names to avoid conflict
export {
  addToList as addToValheimList,
  clearList as clearValheimList,
  getListCount as getValheimListCount,
  isInList as isInValheimList,
  type ListType as ValheimListType,
  readList as readValheimList,
  removeFromList as removeFromValheimList,
} from "./valheim/mod.js";

// CLI
export * from "./cli/mod.js";

// TUI
export { launchTui, TUI_VERSION } from "./tui/mod.js";

// Version info
export const VERSION = "0.2.0";
export const APP_NAME = "Land of OZ - Valheim DSM";
