/**
 * CLI module
 * Provides command-line interface functionality
 */

export type {
  Command,
  ConfigArgs,
  DoctorArgs,
  GlobalArgs,
  HelpArgs,
  InstallArgs,
  ParsedArgs,
  RconArgs,
  StartArgs,
  StopArgs,
  TuiArgs,
  VersionArgs,
  WorldsArgs,
} from "./args.js";
export { getHelpText, parseArgs } from "./args.js";

export {
  clearActiveWatchdog,
  configCommand,
  doctorCommand,
  getActiveWatchdog,
  installCommand,
  interactiveRcon,
  rconCommand,
  startCommand,
  stopCommand,
  worldsCommand,
} from "./commands/mod.js";
