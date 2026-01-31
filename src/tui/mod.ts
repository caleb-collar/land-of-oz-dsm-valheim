/**
 * TUI module exports
 * Ink-based terminal user interface
 */

import React from "react";
import { render } from "ink";
import { App } from "./App.tsx";

// Version
export const TUI_VERSION = "0.1.0";

// Core exports
export { App } from "./App.tsx";
export { useStore } from "./store.ts";
export type {
  LogEntry,
  LogLevel,
  Screen,
  ServerStatus,
  Store,
} from "./store.ts";

// Theme
export { getStatusColor, logColors, theme } from "./theme.ts";

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
} from "./components/mod.ts";

// Screens
export { Console, Dashboard, Settings, Worlds } from "./screens/mod.ts";

// Hooks
export {
  useConfig,
  useConfigSync,
  useLogs,
  useLogStream,
  useServer,
} from "./hooks/mod.ts";

/**
 * Launches the TUI application
 * Renders the Ink-based terminal interface
 */
export function launchTui(): void {
  const { waitUntilExit } = render(React.createElement(App));

  waitUntilExit()
    .then(() => {
      // Cleanup after exit
    })
    .catch(() => {
      // Handle errors silently
    });
}
