/**
 * BepInEx main configuration file management
 * Handles reading/writing BepInEx/config/BepInEx.cfg
 *
 * This controls BepInEx framework behavior including:
 * - Console window visibility
 * - Logging settings
 * - Plugin loading behavior
 */

import fs from "node:fs/promises";
import path from "node:path";
import { createLogger } from "../utils/logger.js";
import { getConfigPath } from "./paths.js";

const log = createLogger("bepinex-config");

/** BepInEx main config filename */
export const BEPINEX_CONFIG_FILE = "BepInEx.cfg";

/** BepInEx framework configuration options (BepInEx.cfg) */
export type BepInExFrameworkConfig = {
  /** Whether to show the BepInEx console window */
  consoleEnabled: boolean;
  /** Whether to write logs to disk (LogOutput.log) */
  diskLoggingEnabled: boolean;
  /** Whether to write Unity logs to disk */
  unityLogEnabled: boolean;
};

/** Default BepInEx framework configuration */
export const DEFAULT_BEPINEX_FRAMEWORK_CONFIG: BepInExFrameworkConfig = {
  consoleEnabled: true,
  diskLoggingEnabled: true,
  unityLogEnabled: true,
};

/**
 * Gets the path to the BepInEx main config file
 * @param valheimPath Optional override for the Valheim server directory
 */
export function getBepInExConfigFilePath(valheimPath?: string): string {
  return path.join(getConfigPath(valheimPath), BEPINEX_CONFIG_FILE);
}

/**
 * Reads the BepInEx main configuration file
 * @param valheimPath Optional override for the Valheim server directory
 * @returns Parsed config or null if file doesn't exist
 */
export async function readBepInExFrameworkConfig(
  valheimPath?: string
): Promise<BepInExFrameworkConfig | null> {
  const cfgPath = getBepInExConfigFilePath(valheimPath);

  let content: string;
  try {
    content = await fs.readFile(cfgPath, "utf-8");
  } catch {
    log.debug("BepInEx config not found");
    return null;
  }

  return parseBepInExFrameworkConfig(content);
}

/**
 * Writes the BepInEx main configuration file
 * Preserves existing settings not managed by this module
 * @param config The config values to set
 * @param valheimPath Optional override for the Valheim server directory
 */
export async function writeBepInExFrameworkConfig(
  config: Partial<BepInExFrameworkConfig>,
  valheimPath?: string
): Promise<void> {
  const cfgPath = getBepInExConfigFilePath(valheimPath);
  const configDir = path.dirname(cfgPath);

  // Ensure config directory exists
  await fs.mkdir(configDir, { recursive: true });

  // Read existing config if present
  let existingContent = "";
  try {
    existingContent = await fs.readFile(cfgPath, "utf-8");
  } catch {
    // File doesn't exist, will create from scratch
  }

  // Merge with existing or default
  const existingConfig = existingContent
    ? parseBepInExFrameworkConfig(existingContent)
    : DEFAULT_BEPINEX_FRAMEWORK_CONFIG;

  const mergedConfig: BepInExFrameworkConfig = {
    ...DEFAULT_BEPINEX_FRAMEWORK_CONFIG,
    ...existingConfig,
    ...config,
  };

  // Update the content or create new
  const newContent = existingContent
    ? updateConfigContent(existingContent, mergedConfig)
    : generateFullConfig(mergedConfig);

  await fs.writeFile(cfgPath, newContent, "utf-8");
  log.info("Updated BepInEx config", {
    consoleEnabled: mergedConfig.consoleEnabled,
  });
}

/**
 * Disables the BepInEx console window (makes it headless)
 * Logs will still be written to LogOutput.log
 * @param valheimPath Optional override for the Valheim server directory
 */
export async function disableBepInExConsole(
  valheimPath?: string
): Promise<void> {
  await writeBepInExFrameworkConfig({ consoleEnabled: false }, valheimPath);
}

/**
 * Enables the BepInEx console window
 * @param valheimPath Optional override for the Valheim server directory
 */
export async function enableBepInExConsole(
  valheimPath?: string
): Promise<void> {
  await writeBepInExFrameworkConfig({ consoleEnabled: true }, valheimPath);
}

/**
 * Checks if the BepInEx console is currently enabled
 * @param valheimPath Optional override for the Valheim server directory
 * @returns True if console is enabled, false if disabled, null if config doesn't exist
 */
export async function isBepInExConsoleEnabled(
  valheimPath?: string
): Promise<boolean | null> {
  const config = await readBepInExFrameworkConfig(valheimPath);
  return config?.consoleEnabled ?? null;
}

// ── Internal helpers ──

/**
 * Parses BepInEx.cfg content into structured config
 */
export function parseBepInExFrameworkConfig(
  content: string
): BepInExFrameworkConfig {
  const config: BepInExFrameworkConfig = {
    ...DEFAULT_BEPINEX_FRAMEWORK_CONFIG,
  };

  let currentSection = "";

  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();

    // Skip empty lines and comments
    if (!line || line.startsWith("#") || line.startsWith(";")) continue;

    // Section header
    if (line.startsWith("[") && line.endsWith("]")) {
      currentSection = line.slice(1, -1).toLowerCase();
      continue;
    }

    // Key=value pair
    const eqIndex = line.indexOf("=");
    if (eqIndex === -1) continue;

    const key = line.slice(0, eqIndex).trim().toLowerCase();
    const value = line
      .slice(eqIndex + 1)
      .trim()
      .toLowerCase();

    // Parse based on section
    if (currentSection === "logging.console") {
      if (key === "enabled") {
        config.consoleEnabled = value === "true";
      }
    } else if (currentSection === "logging.disk") {
      if (key === "enabled") {
        config.diskLoggingEnabled = value === "true";
      }
    } else if (currentSection === "logging.unity") {
      if (key === "enabled") {
        config.unityLogEnabled = value === "true";
      }
    }
  }

  return config;
}

