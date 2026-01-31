/**
 * Deno KV-based configuration persistence
 * Handles loading, saving, and updating configuration
 */

import { join } from "@std/path";
import { ensureDir } from "@std/fs";
import { AppConfigSchema, type AppConfig, type World } from "./schema.ts";
import { defaultConfig } from "./defaults.ts";
import { getAppConfigDir } from "../utils/platform.ts";

const CONFIG_KEY = ["oz-valheim", "config"];

let kv: Deno.Kv | null = null;

/**
 * Gets or opens the Deno KV database
 * @returns The Deno KV instance
 */
async function getKv(): Promise<Deno.Kv> {
  if (kv) return kv;

  const configDir = getAppConfigDir();
  await ensureDir(configDir);

  const dbPath = join(configDir, "config.db");
  kv = await Deno.openKv(dbPath);
  return kv;
}

/**
 * Loads the configuration from Deno KV
 * Returns defaults if no configuration exists
 * @returns The application configuration
 */
export async function loadConfig(): Promise<AppConfig> {
  const db = await getKv();
  const result = await db.get<AppConfig>(CONFIG_KEY);

  if (!result.value) {
    // Initialize with defaults
    await saveConfig(defaultConfig);
    return defaultConfig;
  }

  // Validate and merge with defaults for any missing fields
  try {
    const validated = AppConfigSchema.parse(result.value);
    return validated;
  } catch (error) {
    console.warn("Config validation failed, using defaults:", error);
    return defaultConfig;
  }
}

/**
 * Saves the configuration to Deno KV
 * @param config The configuration to save
 */
export async function saveConfig(config: AppConfig): Promise<void> {
  // Validate before saving
  const validated = AppConfigSchema.parse(config);

  const db = await getKv();
  await db.set(CONFIG_KEY, validated);
}

/**
 * Updates the configuration with partial values
 * @param partial Partial configuration to merge
 * @returns The updated configuration
 */
export async function updateConfig(
  partial: Partial<AppConfig>,
): Promise<AppConfig> {
  const current = await loadConfig();
  const updated = { ...current, ...partial };
  await saveConfig(updated);
  return updated;
}

/**
 * Updates only the server configuration section
 * @param partial Partial server configuration to merge
 * @returns The updated full configuration
 */
export async function updateServerConfig(
  partial: Partial<AppConfig["server"]>,
): Promise<AppConfig> {
  const current = await loadConfig();
  const updated = {
    ...current,
    server: { ...current.server, ...partial },
  };
  await saveConfig(updated);
  return updated;
}

/**
 * Updates only the watchdog configuration section
 * @param partial Partial watchdog configuration to merge
 * @returns The updated full configuration
 */
export async function updateWatchdogConfig(
  partial: Partial<AppConfig["watchdog"]>,
): Promise<AppConfig> {
  const current = await loadConfig();
  const updated = {
    ...current,
    watchdog: { ...current.watchdog, ...partial },
  };
  await saveConfig(updated);
  return updated;
}

/**
 * Updates only the TUI configuration section
 * @param partial Partial TUI configuration to merge
 * @returns The updated full configuration
 */
export async function updateTuiConfig(
  partial: Partial<AppConfig["tui"]>,
): Promise<AppConfig> {
  const current = await loadConfig();
  const updated = {
    ...current,
    tui: { ...current.tui, ...partial },
  };
  await saveConfig(updated);
  return updated;
}

/**
 * Resets the configuration to defaults
 * @returns The default configuration
 */
export async function resetConfig(): Promise<AppConfig> {
  await saveConfig(defaultConfig);
  return defaultConfig;
}

/**
 * Closes the Deno KV database connection
 */
export async function closeConfig(): Promise<void> {
  if (kv) {
    kv.close();
    kv = null;
  }
  await Promise.resolve(); // Ensure async signature
}

// World management helpers

/**
 * Adds a world to the configuration
 * @param world The world to add
 */
export async function addWorld(world: World): Promise<void> {
  const config = await loadConfig();
  const exists = config.worlds.some((w) => w.name === world.name);

  if (!exists) {
    config.worlds.push(world);
    await saveConfig(config);
  }
}

/**
 * Removes a world from the configuration
 * @param name The name of the world to remove
 */
export async function removeWorld(name: string): Promise<void> {
  const config = await loadConfig();
  config.worlds = config.worlds.filter((w) => w.name !== name);

  if (config.activeWorld === name) {
    config.activeWorld = null;
  }

  await saveConfig(config);
}

/**
 * Sets the active world
 * @param name The name of the world to set as active, or null to deselect
 */
export async function setActiveWorld(name: string | null): Promise<void> {
  const config = await loadConfig();

  if (name !== null) {
    const exists = config.worlds.some((w) => w.name === name);
    if (!exists) {
      throw new Error(`World "${name}" not found`);
    }
  }

  config.activeWorld = name;
  await saveConfig(config);
}

/**
 * Gets the list of all configured worlds
 * @returns Array of world configurations
 */
export async function getWorlds(): Promise<World[]> {
  const config = await loadConfig();
  return config.worlds;
}

/**
 * Gets the currently active world
 * @returns The active world configuration, or null if none selected
 */
export async function getActiveWorld(): Promise<World | null> {
  const config = await loadConfig();
  if (!config.activeWorld) return null;
  return config.worlds.find((w) => w.name === config.activeWorld) ?? null;
}
