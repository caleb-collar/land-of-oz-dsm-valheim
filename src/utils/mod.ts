/**
 * Utility module exports
 */

export {
  type Platform,
  getPlatform,
  getHomeDir,
  getConfigDir,
  getLocalDataDir,
  getValheimSaveDir,
  getAppConfigDir,
  getSteamCmdDir,
  getValheimServerDir,
  getValheimExecutable,
  getSteamCmdExecutable,
} from "./platform.ts";

export {
  type LogLevel,
  type LogEntry,
  type LoggerConfig,
  configureLogger,
  debug,
  info,
  warn,
  error,
  createLogger,
  parseValheimLog,
} from "./logger.ts";
