/**
 * Land of OZ - Valheim Dedicated Server Manager
 * Main entry point
 */

import { type AppConfig, closeConfig, loadConfig } from "./src/config/mod.ts";
import {
  createLogger,
  getAppConfigDir,
  getPlatform,
  info,
} from "./src/utils/mod.ts";
import { APP_NAME, launchTui, VERSION } from "./src/mod.ts";
import {
  getInstalledVersion,
  getSteamPaths,
  installSteamCmd,
  installValheim,
  isSteamCmdInstalled,
  isValheimInstalled,
} from "./src/steamcmd/mod.ts";
import { type ProcessState, Watchdog } from "./src/server/mod.ts";

const log = createLogger("main");

/** CLI argument definitions */
type CliArgs = {
  help: boolean;
  version: boolean;
  tui: boolean;
  config: boolean;
  debug: boolean;
  dryRun: boolean;
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
    dryRun: false,
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
      case "--dry-run":
        args.dryRun = true;
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
    --dry-run        Show what would be done without executing

COMMANDS:
    start            Start the Valheim server
    stop             Stop the Valheim server
    install          Install/update SteamCMD and Valheim
    config           Manage configuration
    tui              Launch the TUI (same as --tui)

INSTALL OPTIONS:
    install --dry-run    Show installation status without installing
    install              Install SteamCMD and Valheim dedicated server

EXAMPLES:
    oz-valheim --tui           Launch the TUI interface
    oz-valheim start           Start the server
    oz-valheim install         Install SteamCMD and Valheim
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
      await startCommand(config);
      break;
    case "stop":
      await stopCommand();
      break;
    case "install":
      await installCommand(args.dryRun);
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

/**
 * Handles the install command
 * Installs SteamCMD and Valheim dedicated server
 */
async function installCommand(dryRun: boolean): Promise<void> {
  const steamInstalled = await isSteamCmdInstalled();
  const valheimInstalled = await isValheimInstalled();
  const paths = getSteamPaths();

  if (dryRun) {
    console.log("\nInstallation Status (dry run):\n");
    console.log(`  SteamCMD:`);
    console.log(
      `    Status: ${steamInstalled ? "Installed" : "Not installed"}`,
    );
    console.log(`    Path: ${paths.steamcmd}`);
    console.log("");
    console.log(`  Valheim Dedicated Server:`);
    console.log(
      `    Status: ${valheimInstalled ? "Installed" : "Not installed"}`,
    );
    console.log(`    Path: ${paths.valheimDir}`);

    if (valheimInstalled) {
      const version = await getInstalledVersion();
      if (version) {
        console.log(`    Build ID: ${version}`);
      }
    }

    console.log("");

    if (!steamInstalled || !valheimInstalled) {
      console.log("  Actions that would be taken:");
      if (!steamInstalled) {
        console.log("    - Download and install SteamCMD");
      }
      if (!valheimInstalled) {
        console.log("    - Download and install Valheim Dedicated Server");
      }
    } else {
      console.log("  Everything is already installed.");
    }

    return;
  }

  // Install SteamCMD if needed
  if (!steamInstalled) {
    console.log("\nInstalling SteamCMD...\n");
    await installSteamCmd((progress) => {
      const bar = createProgressBar(progress.progress);
      Deno.stdout.writeSync(
        new TextEncoder().encode(`\r  ${bar} ${progress.message}`),
      );
    });
    console.log("\n");
  } else {
    console.log("\nSteamCMD is already installed.");
  }

  // Install Valheim
  if (!valheimInstalled) {
    console.log("\nInstalling Valheim Dedicated Server...\n");
  } else {
    console.log("\nUpdating Valheim Dedicated Server...\n");
  }

  await installValheim((status) => {
    const bar = createProgressBar(status.progress);
    Deno.stdout.writeSync(
      new TextEncoder().encode(
        `\r  ${bar} ${status.message}                    `,
      ),
    );
  });
  console.log("\n");

  const version = await getInstalledVersion();
  console.log(`\nInstallation complete!`);
  if (version) {
    console.log(`  Build ID: ${version}`);
  }
  console.log(`  Server path: ${paths.valheimDir}`);
}

/**
 * Creates a simple text progress bar
 */
function createProgressBar(percent: number): string {
  const width = 20;
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;
  return `[${"█".repeat(filled)}${"░".repeat(empty)}] ${percent
    .toString()
    .padStart(3)}%`;
}

/** Active watchdog instance for the running server */
let activeWatchdog: Watchdog | null = null;

/**
 * Handles the start command
 * Starts the Valheim server with watchdog
 */
async function startCommand(config: AppConfig): Promise<void> {
  // Check if Valheim is installed
  const valheimInstalled = await isValheimInstalled();
  if (!valheimInstalled) {
    console.error("\nError: Valheim Dedicated Server is not installed.");
    console.log("Run 'oz-valheim install' first to install the server.");
    Deno.exit(1);
  }

  console.log(`\nStarting ${config.server.name}...`);
  console.log(`  World: ${config.server.world}`);
  console.log(`  Port: ${config.server.port}`);
  console.log(`  Public: ${config.server.public}`);
  console.log(`  Crossplay: ${config.server.crossplay}`);
  console.log("");

  // Create watchdog with config
  activeWatchdog = new Watchdog(
    {
      name: config.server.name,
      port: config.server.port,
      world: config.server.world,
      password: config.server.password,
      public: config.server.public,
      crossplay: config.server.crossplay,
      savedir: config.server.savedir,
      saveinterval: config.server.saveinterval,
      backups: config.server.backups,
    },
    {
      enabled: config.watchdog.enabled,
      maxRestarts: config.watchdog.maxRestarts,
      restartDelay: config.watchdog.restartDelay,
      cooldownPeriod: config.watchdog.cooldownPeriod,
      backoffMultiplier: config.watchdog.backoffMultiplier,
    },
    {
      onStateChange: (state: ProcessState) => {
        console.log(`[Server] State: ${state}`);
      },
      onLog: (line: string) => {
        console.log(`[Server] ${line}`);
      },
      onPlayerJoin: (name: string) => {
        console.log(`[Server] Player joined: ${name}`);
      },
      onPlayerLeave: (name: string) => {
        console.log(`[Server] Player left: ${name}`);
      },
      onError: (error: Error) => {
        console.error(`[Server] Error: ${error.message}`);
      },
      onWatchdogRestart: (attempt: number, max: number) => {
        console.log(
          `[Watchdog] Restarting server (attempt ${attempt}/${max})...`,
        );
      },
      onWatchdogMaxRestarts: () => {
        console.error(
          "[Watchdog] Max restarts exceeded. Server will not be restarted.",
        );
      },
    },
  );

  // Setup signal handlers for graceful shutdown
  setupShutdownHandlers();

  try {
    await activeWatchdog.start();
    console.log("\nServer started. Press Ctrl+C to stop.\n");

    // Keep the process running
    await new Promise(() => {
      // This promise never resolves - we wait for signal handlers
    });
  } catch (error) {
    console.error(`\nFailed to start server: ${(error as Error).message}`);
    Deno.exit(1);
  }
}

/**
 * Handles the stop command
 * Stops the running Valheim server
 */
async function stopCommand(): Promise<void> {
  if (!activeWatchdog) {
    console.log("\nNo server is currently running.");
    return;
  }

  console.log("\nStopping server...");
  await activeWatchdog.stop();
  console.log("Server stopped.");
  activeWatchdog = null;
}

/**
 * Sets up signal handlers for graceful shutdown
 */
function setupShutdownHandlers(): void {
  const shutdown = async () => {
    console.log("\n\nShutting down...");
    if (activeWatchdog) {
      await activeWatchdog.stop();
      activeWatchdog = null;
    }
    await closeConfig();
    Deno.exit(0);
  };

  // Handle SIGINT (Ctrl+C)
  Deno.addSignalListener("SIGINT", shutdown);

  // Handle SIGTERM (kill command) - not supported on Windows
  if (Deno.build.os !== "windows") {
    Deno.addSignalListener("SIGTERM", shutdown);
  }
}

// Run main if this is the entry point
if (import.meta.main) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    Deno.exit(1);
  });
}
