/**
 * Global server manager singleton
 * Maintains the Watchdog instance across component mounts/unmounts
 * Supports detached mode where the server runs independently of the TUI
 *
 * In detached mode:
 * - Server runs as an independent process with its output going to a log file
 * - TUI can exit without stopping the server
 * - TUI can reconnect to a running server on startup
 * - Only one server instance can run at a time (enforced via PID file)
 */

import { disableBepInExConsole, isBepInExInstalled } from "../bepinex/mod.js";
import {
  getRunningServer,
  type PidFileData,
  type ProcessState,
  removePidFile,
  type ServerLaunchConfig,
  Watchdog,
  type WatchdogEvents,
} from "../server/mod.js";

/** Singleton watchdog instance */
let watchdog: Watchdog | null = null;

/** Track if an update is in progress */
let updating = false;

/** Whether we're attached to a detached server (vs owning it) */
let isAttached = false;

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
 * Checks if we're attached to a detached server
 */
export function isAttachedToServer(): boolean {
  return isAttached;
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
 * Checks if a server is already running (via PID file)
 * @returns PID file data if a server is running, null otherwise
 */
export async function checkRunningServer(): Promise<PidFileData | null> {
  return getRunningServer();
}

/**
 * Attaches to an already-running detached server
 * @param pidData PID file data for the running server
 * @param events Event handlers
 * @returns The watchdog instance wrapping the attached process
 */
export async function attachToServer(
  pidData: PidFileData,
  events: Partial<WatchdogEvents>
): Promise<Watchdog> {
  if (watchdog) {
    throw new Error("Already managing a server - stop it first");
  }

  // Create a minimal config from PID data for the watchdog
  const config: ServerLaunchConfig = {
    name: pidData.serverName ?? "Valheim Server",
    port: pidData.port,
    world: pidData.world,
    password: "", // Not needed for attach
    public: false,
    crossplay: false,
    detached: true,
  };

  watchdog = new Watchdog(config, { enabled: false }, events);

  // Attach to the running process
  await watchdog.serverProcess.attach(pidData);

  isAttached = true;
  return watchdog;
}

/**
 * Starts the server with the given configuration
 * Always starts in detached mode for stability
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

  // Check if a server is already running elsewhere
  const running = await getRunningServer();
  if (running) {
    throw new Error(
      `A server is already running (PID: ${running.pid}, World: ${running.world}). ` +
        "Stop it first or attach to it."
    );
  }

  // If BepInEx is installed, disable its console window so it runs headless
  // (logs will still be written to LogOutput.log and streamed to the TUI)
  if (await isBepInExInstalled()) {
    try {
      await disableBepInExConsole();
    } catch {
      // Non-fatal - BepInEx console will just be visible
    }
  }

  // Force detached mode for stability (prevents memory leaks from piping)
  const detachedConfig: ServerLaunchConfig = {
    ...config,
    detached: true,
  };

  watchdog = new Watchdog(detachedConfig, watchdogConfig, events);
  await watchdog.start();

  // PID file is written by ValheimProcess in detached mode
  isAttached = false;

  return watchdog;
}

/**
 * Stops the currently running server
 * @param keepRunning If true and server is detached, just detaches without stopping
 */
export async function stopServer(keepRunning = false): Promise<void> {
  if (!watchdog) {
    return;
  }

  if (keepRunning && isAttached) {
    // Just detach from the server, don't stop it
    await watchdog.serverProcess.detach();
    watchdog = null;
    isAttached = false;
    return;
  }

  await watchdog.stop();
  watchdog = null;
  isAttached = false;
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
  isAttached = false;
  await removePidFile();
}

/**
 * Detaches from a running server without stopping it
 * Only valid when attached to a detached server
 */
export async function detachFromServer(): Promise<void> {
  if (!watchdog) {
    return;
  }

  if (!isAttached && !watchdog.serverProcess.isDetached) {
    throw new Error("Cannot detach from a non-detached server");
  }

  await watchdog.serverProcess.detach();
  watchdog = null;
  isAttached = false;
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
 * Gets the log file path if server is running in detached mode
 */
export function getLogFilePath(): string | null {
  return watchdog?.serverProcess.logFilePath ?? null;
}

/**
 * Cleanup function to be called when the TUI exits
 * In detached mode, this just disconnects without stopping the server
 */
export async function cleanupOnExit(): Promise<void> {
  if (!watchdog) {
    return;
  }

  // If we're attached or running detached, just detach - don't stop
  if (isAttached || watchdog.serverProcess.isDetached) {
    try {
      await watchdog.serverProcess.detach();
    } catch {
      // Ignore errors during cleanup
    }
    watchdog = null;
    isAttached = false;
    return;
  }

  // Non-detached mode (shouldn't happen normally, but handle it)
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
