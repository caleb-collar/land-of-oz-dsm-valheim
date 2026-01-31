/**
 * Log parsing and streaming for Valheim server output
 * Provides structured log entries and event detection
 */

/** Log severity levels for server output */
export type ServerLogLevel = "debug" | "info" | "warn" | "error";

/** Parsed log entry with structured data from server output */
export type ServerLogEntry = {
  timestamp: Date;
  level: ServerLogLevel;
  message: string;
  raw: string;
};

/** Server events that can be detected from logs */
export type ParsedEvent =
  | { type: "player_join"; name: string }
  | { type: "player_leave"; name: string }
  | { type: "world_saved" }
  | { type: "server_ready" }
  | { type: "server_shutdown" }
  | { type: "error"; message: string };

/**
 * Parses a raw log line into a structured entry
 * @param line Raw log line from server output
 * @returns Structured log entry
 */
export function parseLogLine(line: string): ServerLogEntry {
  const timestamp = new Date();
  let level: ServerLogLevel = "info";
  let message = line.trim();

  // Detect log level from content
  if (line.includes("Error") || line.includes("Exception")) {
    level = "error";
  } else if (line.includes("Warning") || line.includes("WARN")) {
    level = "warn";
  } else if (line.includes("DEBUG") || line.includes("[Debug]")) {
    level = "debug";
  }

  // Try to extract timestamp from Valheim log format
  // "02/15/2024 12:34:56: Message"
  const timestampMatch = line.match(
    /^(\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}): (.+)$/
  );
  if (timestampMatch) {
    message = timestampMatch[2];
  }

  return { timestamp, level, message, raw: line };
}

/**
 * Parses a log line for server events
 * @param line Raw log line from server output
 * @returns Parsed event or null if no event detected
 */
export function parseEvent(line: string): ParsedEvent | null {
  // Player join detection
  // "Got character ZDOID from playername"
  if (line.includes("Got character ZDOID from")) {
    const match = line.match(/Got character ZDOID from (\S+)/);
    if (match) {
      return { type: "player_join", name: match[1] };
    }
  }

  // Player leave is harder to detect reliably
  // Socket closes include IP but not player name
  if (line.includes("Closing socket")) {
    // We can't get player name from this, would need IP->player mapping
    return null;
  }

  // World saved
  if (line.includes("World saved")) {
    return { type: "world_saved" };
  }

  // Server ready (fully started)
  if (line.includes("Game server connected")) {
    return { type: "server_ready" };
  }

  // Server shutting down
  if (line.includes("OnApplicationQuit")) {
    return { type: "server_shutdown" };
  }

  // Error detection
  if (
    line.includes("Error!") ||
    line.includes("FAILED") ||
    line.includes("Exception:")
  ) {
    return { type: "error", message: line.trim() };
  }

  return null;
}

/** Callback type for log subscribers */
export type ServerLogSubscriber = (entry: ServerLogEntry) => void;

/**
 * Circular buffer for storing and streaming log entries
 * Supports subscriber pattern for real-time log updates
 */
export class LogBuffer {
  private entries: ServerLogEntry[] = [];
  private maxSize: number;
  private subscribers: Set<ServerLogSubscriber> = new Set();

  /**
   * Creates a new log buffer
   * @param maxSize Maximum number of entries to retain (default: 1000)
   */
  constructor(maxSize = 1000) {
    this.maxSize = maxSize;
  }

  /**
   * Adds a raw log line to the buffer
   * Parses the line and notifies all subscribers
   * @param line Raw log line from server output
   * @returns The parsed log entry
   */
  add(line: string): ServerLogEntry {
    const entry = parseLogLine(line);
    this.entries.push(entry);

    // Trim if over max size
    if (this.entries.length > this.maxSize) {
      this.entries = this.entries.slice(-this.maxSize);
    }

    // Notify all subscribers
    for (const subscriber of this.subscribers) {
      try {
        subscriber(entry);
      } catch (error) {
        console.error("Log subscriber error:", error);
      }
    }

    return entry;
  }

  /**
   * Gets all log entries
   * @returns Copy of all log entries
   */
  getAll(): ServerLogEntry[] {
    return [...this.entries];
  }

  /**
   * Gets log entries filtered by level
   * @param level Log level to filter by
   * @returns Filtered log entries
   */
  getFiltered(level: ServerLogLevel): ServerLogEntry[] {
    return this.entries.filter((e) => e.level === level);
  }

  /**
   * Gets the most recent log entries
   * @param count Number of entries to return
   * @returns Most recent entries
   */
  getRecent(count: number): ServerLogEntry[] {
    return this.entries.slice(-count);
  }

  /**
   * Subscribes to new log entries
   * @param callback Function called for each new log entry
   * @returns Unsubscribe function
   */
  subscribe(callback: ServerLogSubscriber): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  /**
   * Clears all log entries
   */
  clear(): void {
    this.entries = [];
  }

  /**
   * Gets the current number of entries
   */
  get size(): number {
    return this.entries.length;
  }
}
