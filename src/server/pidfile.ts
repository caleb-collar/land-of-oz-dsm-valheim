/**
 * PID file management for tracking server processes across terminals
 * Allows the stop command to find and stop servers started in other processes
 * Supports detached server mode where the server runs independently of the TUI
 */

import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { getAppConfigDir, getConfigDir } from "../utils/platform.js";

/** Zod schema for validating PID file contents */
const PidFileSchema = z.object({
  pid: z.number().int().positive(),
  startedAt: z.string(),
  world: z.string(),
  port: z.number().int(),
  logFile: z.string().optional(),
  detached: z.boolean().optional(),
  serverName: z.string().optional(),
});

/** PID file data structure */
export type PidFileData = z.infer<typeof PidFileSchema>;

/**
 * Gets the path to the server logs directory
 */
export function getServerLogsDir(): string {
  return path.join(getAppConfigDir(), "logs");
}

/**
 * Gets the path to the current server log file
 * @param timestamp Optional timestamp for the log file name
 */
export function getServerLogFile(timestamp?: Date): string {
  const ts = timestamp ?? new Date();
  const dateStr = ts.toISOString().split("T")[0]; // YYYY-MM-DD
  return path.join(getServerLogsDir(), `valheim-server-${dateStr}.log`);
}

/**
 * Gets the path to the PID file
 */
export function getPidFilePath(): string {
  return path.join(getConfigDir(), "oz-valheim", "server.pid");
}

/**
 * Writes the PID file with server information
 * @param data PID file data to write
 */
export async function writePidFile(data: PidFileData): Promise<void> {
  const pidPath = getPidFilePath();
  const dir = path.dirname(pidPath);

  // Ensure directory exists
  await fs.mkdir(dir, { recursive: true });

  // Write PID file as JSON
  await fs.writeFile(pidPath, JSON.stringify(data, null, 2), "utf-8");
}

/**
 * Reads the PID file if it exists
 * @returns PID file data or null if file doesn't exist or is invalid
 */
export async function readPidFile(): Promise<PidFileData | null> {
  const pidPath = getPidFilePath();

  try {
    const content = await fs.readFile(pidPath, "utf-8");
    const parsed = JSON.parse(content);
    const result = PidFileSchema.safeParse(parsed);
    if (!result.success) {
      // Invalid PID file format — remove the corrupt file
      await removePidFile();
      return null;
    }
    return result.data;
  } catch {
    return null;
  }
}

/**
 * Removes the PID file
 */
export async function removePidFile(): Promise<void> {
  const pidPath = getPidFilePath();

  try {
    await fs.unlink(pidPath);
  } catch {
    // File may not exist, that's fine
  }
}

/**
 * Checks if a process with the given PID is running
 * @param pid Process ID to check
 * @returns True if the process is running
 */
export function isProcessRunning(pid: number): boolean {
  try {
    // Sending signal 0 doesn't kill the process but checks if it exists
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * Scans for running Valheim server processes on the system
 * Used as a fallback when no PID file exists to detect orphan servers
 * @returns Array of PIDs for running valheim_server processes
 */
export async function findValheimProcesses(): Promise<number[]> {
  const { execSync } = await import("node:child_process");
  const { getPlatform } = await import("../utils/platform.js");

  const platform = getPlatform();
  const pids: number[] = [];

  try {
    if (platform === "windows") {
      // Windows: use tasklist with filter (works on all Windows versions)
      const output = execSync(
        'tasklist /FI "IMAGENAME eq valheim_server.exe" /FO CSV /NH',
        { encoding: "utf-8", timeout: 5000 }
      );
      // Output format: "valheim_server.exe","12824","Console","1","123,456 K"
      const lines = output.split("\n").map((l) => l.trim());
      for (const line of lines) {
        if (line.startsWith('"valheim_server')) {
          const parts = line.split(",");
          if (parts.length >= 2) {
            // PID is second field, strip quotes
            const pidStr = parts[1]?.replace(/"/g, "");
            const pid = Number.parseInt(pidStr ?? "", 10);
            if (!Number.isNaN(pid) && pid > 0) {
              pids.push(pid);
            }
          }
        }
      }
    } else {
      // Linux/macOS: use pgrep with exact process name match
      // The Valheim server binary on Linux is valheim_server.x86_64
      // Using -x for exact match to avoid matching paths containing "valheim"
      const output = execSync("pgrep -x valheim_server.x86_64", {
        encoding: "utf-8",
        timeout: 5000,
      });
      const lines = output.split("\n").map((l) => l.trim());
      for (const line of lines) {
        const pid = Number.parseInt(line, 10);
        if (!Number.isNaN(pid) && pid > 0) {
          pids.push(pid);
        }
      }
    }
  } catch {
    // Command failed (e.g., no processes found) - that's OK
  }

  return pids;
}

/**
 * Kills a process by PID
 * @param pid Process ID to kill
 * @param force If true, use SIGKILL instead of SIGTERM
 * @returns True if the signal was sent successfully
 */
export function killProcess(pid: number, force = false): boolean {
  try {
    const signal = force ? "SIGKILL" : "SIGTERM";
    process.kill(pid, signal);
    return true;
  } catch {
    return false;
  }
}

/**
 * Gets the running server info from PID file, validating the process is still alive
 * Falls back to scanning for valheim_server processes if no PID file exists
 * @returns PID file data if server is running, null otherwise
 */
export async function getRunningServer(): Promise<PidFileData | null> {
  const data = await readPidFile();

  if (data) {
    // Check if the process is actually running
    if (!isProcessRunning(data.pid)) {
      // Process is dead, clean up stale PID file
      await removePidFile();
      return null;
    }
    return data;
  }

  // No PID file - scan for orphan Valheim processes
  const pids = await findValheimProcesses();
  if (pids.length === 0) {
    return null;
  }

  // Found an orphan server - create minimal PidFileData for attachment
  // Use the first PID found (should only be one server running)
  const orphanPid = pids[0]!;
  const orphanData: PidFileData = {
    pid: orphanPid,
    startedAt: new Date().toISOString(), // Unknown, use now as approximation
    world: "Unknown", // Cannot determine without access to process args
    port: 2456, // Default port
    detached: true,
    serverName: "Valheim Server (detected)",
  };

  // Write PID file so we don't have to scan next time
  await writePidFile(orphanData);

  return orphanData;
}

/**
 * Ensures the server logs directory exists
 */
export async function ensureLogsDir(): Promise<void> {
  const logsDir = getServerLogsDir();
  await fs.mkdir(logsDir, { recursive: true });
}

/**
 * Cleans up old log files, keeping only the most recent ones
 * @param keepCount Number of log files to keep (default: 7)
 */
export async function cleanupOldLogs(keepCount = 7): Promise<void> {
  const logsDir = getServerLogsDir();

  try {
    const files = await fs.readdir(logsDir);
    const logFiles = files
      .filter((f) => f.startsWith("valheim-server-") && f.endsWith(".log"))
      .sort()
      .reverse();

    // Delete old files beyond keepCount
    for (const file of logFiles.slice(keepCount)) {
      try {
        await fs.unlink(path.join(logsDir, file));
      } catch {
        // Ignore errors deleting old logs
      }
    }
  } catch {
    // Directory may not exist yet, that's fine
  }
}
