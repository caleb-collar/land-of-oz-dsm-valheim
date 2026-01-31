/**
 * TUI Color Theme
 * Defines the color palette for the terminal UI
 */

/**
 * Base color palette for the TUI
 */
export const theme = {
  /** Main accent color for active items and highlights */
  primary: "cyan",

  /** Default text color */
  secondary: "white",

  /** Special highlights and animations */
  accent: "magenta",

  /** Success states (server online, confirmations) */
  success: "green",

  /** Warning states (starting, stopping) */
  warning: "yellow",

  /** Error states (offline, failures) */
  error: "red",

  /** Inactive items, borders, dimmed text */
  muted: "gray",

  // Status-specific colors
  /** Server online indicator */
  serverOnline: "green",

  /** Server starting indicator */
  serverStarting: "yellow",

  /** Server offline indicator */
  serverOffline: "red",

  /** Server stopping indicator */
  serverStopping: "yellow",
} as const;

/** Type for theme color keys */
export type ThemeColor = keyof typeof theme;

/**
 * Log level colors for the log feed
 */
export const logColors = {
  info: "cyan",
  warn: "yellow",
  error: "red",
  debug: "gray",
} as const;

/**
 * Get status color based on server status
 */
export function getStatusColor(
  status: "offline" | "starting" | "online" | "stopping",
): string {
  switch (status) {
    case "online":
      return theme.serverOnline;
    case "starting":
      return theme.serverStarting;
    case "stopping":
      return theme.serverStopping;
    case "offline":
    default:
      return theme.serverOffline;
  }
}

/**
 * Border styles for different states
 */
export const borderStyles = {
  active: "single",
  inactive: "single",
  focus: "double",
} as const;
