/**
 * BepInEx log tailing singleton
 * Monitors the BepInEx LogOutput.log file and streams entries to subscribers
 * Persists across TUI sessions - can be reconnected when TUI reopens
 */

import { LogTailer } from "../server/logTail.js";
import { createLogger } from "../utils/logger.js";
import { bepInExLogExists, getBepInExLogPath } from "./paths.js";

const log = createLogger("bepinex-log");

/** BepInEx log levels (from BepInEx logger) */
export type BepInExLogLevel = "debug" | "info" | "warn" | "error" | "fatal";

/** BepInEx-specific log entry */
export type BepInExLogEntry = {
  timestamp: Date;
  level: BepInExLogLevel;
  source: string;
  message: string;
  raw: string;
};

/** Callback for BepInEx log lines */
export type BepInExLogCallback = (entry: BepInExLogEntry) => void;

/**
 * Parses a BepInEx log line into a structured entry
 * BepInEx format: [Info   :   BepInEx] BepInEx 5.4.22.0 - valheim
 * or: [Error  :Unity Log] NullReferenceException: ...
 *
 * @param line Raw log line from BepInEx LogOutput.log
 * @returns Parsed BepInEx log entry
 */
export function parseBepInExLogLine(line: string): BepInExLogEntry {
  const timestamp = new Date();
  let level: BepInExLogLevel = "info";
  let source = "BepInEx";
  let message = line.trim();

  // Match BepInEx log format: [Level   : Source] Message
  const match = line.match(/^\[(\w+)\s*:\s*([^\]]+)\]\s*(.*)$/);
  if (match) {
    const levelStr = match[1].toLowerCase();
    source = match[2].trim();
    message = match[3];

    // Map BepInEx log levels
    switch (levelStr) {
      case "debug":
        level = "debug";
        break;
      case "info":
      case "message":
        level = "info";
        break;
      case "warning":
      case "warn":
        level = "warn";
        break;
      case "error":
        level = "error";
        break;
      case "fatal":
        level = "fatal";
        break;
      default:
        level = "info";
    }
  } else {
    // Fallback: detect level from content
    const lowerLine = line.toLowerCase();
    if (lowerLine.includes("error") || lowerLine.includes("exception")) {
      level = "error";
    } else if (lowerLine.includes("warning") || lowerLine.includes("warn")) {
      level = "warn";
    } else if (lowerLine.includes("debug")) {
      level = "debug";
    }
  }

  return { timestamp, level, source, message, raw: line };
}

/**
 * BepInEx log manager singleton
 * Provides log tailing and subscription for BepInEx console output
 */
class BepInExLogManager {
  private tailer: LogTailer | null = null;
  private subscribers: Set<BepInExLogCallback> = new Set();
  private valheimPath: string | null = null;
  private _isRunning = false;
  private recentEntries: BepInExLogEntry[] = [];
  private maxRecentEntries = 200;

  /**
   * Gets whether the log tailer is currently running
   */
  get isRunning(): boolean {
    return this._isRunning;
  }

  /**
   * Gets the path to the BepInEx log file being tailed
   */
  get logPath(): string | null {
    return this.valheimPath ? getBepInExLogPath(this.valheimPath) : null;
  }

  /**
   * Gets recent log entries (for displaying when TUI reconnects)
   */
  getRecentEntries(): BepInExLogEntry[] {
    return [...this.recentEntries];
  }

  /**
   * Starts tailing the BepInEx log file
   * @param valheimPath Path to the Valheim server directory
   * @param fromEnd If true, start from end of file (skip existing content)
   */
  async start(valheimPath: string, fromEnd = true): Promise<void> {
    if (this._isRunning) {
      // Already running for same path, just return
      if (this.valheimPath === valheimPath) {
        log.debug("BepInEx log tailer already running");
        return;
      }
      // Different path, stop and restart
      await this.stop();
    }

    this.valheimPath = valheimPath;
    const logFilePath = getBepInExLogPath(valheimPath);

    // Check if log file exists
    const exists = await bepInExLogExists(valheimPath);
    if (!exists) {
      log.debug("BepInEx log file does not exist yet, will wait for it");
      // The LogTailer handles missing files gracefully
    }

    log.info("Starting BepInEx log tailer", { path: logFilePath });

    this.tailer = new LogTailer(
      logFilePath,
      (line, _entry) => {
        this.handleLogLine(line);
      },
      {
        pollMs: 500,
      }
    );

    await this.tailer.start(fromEnd);
    this._isRunning = true;
  }

  /**
   * Stops tailing the BepInEx log file
   */
  async stop(): Promise<void> {
    if (!this._isRunning || !this.tailer) {
      return;
    }

    log.info("Stopping BepInEx log tailer");
    await this.tailer.stop();
    this.tailer = null;
    this._isRunning = false;
  }

  /**
   * Subscribes to BepInEx log entries
   * @param callback Function called for each new log entry
   * @returns Unsubscribe function
   */
  subscribe(callback: BepInExLogCallback): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  /**
   * Reads the last N lines from the log file (for initial display)
   * @param lineCount Number of lines to read
   * @returns Array of parsed log entries
   */
  async readLastLines(lineCount = 50): Promise<BepInExLogEntry[]> {
    if (!this.tailer) {
      return [];
    }

    const entries = await this.tailer.readLastLines(lineCount);
    return entries.map((entry) => parseBepInExLogLine(entry.raw));
  }

  /**
   * Handles a new log line from the tailer
   */
  private handleLogLine(line: string): void {
    const trimmed = line.trim();
    if (!trimmed) return;

    const entry = parseBepInExLogLine(trimmed);

    // Store in recent entries buffer
    this.recentEntries.push(entry);
    if (this.recentEntries.length > this.maxRecentEntries) {
      this.recentEntries = this.recentEntries.slice(-this.maxRecentEntries);
    }

    // Notify all subscribers
    for (const callback of this.subscribers) {
      try {
        callback(entry);
      } catch (error) {
        log.error("BepInEx log subscriber error", { error });
      }
    }
  }

  /**
   * Clears the recent entries buffer
   */
  clearRecentEntries(): void {
    this.recentEntries = [];
  }
}

/** Singleton instance */
export const bepInExLogManager = new BepInExLogManager();
