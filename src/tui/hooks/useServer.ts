/**
 * useServer hook - Server control and status
 */

import { useCallback, useEffect } from "react";
import { useStore } from "../store.ts";

/**
 * Hook for managing server lifecycle
 * Provides start/stop controls and manages uptime counter
 */
export function useServer() {
  const status = useStore((s) => s.server.status);
  const actions = useStore((s) => s.actions);

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
      // TODO: Integrate with actual ValheimProcess/Watchdog
      // For now, simulate startup
      await new Promise((resolve) => setTimeout(resolve, 2000));

      actions.setServerStatus("online");
      actions.addLog("info", "Server is now online");
    } catch (error) {
      actions.setServerStatus("offline");
      actions.addLog("error", `Failed to start server: ${error}`);
    }
  }, [status, actions]);

  /**
   * Stop the Valheim server
   */
  const stop = useCallback(async () => {
    if (status !== "online") {
      actions.addLog("warn", "Server is not online, cannot stop");
      return;
    }

    actions.setServerStatus("stopping");
    actions.addLog("info", "Stopping Valheim server...");

    try {
      // TODO: Integrate with actual ValheimProcess/Watchdog
      // For now, simulate shutdown
      await new Promise((resolve) => setTimeout(resolve, 1500));

      actions.setServerStatus("offline");
      actions.setServerPid(null);
      actions.addLog("info", "Server stopped");
    } catch (error) {
      actions.addLog("error", `Error stopping server: ${error}`);
    }
  }, [status, actions]);

  /**
   * Force kill the server (no graceful shutdown)
   */
  const kill = useCallback(() => {
    actions.addLog("warn", "Force killing server...");
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

  return {
    status,
    start,
    stop,
    kill,
    isOnline: status === "online",
    isOffline: status === "offline",
    isTransitioning: status === "starting" || status === "stopping",
  };
}
