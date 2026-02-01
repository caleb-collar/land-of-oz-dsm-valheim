/**
 * Dashboard screen - Main server status and quick actions
 */

import { Box, Text, useInput } from "ink";
import type { FC } from "react";
import { ConfirmModal } from "../components/Modal.js";
import { Spinner } from "../components/Spinner.js";
import { useServer } from "../hooks/useServer.js";
import { useStore } from "../store.js";
import { getStatusColor, theme } from "../theme.js";

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

/** Props for Dashboard screen */
type DashboardProps = Record<string, never>;

/**
 * Dashboard screen showing server status and quick actions
 */
export const Dashboard: FC<DashboardProps> = () => {
  const status = useStore((s) => s.server.status);
  const uptime = useStore((s) => s.server.uptime);
  const players = useStore((s) => s.server.players);
  const pid = useStore((s) => s.server.pid);
  const config = useStore((s) => s.config);
  const modalOpen = useStore((s) => s.ui.modalOpen);
  const openModal = useStore((s) => s.actions.openModal);
  const closeModal = useStore((s) => s.actions.closeModal);
  const addLog = useStore((s) => s.actions.addLog);

  const { start, stop } = useServer();

  const statusColor = getStatusColor(status);

  // Handle confirmed stop
  const handleStopConfirm = () => {
    closeModal();
    stop();
    addLog("info", "Stopping server...");
  };

  // Handle keyboard shortcuts
  useInput((input) => {
    // Don't handle if modal is open
    if (modalOpen) return;

    if (input === "s" || input === "S") {
      if (status === "offline") {
        start();
        addLog("info", "Starting server...");
      }
    }
    if (input === "x" || input === "X") {
      if (status === "online") {
        // Show confirmation dialog
        openModal(
          <ConfirmModal
            message="Stop the server? Players will be disconnected."
            onConfirm={handleStopConfirm}
            onCancel={closeModal}
          />
        );
      }
    }
  });

  // Render loading state for starting/stopping
  const renderStatusWithLoading = () => {
    if (status === "starting" || status === "stopping") {
      return (
        <Box>
          <Spinner />
          <Text color={statusColor} bold>
            {" "}
            {status.toUpperCase()}
          </Text>
        </Box>
      );
    }
    return (
      <Text color={statusColor} bold>
        ● {status.toUpperCase()}
      </Text>
    );
  };

  return (
    <Box flexDirection="column" flexGrow={1} padding={1}>
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
            <Text>Status: </Text>
            {renderStatusWithLoading()}
          </Box>
          <Box>
            <Text>Server Name: </Text>
            <Text color={theme.primary}>{config.serverName}</Text>
          </Box>
          <Box>
            <Text>World: </Text>
            <Text color={theme.primary}>{config.world}</Text>
          </Box>
          <Box>
            <Text>Port: </Text>
            <Text>{config.port}</Text>
          </Box>
          {pid && (
            <Box>
              <Text>PID: </Text>
              <Text dimColor>{pid}</Text>
            </Box>
          )}
          <Box>
            <Text>Uptime: </Text>
            <Text>{formatUptime(uptime)}</Text>
          </Box>
        </Box>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text bold>Players ({players.length})</Text>
        <Box marginLeft={2} flexDirection="column">
          {players.length === 0 ? (
            <Text dimColor>No players connected</Text>
          ) : (
            players.map((player) => (
              <Box key={player}>
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
          {status === "offline" ? (
            <Box>
              <Text color={theme.success}>[S] </Text>
              <Text>Start Server</Text>
            </Box>
          ) : status === "online" ? (
            <Box>
              <Text color={theme.error}>[X] </Text>
              <Text>Stop Server</Text>
            </Box>
          ) : (
            <Box>
              <Spinner label={`Server is ${status}...`} />
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};
