/**
 * useBepInExLogs hook - BepInEx log integration
 * Manages the BepInEx log tailer and streams logs into the TUI store
 */

import { useCallback, useEffect, useRef } from "react";
import {
  type BepInExLogEntry,
  bepInExLogManager,
  isBepInExInstalled,
} from "../../bepinex/mod.js";
import { type LogLevel, useStore } from "../store.js";

/**
 * Maps BepInEx log levels to TUI log levels
 */
function mapBepInExLevel(level: BepInExLogEntry["level"]): LogLevel {
  switch (level) {
    case "debug":
      return "debug";
    case "info":
      return "info";
    case "warn":
      return "warn";
    case "error":
    case "fatal":
      return "error";
    default:
      return "info";
  }
}

/**
 * Hook for managing BepInEx log streaming
 * Automatically starts/stops the log tailer based on server status and BepInEx availability
 */
export function useBepInExLogs() {
  const serverStatus = useStore((s) => s.server.status);
  const bepinexInstalled = useStore((s) => s.bepinex.installed);
  const valheimPath = useStore((s) => s.valheim.path);
  const addLog = useStore((s) => s.actions.addLog);

  const unsubscribeRef = useRef<(() => void) | null>(null);
  const isRunningRef = useRef(false);

  /**
   * Handles new BepInEx log entries
   */
  const handleLogEntry = useCallback(
    (entry: BepInExLogEntry) => {
      const level = mapBepInExLevel(entry.level);
      // Format message with source context from BepInEx
      const message =
        entry.source !== "BepInEx"
          ? `[${entry.source}] ${entry.message}`
          : entry.message;
      addLog(level, message, "bepinex");
    },
    [addLog]
  );

  /**
   * Starts the BepInEx log tailer
   */
  const startLogTailer = useCallback(async () => {
    if (isRunningRef.current || !valheimPath) {
      return;
    }

    // Verify BepInEx is actually installed
    const isInstalled = await isBepInExInstalled(valheimPath);
    if (!isInstalled) {
      return;
    }

    try {
      // Start tailing from end of file (only new entries)
      await bepInExLogManager.start(valheimPath, true);
      isRunningRef.current = true;

      // Subscribe to new entries
      unsubscribeRef.current = bepInExLogManager.subscribe(handleLogEntry);

      addLog("info", "BepInEx log streaming started", "app");
    } catch (error) {
      addLog(
        "warn",
        `Failed to start BepInEx log tailer: ${error instanceof Error ? error.message : String(error)}`,
        "app"
      );
    }
  }, [valheimPath, addLog, handleLogEntry]);

  /**
   * Stops the BepInEx log tailer
   */
  const stopLogTailer = useCallback(async () => {
    if (!isRunningRef.current) {
      return;
    }

    // Unsubscribe from log entries
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    // Stop the tailer
    await bepInExLogManager.stop();
    isRunningRef.current = false;
  }, []);

  /**
   * Loads recent BepInEx log history
   */
  const loadRecentHistory = useCallback(async () => {
    if (!bepInExLogManager.isRunning) {
      return;
    }

    const recentEntries = await bepInExLogManager.readLastLines(30);
    for (const entry of recentEntries) {
      handleLogEntry(entry);
    }
  }, [handleLogEntry]);

  // Auto-start/stop based on server status and BepInEx availability
  useEffect(() => {
    // Start when server comes online and BepInEx is installed
    if (
      (serverStatus === "online" || serverStatus === "starting") &&
      bepinexInstalled &&
      valheimPath
    ) {
      startLogTailer();
    }

    // Stop when server goes offline
    if (serverStatus === "offline" && isRunningRef.current) {
      stopLogTailer();
    }

    // Cleanup on unmount
    return () => {
      if (isRunningRef.current && unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      // Note: Don't stop the tailer itself - it's a singleton that persists
    };
  }, [
    serverStatus,
    bepinexInstalled,
    valheimPath,
    startLogTailer,
    stopLogTailer,
  ]);

  return {
    isRunning: isRunningRef.current,
    logPath: bepInExLogManager.logPath,
    startLogTailer,
    stopLogTailer,
    loadRecentHistory,
  };
}
