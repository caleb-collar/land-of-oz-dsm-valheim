/**
 * BepInEx module
 * Provides BepInEx framework detection, installation, and plugin management
 */

// Main config (BepInEx.cfg)
export {
  BEPINEX_CONFIG_FILE,
  type BepInExFrameworkConfig,
  DEFAULT_BEPINEX_FRAMEWORK_CONFIG,
  disableBepInExConsole,
  enableBepInExConsole,
  getBepInExConfigFilePath,
  isBepInExConsoleEnabled,
  parseBepInExFrameworkConfig,
  readBepInExFrameworkConfig,
  writeBepInExFrameworkConfig,
} from "./config.js";
// Installer
export {
  BEPINEX_URLS,
  BEPINEX_VERSIONS,
  type BepInExInstallProgress,
  type BepInExProgressCallback,
  installBepInEx,
  uninstallBepInEx,
  verifyBepInExSetup,
} from "./installer.js";
// Log tailing
export {
  type BepInExLogCallback,
  type BepInExLogEntry,
  type BepInExLogLevel,
  bepInExLogManager,
  parseBepInExLogLine,
} from "./logTailer.js";

// Paths and detection
export {
  bepInExLogExists,
  getBepInExLogPath,
  getBepInExPath,
  getBepInExVersion,
  getConfigPath as getBepInExConfigPath,
  getCorePath,
  getDisabledPluginsPath,
  getPluginsPath,
  isBepInExInstalled,
  verifyBepInExInstallation,
} from "./paths.js";
// Plugin manager
export {
  disablePlugin,
  enablePlugin,
  getInstalledPlugins,
  getPluginConfig,
  getPluginDefinition,
  installPlugin,
  isPluginEnabled,
  isPluginInstalled,
  type PluginInstallProgress,
  type PluginProgressCallback,
  resolveLatestPluginVersion,
  SUPPORTED_PLUGINS,
  uninstallPlugin,
  updatePluginConfig,
} from "./plugins.js";
// RCON plugin config sync
export {
  BEPINEX_RCON_DEFAULT_PASSWORD,
  BEPINEX_RCON_DEFAULT_PORT,
  parseRconConfig,
  RCON_CONFIG_FILE,
  type RconPluginConfig,
  rconPluginConfigExists,
  readRconPluginConfig,
  serializeRconConfig,
  writeRconPluginConfig,
} from "./rcon-config.js";
// Types
export type {
  BepInExState,
  GithubSource,
  InstalledPlugin,
  PluginDefinition,
  PluginId,
  PluginSource,
  ThunderstoreSource,
} from "./types.js";
