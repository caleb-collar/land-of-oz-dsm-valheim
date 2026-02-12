/**
 * LogEntry component for displaying a single log line
 */

import { Box, Text } from "ink";
import type { FC } from "react";
import type {
  LogEntry as LogEntryType,
  LogLevel,
  LogSource,
} from "../store.js";
import { logColors, sourceColors } from "../theme.js";

type LogEntryProps = {
  entry: LogEntryType;
  /** Whether to show the source prefix (default: true) */
  showSource?: boolean;
};

/**
 * Formats a date to time string
 */
function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/**
 * Gets the display color for a log level
 */
function getLevelColor(level: LogLevel): string {
  return logColors[level] || "white";
}

/**
 * Gets the display color for a log source
 */
function getSourceColor(source: LogSource): string {
  return sourceColors[source] || "gray";
}

/**
 * Gets the abbreviated source label
 */
function getSourceLabel(source: LogSource): string {
  switch (source) {
    case "server":
      return "SRV";
    case "bepinex":
      return "BEP";
    case "app":
      return "APP";
    default:
      return "???";
  }
}

/**
 * Single log entry with timestamp, source, level, and message
 * Truncates long messages to prevent layout issues
 */
export const LogEntry: FC<LogEntryProps> = (props: LogEntryProps) => {
  const { entry, showSource = true } = props;
  const levelColor = getLevelColor(entry.level);
  const sourceColor = getSourceColor(entry.source);

  return (
    <Box flexShrink={0}>
      <Text dimColor wrap="truncate">
        [{formatTime(entry.timestamp)}]
      </Text>
      {showSource && (
        <Text color={sourceColor} wrap="truncate">
          [{getSourceLabel(entry.source)}]
        </Text>
      )}
      <Text color={levelColor} wrap="truncate">
        [{entry.level.toUpperCase().padEnd(5)}]
      </Text>
      <Text wrap="truncate-end">{entry.message}</Text>
    </Box>
  );
};
