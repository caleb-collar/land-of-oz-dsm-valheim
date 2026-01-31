/**
 * Dashboard screen - Main server status and quick actions
 */

import { type FC } from "react";
import { Box, Text, useInput } from "ink";
import { useStore } from "../store.ts";
import { getStatusColor, theme } from "../theme.ts";
import { useServer } from "../hooks/useServer.ts";

/**
 * Formats uptime seconds to readable string
 */
function formatUptime(seconds: number): string {
  if (seconds === 0) return "N/A";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
}

/**
 * Dashboard screen showing server status and quick actions
 */
export const Dashboard: FC = () => {
  const status = useStore((s) => s.server.status);
  const uptime = useStore((s) => s.server.uptime);
  const players = useStore((s) => s.server.players);
  const pid = useStore((s) => s.server.pid);
  const config = useStore((s) => s.config);
  const addLog = useStore((s) => s.actions.addLog);

  const { start, stop } = useServer();

  const statusColor = getStatusColor(status);

  // Handle keyboard shortcuts
  useInput((input) => {
    if (input === "s" || input === "S") {
      if (status === "offline") {
        start();
        addLog("info", "Starting server...");
      }
    }
    if (input === "x" || input === "X") {
      if (status === "online") {
        stop();
        addLog("info", "Stopping server...");
      }
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      {/* Title */}
      <Box marginBottom={1}>
        <Text bold color={theme.primary}>
          ─ Dashboard ─
        </Text>
      </Box>

      {/* Server Status Section */}
      <Box flexDirection="column" marginBottom={1}>
        <Text bold>Server Status</Text>
        <Box marginLeft={2} flexDirection="column">
          <Box>
            <Text>Status:</Text>
            <Text color={statusColor} bold>
              ● {status.toUpperCase()}
            </Text>
          </Box>
          <Box>
            <Text>Server Name:</Text>
            <Text color={theme.primary}>{config.serverName}</Text>
          </Box>
          <Box>
            <Text>World:</Text>
            <Text color={theme.primary}>{config.world}</Text>
          </Box>
          <Box>
            <Text>Port:</Text>
            <Text>{config.port}</Text>
          </Box>
          {pid && (
            <Box>
              <Text>PID:</Text>
              <Text dimColor>{pid}</Text>
            </Box>
          )}
          <Box>
            <Text>Uptime:</Text>
            <Text>{formatUptime(uptime)}</Text>
          </Box>
        </Box>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text bold>Players ({players.length})</Text>
        <Box marginLeft={2} flexDirection="column">
          {players.length === 0 ? <Text dimColor>No players connected</Text> : (
            players.map((player, idx) => (
              <Box key={idx}>
                <Text color={theme.primary}>• {player}</Text>
              </Box>
            ))
          )}
        </Box>
      </Box>

      {/* Quick Actions */}
      <Box flexDirection="column">
        <Text bold>Quick Actions</Text>
        <Box marginLeft={2} marginTop={1}>
          {status === "offline"
            ? (
              <Box>
                <Text color={theme.success}>[S]</Text>
                <Text>Start Server</Text>
              </Box>
            )
            : status === "online"
            ? (
              <Box>
                <Text color={theme.error}>[X]</Text>
                <Text>Stop Server</Text>
              </Box>
            )
            : <Text dimColor>Server is {status}...</Text>}
        </Box>
      </Box>
    </Box>
  );
};
