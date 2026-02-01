/**
 * Global server manager singleton
 * Maintains the Watchdog instance across component mounts/unmounts
 * This ensures the server stays running when navigating between screens
 */

import {
  type ProcessState,
  removePidFile,
  type ServerLaunchConfig,
  Watchdog,
  type WatchdogEvents,
  writePidFile,
} from "../server/mod.js";

/** Singleton watchdog instance */
let watchdog: Watchdog | null = null;

/** Track if an update is in progress */
let updating = false;

/**
 * Gets the current watchdog instance
 */
export function getWatchdog(): Watchdog | null {
  return watchdog;
}

/**
 * Checks if the server is managed by this instance
 */
export function hasActiveServer(): boolean {
  return watchdog !== null;
}

/**
 * Checks if an update is in progress
 */
export function isUpdating(): boolean {
  return updating;
}

/**
 * Sets the updating flag
 */
export function setUpdating(value: boolean): void {
  updating = value;
}

/**
 * Starts the server with the given configuration
 * @param config Server launch configuration
 * @param watchdogConfig Watchdog configuration
 * @param events Event handlers
 * @returns The created watchdog instance
 */
export async function startServer(
  config: ServerLaunchConfig,
  watchdogConfig: Partial<{
    enabled: boolean;
    maxRestarts: number;
    restartDelay: number;
    cooldownPeriod: number;
    backoffMultiplier: number;
  }>,
  events: Partial<WatchdogEvents>
): Promise<Watchdog> {
  if (watchdog) {
    throw new Error("Server is already running");
  }

  watchdog = new Watchdog(config, watchdogConfig, events);
  await watchdog.start();

  // Write PID file
  const pid = watchdog.serverProcess.pid;
  if (pid) {
    await writePidFile({
      pid,
      startedAt: new Date().toISOString(),
      world: config.world,
      port: config.port,
    });
  }

  return watchdog;
}

/**
 * Stops the currently running server
 */
export async function stopServer(): Promise<void> {
  if (!watchdog) {
    return;
  }

  await watchdog.stop();
  watchdog = null;
  await removePidFile();
}

/**
 * Force kills the currently running server
 */
export async function killServer(): Promise<void> {
  if (!watchdog) {
    return;
  }

  await watchdog.kill();
  watchdog = null;
  await removePidFile();
}

/**
 * Gets the current server state
 */
export function getServerState(): ProcessState | null {
  return watchdog?.serverProcess.currentState ?? null;
}

/**
 * Gets the server PID if running
 */
export function getServerPid(): number | null {
  return watchdog?.serverProcess.pid ?? null;
}

/**
 * Cleanup function to be called when the TUI exits
 * This should only be called once when the entire application is shutting down
 */
export async function cleanupOnExit(): Promise<void> {
  if (watchdog) {
    try {
      await watchdog.stop();
    } catch {
      // Force kill if graceful stop fails
      try {
        await watchdog.kill();
      } catch {
        // Ignore errors during cleanup
      }
    }
    watchdog = null;
    await removePidFile();
  }
}
