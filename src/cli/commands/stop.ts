/**
 * Stop command handler
 * Stops the running Valheim server
 */

import type { StopArgs } from "../args.js";
import { clearActiveWatchdog, getActiveWatchdog } from "./start.js";

/**
 * Handles the stop command
 * @param args Parsed stop command arguments
 */
export async function stopCommand(args: StopArgs): Promise<void> {
  const watchdog = getActiveWatchdog();

  if (!watchdog) {
    console.log("\nNo server is currently running in this process.");
    console.log(
      "\nNote: If the server was started in a different terminal or as a"
    );
    console.log("background process, you'll need to stop it manually.");
    return;
  }

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
}
