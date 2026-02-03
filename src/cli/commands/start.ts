/**
 * Start command handler
 * Starts the Valheim dedicated server in detached mode
 * Server runs independently and survives terminal/TUI exit
 */

import type { AppConfig } from "../../config/mod.js";
import {
  cleanupOldLogs,
  getRunningServer,
  type ProcessState,
  Watchdog,
} from "../../server/mod.js";
import { isValheimInstalled } from "../../steamcmd/mod.js";
import { getPlatform } from "../../utils/platform.js";
import type { StartArgs } from "../args.js";

/** Active watchdog instance (for foreground mode only) */
let activeWatchdog: Watchdog | null = null;

/**
 * Handles the start command
 * @param args Parsed start command arguments
 * @param config Application configuration
 */
export async function startCommand(
  args: StartArgs,
  config: AppConfig
): Promise<void> {
  // Check if Valheim is installed
  const valheimInstalled = await isValheimInstalled();
  if (!valheimInstalled) {
    console.error("\nError: Valheim Dedicated Server is not installed.");
    console.log("Run 'valheim-dsm install' first to install the server.");
    process.exit(1);
  }

  // Check for already running server
  const running = await getRunningServer();
  if (running) {
    console.error(`\nError: A server is already running.`);
    console.log(`  PID: ${running.pid}`);
    console.log(`  World: ${running.world}`);
    console.log(`  Port: ${running.port}`);
    console.log(`  Started: ${new Date(running.startedAt).toLocaleString()}`);
    console.log("\nRun 'valheim-dsm stop' to stop it first.");
    process.exit(1);
  }

  // Clean up old log files
  await cleanupOldLogs();

  // Merge CLI args with config (CLI takes precedence)
  const serverConfig = {
    name: args.name ?? config.server.name,
    port: args.port ?? config.server.port,
    world: args.world ?? config.server.world,
    password: args.password ?? config.server.password,
    public: args.public ?? config.server.public,
    crossplay: args.crossplay ?? config.server.crossplay,
    savedir: args.savedir ?? config.server.savedir,
    saveinterval: config.server.saveinterval,
    backups: config.server.backups,
    // Always use detached mode for stability
    detached: true,
  };

  console.log(`\nStarting ${serverConfig.name}...`);
  console.log(`  World: ${serverConfig.world}`);
  console.log(`  Port: ${serverConfig.port}`);
  console.log(`  Public: ${serverConfig.public}`);
  console.log(`  Crossplay: ${serverConfig.crossplay}`);
  console.log(`  Mode: Detached (server continues after terminal exits)`);
  console.log("");

  // Create watchdog with merged config
  activeWatchdog = new Watchdog(
    serverConfig,
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
        if (state === "online") {
          console.log("\n✓ Server is now online!");
          console.log("  The server will continue running in the background.");
          console.log("  Use 'valheim-dsm stop' to stop it.");
          console.log("  Use 'valheim-dsm' (TUI) to manage it.\n");
        }
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
          `[Watchdog] Restarting server (attempt ${attempt}/${max})...`
        );
      },
      onWatchdogMaxRestarts: () => {
        console.error(
          "[Watchdog] Max restarts exceeded. Server will not be restarted."
        );
      },
    }
  );

  // Setup shutdown handlers for graceful exit
  setupShutdownHandlers();

  try {
    await activeWatchdog.start();

    const logPath = activeWatchdog.serverProcess.logFilePath;
    if (logPath) {
      console.log(`\nServer log: ${logPath}`);
    }

    console.log("\nServer is starting in detached mode.");
    console.log(
      "Press Ctrl+C to stop monitoring (server will keep running).\n"
    );

    // Wait for server to come online or crash, with a timeout
    const timeout = 120000; // 2 minutes for world generation
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const state = activeWatchdog.serverProcess.currentState;
      if (state === "online") {
        // Give it a moment more then exit
        await new Promise((resolve) => setTimeout(resolve, 2000));
        break;
      }
      if (state === "crashed" || state === "offline") {
        console.error("\nServer failed to start.");
        await cleanupAndExit(1);
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Detach from the server (it keeps running)
    console.log("\nDetaching from server...");
    await activeWatchdog.serverProcess.detach();
    activeWatchdog = null;

    process.exit(0);
  } catch (error) {
    console.error(`\nFailed to start server: ${(error as Error).message}`);
    process.exit(1);
  }
}

/**
 * Returns the active watchdog, if any
 */
export function getActiveWatchdog(): Watchdog | null {
  return activeWatchdog;
}

/**
 * Clears the active watchdog reference
 */
export function clearActiveWatchdog(): void {
  activeWatchdog = null;
}

/**
 * Cleanup and exit
 */
async function cleanupAndExit(code: number): Promise<void> {
  if (activeWatchdog) {
    try {
      await activeWatchdog.serverProcess.detach();
    } catch {
      // Ignore
    }
    activeWatchdog = null;
  }
  process.exit(code);
}

/**
 * Sets up signal handlers for graceful shutdown
 */
function setupShutdownHandlers(): void {
  const shutdown = async () => {
    console.log("\n\nDetaching from server (it will keep running)...");
    if (activeWatchdog) {
      try {
        await activeWatchdog.serverProcess.detach();
      } catch {
        // Ignore
      }
      activeWatchdog = null;
    }
    process.exit(0);
  };

  // Handle SIGINT (Ctrl+C)
  process.on("SIGINT", shutdown);

  // Handle SIGTERM (kill command) - not supported on Windows
  if (getPlatform() !== "windows") {
    process.on("SIGTERM", shutdown);
  }
}
