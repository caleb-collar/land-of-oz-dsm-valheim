/**
 * Console screen - Log viewer
 */

import { Box, Text, useInput } from "ink";
import { type FC, useState } from "react";
import { LogEntry } from "../components/LogEntry.js";
import { type LogLevel, selectFilteredLogs, useStore } from "../store.js";
import { logColors, theme } from "../theme.js";

/** Available log filters */
const LOG_FILTERS: (LogLevel | null)[] = [
  null,
  "info",
  "warn",
  "error",
  "debug",
];

/**
 * Console screen for viewing logs
 */
export const Console: FC = () => {
  const entries = useStore(selectFilteredLogs);
  const filter = useStore((s) => s.logs.filter);
  const setLogFilter = useStore((s) => s.actions.setLogFilter);
  const clearLogs = useStore((s) => s.actions.clearLogs);
  const [scrollOffset, setScrollOffset] = useState(0);

  const visibleCount = 15;
  const maxScroll = Math.max(0, entries.length - visibleCount);
  const visibleEntries = entries.slice(
    scrollOffset,
    scrollOffset + visibleCount
  );

  // Handle input
  useInput((input, key) => {
    // Scroll with arrow keys
    if (key.upArrow || input === "k") {
      setScrollOffset((prev: number) => Math.max(0, prev - 1));
    }
    if (key.downArrow || input === "j") {
      setScrollOffset((prev: number) => Math.min(maxScroll, prev + 1));
    }

    // Page up/down
    if (key.pageUp) {
      setScrollOffset((prev: number) => Math.max(0, prev - visibleCount));
    }
    if (key.pageDown) {
      setScrollOffset((prev: number) =>
        Math.min(maxScroll, prev + visibleCount)
      );
    }

    // Filter shortcuts
    if (input === "f") {
      const currentIndex = LOG_FILTERS.indexOf(filter);
      const nextIndex = (currentIndex + 1) % LOG_FILTERS.length;
      setLogFilter(LOG_FILTERS[nextIndex]);
      setScrollOffset(0);
    }

    // Clear logs
    if (input === "c" || input === "C") {
      clearLogs();
      setScrollOffset(0);
    }

    // Go to bottom
    if (input === "g" && key.shift) {
      setScrollOffset(maxScroll);
    }
    if (input === "g" && !key.shift) {
      setScrollOffset(0);
    }
  });

  return (
    <Box flexDirection="column" flexGrow={1} padding={1} overflow="hidden">
      {/* Title and controls */}
      <Box justifyContent="space-between" marginBottom={1}>
        <Text bold color={theme.primary}>
          ─ Console ─
        </Text>
        <Box>
          <Text dimColor>[F] Filter</Text>
          <Text color={filter ? logColors[filter] : theme.muted}>
            {filter?.toUpperCase() ?? "ALL"}
          </Text>
          <Text dimColor>| [C] Clear | ↑↓ Scroll</Text>
        </Box>
      </Box>

      {/* Log entries */}
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor={theme.muted}
        height={visibleCount + 2}
        paddingX={1}
        overflow="hidden"
      >
        {visibleEntries.length === 0 ? (
          <Text dimColor>
            No log entries{filter ? ` matching "${filter}"` : ""}
          </Text>
        ) : (
          visibleEntries.map((entry) => (
            <LogEntry key={entry.id} entry={entry} />
          ))
        )}
      </Box>

      {/* Scroll indicator */}
      <Box justifyContent="space-between" marginTop={1}>
        <Text dimColor>
          Showing {visibleEntries.length} of {entries.length} entries
        </Text>
        {entries.length > visibleCount && (
          <Text dimColor>
            Scroll: {scrollOffset + 1}-
            {Math.min(scrollOffset + visibleCount, entries.length)} /{" "}
            {entries.length}
          </Text>
        )}
      </Box>
    </Box>
  );
};
