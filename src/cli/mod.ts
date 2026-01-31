/**
 * CLI module
 * Provides command-line interface functionality
 */

export { getHelpText, parseArgs } from "./args.ts";
export type {
  Command,
  ConfigArgs,
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
} from "./args.ts";

export {
  clearActiveWatchdog,
  configCommand,
  getActiveWatchdog,
  installCommand,
  interactiveRcon,
  rconCommand,
  startCommand,
  stopCommand,
  worldsCommand,
} from "./commands/mod.ts";
