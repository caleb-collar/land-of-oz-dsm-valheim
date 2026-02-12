/**
 * TUI module exports
 * Ink-based terminal user interface
 */

import { withFullScreen } from "fullscreen-ink";
import React from "react";
import { App } from "./App.js";

// Version
export const TUI_VERSION = "1.12.1";

// Core exports
export { App } from "./App.js";
// Components
export {
  AdminManager,
  ConfirmModal,
  Header,
  LogEntry as LogEntryComponent,
  LogFeed,
  Menu,
  MenuItem,
  Modal,
  StatusBar,
} from "./components/mod.js";
export type { RconAvailability, TerminalSize } from "./hooks/mod.js";
// Hooks
export {
  useAdminManager,
  useConfig,
  useConfigSync,
  useLogStream,
  useLogs,
  usePlugins,
  useRconAvailable,
  useServer,
  useTerminalSize,
} from "./hooks/mod.js";
// Screens
export {
  Console,
  Dashboard,
  Plugins,
  Settings,
  Worlds,
} from "./screens/mod.js";
export type {
  AdminRole,
  LogEntry,
  LogLevel,
  Screen,
  ServerStatus,
  ServerUser,
  Store,
} from "./store.js";
export { useStore } from "./store.js";
// Theme
export { getStatusColor, logColors, theme } from "./theme.js";

/**
 * Launches the TUI application in fullscreen mode
 * Uses fullscreen-ink for alternate screen buffer support
 * This fixes terminal buffer truncation issues on Windows
 *
 * Pattern from working ink-app-template:
 * Simple .start() call without await/waitUntilExit
 */
export function launchTui(): void {
  withFullScreen(React.createElement(App)).start();
}
