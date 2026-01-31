/**
 * Structured logging utility
 * Provides consistent logging with levels and formatting
 */

/** Log level definitions */
export type LogLevel = "debug" | "info" | "warn" | "error";

/** Log entry structure */
export type LogEntry = {
  timestamp: Date;
  level: LogLevel;
  message: string;
  data?: Record<string, unknown>;
  source?: string;
};

/** Log level priority for filtering */
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/** ANSI color codes for log levels */
const LOG_LEVEL_COLORS: Record<LogLevel, string> = {
  debug: "\x1b[90m", // Gray
  info: "\x1b[36m", // Cyan
  warn: "\x1b[33m", // Yellow
  error: "\x1b[31m", // Red
};

const RESET = "\x1b[0m";

/** Logger configuration */
export type LoggerConfig = {
  minLevel: LogLevel;
  enableColors: boolean;
  enableTimestamp: boolean;
  source?: string;
};

const defaultConfig: LoggerConfig = {
  minLevel: "info",
  enableColors: true,
  enableTimestamp: true,
};

let globalConfig: LoggerConfig = { ...defaultConfig };

/**
 * Configures the global logger settings
 * @param config Partial configuration to merge with defaults
 */
export function configureLogger(config: Partial<LoggerConfig>): void {
  globalConfig = { ...globalConfig, ...config };
}

/**
 * Formats a log entry for console output
 */
function formatLogEntry(entry: LogEntry, config: LoggerConfig): string {
  const parts: string[] = [];

  // Timestamp
  if (config.enableTimestamp) {
    const time = entry.timestamp.toISOString().slice(11, 19);
    parts.push(`[${time}]`);
  }

  // Level
  const levelStr = entry.level.toUpperCase().padEnd(5);
  if (config.enableColors) {
    parts.push(`${LOG_LEVEL_COLORS[entry.level]}${levelStr}${RESET}`);
  } else {
    parts.push(levelStr);
  }

  // Source
  if (entry.source) {
    parts.push(`[${entry.source}]`);
  }

  // Message
  parts.push(entry.message);

  // Data
  if (entry.data && Object.keys(entry.data).length > 0) {
    parts.push(JSON.stringify(entry.data));
  }

  return parts.join(" ");
}

/**
 * Creates a log entry and outputs it if level is sufficient
 */
function log(
  level: LogLevel,
  message: string,
  data?: Record<string, unknown>,
  source?: string
): LogEntry {
  const entry: LogEntry = {
    timestamp: new Date(),
    level,
    message,
    data,
    source: source ?? globalConfig.source,
  };

  // Check if we should output this log
  if (LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[globalConfig.minLevel]) {
    const formatted = formatLogEntry(entry, globalConfig);

    if (level === "error") {
      console.error(formatted);
    } else if (level === "warn") {
      console.warn(formatted);
    } else {
      console.log(formatted);
    }
  }

  return entry;
}

/**
 * Logs a debug message
 */
export function debug(
  message: string,
  data?: Record<string, unknown>
): LogEntry {
  return log("debug", message, data);
}

/**
 * Logs an info message
 */
export function info(
  message: string,
  data?: Record<string, unknown>
): LogEntry {
  return log("info", message, data);
}

/**
 * Logs a warning message
 */
export function warn(
  message: string,
  data?: Record<string, unknown>
): LogEntry {
  return log("warn", message, data);
}

/**
 * Logs an error message
 */
export function error(
  message: string,
  data?: Record<string, unknown>
): LogEntry {
  return log("error", message, data);
}

/**
 * Creates a child logger with a specific source name
 * @param source The source identifier for this logger
 * @returns An object with log methods bound to the source
 */
export function createLogger(source: string) {
  return {
    debug: (message: string, data?: Record<string, unknown>) =>
      log("debug", message, data, source),
    info: (message: string, data?: Record<string, unknown>) =>
      log("info", message, data, source),
    warn: (message: string, data?: Record<string, unknown>) =>
      log("warn", message, data, source),
    error: (message: string, data?: Record<string, unknown>) =>
      log("error", message, data, source),
  };
}

/**
 * Parses a Valheim server log line and extracts structured info
 * @param line Raw log line from Valheim server
 * @returns Parsed log entry with appropriate level
 */
export function parseValheimLog(line: string): LogEntry {
  const timestamp = new Date();
  let level: LogLevel = "info";
  const message = line.trim();

  // Detect log level from content
  if (message.includes("Error") || message.includes("Exception")) {
    level = "error";
  } else if (message.includes("Warning") || message.includes("Warn")) {
    level = "warn";
  } else if (message.includes("Debug")) {
    level = "debug";
  }

  // Extract player events
  const data: Record<string, unknown> = {};

  const playerConnectMatch = message.match(
    /Got character ZDOID from (.+) : (\d+:\d+)/
  );
  if (playerConnectMatch) {
    data.event = "player_connect";
    data.player = playerConnectMatch[1];
    data.zdoid = playerConnectMatch[2];
  }

  const playerDisconnectMatch = message.match(/Closing socket (\d+)/);
  if (playerDisconnectMatch) {
    data.event = "player_disconnect";
    data.socket = playerDisconnectMatch[1];
  }

  const worldSaveMatch = message.match(/World saved/i);
  if (worldSaveMatch) {
    data.event = "world_save";
  }

  return {
    timestamp,
    level,
    message,
    data: Object.keys(data).length > 0 ? data : undefined,
    source: "valheim",
  };
}
