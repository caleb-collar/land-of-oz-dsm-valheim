/**
 * Start command handler
 * Starts the Valheim dedicated server with watchdog
 */

import type { AppConfig } from "../../config/mod.js";
import {
  type ProcessState,
  removePidFile,
  Watchdog,
  writePidFile,
} from "../../server/mod.js";
import { isValheimInstalled } from "../../steamcmd/mod.js";
import { getPlatform } from "../../utils/platform.js";
import type { StartArgs } from "../args.js";

/** Active watchdog instance */
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
  };

  console.log(`\nStarting ${serverConfig.name}...`);
  console.log(`  World: ${serverConfig.world}`);
  console.log(`  Port: ${serverConfig.port}`);
  console.log(`  Public: ${serverConfig.public}`);
  console.log(`  Crossplay: ${serverConfig.crossplay}`);
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

  // Setup shutdown handlers
  setupShutdownHandlers();

  try {
    await activeWatchdog.start();

    // Write PID file so stop command can find the server
    const pid = activeWatchdog.serverProcess.pid;
    if (pid) {
      await writePidFile({
        pid,
        startedAt: new Date().toISOString(),
        world: serverConfig.world,
        port: serverConfig.port,
      });
    }

    console.log("\nServer started. Press Ctrl+C to stop.\n");

    // Keep the process running
    await new Promise(() => {
      // This promise never resolves - we wait for signal handlers
    });
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
 * Sets up signal handlers for graceful shutdown
 */
function setupShutdownHandlers(): void {
  const shutdown = async () => {
    console.log("\n\nShutting down...");
    if (activeWatchdog) {
      await activeWatchdog.stop();
      activeWatchdog = null;
    }
    // Clean up PID file
    await removePidFile();
    process.exit(0);
  };

  // Handle SIGINT (Ctrl+C)
  process.on("SIGINT", shutdown);

  // Handle SIGTERM (kill command) - not supported on Windows
  if (getPlatform() !== "windows") {
    process.on("SIGTERM", shutdown);
  }
}
