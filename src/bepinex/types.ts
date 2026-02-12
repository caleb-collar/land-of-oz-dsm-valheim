/**
 * BepInEx plugin types and definitions
 * Server-side only plugins that don't require client installation
 */

/** Supported plugin identifiers */
export type PluginId =
  | "bepinex-rcon" // RCON protocol library (AviiNL)
  | "server-devcommands"; // Enhanced admin commands (JereKuusela)

/** Source for resolving plugin versions dynamically */
export type ThunderstoreSource = {
  type: "thunderstore";
  /** Thunderstore namespace (author) */
  namespace: string;
  /** Thunderstore package name */
  packageName: string;
};

export type GithubSource = {
  type: "github";
  /** GitHub owner/org */
  owner: string;
  /** GitHub repository name */
  repo: string;
};

export type PluginSource = ThunderstoreSource | GithubSource;

/** Definition of a supported plugin */
export type PluginDefinition = {
  /** Unique plugin identifier */
  id: PluginId;
  /** Human-readable plugin name */
  name: string;
  /** Plugin description */
  description: string;
  /** Fallback version if dynamic resolution fails */
  version: string;
  /** Major version constraint (only install within this major) */
  majorVersion: number;
  /** Plugin author */
  author: string;
  /** Fallback download URL (used if dynamic resolution fails) */
  downloadUrl: string;
  /** Source for resolving latest version dynamically */
  source: PluginSource;
  /** Main DLL filename to check for installation */
  dllFile: string;
  /** Config file name (in BepInEx/config/) */
  configFile?: string;
  /** Whether this plugin requires BepInEx framework */
  requiresBepInEx: boolean;
  /** Plugin category */
  category: "core";
};

/** Represents an installed plugin's state */
export type InstalledPlugin = {
  /** Plugin identifier */
  id: PluginId;
  /** Whether the plugin is currently enabled */
  enabled: boolean;
  /** Detected version (null if unknown) */
  version: string | null;
  /** Path to the plugin's config file (null if none) */
  configPath: string | null;
};

/** BepInEx framework state */
export type BepInExState = {
  /** Whether BepInEx is installed (null = not yet checked) */
  installed: boolean | null;
  /** Detected BepInEx version (null if unknown) */
  version: string | null;
  /** BepInEx installation path (null if not installed) */
  path: string | null;
  /** List of installed plugins */
  plugins: InstalledPlugin[];
};
