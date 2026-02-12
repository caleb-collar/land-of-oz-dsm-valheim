/**
 * Dashboard screen - Main server status and quick actions
 */

import { Box, Text, useInput } from "ink";
import { type FC, useEffect, useState } from "react";
import type { StartupPhase } from "../../server/logs.js";
import {
  getInstalledVersion,
  getSteamPaths,
  installSteamCmd,
  installValheim,
  isSteamCmdInstalled,
  isValheimInstalled,
  verifyValheimInstallation,
} from "../../steamcmd/mod.js";
import {
  isStartupTaskRegistered,
  registerStartupTask,
  unregisterStartupTask,
} from "../../utils/mod.js";
import { AdminManager } from "../components/AdminManager.js";
import { EventManager } from "../components/EventManager.js";
import { GlobalKeysManager } from "../components/GlobalKeysManager.js";
import { ConfirmModal } from "../components/Modal.js";
import { PlayerManager } from "../components/PlayerManager.js";
import { ServerInfoModal } from "../components/ServerInfoModal.js";
import { Spinner } from "../components/Spinner.js";
import { TimeControl } from "../components/TimeControl.js";
import { useRconAvailable } from "../hooks/useRconAvailable.js";
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

/**
 * Gets a human-readable description for startup phases
 */
function getPhaseDescription(phase: StartupPhase): string {
  switch (phase) {
    case "idle":
      return "";
    case "initializing":
      return "Initializing...";
    case "loading_world":
      return "Loading world data...";
    case "generating_world":
      return "Generating new world...";
    case "creating_locations":
      return "Creating locations (may take ~1 min)...";
    case "starting_server":
      return "Starting server systems...";
    case "registering_lobby":
      return "Registering lobby...";
    case "ready":
      return "Ready to join!";
    default:
      return "";
  }
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
  const startupPhase = useStore((s) => s.server.startupPhase);
  const config = useStore((s) => s.config);
  const rconConfig = useStore((s) => s.rcon);
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

  // Valheim server state
  const valheimInstalled = useStore((s) => s.valheim.installed);
  const valheimInstalling = useStore((s) => s.valheim.installing);
  const valheimProgress = useStore((s) => s.valheim.installProgress);
  const valheimPercent = useStore((s) => s.valheim.installPercent);
  const valheimPath = useStore((s) => s.valheim.path);
  const valheimVerified = useStore((s) => s.valheim.verified);
  const valheimBuildId = useStore((s) => s.valheim.buildId);
  const setValheimInstalled = useStore((s) => s.actions.setValheimInstalled);
  const setValheimInstalling = useStore((s) => s.actions.setValheimInstalling);
  const setValheimInstallProgress = useStore(
    (s) => s.actions.setValheimInstallProgress
  );
  const setValheimPath = useStore((s) => s.actions.setValheimPath);
  const setValheimVerified = useStore((s) => s.actions.setValheimVerified);
  const setValheimBuildId = useStore((s) => s.actions.setValheimBuildId);
  const resetValheimInstall = useStore((s) => s.actions.resetValheimInstall);

  const { start, stop, restart, update, forceSave } = useServer();
  const {
    available: rconAvailable,
    connected: rconPluginConnected,
    hasCommands: rconHasCommands,
    reason: rconReason,
  } = useRconAvailable();

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

  // Check Valheim installation status when SteamCMD is installed
  useEffect(() => {
    if (steamCmdInstalled !== true) return;

    const checkValheim = async () => {
      try {
        const installed = await isValheimInstalled();
        setValheimInstalled(installed);

        if (installed) {
          const paths = getSteamPaths();
          setValheimPath(paths.valheimDir);

          // Verify installation
          const verification = await verifyValheimInstallation();
          setValheimVerified(verification.valid);

          if (!verification.valid) {
            addLog("warn", verification.message);
          }

          // Get build ID
          const buildId = await getInstalledVersion();
          setValheimBuildId(buildId);
        }
      } catch {
        setValheimInstalled(false);
        setValheimVerified(false);
      }
    };
    checkValheim();
  }, [
    steamCmdInstalled,
    setValheimInstalled,
    setValheimPath,
    setValheimVerified,
    setValheimBuildId,
    addLog,
  ]);

  // Auto-install Valheim when SteamCMD becomes installed and Valheim is not installed
  useEffect(() => {
    if (
      steamCmdInstalled === true &&
      valheimInstalled === false &&
      !valheimInstalling
    ) {
      // Auto-trigger Valheim installation inline
      const autoInstallValheim = async () => {
        setValheimInstalling(true);
        addLog("info", "Auto-installing Valheim Dedicated Server...");

        try {
          await installValheim((status) => {
            setValheimInstallProgress(status.message, status.progress);
            if (status.stage === "complete") {
              addLog(
                "info",
                "Valheim Dedicated Server installed successfully!"
              );
            }
          });

          setValheimInstalled(true);
          const paths = getSteamPaths();
          setValheimPath(paths.valheimDir);

          // Verify installation
          const verification = await verifyValheimInstallation();
          setValheimVerified(verification.valid);

          if (verification.valid) {
            addLog(
              "info",
              `Installation verified at: ${verification.installPath}`
            );
          } else {
            addLog("warn", verification.message);
          }

          // Get build ID
          const buildId = await getInstalledVersion();
          setValheimBuildId(buildId);
          if (buildId) {
            addLog("info", `Valheim build ID: ${buildId}`);
          }
        } catch (error) {
          addLog(
            "error",
            `Valheim installation failed: ${error instanceof Error ? error.message : String(error)}`
          );
          setValheimInstalled(false);
          setValheimVerified(false);
        } finally {
          resetValheimInstall();
        }
      };

      autoInstallValheim();
    }
  }, [
    steamCmdInstalled,
    valheimInstalled,
    valheimInstalling,
    setValheimInstalling,
    setValheimInstallProgress,
    setValheimInstalled,
    setValheimPath,
    setValheimVerified,
    setValheimBuildId,
    resetValheimInstall,
    addLog,
  ]);

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

  // Handle Valheim installation
  const handleInstallValheim = async () => {
    closeModal();
    setValheimInstalling(true);
    addLog("info", "Starting Valheim Dedicated Server installation...");

    try {
      await installValheim((status) => {
        setValheimInstallProgress(status.message, status.progress);
        if (status.stage === "complete") {
          addLog("info", "Valheim Dedicated Server installed successfully!");
        }
      });

      setValheimInstalled(true);
      const paths = getSteamPaths();
      setValheimPath(paths.valheimDir);

      // Verify installation
      const verification = await verifyValheimInstallation();
      setValheimVerified(verification.valid);

      if (verification.valid) {
        addLog("info", `Installation verified at: ${verification.installPath}`);
      } else {
        addLog("warn", verification.message);
      }

      // Get build ID
      const buildId = await getInstalledVersion();
      setValheimBuildId(buildId);
      if (buildId) {
        addLog("info", `Valheim build ID: ${buildId}`);
      }
    } catch (error) {
      addLog(
        "error",
        `Valheim installation failed: ${error instanceof Error ? error.message : String(error)}`
      );
      setValheimInstalled(false);
      setValheimVerified(false);
    } finally {
      resetValheimInstall();
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
    // Don't handle if modal is open or updating or installing or processing startup task
    if (
      modalOpen ||
      isUpdating ||
      steamCmdInstalling ||
      valheimInstalling ||
      startupTaskProcessing
    )
      return;

    // S = Start
    if (input === "s" || input === "S") {
      if (status === "offline" && steamCmdInstalled && valheimInstalled) {
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
      if (status === "offline" && steamCmdInstalled && valheimInstalled) {
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

    // V = Install/Reinstall Valheim
    if (input === "v" || input === "V") {
      if (steamCmdInstalled && !valheimInstalling) {
        const action =
          valheimInstalled === false ? "Install" : "Reinstall/Verify";
        openModal(
          <ConfirmModal
            message={`${action} Valheim Dedicated Server? This may take several minutes.`}
            onConfirm={handleInstallValheim}
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

    // RCON Features (require RCON plugin connection + DevCommands)
    if (rconPluginConnected && rconHasCommands && status === "online") {
      // P = Player Management
      if (input === "p" || input === "P") {
        openModal(<PlayerManager onClose={closeModal} />);
      }

      // N = Server Info
      if (input === "n" || input === "N") {
        openModal(<ServerInfoModal onClose={closeModal} />);
      }

      // E = Event Manager
      if (input === "e" || input === "E") {
        openModal(<EventManager onClose={closeModal} />);
      }

      // T = Time Control
      if (input === "t" || input === "T") {
        openModal(<TimeControl onClose={closeModal} />);
      }

      // G = Global Keys
      if (input === "g" || input === "G") {
        openModal(<GlobalKeysManager onClose={closeModal} />);
      }

      // D = Remove Drops
      if (input === "d" || input === "D") {
        openModal(
          <ConfirmModal
            message="Remove all dropped items from the world? This cannot be undone."
            onConfirm={async () => {
              closeModal();
              const { rconManager } = await import("../../rcon/mod.js");
              const response = await rconManager.removeDrops();
              addLog("info", `Remove drops: ${response || "Done"}`);
            }}
            onCancel={closeModal}
          />
        );
      }
    }

    // M = Admin Manager (always available, works with file-based operations)
    if (input === "m" || input === "M") {
      openModal(<AdminManager onClose={closeModal} />);
    }
  });

  // Render loading state for starting/stopping
  const renderStatusWithLoading = () => {
    if (status === "starting") {
      const phaseDesc = getPhaseDescription(startupPhase);
      return (
        <Box flexDirection="column">
          <Box>
            <Spinner />
            <Text color={statusColor} bold>
              {" "}
              STARTING
            </Text>
          </Box>
          {phaseDesc && (
            <Box marginLeft={2}>
              <Text dimColor>{phaseDesc}</Text>
            </Box>
          )}
        </Box>
      );
    }
    if (status === "stopping") {
      return (
        <Box>
          <Spinner />
          <Text color={statusColor} bold>
            {" "}
            STOPPING
          </Text>
        </Box>
      );
    }
    // When online, show "ONLINE" with ready status
    if (status === "online" && startupPhase === "ready") {
      return (
        <Text color={statusColor} bold>
          ● ONLINE (Ready to join)
        </Text>
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

  // Render Valheim installing state
  if (valheimInstalling) {
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
          <Spinner label="Installing Valheim Dedicated Server..." />
          {valheimProgress && (
            <Box marginTop={1}>
              <Text dimColor>
                {valheimProgress}
                {valheimPercent > 0 && ` (${valheimPercent}%)`}
              </Text>
            </Box>
          )}
          <Box marginTop={1}>
            <Text dimColor>Please wait, this may take several minutes...</Text>
          </Box>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" flexGrow={1} padding={1} overflow="hidden">
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
              <Text dimColor wrap="truncate-end">
                {steamCmdPath}
              </Text>
            </Box>
          )}
        </Box>
      </Box>

      {/* Valheim Dedicated Server Status Section */}
      <Box flexDirection="column" marginBottom={1}>
        <Text bold>Valheim Dedicated Server</Text>
        <Box marginLeft={2} flexDirection="column">
          <Box flexShrink={0}>
            <Text>Status: </Text>
            {steamCmdInstalled !== true ? (
              <Text dimColor>Waiting for SteamCMD...</Text>
            ) : valheimInstalled === null ? (
              <Text dimColor>Checking...</Text>
            ) : valheimInstalled ? (
              <Text color={theme.success}>● Installed</Text>
            ) : (
              <Text color={theme.warning}>○ Not Installed</Text>
            )}
          </Box>
          {valheimInstalled && valheimVerified !== null && (
            <Box flexShrink={0}>
              <Text>Verified: </Text>
              {valheimVerified ? (
                <Text color={theme.success}>● Yes</Text>
              ) : (
                <Text color={theme.error}>○ Files Missing</Text>
              )}
            </Box>
          )}
          {valheimInstalled && valheimBuildId && (
            <Box flexShrink={0}>
              <Text>Build ID: </Text>
              <Text dimColor>{valheimBuildId}</Text>
            </Box>
          )}
          {valheimInstalled && valheimPath && (
            <Box flexShrink={0}>
              <Text>Location: </Text>
              <Text dimColor wrap="truncate-end">
                {valheimPath}
              </Text>
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

      {/* RCON Status Section */}
      <Box flexDirection="column" marginBottom={1}>
        <Text bold>RCON Status</Text>
        <Box marginLeft={2} flexDirection="column">
          {!rconAvailable ? (
            <>
              <Box flexShrink={0}>
                <Text>Status: </Text>
                <Text color={theme.warning}>○ Not Available</Text>
              </Box>
              <Box flexShrink={0}>
                <Text dimColor>{rconReason}</Text>
              </Box>
              <Box flexShrink={0}>
                <Text dimColor>[5] Go to Plugins to install</Text>
              </Box>
            </>
          ) : (
            <>
              <Box flexShrink={0}>
                <Text>RCON: </Text>
                {rconPluginConnected ? (
                  <Text color={theme.success}>
                    ● Connected (port {rconConfig.port})
                  </Text>
                ) : status === "online" ? (
                  <Text color={theme.warning}>○ Connecting...</Text>
                ) : (
                  <Text dimColor>○ Waiting for server...</Text>
                )}
              </Box>
              {rconConfig.enabled && (
                <>
                  <Box flexShrink={0}>
                    <Text>Port: </Text>
                    <Text dimColor>{rconConfig.port}</Text>
                  </Box>
                  <Box flexShrink={0}>
                    <Text>Auto-reconnect: </Text>
                    <Text dimColor>
                      {rconConfig.autoReconnect ? "Enabled" : "Disabled"}
                    </Text>
                  </Box>
                </>
              )}
              {rconPluginConnected && !rconHasCommands && (
                <Box flexShrink={0}>
                  <Text color={theme.warning}>
                    ⚠ Server DevCommands not installed - admin commands
                    unavailable
                  </Text>
                </Box>
              )}
            </>
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

          {/* Valheim Install Option - when SteamCMD installed but Valheim is not */}
          {steamCmdInstalled &&
            valheimInstalled === false &&
            !valheimInstalling && (
              <Box marginBottom={1} flexShrink={0}>
                <Box flexShrink={0}>
                  <Text color={theme.info}>[V] </Text>
                  <Text>Install Valheim Server</Text>
                  <Text color={theme.warning}> (required)</Text>
                </Box>
              </Box>
            )}

          {/* Valheim Reinstall Option - when installed but verification failed */}
          {steamCmdInstalled &&
            valheimInstalled &&
            valheimVerified === false && (
              <Box marginBottom={1} flexShrink={0}>
                <Box flexShrink={0}>
                  <Text color={theme.warning}>[V] </Text>
                  <Text>Reinstall Valheim Server</Text>
                  <Text color={theme.error}> (verification failed)</Text>
                </Box>
              </Box>
            )}

          {/* Server Actions - only available when both SteamCMD and Valheim are installed */}
          {steamCmdInstalled && valheimInstalled ? (
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
                <Box flexShrink={0}>
                  <Text color={theme.info}>[V] </Text>
                  <Text dimColor>Verify/Reinstall Server</Text>
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

                {/* RCON Actions - only show if RCON available and connected with commands */}
                {rconPluginConnected && rconHasCommands && (
                  <>
                    <Box marginTop={1} flexShrink={0}>
                      <Text bold color={theme.primary}>
                        RCON Admin:
                      </Text>
                    </Box>
                    <Box flexShrink={0}>
                      <Text color={theme.primary}>[P] </Text>
                      <Text>Player Manager</Text>
                    </Box>
                    <Box flexShrink={0}>
                      <Text color={theme.info}>[N] </Text>
                      <Text>Server Info</Text>
                    </Box>
                    <Box flexShrink={0}>
                      <Text color={theme.warning}>[E] </Text>
                      <Text>Event Manager</Text>
                    </Box>
                    <Box flexShrink={0}>
                      <Text color={theme.info}>[T] </Text>
                      <Text>Time Control</Text>
                    </Box>
                    <Box flexShrink={0}>
                      <Text color={theme.primary}>[G] </Text>
                      <Text>Boss Progress</Text>
                    </Box>
                    <Box flexShrink={0}>
                      <Text color={theme.error}>[D] </Text>
                      <Text>Remove Drops</Text>
                    </Box>
                  </>
                )}
                {rconPluginConnected && !rconHasCommands && (
                  <Box marginTop={1} flexShrink={0}>
                    <Text color={theme.warning}>
                      [5] Install Server DevCommands for admin features
                    </Text>
                  </Box>
                )}
                {!rconAvailable && (
                  <Box marginTop={1} flexShrink={0}>
                    <Text color={theme.warning}>
                      [5] Manage Plugins (RCON requires BepInEx plugins)
                    </Text>
                  </Box>
                )}
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
            <Text dimColor>Checking installation status...</Text>
          ) : !steamCmdInstalled ? (
            <Text dimColor>Install SteamCMD to manage server</Text>
          ) : valheimInstalled === null ? (
            <Text dimColor>Checking Valheim installation...</Text>
          ) : (
            <Text dimColor>Install Valheim to manage server</Text>
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

          {/* Admin Management - always available (file-based) */}
          <Box flexShrink={0}>
            <Text color={theme.info}>[M] </Text>
            <Text>Manage Admins</Text>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
