/**
 * Server module exports
 * Provides Valheim server process management
 */

// Admin commands and RCON integration
export {
  type AdminCommand,
  addToAdminList,
  addToBanList,
  addToPermittedList,
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
// Log parsing
export {
  LogBuffer,
  type ParsedEvent,
  parseEvent,
  parseLogLine,
  type ServerLogEntry,
  type ServerLogLevel,
  type ServerLogSubscriber,
  type StartupPhase,
} from "./logs.js";
// Log tailing for detached mode
export {
  type LogEventCallback,
  type LogLineCallback,
  LogTailer,
} from "./logTail.js";
// PID file management
export {
  cleanupOldLogs,
  ensureLogsDir,
  getPidFilePath,
  getRunningServer,
  getServerLogFile,
  getServerLogsDir,
  isProcessRunning,
  killProcess,
  type PidFileData,
  readPidFile,
  removePidFile,
  writePidFile,
} from "./pidfile.js";
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
