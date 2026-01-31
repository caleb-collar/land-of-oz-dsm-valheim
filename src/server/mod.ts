/**
 * Server module exports
 * Provides Valheim server process management
 */

// Process management
export {
  type ProcessEvents,
  type ProcessState,
  type ServerLaunchConfig,
  ValheimProcess,
} from "./process.js";

// Watchdog
export {
  defaultWatchdogConfig,
  type ServerWatchdogConfig,
  Watchdog,
  type WatchdogEvents,
} from "./watchdog.js";

// Log parsing
export {
  LogBuffer,
  type ParsedEvent,
  parseEvent,
  parseLogLine,
  type ServerLogEntry,
  type ServerLogLevel,
  type ServerLogSubscriber,
} from "./logs.js";

// Admin commands and RCON integration
export {
  addToAdminList,
  addToBanList,
  addToPermittedList,
  type AdminCommand,
  connectRcon,
  disconnectRcon,
  getListContents,
  isInList,
  isRconConnected,
  type ListType,
  type RconCommandConfig,
  removeFromBanList,
  removeFromList,
  sendRconCommand,
  sendServerCommand,
  VALHEIM_COMMANDS,
} from "./commands.js";
