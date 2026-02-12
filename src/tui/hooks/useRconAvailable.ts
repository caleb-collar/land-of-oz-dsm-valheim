/**
 * Hook for checking RCON feature availability based on BepInEx plugin status.
 *
 * RCON features require:
 * 1. BepInEx framework installed
 * 2. BepInEx.rcon plugin installed and enabled
 * 3. Server DevCommands plugin for admin commands (optional but needed for most features)
 * 4. Server online and RCON connected
 */

import { useStore } from "../store.js";

/** RCON availability status */
export type RconAvailability = {
  /** Whether the RCON plugin is installed and enabled */
  available: boolean;
  /** Whether RCON is actually connected to the server */
  connected: boolean;
  /** Whether Server DevCommands plugin is installed (provides admin commands) */
  hasCommands: boolean;
  /** Human-readable reason why RCON is not available (null if available) */
  reason: string | null;
};

/**
 * Checks RCON feature availability based on BepInEx plugin installation status.
 *
 * Visibility matrix:
 * | BepInEx | RCON Plugin | DevCommands | Server | Result |
 * |---------|-------------|-------------|--------|--------|
 * | No      | -           | -           | -      | "Install BepInEx first" |
 * | Yes     | No          | -           | -      | "Install BepInEx.rcon plugin" |
 * | Yes     | Yes         | No          | -      | "RCON ready, install Server DevCommands for admin commands" |
 * | Yes     | Yes         | Yes         | Off    | "Start server to use RCON" |
 * | Yes     | Yes         | Yes         | On     | Full RCON admin panel |
 */
export function useRconAvailable(): RconAvailability {
  const bepinex = useStore((s) => s.bepinex);
  const rconConnected = useStore((s) => s.rcon.connected);
  const serverStatus = useStore((s) => s.server.status);

  const rconPlugin = bepinex.plugins.find((p) => p.id === "bepinex-rcon");
  const devCommandsPlugin = bepinex.plugins.find(
    (p) => p.id === "server-devcommands"
  );

  const rconInstalled = rconPlugin?.installed === true;
  const rconEnabled = rconPlugin?.enabled === true;
  const devCommandsInstalled = devCommandsPlugin?.installed === true;
  const devCommandsEnabled = devCommandsPlugin?.enabled === true;

  // Check availability in order of dependencies
  if (bepinex.installed !== true) {
    return {
      available: false,
      connected: false,
      hasCommands: false,
      reason:
        "BepInEx framework not installed. Install via Plugins menu (press 5).",
    };
  }

  if (!rconInstalled || !rconEnabled) {
    return {
      available: false,
      connected: false,
      hasCommands: false,
      reason:
        "BepInEx.rcon plugin not installed or disabled. Manage via Plugins menu (press 5).",
    };
  }

  const hasCommands = devCommandsInstalled && devCommandsEnabled;

  if (serverStatus !== "online") {
    return {
      available: true,
      connected: false,
      hasCommands,
      reason: "Start the server to use RCON features.",
    };
  }

  if (!rconConnected) {
    return {
      available: true,
      connected: false,
      hasCommands,
      reason: "RCON is connecting...",
    };
  }

  if (!hasCommands) {
    return {
      available: true,
      connected: true,
      hasCommands: false,
      reason:
        "RCON connected but Server DevCommands plugin not installed. Install for admin commands (press 5).",
    };
  }

  return {
    available: true,
    connected: true,
    hasCommands: true,
    reason: null,
  };
}
