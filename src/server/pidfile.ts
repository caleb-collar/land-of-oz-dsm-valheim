/**
 * PID file management for tracking server processes across terminals
 * Allows the stop command to find and stop servers started in other processes
 * Supports detached server mode where the server runs independently of the TUI
 */

import fs from "node:fs/promises";
import path from "node:path";
import { getAppConfigDir, getConfigDir } from "../utils/platform.js";

/** PID file data structure */
export type PidFileData = {
  pid: number;
  startedAt: string;
  world: string;
  port: number;
  /** Path to the server log file (for detached mode) */
  logFile?: string;
  /** Whether the server was started in detached mode */
  detached?: boolean;
  /** Server name */
  serverName?: string;
};

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
    return JSON.parse(content) as PidFileData;
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
 * @returns PID file data if server is running, null otherwise
 */
export async function getRunningServer(): Promise<PidFileData | null> {
  const data = await readPidFile();

  if (!data) {
    return null;
  }

  // Check if the process is actually running
  if (!isProcessRunning(data.pid)) {
    // Process is dead, clean up stale PID file
    await removePidFile();
    return null;
  }

  return data;
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
