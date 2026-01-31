/**
 * Land of OZ - Valheim Dedicated Server Manager
 * Main entry point
 */

import {
  configCommand,
  getHelpText,
  installCommand,
  interactiveRcon,
  parseArgs,
  rconCommand,
  startCommand,
  stopCommand,
  worldsCommand,
} from "./src/cli/mod.js";
import { type AppConfig, closeConfig, loadConfig } from "./src/config/mod.js";
import { APP_NAME, VERSION, launchTui } from "./src/mod.js";
import { createLogger, getPlatform, info } from "./src/utils/mod.js";

const log = createLogger("main");

/**
 * Displays version information
 */
function showVersion(): void {
  console.log(`${APP_NAME} v${VERSION}`);
  console.log(`Platform: ${getPlatform()}`);
  console.log(`Runtime: Node.js ${process.version}`);
}

/**
 * Main application entry point
 */
async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  // Handle version command/flag
  if (args.command === "version") {
    showVersion();
    return;
  }

  // Handle help command/flag
  if (args.command === "help") {
    console.log(getHelpText(args.topic));
    return;
  }

  // Enable debug logging if requested
  if (args.debug) {
    log.info("Debug mode enabled");
  }

  // For commands that don't need config, handle them early
  if (args.help) {
    const topic = args.command === null ? undefined : String(args.command);
    console.log(getHelpText(topic));
    return;
  }

  // Load configuration
  info("Loading configuration...");
  let config: AppConfig;

  try {
    config = await loadConfig();
    log.info("Configuration loaded successfully");
  } catch (error) {
    log.error("Failed to load configuration", { error: String(error) });
    console.error(
      "Error: Failed to load configuration. Please check file permissions."
    );
    process.exit(1);
  }

  try {
    // Route to appropriate command handler
    switch (args.command) {
      case "start":
        await startCommand(args, config);
        break;

      case "stop":
        await stopCommand(args);
        break;

      case "install":
        await installCommand(args);
        break;

      case "config":
        await configCommand(args, config);
        break;

      case "worlds":
        await worldsCommand(args);
        break;

      case "rcon":
        if (args.interactive) {
          await interactiveRcon(args);
        } else {
          await rconCommand(args);
        }
        break;

      case "tui":
        launchTui();
        // TUI handles its own exit
        return;

      case null:
        // No command - default to TUI if no args, or show help
        if (process.argv.slice(2).length === 0) {
          launchTui();
          return;
        }
        console.log(getHelpText());
        break;
    }
  } finally {
    await closeConfig();
  }
}

// Run main
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