/**
 * Updates existing config content with new values
 * Preserves comments and structure
 */
function updateConfigContent(
  content: string,
  config: BepInExFrameworkConfig
): string {
  const lines = content.split("\n");
  let currentSection = "";
  const result: string[] = [];

  // Track which settings we've updated
  const updated = {
    consoleEnabled: false,
    diskLoggingEnabled: false,
    unityLogEnabled: false,
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Track section
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      currentSection = trimmed.slice(1, -1).toLowerCase();
      result.push(line);
      continue;
    }

    // Check for settings to update
    if (trimmed && !trimmed.startsWith("#") && !trimmed.startsWith(";")) {
      const eqIndex = trimmed.indexOf("=");
      if (eqIndex !== -1) {
        const key = trimmed.slice(0, eqIndex).trim().toLowerCase();

        if (currentSection === "logging.console" && key === "enabled") {
          result.push(`Enabled = ${config.consoleEnabled}`);
          updated.consoleEnabled = true;
          continue;
        }
        if (currentSection === "logging.disk" && key === "enabled") {
          result.push(`Enabled = ${config.diskLoggingEnabled}`);
          updated.diskLoggingEnabled = true;
          continue;
        }
        if (currentSection === "logging.unity" && key === "enabled") {
          result.push(`Enabled = ${config.unityLogEnabled}`);
          updated.unityLogEnabled = true;
          continue;
        }
      }
    }

    result.push(line);
  }

  // If sections were missing, append them
  if (!updated.consoleEnabled) {
    result.push("");
    result.push("[Logging.Console]");
    result.push(`Enabled = ${config.consoleEnabled}`);
  }

  return result.join("\n");
}

/**
 * Generates a full BepInEx.cfg from scratch
 */
function generateFullConfig(config: BepInExFrameworkConfig): string {
  return `## Settings file was auto-generated by oz-dsm-valheim

[Caching]

## Enable/disable assembly metadata cache
## Enabling this will speed up discovery of plugins and patchers by caching the metadata of all types BepInEx discovers.
# Setting type: Boolean
# Default value: true
EnableAssemblyCache = true

[Chainloader]

## If enabled, hides BepInEx Manager from the desktop and taskbar.
## Can be useful in combination with preloader hiding.
# Setting type: Boolean
# Default value: false
HideManagerGUI = false

[Harmony.Logger]

## Specifies which Harmony log channels to listen to.
## NOTE: IL channel dumps the whole patch methods, use only when needed!
# Setting type: LogChannel
# Default value: Warn, Error
# Acceptable values: None, Info, IL, Warn, Error, Debug, All
# Multiple values can be set at the same time by separating them with , (e.g. Debug, Warning)
LogChannels = Warn, Error

[Logging]

## Enables showing unity log messages in the BepInEx logging system.
# Setting type: Boolean
# Default value: true
UnityLogListening = true

## If enabled, writes Standard Output messages to Unity log
# Setting type: Boolean
# Default value: false
LogConsoleToUnityLog = false

[Logging.Console]

## Enables showing a console for log output.
# Setting type: Boolean
# Default value: false
Enabled = ${config.consoleEnabled}

## If enabled, will prevent closing the console (either by user or by Windows background
management).
# Setting type: Boolean
# Default value: false
PreventClose = false

## If true, console is set to the Shift-JIS encoding, otherwise UTF-8 encoding.
# Setting type: Boolean
# Default value: false
ShiftJisEncoding = false

## Displayed title on the console window.
# Setting type: String
# Default value: BepInEx {version} - {game_name}
LogDisplayTitle = true

[Logging.Disk]

## Enables writing log messages to disk.
# Setting type: Boolean
# Default value: true
Enabled = ${config.diskLoggingEnabled}

## Appends to the log file instead of overwriting, on game startup.
# Setting type: Boolean
# Default value: false
AppendLog = false

[Logging.Unity]

## Enables writing log messages to Unity's log file (Player.log).
# Setting type: Boolean
# Default value: true
Enabled = ${config.unityLogEnabled}

[Preloader]

## Enables or disables runtime dumping of assemblies.
# Setting type: Boolean
# Default value: false
DumpAssemblies = false

## If enabled and an assembly is already dumped, it will be overwritten.
# Setting type: Boolean
# Default value: false
OverwriteDumps = false

## If enabled, Mono will load patched assemblies from the BepInEx/DumpedAssemblies folder.
# Setting type: Boolean
# Default value: false
LoadDumpedAssemblies = false

## If enabled, BepInEx will save patched assemblies into BepInEx/DumpedAssemblies.
## This can be used by developers to inspect and debug pseudoassemblies.
# Setting type: Boolean
# Default value: false
BreakBeforeLoadAssemblies = false

[Preloader.Entrypoint]

## Type of the entrypoint assembly
# Setting type: String
# Default value:
Type =

## Name of the class in the entrypoint assembly
# Setting type: String
# Default value:
Assembly =

`;
}
