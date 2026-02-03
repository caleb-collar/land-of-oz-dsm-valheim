/**
 * Stop command handler
 * Stops the running Valheim server (works with detached servers)
 */

import {
  getRunningServer,
  isProcessRunning,
  killProcess,
  removePidFile,
} from "../../server/mod.js";
import { getPlatform } from "../../utils/platform.js";
import type { StopArgs } from "../args.js";
import { clearActiveWatchdog, getActiveWatchdog } from "./start.js";

/**
 * Handles the stop command
 * @param args Parsed stop command arguments
 */
export async function stopCommand(args: StopArgs): Promise<void> {
  const timeout = args.timeout ?? 30000;

  // First check if we have a watchdog in this process
  const watchdog = getActiveWatchdog();

  if (watchdog) {
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

  // No watchdog in this process, check PID file for detached server
  const runningServer = await getRunningServer();

  if (!runningServer) {
    console.log("\nNo server is currently running.");
    console.log("\nNote: Run 'valheim-dsm start' to start a server.");
    return;
  }

  const { pid, world, port, startedAt, detached, logFile } = runningServer;

  console.log(`\nFound running server:`);
  console.log(`  PID: ${pid}`);
  console.log(`  World: ${world}`);
  console.log(`  Port: ${port}`);
  console.log(`  Started: ${new Date(startedAt).toLocaleString()}`);
  console.log(`  Mode: ${detached ? "Detached" : "Attached"}`);
  if (logFile) {
    console.log(`  Log: ${logFile}`);
  }

  // Verify process is still running
  if (!isProcessRunning(pid)) {
    console.log("\nServer process is no longer running. Cleaning up...");
    await removePidFile();
    return;
  }

  const platform = getPlatform();

  // Kill the process
  if (args.force) {
    console.log("\nForce killing server...");
    // On Windows, there's no SIGKILL - use SIGTERM
    killProcess(pid, platform !== "windows");
  } else {
    console.log("\nSending stop signal...");
    killProcess(pid, false);

    // Wait for process to exit
    const startTime = Date.now();
    let dots = 0;

    while (isProcessRunning(pid) && Date.now() - startTime < timeout) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      process.stdout.write(".");
      dots++;
    }
    if (dots > 0) console.log();

    // Check if it's still running
    if (isProcessRunning(pid)) {
      console.log("Server did not stop gracefully, force killing...");
      killProcess(pid, platform !== "windows");

      // Wait a bit more for force kill
      await new Promise((resolve) => setTimeout(resolve, 2000));

      if (isProcessRunning(pid)) {
        console.error(
          "Failed to stop server. Process may require manual termination."
        );
        console.log(`  PID: ${pid}`);
        if (platform === "windows") {
          console.log(`  Try: taskkill /F /PID ${pid}`);
        } else {
          console.log(`  Try: kill -9 ${pid}`);
        }
        return;
      }
    }
  }

  // Clean up PID file
  await removePidFile();
  console.log("Server stopped.");
}
