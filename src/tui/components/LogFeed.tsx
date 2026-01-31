/**
 * LogFeed component for displaying scrollable log entries
 */

import { type FC } from "react";
import { Box, Text } from "ink";
import { selectFilteredLogs, useStore } from "../store.ts";
import { LogEntry } from "./LogEntry.tsx";
import { theme } from "../theme.ts";

/** Number of log entries to display */
const VISIBLE_ENTRIES = 8;

/**
 * Log feed displaying recent log entries
 */
export const LogFeed: FC = () => {
  const entries = useStore(selectFilteredLogs);
  const filter = useStore((s) => s.logs.filter);

  // Get the last N visible entries
  const visible = entries.slice(-VISIBLE_ENTRIES);

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor={theme.muted}
      height={VISIBLE_ENTRIES + 2}
      paddingX={1}
    >
      <Box justifyContent="space-between">
        <Text bold dimColor>
          ─ Log Feed ─
        </Text>
        {filter && (
          <Text dimColor>
            Filter: <Text color={theme.primary}>{filter}</Text>
          </Text>
        )}
      </Box>
      <Box flexDirection="column" marginTop={0}>
        {visible.length === 0 ? <Text dimColor>No log entries yet...</Text> : (
          visible.map((entry) => <LogEntry key={entry.id} entry={entry} />)
        )}
      </Box>
    </Box>
  );
};
