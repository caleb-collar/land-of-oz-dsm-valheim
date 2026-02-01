/**
 * Stop command handler
 * Stops the running Valheim server
 */

import {
  getRunningServer,
  isProcessRunning,
  killProcess,
  removePidFile,
} from "../../server/mod.js";
import type { StopArgs } from "../args.js";
import { clearActiveWatchdog, getActiveWatchdog } from "./start.js";

/**
 * Handles the stop command
 * @param args Parsed stop command arguments
 */
export async function stopCommand(args: StopArgs): Promise<void> {
  // First check if we have a watchdog in this process
  const watchdog = getActiveWatchdog();

  if (watchdog) {
    const timeout = args.timeout ?? 30000;

    if (args.force) {
      console.log("\nForce stopping server...");
      await watchdog.kill();
    } else {
      console.log(`\nStopping server (timeout: ${timeout}ms)...`);
      await watchdog.stop();
    }

    console.log("Server stopped.");
    clearActiveWatchdog();
    await removePidFile();
    return;
  }

  // No watchdog in this process, check PID file for external process
  const runningServer = await getRunningServer();

  if (!runningServer) {
    console.log("\nNo server is currently running.");
    console.log("\nNote: Run 'valheim-dsm start' to start a server.");
    return;
  }

  const { pid, world, port, startedAt } = runningServer;

  console.log(`\nFound running server:`);
  console.log(`  PID: ${pid}`);
  console.log(`  World: ${world}`);
  console.log(`  Port: ${port}`);
  console.log(`  Started: ${new Date(startedAt).toLocaleString()}`);

  // Verify process is still running
  if (!isProcessRunning(pid)) {
    console.log("\nServer process is no longer running. Cleaning up...");
    await removePidFile();
    return;
  }

  // Kill the process
  if (args.force) {
    console.log("\nForce killing server...");
    killProcess(pid, true);
  } else {
    console.log("\nSending stop signal...");
    killProcess(pid, false);

    // Wait for process to exit
    const timeout = args.timeout ?? 30000;
    const startTime = Date.now();

    while (isProcessRunning(pid) && Date.now() - startTime < timeout) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      process.stdout.write(".");
    }
    console.log();

    // Check if it's still running
    if (isProcessRunning(pid)) {
      console.log("Server did not stop gracefully, force killing...");
      killProcess(pid, true);
    }
  }

  // Clean up PID file
  await removePidFile();
  console.log("Server stopped.");
}
