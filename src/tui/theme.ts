/**
 * TUI Color Theme
 * Defines the Valheim-inspired color palette for the terminal UI
 *
 * Official Valheim Color Palette:
 * - #F37A47 | Mandarin      - Primary (main titles, UI)
 * - #FCF983 | Straw Gold    - Secondary accents, DSM text
 * - #B63C21 | Bricky Brick  - Warnings, errors
 * - #691E11 | Prune         - Dark accents
 * - #000000 | Black         - Backgrounds
 * - #001018 | Black Knight  - Deep backgrounds
 * - #01657C | Blue-Collar   - Info, links
 * - #018DA6 | Waikiki       - Highlights, active states
 */

/**
 * Valheim color palette constants
 */
export const valheimPalette = {
  mandarin: "#F37A47",
  strawGold: "#FCF983",
  brickyBrick: "#B63C21",
  prune: "#691E11",
  black: "#000000",
  blackKnight: "#001018",
  blueCollar: "#01657C",
  waikiki: "#018DA6",
} as const;

/**
 * Base color palette for the TUI
 */
export const theme = {
  /** Main accent color for active items and highlights */
  primary: valheimPalette.mandarin,

  /** Default text color */
  secondary: valheimPalette.strawGold,

  /** Special highlights and animations */
  accent: valheimPalette.waikiki,

  /** Success states (server online, confirmations) */
  success: "green",

  /** Warning states (starting, stopping) */
  warning: valheimPalette.strawGold,

  /** Error states (offline, failures) */
  error: valheimPalette.brickyBrick,

  /** Inactive items, borders, dimmed text */
  muted: "gray",

  /** Info/link color */
  info: valheimPalette.blueCollar,

  // Status-specific colors
  /** Server online indicator */
  serverOnline: "green",

  /** Server starting indicator */
  serverStarting: valheimPalette.strawGold,

  /** Server offline indicator */
  serverOffline: valheimPalette.brickyBrick,

  /** Server stopping indicator */
  serverStopping: valheimPalette.strawGold,
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
  status: "offline" | "starting" | "online" | "stopping"
): string {
  switch (status) {
    case "online":
      return theme.serverOnline;
    case "starting":
      return theme.serverStarting;
    case "stopping":
      return theme.serverStopping;
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
