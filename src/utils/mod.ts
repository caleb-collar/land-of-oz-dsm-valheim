/**
 * Utility module exports
 */

export {
  configureLogger,
  createLogger,
  debug,
  error,
  info,
  type LogEntry,
  type LoggerConfig,
  type LogLevel,
  parseValheimLog,
  warn,
} from "./logger.js";
export {
  getAppConfigDir,
  getConfigDir,
  getHomeDir,
  getLocalDataDir,
  getPlatform,
  getSteamCmdDir,
  getSteamCmdExecutable,
  getValheimExecutable,
  getValheimSaveDir,
  getValheimServerDir,
  type Platform,
} from "./platform.js";
