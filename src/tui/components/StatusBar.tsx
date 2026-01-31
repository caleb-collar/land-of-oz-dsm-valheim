/**
 * StatusBar component showing server status indicator
 */

import { Box, Text } from "ink";
import type { FC } from "react";
import { useStore } from "../store.js";
import { getStatusColor, theme } from "../theme.js";

/**
 * Compact status bar for server status
 */
export const StatusBar: FC = () => {
  const status = useStore((s) => s.server.status);
  const world = useStore((s) => s.server.world);
  const players = useStore((s) => s.server.players);

  const statusColor = getStatusColor(status);

  return (
    <Box paddingX={1} justifyContent="space-between">
      <Box>
        <Text>Status:</Text>
        <Text color={statusColor}>●</Text>
        <Text color={statusColor}>{status.toUpperCase()}</Text>
      </Box>
      {world && (
        <Box>
          <Text dimColor>World:</Text>
          <Text color={theme.primary}>{world}</Text>
        </Box>
      )}
      <Box>
        <Text dimColor>Players:</Text>
        <Text color={theme.primary}>{players.length}</Text>
      </Box>
    </Box>
  );
};
