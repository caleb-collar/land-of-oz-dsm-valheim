/**
 * useServer hook - Server control and status
 * Integrates with ValheimProcess and Watchdog for real server management
 */

import { useCallback, useEffect } from "react";
import type {
  ParsedEvent,
  ProcessState,
  ServerLaunchConfig,
  WatchdogEvents,
} from "../../server/mod.js";
import { type UpdateCallback, updateValheim } from "../../steamcmd/updater.js";
import { worldExists } from "../../valheim/worlds.js";
import {
  getWatchdog,
  hasActiveServer,
  isUpdating,
  killServer,
  setUpdating,
  startServer,
  stopServer,
} from "../serverManager.js";
import { type ServerStatus, useStore } from "../store.js";

/**
 * Maps ProcessState to ServerStatus for TUI store
 */
function mapProcessStateToStatus(state: ProcessState): ServerStatus {
  switch (state) {
    case "online":
      return "online";
    case "starting":
      return "starting";
    case "stopping":
      return "stopping";
    case "offline":
    case "crashed":
      return "offline";
    default:
      return "offline";
  }
}

/**
 * Converts TUI config to server launch config
 */
function buildLaunchConfig(config: {
  serverName: string;
  port: number;
  password: string;
  world: string;
  public: boolean;
  crossplay: boolean;
  saveInterval: number;
  backups: number;
}): ServerLaunchConfig {
  return {
    name: config.serverName,
    port: config.port,
    world: config.world,
    password: config.password,
    public: config.public,
    crossplay: config.crossplay,
    saveinterval: config.saveInterval,
    backups: config.backups,
  };
}

/**
 * Hook for managing server lifecycle
 * Provides start/stop controls and manages uptime counter
 * Uses the global serverManager to persist state across screen changes
 */
