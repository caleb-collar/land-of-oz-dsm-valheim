/**
 * BepInEx module
 * Provides BepInEx framework detection, installation, and plugin management
 */

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

// Paths and detection
export {
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
