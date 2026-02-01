/**
 * TUI module exports
 * Ink-based terminal user interface
 */

import { withFullScreen } from "fullscreen-ink";
import React from "react";
import { App } from "./App.js";

// Version
export const TUI_VERSION = "0.6.0";

// Core exports
export { App } from "./App.js";
// Components
export {
  ConfirmModal,
  Header,
  LogEntry as LogEntryComponent,
  LogFeed,
  Menu,
  MenuItem,
  Modal,
  StatusBar,
} from "./components/mod.js";
export type { TerminalSize } from "./hooks/mod.js";
// Hooks
export {
  useConfig,
  useConfigSync,
  useLogStream,
  useLogs,
  useServer,
  useTerminalSize,
} from "./hooks/mod.js";
// Screens
export { Console, Dashboard, Settings, Worlds } from "./screens/mod.js";
export type {
  LogEntry,
  LogLevel,
  Screen,
  ServerStatus,
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
