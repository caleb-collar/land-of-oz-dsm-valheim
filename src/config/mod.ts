/**
 * Configuration module exports
 */

export { defaultConfig } from "./defaults.js";
export {
  type AppConfig,
  AppConfigSchema,
  type CombatModifier,
  CombatModifierSchema,
  type DeathPenalty,
  DeathPenaltySchema,
  type Modifiers,
  ModifiersSchema,
  type PortalMode,
  PortalModeSchema,
  type Preset,
  PresetSchema,
  type ResourceModifier,
  ResourceModifierSchema,
  type ServerConfig,
  ServerConfigSchema,
  type TuiConfig,
  TuiConfigSchema,
  type WatchdogConfig,
  WatchdogConfigSchema,
  type World,
  WorldSchema,
} from "./schema.js";

export {
  addWorld,
  closeConfig,
  getActiveWorld,
  getWorlds,
  loadConfig,
  removeWorld,
  resetConfig,
  saveConfig,
  setActiveWorld,
  updateConfig,
  updateServerConfig,
  updateTuiConfig,
  updateWatchdogConfig,
} from "./store.js";
