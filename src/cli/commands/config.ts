/**
 * Config command handler
 * Manages application configuration
 */

import type { AppConfig } from "../../config/mod.ts";
import {
  resetConfig,
  updateServerConfig,
  updateWatchdogConfig,
} from "../../config/mod.ts";
import type { ConfigArgs } from "../args.ts";
import { getAppConfigDir } from "../../utils/mod.ts";

/**
 * Handles the config command
 * @param args Parsed config command arguments
 * @param config Current application configuration
 */
export async function configCommand(
  args: ConfigArgs,
  config: AppConfig,
): Promise<void> {
  switch (args.subcommand) {
    case "list":
      showConfig(config);
      break;
    case "get":
      getConfigValue(args.key, config);
      break;
    case "set":
      await setConfigValue(args.key, args.value, config);
      break;
    case "reset":
      await resetConfiguration();
      break;
    default:
      showConfig(config);
  }
}

/**
 * Displays all configuration
 */
function showConfig(config: AppConfig): void {
  console.log("\nConfiguration:");
  console.log(`  Config directory: ${getAppConfigDir()}`);
  console.log("");
  console.log("Server Settings:");
  console.log(`  server.name: ${config.server.name}`);
  console.log(`  server.port: ${config.server.port}`);
  console.log(`  server.world: ${config.server.world}`);
  console.log(
    `  server.password: ${config.server.password ? "****" : "(not set)"}`,
  );
  console.log(`  server.public: ${config.server.public}`);
  console.log(`  server.crossplay: ${config.server.crossplay}`);
  console.log(`  server.saveinterval: ${config.server.saveinterval}`);
  console.log(`  server.backups: ${config.server.backups}`);
  console.log("");
  console.log("Watchdog Settings:");
  console.log(`  watchdog.enabled: ${config.watchdog.enabled}`);
  console.log(`  watchdog.maxRestarts: ${config.watchdog.maxRestarts}`);
  console.log(`  watchdog.restartDelay: ${config.watchdog.restartDelay}`);
  console.log(`  watchdog.cooldownPeriod: ${config.watchdog.cooldownPeriod}`);
  console.log("");
  console.log("TUI Settings:");
  console.log(`  tui.colorScheme: ${config.tui.colorScheme}`);
  console.log(`  tui.animationsEnabled: ${config.tui.animationsEnabled}`);
  console.log(`  tui.logMaxLines: ${config.tui.logMaxLines}`);
  console.log("");
  console.log(`Worlds configured: ${config.worlds.length}`);
  console.log(`Active world: ${config.activeWorld ?? "(none)"}`);
}

/**
 * Gets a specific configuration value
 */
function getConfigValue(key: string | undefined, config: AppConfig): void {
  if (!key) {
    console.error("Error: No key specified.");
    console.log("Usage: oz-valheim config get <key>");
    console.log(
      "Example: oz-valheim config get server.name",
    );
    Deno.exit(1);
  }

  const value = getNestedValue(config, key);
  if (value === undefined) {
    console.error(`Error: Unknown configuration key: ${key}`);
    Deno.exit(1);
  }

  // Format output based on type
  if (typeof value === "object") {
    console.log(JSON.stringify(value, null, 2));
  } else {
    console.log(value);
  }
}

/**
 * Sets a configuration value
 */
async function setConfigValue(
  key: string | undefined,
  value: string | undefined,
  _config: AppConfig,
): Promise<void> {
  if (!key) {
    console.error("Error: No key specified.");
    console.log("Usage: oz-valheim config set <key> <value>");
    Deno.exit(1);
  }

  if (value === undefined) {
    console.error("Error: No value specified.");
    console.log("Usage: oz-valheim config set <key> <value>");
    Deno.exit(1);
  }

  const parts = key.split(".");
  if (parts.length !== 2) {
    console.error("Error: Key must be in format 'section.key'");
    console.log("Example: server.name, watchdog.enabled");
    Deno.exit(1);
  }

  const [section, field] = parts;

  try {
    const parsedValue = parseValue(value);

    switch (section) {
      case "server":
        await updateServerConfig({ [field]: parsedValue });
        break;
      case "watchdog":
        await updateWatchdogConfig({ [field]: parsedValue });
        break;
      case "tui":
        // Would need updateTuiConfig
        console.error("Error: TUI settings cannot be changed via CLI yet.");
        Deno.exit(1);
        break;
      default:
        console.error(`Error: Unknown section: ${section}`);
        console.log("Valid sections: server, watchdog, tui");
        Deno.exit(1);
    }

    console.log(`✓ Set ${key} = ${value}`);
  } catch (error) {
    console.error(`Error: ${(error as Error).message}`);
    Deno.exit(1);
  }
}

/**
 * Resets configuration to defaults
 */
async function resetConfiguration(): Promise<void> {
  console.log("\nResetting configuration to defaults...");

  try {
    await resetConfig();
    console.log("✓ Configuration reset successfully.");
    console.log("\nRun 'oz-valheim config list' to see default values.");
  } catch (error) {
    console.error(`Error: ${(error as Error).message}`);
    Deno.exit(1);
  }
}

/**
 * Gets a nested value from an object by dot-separated key
 */
function getNestedValue(obj: unknown, key: string): unknown {
  const parts = key.split(".");
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/**
 * Parses a string value into the appropriate type
 */
function parseValue(value: string): unknown {
  // Boolean
  if (value.toLowerCase() === "true") return true;
  if (value.toLowerCase() === "false") return false;

  // Number
  const num = Number(value);
  if (!isNaN(num)) return num;

  // String
  return value;
}
