/**
 * Dashboard screen - Main server status and quick actions
 */

import { Box, Text, useInput } from "ink";
import { type FC, useEffect, useState } from "react";
import {
  getSteamPaths,
  installSteamCmd,
  isSteamCmdInstalled,
} from "../../steamcmd/mod.js";
import {
  isStartupTaskRegistered,
  registerStartupTask,
  unregisterStartupTask,
} from "../../utils/mod.js";
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

/**
 * Formats bytes to human-readable size
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
}

/**
 * Formats timestamp to relative time
 */
function formatLastSave(timestamp: Date | null): string {
  if (!timestamp) return "Never";
  const seconds = Math.floor((Date.now() - timestamp.getTime()) / 1000);
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
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
  const version = useStore((s) => s.server.version);
  const updateAvailable = useStore((s) => s.server.updateAvailable);
  const lastSave = useStore((s) => s.server.lastSave);
  const memoryUsage = useStore((s) => s.server.memoryUsage);
  const config = useStore((s) => s.config);
  const modalOpen = useStore((s) => s.ui.modalOpen);
  const openModal = useStore((s) => s.actions.openModal);
  const closeModal = useStore((s) => s.actions.closeModal);
  const addLog = useStore((s) => s.actions.addLog);

  // SteamCMD state
  const steamCmdInstalled = useStore((s) => s.steamcmd.installed);
  const steamCmdInstalling = useStore((s) => s.steamcmd.installing);
  const steamCmdProgress = useStore((s) => s.steamcmd.installProgress);
  const steamCmdPercent = useStore((s) => s.steamcmd.installPercent);
  const steamCmdPath = useStore((s) => s.steamcmd.path);
  const setSteamCmdInstalled = useStore((s) => s.actions.setSteamCmdInstalled);
  const setSteamCmdInstalling = useStore(
    (s) => s.actions.setSteamCmdInstalling
  );
  const setSteamCmdInstallProgress = useStore(
    (s) => s.actions.setSteamCmdInstallProgress
  );
  const setSteamCmdPath = useStore((s) => s.actions.setSteamCmdPath);
  const resetSteamCmdInstall = useStore((s) => s.actions.resetSteamCmdInstall);

  const { start, stop, restart, update, forceSave } = useServer();

  const [isUpdating, setIsUpdating] = useState(false);
  const [updateProgress, setUpdateProgress] = useState("");
  const [startupTaskRegistered, setStartupTaskRegistered] = useState<
    boolean | null
  >(null);
  const [startupTaskProcessing, setStartupTaskProcessing] = useState(false);

  const statusColor = getStatusColor(status);

  // Check SteamCMD installation status on mount
  useEffect(() => {
    const checkSteamCmd = async () => {
      try {
        const installed = await isSteamCmdInstalled();
        setSteamCmdInstalled(installed);
        if (installed) {
          const paths = getSteamPaths();
          setSteamCmdPath(paths.steamcmdDir);
        }
      } catch {
        setSteamCmdInstalled(false);
      }
    };
    checkSteamCmd();
  }, [setSteamCmdInstalled, setSteamCmdPath]);

  // Check startup task registration status on mount
  useEffect(() => {
    const checkStartupTask = async () => {
      try {
        const registered = await isStartupTaskRegistered();
        setStartupTaskRegistered(registered);
      } catch {
        setStartupTaskRegistered(false);
      }
    };
    checkStartupTask();
  }, []);

  // Handle SteamCMD installation
  const handleInstallSteamCmd = async () => {
    closeModal();
    setSteamCmdInstalling(true);
    addLog("info", "Starting SteamCMD installation...");

    try {
      await installSteamCmd((progress) => {
        setSteamCmdInstallProgress(progress.message, progress.progress);
        if (progress.stage === "complete") {
          addLog("info", "SteamCMD installed successfully!");
        }
      });
      setSteamCmdInstalled(true);
      const paths = getSteamPaths();
      setSteamCmdPath(paths.steamcmdDir);
    } catch (error) {
      addLog(
        "error",
        `SteamCMD installation failed: ${error instanceof Error ? error.message : String(error)}`
      );
      setSteamCmdInstalled(false);
    } finally {
      resetSteamCmdInstall();
    }
  };

  // Handle confirmed stop
  const handleStopConfirm = () => {
    closeModal();
    stop();
    addLog("info", "Stopping server...");
  };

  // Handle confirmed restart
  const handleRestartConfirm = () => {
    closeModal();
    restart();
    addLog("info", "Restarting server...");
  };

  // Handle confirmed kill
  const handleKillConfirm = async () => {
    closeModal();
    addLog("warn", "Force killing server process...");
    // Force stop by calling stop (process manager should handle SIGKILL)
    stop();
  };

  // Handle update
  const handleUpdate = async () => {
    closeModal();
    setIsUpdating(true);
    addLog("info", "Starting server update...");

    try {
      await update((progress) => {
        setUpdateProgress(progress.message);
      });
      addLog("info", "Server update completed!");
    } catch (error) {
      addLog("error", `Update failed: ${error}`);
    } finally {
      setIsUpdating(false);
      setUpdateProgress("");
    }
  };

  // Handle force save
  const handleForceSave = async () => {
    addLog("info", "Triggering world save...");
    await forceSave();
  };

  // Handle startup task toggle
  const handleToggleStartupTask = async () => {
    closeModal();
    setStartupTaskProcessing(true);

    try {
      if (startupTaskRegistered) {
        addLog("info", "Removing startup task...");
        const result = await unregisterStartupTask();
        if (result.success) {
          addLog("info", result.message);
          setStartupTaskRegistered(false);
        } else {
          addLog("error", result.message);
        }
      } else {
        addLog("info", "Registering startup task...");
        const result = await registerStartupTask();
        if (result.success) {
          addLog("info", result.message);
          setStartupTaskRegistered(true);
        } else {
          addLog("error", result.message);
          if (result.requiresAdmin) {
            addLog("warn", "Try running as administrator.");
          }
        }
      }
    } catch (error) {
      addLog(
        "error",
        `Startup task operation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      setStartupTaskProcessing(false);
    }
  };

  // Handle keyboard shortcuts
  useInput((input) => {
    // Don't handle if modal is open or updating or installing steamcmd or processing startup task
    if (modalOpen || isUpdating || steamCmdInstalling || startupTaskProcessing)
      return;

    // S = Start
    if (input === "s" || input === "S") {
      if (status === "offline" && steamCmdInstalled) {
        start();
        addLog("info", "Starting server...");
      }
    }

    // X = Stop
    if (input === "x" || input === "X") {
      if (status === "online") {
        openModal(
          <ConfirmModal
            message="Stop the server? Players will be disconnected."
            onConfirm={handleStopConfirm}
            onCancel={closeModal}
          />
        );
      }
    }

    // R = Restart
    if (input === "r" || input === "R") {
      if (status === "online") {
        openModal(
          <ConfirmModal
            message="Restart the server? Players will be briefly disconnected."
            onConfirm={handleRestartConfirm}
            onCancel={closeModal}
          />
        );
      }
    }

    // U = Update
    if (input === "u" || input === "U") {
      if (status === "offline" && steamCmdInstalled) {
        openModal(
          <ConfirmModal
            message="Update server via SteamCMD? This may take a few minutes."
            onConfirm={handleUpdate}
            onCancel={closeModal}
          />
        );
      }
    }

    // I = Install SteamCMD
    if (input === "i" || input === "I") {
      if (!steamCmdInstalled && !steamCmdInstalling) {
        openModal(
          <ConfirmModal
            message="Install SteamCMD? This is required to download and update Valheim."
            onConfirm={handleInstallSteamCmd}
            onCancel={closeModal}
          />
        );
      }
    }

    // F = Force save
    if (input === "f" || input === "F") {
      if (status === "online") {
        handleForceSave();
      }
    }

    // K = Kill (force stop)
    if (input === "k" || input === "K") {
      if (
        status === "online" ||
        status === "starting" ||
        status === "stopping"
      ) {
        openModal(
          <ConfirmModal
            message="Force kill the server? Data may be lost!"
            onConfirm={handleKillConfirm}
            onCancel={closeModal}
          />
        );
      }
    }

    // A = Auto-start (toggle startup task)
    if (input === "a" || input === "A") {
      if (startupTaskRegistered === null) return;
      const action = startupTaskRegistered ? "Remove" : "Enable";
      openModal(
        <ConfirmModal
          message={`${action} auto-start at login? The server manager will ${startupTaskRegistered ? "no longer" : ""} start automatically when you log in.`}
          onConfirm={handleToggleStartupTask}
          onCancel={closeModal}
        />
      );
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

  // Render updating state
  if (isUpdating) {
    return (
      <Box flexDirection="column" flexGrow={1} padding={1}>
        <Box marginBottom={1}>
          <Text bold color={theme.primary}>
            ─ Dashboard ─
          </Text>
        </Box>
        <Box
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          flexGrow={1}
        >
          <Spinner label="Updating server..." />
          {updateProgress && (
            <Box marginTop={1}>
              <Text dimColor>{updateProgress}</Text>
            </Box>
          )}
          <Box marginTop={1}>
            <Text dimColor>Please wait, this may take several minutes...</Text>
          </Box>
        </Box>
      </Box>
    );
  }

  // Render SteamCMD installing state
  if (steamCmdInstalling) {
    return (
      <Box flexDirection="column" flexGrow={1} padding={1}>
        <Box marginBottom={1}>
          <Text bold color={theme.primary}>
            ─ Dashboard ─
          </Text>
        </Box>
        <Box
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          flexGrow={1}
        >
          <Spinner label="Installing SteamCMD..." />
          {steamCmdProgress && (
            <Box marginTop={1}>
              <Text dimColor>
                {steamCmdProgress}
                {steamCmdPercent > 0 && ` (${steamCmdPercent}%)`}
              </Text>
            </Box>
          )}
          <Box marginTop={1}>
            <Text dimColor>Please wait...</Text>
          </Box>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" flexGrow={1} padding={1}>
      {/* Title */}
      <Box marginBottom={1}>
        <Text bold color={theme.primary}>
          ─ Dashboard ─
        </Text>
      </Box>

      {/* SteamCMD Status Section */}
      <Box flexDirection="column" marginBottom={1}>
        <Text bold>SteamCMD</Text>
        <Box marginLeft={2} flexDirection="column">
          <Box flexShrink={0}>
            <Text>Status: </Text>
            {steamCmdInstalled === null ? (
              <Text dimColor>Checking...</Text>
            ) : steamCmdInstalled ? (
              <Text color={theme.success}>● Installed</Text>
            ) : (
              <Text color={theme.warning}>○ Not Installed</Text>
            )}
          </Box>
          {steamCmdInstalled && steamCmdPath && (
            <Box flexShrink={0}>
              <Text>Location: </Text>
              <Text dimColor>{steamCmdPath}</Text>
            </Box>
          )}
        </Box>
      </Box>

      {/* Server Status Section */}
      <Box flexDirection="column" marginBottom={1}>
        <Text bold>Server Status</Text>
        <Box marginLeft={2} flexDirection="column">
          <Box flexShrink={0}>
            <Text>Status: </Text>
            {renderStatusWithLoading()}
          </Box>
          <Box flexShrink={0}>
            <Text>Server Name: </Text>
            <Text color={theme.primary}>{config.serverName}</Text>
          </Box>
          <Box flexShrink={0}>
            <Text>World: </Text>
            <Text color={theme.primary}>{config.world}</Text>
          </Box>
          <Box flexShrink={0}>
            <Text>Port: </Text>
            <Text>{config.port}</Text>
          </Box>
          {version && (
            <Box flexShrink={0}>
              <Text>Version: </Text>
              <Text>{version}</Text>
              {updateAvailable && (
                <Text color={theme.warning}> (Update available!)</Text>
              )}
            </Box>
          )}
          {pid && (
            <Box flexShrink={0}>
              <Text>PID: </Text>
              <Text dimColor>{pid}</Text>
            </Box>
          )}
          <Box flexShrink={0}>
            <Text>Uptime: </Text>
            <Text>{formatUptime(uptime)}</Text>
          </Box>
          <Box flexShrink={0}>
            <Text>Last Save: </Text>
            <Text>{formatLastSave(lastSave)}</Text>
          </Box>
          {memoryUsage !== null && memoryUsage > 0 && (
            <Box flexShrink={0}>
              <Text>Memory: </Text>
              <Text>{formatBytes(memoryUsage)}</Text>
            </Box>
          )}
        </Box>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text bold>Players ({players.length})</Text>
        <Box marginLeft={2} flexDirection="column">
          {players.length === 0 ? (
            <Text dimColor>No players connected</Text>
          ) : (
            players.map((player) => (
              <Box key={player} flexShrink={0}>
                <Text color={theme.primary}>• {player}</Text>
              </Box>
            ))
          )}
        </Box>
      </Box>

      {/* Auto-start Status */}
      <Box flexDirection="column" marginBottom={1}>
        <Text bold>Auto-start</Text>
        <Box marginLeft={2} flexShrink={0}>
          <Text>Status: </Text>
          {startupTaskRegistered === null ? (
            <Text dimColor>Checking...</Text>
          ) : startupTaskRegistered ? (
            <Text color={theme.success}>● Enabled</Text>
          ) : (
            <Text dimColor>○ Disabled</Text>
          )}
        </Box>
      </Box>

      {/* Quick Actions */}
      <Box flexDirection="column">
        <Text bold>Quick Actions</Text>
        <Box marginLeft={2} marginTop={1} flexDirection="column">
          {/* SteamCMD Install Option */}
          {steamCmdInstalled === false && (
            <Box marginBottom={1} flexShrink={0}>
              <Box flexShrink={0}>
                <Text color={theme.info}>[I] </Text>
                <Text>Install SteamCMD</Text>
                <Text color={theme.warning}> (required)</Text>
              </Box>
            </Box>
          )}

          {/* Server Actions - only available when SteamCMD is installed */}
          {steamCmdInstalled ? (
            status === "offline" ? (
              <Box flexDirection="column">
                <Box flexShrink={0}>
                  <Text color={theme.success}>[S] </Text>
                  <Text>Start Server</Text>
                </Box>
                <Box flexShrink={0}>
                  <Text color={theme.info}>[U] </Text>
                  <Text>Update Server</Text>
                  {updateAvailable && <Text color={theme.warning}> ★</Text>}
                </Box>
              </Box>
            ) : status === "online" ? (
              <Box flexDirection="column">
                <Box flexShrink={0}>
                  <Text color={theme.error}>[X] </Text>
                  <Text>Stop Server</Text>
                </Box>
                <Box flexShrink={0}>
                  <Text color={theme.warning}>[R] </Text>
                  <Text>Restart Server</Text>
                </Box>
                <Box flexShrink={0}>
                  <Text color={theme.info}>[F] </Text>
                  <Text>Force Save</Text>
                </Box>
                <Box flexShrink={0}>
                  <Text color={theme.error}>[K] </Text>
                  <Text>Kill Process</Text>
                </Box>
              </Box>
            ) : (
              <Box flexDirection="column">
                <Spinner label={`Server is ${status}...`} />
                <Box marginTop={1} flexShrink={0}>
                  <Text color={theme.error}>[K] </Text>
                  <Text dimColor>Force Kill (if stuck)</Text>
                </Box>
              </Box>
            )
          ) : steamCmdInstalled === null ? (
            <Text dimColor>Checking SteamCMD status...</Text>
          ) : (
            <Text dimColor>Install SteamCMD to manage server</Text>
          )}

          {/* Auto-start toggle - always available */}
          <Box marginTop={1} flexShrink={0}>
            {startupTaskProcessing ? (
              <Spinner label="Updating auto-start..." />
            ) : startupTaskRegistered === null ? (
              <Text dimColor>Checking auto-start status...</Text>
            ) : (
              <Box flexShrink={0}>
                <Text
                  color={startupTaskRegistered ? theme.warning : theme.success}
                >
                  [A]{" "}
                </Text>
                <Text>
                  {startupTaskRegistered ? "Disable" : "Enable"} Auto-start
                </Text>
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
