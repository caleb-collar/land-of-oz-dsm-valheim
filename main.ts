/**
 * Land of OZ - Valheim Dedicated Server Manager
 * Main entry point
 */

import { loadConfig, closeConfig, type AppConfig } from "./src/config/mod.ts";
import {
  getPlatform,
  getAppConfigDir,
  info,
  createLogger,
} from "./src/utils/mod.ts";
import { launchTui, VERSION, APP_NAME } from "./src/mod.ts";

const log = createLogger("main");

/** CLI argument definitions */
type CliArgs = {
  help: boolean;
  version: boolean;
  tui: boolean;
  config: boolean;
  debug: boolean;
};

/**
 * Parses command line arguments
 * @returns Parsed CLI arguments
 */
function parseArgs(): CliArgs {
  const args: CliArgs = {
    help: false,
    version: false,
    tui: false,
    config: false,
    debug: false,
  };

  for (const arg of Deno.args) {
    switch (arg) {
      case "-h":
      case "--help":
        args.help = true;
        break;
      case "-v":
      case "--version":
        args.version = true;
        break;
      case "-t":
      case "--tui":
        args.tui = true;
        break;
      case "-c":
      case "--config":
        args.config = true;
        break;
      case "-d":
      case "--debug":
        args.debug = true;
        break;
    }
  }

  return args;
}

/**
 * Displays help message
 */
function showHelp(): void {
  console.log(`
${APP_NAME} v${VERSION}

USAGE:
    oz-valheim [OPTIONS] [COMMAND]

OPTIONS:
    -h, --help       Show this help message
    -v, --version    Show version information
    -t, --tui        Launch the TUI interface
    -c, --config     Show current configuration
    -d, --debug      Enable debug logging

COMMANDS:
    start            Start the Valheim server
    stop             Stop the Valheim server
    install          Install/update Valheim via SteamCMD
    config           Manage configuration
    tui              Launch the TUI (same as --tui)

EXAMPLES:
    oz-valheim --tui           Launch the TUI interface
    oz-valheim start           Start the server
    oz-valheim config --list   Show all configuration

For more information, see: https://github.com/yourusername/land-of-oz-dsm-valheim
`);
}

/**
 * Displays version information
 */
function showVersion(): void {
  console.log(`${APP_NAME} v${VERSION}`);
  console.log(`Platform: ${getPlatform()}`);
  console.log(`Runtime: Deno ${Deno.version.deno}`);
}

/**
 * Displays current configuration
 */
function showConfig(config: AppConfig): void {
  console.log("\nConfiguration:");
  console.log(`  Config directory: ${getAppConfigDir()}`);
  console.log("");
  console.log("Server Settings:");
  console.log(`  Name: ${config.server.name}`);
  console.log(`  Port: ${config.server.port}`);
  console.log(`  World: ${config.server.world}`);
  console.log(`  Public: ${config.server.public}`);
  console.log(`  Crossplay: ${config.server.crossplay}`);
  console.log("");
  console.log("Watchdog Settings:");
  console.log(`  Enabled: ${config.watchdog.enabled}`);
  console.log(`  Max restarts: ${config.watchdog.maxRestarts}`);
  console.log("");
  console.log("TUI Settings:");
  console.log(`  Color scheme: ${config.tui.colorScheme}`);
  console.log(`  Animations: ${config.tui.animationsEnabled}`);
  console.log("");
  console.log(`Worlds configured: ${config.worlds.length}`);
  console.log(`Active world: ${config.activeWorld ?? "none"}`);
}

/**
 * Main application entry point
 */
async function main(): Promise<void> {
  const args = parseArgs();

  // Handle immediate flags
  if (args.version) {
    showVersion();
    return;
  }

  if (args.help) {
    showHelp();
    return;
  }

  // Load or initialize configuration
  info("Loading configuration...");
  let config: AppConfig;

  try {
    config = await loadConfig();
    log.info("Configuration loaded successfully");
  } catch (error) {
    log.error("Failed to load configuration", { error: String(error) });
    console.error(
      "Error: Failed to load configuration. Please check file permissions.",
    );
    Deno.exit(1);
  }

  // Handle config display
  if (args.config) {
    await showConfig(config);
    await closeConfig();
    return;
  }

  // Handle TUI launch
  if (args.tui || Deno.args.length === 0) {
    info(`Starting ${APP_NAME}...`);
    console.log("");
    console.log(`  Platform: ${getPlatform()}`);
    console.log(`  Config: ${getAppConfigDir()}`);
    console.log("");

    // For now, show placeholder - TUI will be implemented in Phase 3
    launchTui();

    await closeConfig();
    return;
  }

  // Handle subcommands (Phase 4 implementation)
  const command = Deno.args[0];
  switch (command) {
    case "start":
      console.log("Server start command not yet implemented (Phase 2)");
      break;
    case "stop":
      console.log("Server stop command not yet implemented (Phase 2)");
      break;
    case "install":
      console.log("Install command not yet implemented (Phase 2)");
      break;
    case "config":
      await showConfig(config);
      break;
    case "tui":
      launchTui();
      break;
    default:
      console.error(`Unknown command: ${command}`);
      console.log("Use --help to see available commands.");
      Deno.exit(1);
  }

  await closeConfig();
}

// Run main if this is the entry point
if (import.meta.main) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    Deno.exit(1);
  });
}
