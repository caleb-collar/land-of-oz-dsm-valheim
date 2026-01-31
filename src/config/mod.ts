/**
 * Configuration module exports
 */

export {
  AppConfigSchema,
  ServerConfigSchema,
  WatchdogConfigSchema,
  TuiConfigSchema,
  WorldSchema,
  PresetSchema,
  ModifiersSchema,
  CombatModifierSchema,
  DeathPenaltySchema,
  ResourceModifierSchema,
  PortalModeSchema,
  type AppConfig,
  type ServerConfig,
  type WatchdogConfig,
  type TuiConfig,
  type World,
  type Preset,
  type Modifiers,
  type CombatModifier,
  type DeathPenalty,
  type ResourceModifier,
  type PortalMode,
} from "./schema.ts";

export { defaultConfig } from "./defaults.ts";

export {
  loadConfig,
  saveConfig,
  updateConfig,
  updateServerConfig,
  updateWatchdogConfig,
  updateTuiConfig,
  resetConfig,
  closeConfig,
  addWorld,
  removeWorld,
  setActiveWorld,
  getWorlds,
  getActiveWorld,
} from "./store.ts";
