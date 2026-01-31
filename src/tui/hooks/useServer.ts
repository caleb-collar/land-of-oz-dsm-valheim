/**
 * useServer hook - Server control and status
 * Integrates with ValheimProcess and Watchdog for real server management
 */

import { useCallback, useEffect, useRef } from "react";
import {
  type ProcessState,
  type ServerLaunchConfig,
  Watchdog,
  type WatchdogEvents,
} from "../../server/mod.js";
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
 * Integrates with actual ValheimProcess and Watchdog
 */
export function useServer() {
  const status = useStore((s) => s.server.status);
  const config = useStore((s) => s.config);
  const actions = useStore((s) => s.actions);

  // Ref to hold the watchdog instance (persists across renders)
  const watchdogRef = useRef<Watchdog | null>(null);

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

    actions.setServerStatus("starting");
    actions.addLog("info", "Starting Valheim server...");
    actions.resetUptime();

    try {
      const launchConfig = buildLaunchConfig(config);
      const events = createWatchdogEvents();

      // Create watchdog with default config (can be extended to use stored config)
      watchdogRef.current = new Watchdog(launchConfig, {}, events);
      await watchdogRef.current.start();

      // Get PID if available
      const pid = watchdogRef.current.serverProcess.pid;
      if (pid) {
        actions.setServerPid(pid);
      }
    } catch (error) {
      actions.setServerStatus("offline");
      actions.addLog("error", `Failed to start server: ${error}`);
      watchdogRef.current = null;
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
      if (watchdogRef.current) {
        await watchdogRef.current.stop();
        watchdogRef.current = null;
      }
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
      if (watchdogRef.current) {
        await watchdogRef.current.kill();
        watchdogRef.current = null;
      }
    } catch {
      // Ignore errors during force kill
    }

    actions.setServerStatus("offline");
    actions.setServerPid(null);
  }, [actions]);

  // Uptime counter - increments every second when online
  useEffect(() => {
    if (status !== "online") return;

    const interval = setInterval(() => {
      actions.incrementUptime();
    }, 1000);

    return () => clearInterval(interval);
  }, [status, actions]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Stop the server when the TUI is closed
      if (watchdogRef.current) {
        watchdogRef.current.stop().catch(() => {
          // Force kill if graceful stop fails
          watchdogRef.current?.kill().catch(() => {});
        });
      }
    };
  }, []);

  return {
    status,
    start,
    stop,
    kill,
    isOnline: status === "online",
    isOffline: status === "offline",
    isTransitioning: status === "starting" || status === "stopping",
    watchdog: watchdogRef.current,
  };
}
