/**
 * Valheim module
 * Provides Valheim-specific utilities and configurations
 */

// Argument builder
export { buildServerArgs, parseServerArgs } from "./args.ts";

// World management
export {
  backupWorld,
  deleteWorld,
  exportWorld,
  getDefaultWorldsDir,
  getWorldInfo,
  importWorld,
  listWorlds,
  worldExists,
  type WorldInfo,
} from "./worlds.ts";

// Settings definitions
export {
  CombatOptions,
  DeathPenaltyOptions,
  formatInterval,
  getCombatLabel,
  getDeathPenaltyLabel,
  getPortalLabel,
  getPresetLabel,
  getResourceLabel,
  PortalOptions,
  PresetOptions,
  RaidOptions,
  ResourceOptions,
  type SelectOption,
  type SettingDefinition,
  ValheimSettings,
} from "./settings.ts";

// Player lists
export {
  addToList,
  clearList,
  getListCount,
  isInList,
  type ListType,
  readList,
  removeFromList,
} from "./lists.ts";