export function useServer() {
  const status = useStore((s) => s.server.status);
  const config = useStore((s) => s.config);
  const rcon = useStore((s) => s.rcon);
  const actions = useStore((s) => s.actions);

  /**
   * Creates watchdog event handlers connected to the store
   */
  const createWatchdogEvents = useCallback(
    (): Partial<WatchdogEvents> => ({
      onStateChange: (state: ProcessState) => {
        const newStatus = mapProcessStateToStatus(state);
        actions.setServerStatus(newStatus);

        if (state === "crashed") {
          actions.addLog("error", "Server crashed");
          actions.setWorldGenerating(false);
        } else if (state === "offline") {
          actions.setWorldGenerating(false);
        }
      },
      onLog: (line: string) => {
        // Parse log level from line if possible
        const lowerLine = line.toLowerCase();
        let level: "info" | "warn" | "error" | "debug" = "info";
        if (lowerLine.includes("error") || lowerLine.includes("exception")) {
          level = "error";
        } else if (lowerLine.includes("warn")) {
          level = "warn";
        } else if (lowerLine.includes("debug")) {
          level = "debug";
        }
        actions.addLog(level, line);
      },
      onPlayerJoin: (name: string) => {
        actions.addPlayer(name);
        actions.addLog("info", `Player "${name}" connected`);
      },
      onPlayerLeave: (name: string) => {
        actions.removePlayer(name);
        actions.addLog("info", `Player "${name}" disconnected`);
      },
      onError: (error: Error) => {
        actions.addLog("error", `Server error: ${error.message}`);
      },
      onEvent: (event: ParsedEvent) => {
        // Handle world generation completion
        if (event.type === "world_generated") {
          actions.setWorldGenerating(false);
          actions.addLog("info", "World generation complete");
        }
        // Handle world save for lastSave timestamp
        if (event.type === "world_saved") {
          actions.setLastSave(new Date());
        }
      },
      onWatchdogRestart: (attempt: number, maxAttempts: number) => {
        actions.addLog(
          "warn",
          `Watchdog restarting server (attempt ${attempt}/${maxAttempts})...`
        );
      },
      onWatchdogMaxRestarts: () => {
        actions.addLog(
          "error",
          "Watchdog: Maximum restart attempts exceeded. Manual intervention required."
        );
      },
    }),
    [actions]
  );

  /**
   * Start the Valheim server
   */
  const start = useCallback(async () => {
    if (status !== "offline") {
      actions.addLog("warn", "Server is not offline, cannot start");
      return;
    }

    if (hasActiveServer()) {
      actions.addLog("warn", "Server is already managed by this instance");
      return;
    }

    actions.setServerStatus("starting");
    actions.addLog("info", "Starting Valheim server...");
    actions.resetUptime();

    // Check if we're generating a new world
    const worldNotGenerated = !(await worldExists(config.world));
    if (worldNotGenerated) {
      actions.setWorldGenerating(true);
      actions.addLog(
        "info",
        `World "${config.world}" not found - will generate new world (this may take ~1 minute)`
      );
    }

    try {
      const launchConfig = buildLaunchConfig(config);
      const events = createWatchdogEvents();

      // Use global server manager to start and persist the watchdog
      const watchdog = await startServer(launchConfig, {}, events);

      // Get PID if available
      const pid = watchdog.serverProcess.pid;
      if (pid) {
        actions.setServerPid(pid);
      }
    } catch (error) {
      actions.setServerStatus("offline");
      actions.setWorldGenerating(false);
      actions.addLog("error", `Failed to start server: ${error}`);
    }
  }, [status, config, actions, createWatchdogEvents]);

  /**
   * Stop the Valheim server
   */
  const stop = useCallback(async () => {
    if (status !== "online" && status !== "starting") {
      actions.addLog("warn", "Server is not running, cannot stop");
      return;
    }

    actions.setServerStatus("stopping");
    actions.addLog("info", "Stopping Valheim server...");

    try {
      await stopServer();
      actions.setServerPid(null);
      actions.addLog("info", "Server stopped");
    } catch (error) {
      actions.addLog("error", `Error stopping server: ${error}`);
    }
  }, [status, actions]);

  /**
   * Force kill the server (no graceful shutdown)
   */
  const kill = useCallback(async () => {
    actions.addLog("warn", "Force killing server...");

    try {
      await killServer();
    } catch {
      // Ignore errors during force kill
    }

    actions.setServerStatus("offline");
    actions.setServerPid(null);
  }, [actions]);

  /**
   * Restart the server (stop then start)
   */
  const restart = useCallback(async () => {
    if (status !== "online") {
      actions.addLog("warn", "Server is not online, cannot restart");
      return;
    }

    actions.addLog("info", "Restarting server...");

    // Stop the server
    await stop();

    // Wait a moment for clean shutdown
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Start the server
    await start();
  }, [status, actions, stop, start]);

  /**
   * Update the Valheim server via SteamCMD
   */
  const update = useCallback(
    async (onProgress?: UpdateCallback) => {
      if (status !== "offline") {
        actions.addLog("error", "Cannot update while server is running");
        return;
      }

      if (isUpdating()) {
        actions.addLog("warn", "Update already in progress");
        return;
      }

      setUpdating(true);
      actions.addLog("info", "Updating Valheim server...");

      try {
        await updateValheim((status) => {
          actions.addLog("info", status.message);
          onProgress?.(status);
        });
        actions.addLog("info", "Server update complete");
        actions.setUpdateAvailable(false);
      } catch (error) {
        actions.addLog("error", `Failed to update server: ${error}`);
      } finally {
        setUpdating(false);
      }
    },
    [status, actions]
  );

  /**
   * Force save the world via RCON (if connected)
   */
  const forceSave = useCallback(async () => {
    if (!rcon.enabled || !rcon.connected) {
      actions.addLog("warn", "RCON not connected, cannot force save");
      return;
    }

    actions.addLog("info", "Sending save command via RCON...");

    try {
      // Import RconClient dynamically to avoid circular dependencies
      const { RconClient } = await import("../../rcon/client.js");
      const client = new RconClient({
        host: rcon.host,
        port: rcon.port,
        password: rcon.password,
        timeout: rcon.timeout,
      });

      await client.connect();
      const response = await client.send("save");
      await client.disconnect();

      actions.addLog("info", `Save command sent: ${response || "OK"}`);
      actions.setLastSave(new Date());
    } catch (error) {
      actions.addLog("error", `Failed to send save command: ${error}`);
    }
  }, [rcon, actions]);

  // Uptime counter - increments every second when online
  useEffect(() => {
    if (status !== "online") return;

    const interval = setInterval(() => {
      actions.incrementUptime();
    }, 1000);

    return () => clearInterval(interval);
  }, [status, actions]);

  // NOTE: We intentionally do NOT cleanup on unmount here!
  // The server should keep running when navigating between screens.
  // Cleanup happens only when the entire TUI exits (handled in App.tsx)

  return {
    status,
    start,
    stop,
    kill,
    restart,
    update,
    forceSave,
    isOnline: status === "online",
    isOffline: status === "offline",
    isTransitioning: status === "starting" || status === "stopping",
    isUpdating: isUpdating(),
    watchdog: getWatchdog(),
  };
}
