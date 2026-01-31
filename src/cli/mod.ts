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
  startCommand,
  stopCommand,
  worldsCommand,
} from "./commands/mod.ts";
