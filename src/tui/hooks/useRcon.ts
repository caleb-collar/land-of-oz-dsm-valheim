/**
 * useRcon hook - Persistent RCON connection management
 *
 * This hook manages the RCON connection lifecycle at the App level,
 * ensuring the connection persists across screen navigation changes.
 * It should be used once in App.tsx, not in individual screens.
 */

import { useEffect, useRef } from "react";
import { type ConnectionState, rconManager } from "../../rcon/mod.js";
import { useStore } from "../store.js";

/**
 * Hook for managing persistent RCON connection.
 * Should be called once at the App level to maintain connection
 * across screen changes.
 */
export function useRcon() {
  const serverStatus = useStore((s) => s.server.status);
  const rcon = useStore((s) => s.rcon);
  const actions = useStore((s) => s.actions);

  // Track if RCON has been initialized
  const rconInitialized = useRef(false);

  // Extract stable RCON config values (excluding 'connected' to avoid infinite loops)
  const rconEnabled = rcon.enabled;
  const rconPort = rcon.port;
  const rconPassword = rcon.password;
  const rconTimeout = rcon.timeout;
  const rconAutoReconnect = rcon.autoReconnect;

  // Initialize RCON manager when config changes
  useEffect(() => {
    if (!rconEnabled) {
      // RCON disabled, disconnect if connected
      if (rconManager.isConnected()) {
        rconManager.disconnect();
        actions.setRconConnected(false);
      }
      rconInitialized.current = false;
      return;
    }

    // Initialize RCON manager with config and callbacks
    rconManager.initialize(
      {
        host: "localhost",
        port: rconPort,
        password: rconPassword,
        timeout: rconTimeout,
        enabled: rconEnabled,
        autoReconnect: rconAutoReconnect,
      },
      {
        onConnectionStateChange: (state: ConnectionState, error?: string) => {
          const connected = state === "connected";
          actions.setRconConnected(connected);

          if (connected) {
            actions.addLog("info", "RCON connected");
          } else if (state === "error") {
            actions.addLog(
              "warn",
              error
                ? `RCON connection error: ${error}`
                : "RCON connection error"
            );
          } else if (state === "disconnected" && rconInitialized.current) {
            // Only log if we were previously initialized (avoid log on startup)
            actions.addLog("debug", "RCON disconnected");
          }
        },
        onPlayerListUpdate: (players: string[]) => {
          // Sync player list from RCON polling
          actions.setPlayers(players);
        },
        pollInterval: 10000, // Poll every 10 seconds
      }
    );
    rconInitialized.current = true;

    // NOTE: We intentionally do NOT cleanup on unmount!
    // The App component only unmounts when the entire TUI exits,
    // at which point cleanupOnExit() handles proper shutdown.
  }, [
    rconEnabled,
    rconPort,
    rconPassword,
    rconTimeout,
    rconAutoReconnect,
    actions,
  ]);

  // Auto-connect RCON when server comes online
  useEffect(() => {
    if (
      serverStatus === "online" &&
      rconEnabled &&
      !rconManager.isConnected()
    ) {
      // Wait for BepInEx plugins to load before attempting RCON connect.
      // The RCON server is started by BepInEx.rcon plugin which takes a few
      // seconds after the Valheim server starts.
      const timer = setTimeout(() => {
        rconManager.connect().catch(() => {
          // Errors are handled internally by rconManager and surfaced
          // through onConnectionStateChange callback.
        });
      }, 5000); // 5 second delay for BepInEx plugins to load

      return () => clearTimeout(timer);
    }

    if (serverStatus === "offline" && rconManager.isConnected()) {
      rconManager.disconnect();
      actions.setRconConnected(false);
    }
  }, [serverStatus, rconEnabled, actions]);

  return {
    isConnected: rconManager.isConnected(),
    connect: () => rconManager.connect(),
    disconnect: () => rconManager.disconnect(),
  };
}
