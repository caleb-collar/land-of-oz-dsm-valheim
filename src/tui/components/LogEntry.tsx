/**
 * LogEntry component for displaying a single log line
 */

import { type FC } from "react";
import { Box, Text } from "ink";
import { logColors } from "../theme.ts";
import type { LogEntry as LogEntryType, LogLevel } from "../store.ts";

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
 */
export const LogEntry: FC<LogEntryProps> = (props: LogEntryProps) => {
  const { entry } = props;
  const levelColor = getLevelColor(entry.level);

  return (
    <Box>
      <Text dimColor>[{formatTime(entry.timestamp)}]</Text>
      <Text color={levelColor}>[{entry.level.toUpperCase().padEnd(5)}]</Text>
      <Text>{entry.message}</Text>
    </Box>
  );
};
