/**
 * LogEntry component for displaying a single log line
 */

import { Box, Text } from "ink";
import type { FC } from "react";
import type { LogEntry as LogEntryType, LogLevel } from "../store.js";
import { logColors } from "../theme.js";

type LogEntryProps = {
  entry: LogEntryType;
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
 * Single log entry with timestamp, level, and message
 * Truncates long messages to prevent layout issues
 */
export const LogEntry: FC<LogEntryProps> = (props: LogEntryProps) => {
  const { entry } = props;
  const levelColor = getLevelColor(entry.level);

  return (
    <Box flexShrink={0}>
      <Text dimColor wrap="truncate">
        [{formatTime(entry.timestamp)}]
      </Text>
      <Text color={levelColor} wrap="truncate">
        [{entry.level.toUpperCase().padEnd(5)}]
      </Text>
      <Text wrap="truncate-end">{entry.message}</Text>
    </Box>
  );
};
