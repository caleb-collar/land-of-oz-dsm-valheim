/**
 * CLI argument parser
 * Provides subcommand-based argument parsing
 */

import { z } from "zod";

/** Available CLI commands */
export type Command =
  | "start"
  | "stop"
  | "install"
  | "config"
  | "worlds"
  | "rcon"
  | "doctor"
  | "tui"
  | "help"
  | "version";

/** Base args that apply to all commands */
export type GlobalArgs = {
  help: boolean;
  version: boolean;
  debug: boolean;
  json: boolean;
  quiet: boolean;
};

/** Start command arguments */
export type StartArgs = GlobalArgs & {
  command: "start";
  name?: string;
  port?: number;
  world?: string;
  password?: string;
  public?: boolean;
  crossplay?: boolean;
  savedir?: string;
  background?: boolean;
};

/** Stop command arguments */
export type StopArgs = GlobalArgs & {
  command: "stop";
  force?: boolean;
  timeout?: number;
};

/** Install command arguments */
export type InstallArgs = GlobalArgs & {
  command: "install";
  dryRun: boolean;
  validate: boolean;
  force: boolean;
};

/** Config command arguments */
export type ConfigArgs = GlobalArgs & {
  command: "config";
  subcommand: "get" | "set" | "list" | "reset";
  key?: string;
  value?: string;
};

/** Worlds command arguments */
export type WorldsArgs = GlobalArgs & {
  command: "worlds";
  subcommand: "list" | "info" | "import" | "export" | "delete";
  name?: string;
  path?: string;
  force?: boolean;
};

/** RCON command arguments */
export type RconArgs = GlobalArgs & {
  command: "rcon";
  rconCommand?: string;
  host?: string;
  port?: number;
  password?: string;
  timeout?: number;
  interactive?: boolean;
};

/** TUI command arguments */
export type TuiArgs = GlobalArgs & {
  command: "tui";
};

/** Doctor command arguments */
export type DoctorArgs = GlobalArgs & {
  command: "doctor";
  fix?: boolean;
};

/** Help command arguments */
export type HelpArgs = GlobalArgs & {
  command: "help";
  topic?: string;
};

/** Version command arguments */
export type VersionArgs = GlobalArgs & {
  command: "version";
};

/** Union of all possible parsed args */
export type ParsedArgs =
  | StartArgs
  | StopArgs
  | InstallArgs
  | ConfigArgs
  | WorldsArgs
  | RconArgs
  | DoctorArgs
  | TuiArgs
  | HelpArgs
  | VersionArgs
  | (GlobalArgs & { command: null });

/** Schema for validating port numbers */
const PortSchema = z.number().int().min(1024).max(65535);

/**
 * Parses command line arguments into structured args object
 * @param args Raw command line arguments (typically Deno.args)
 * @returns Parsed arguments object
 */
export function parseArgs(args: string[]): ParsedArgs {
  const globalArgs: GlobalArgs = {
    help: false,
    version: false,
    debug: false,
    json: false,
    quiet: false,
  };

  // Check for global flags anywhere in args
  for (const arg of args) {
    if (arg === "-h" || arg === "--help") globalArgs.help = true;
    if (arg === "-v" || arg === "--version") globalArgs.version = true;
    if (arg === "-d" || arg === "--debug") globalArgs.debug = true;
    if (arg === "--json") globalArgs.json = true;
    if (arg === "-q" || arg === "--quiet") globalArgs.quiet = true;
  }

  // If --version flag, return version command
  if (globalArgs.version && !getCommand(args)) {
    return { ...globalArgs, command: "version" };
  }

  // If --help flag without command, return help command
  if (globalArgs.help && !getCommand(args)) {
    return { ...globalArgs, command: "help" };
  }

  // Get the command (first non-flag argument)
  const command = getCommand(args);

  // No command - default to TUI or return null command for help
  if (!command) {
    return { ...globalArgs, command: null };
  }

  // Parse command-specific args
  switch (command) {
    case "start":
      return parseStartArgs(args, globalArgs);
    case "stop":
      return parseStopArgs(args, globalArgs);
    case "install":
      return parseInstallArgs(args, globalArgs);
    case "config":
      return parseConfigArgs(args, globalArgs);
    case "worlds":
      return parseWorldsArgs(args, globalArgs);
    case "rcon":
      return parseRconArgs(args, globalArgs);
    case "doctor":
      return parseDoctorArgs(args, globalArgs);
    case "tui":
      return { ...globalArgs, command: "tui" };
    case "help":
      return parseHelpArgs(args, globalArgs);
    case "version":
      return { ...globalArgs, command: "version" };
    default:
      return { ...globalArgs, command: null };
  }
}

/**
 * Gets the command from args (first non-flag argument)
 */
function getCommand(args: string[]): Command | null {
  for (const arg of args) {
    if (arg.startsWith("-")) continue;

    const cmd = arg.toLowerCase();
    if (isValidCommand(cmd)) {
      return cmd;
    }
    break; // First non-flag should be command
  }
  return null;
}

/**
 * Checks if a string is a valid command
 */
function isValidCommand(cmd: string): cmd is Command {
  return [
    "start",
    "stop",
    "install",
    "config",
    "worlds",
    "rcon",
    "doctor",
    "tui",
    "help",
    "version",
  ].includes(cmd);
}

/**
 * Gets a flag value from args
 * @param args Arguments array
 * @param flag Flag name (with --)
 * @param shortFlag Optional short flag (with -)
 * @returns The value after the flag, or undefined
 */
function getFlagValue(
  args: string[],
  flag: string,
  shortFlag?: string
): string | undefined {
  for (let i = 0; i < args.length; i++) {
    if (args[i] === flag || (shortFlag && args[i] === shortFlag)) {
      return args[i + 1];
    }
    // Handle --flag=value syntax
    if (args[i].startsWith(`${flag}=`)) {
      return args[i].substring(flag.length + 1);
    }
  }
  return undefined;
}

/**
 * Checks if a flag is present in args
 */
function hasFlag(args: string[], flag: string, shortFlag?: string): boolean {
  return args.includes(flag) || (shortFlag ? args.includes(shortFlag) : false);
}

/**
 * Parses start command arguments
 */
function parseStartArgs(args: string[], global: GlobalArgs): StartArgs {
  const portStr = getFlagValue(args, "--port", "-p");
  let port: number | undefined;

  if (portStr) {
    const parsed = Number.parseInt(portStr, 10);
    if (!Number.isNaN(parsed)) {
      const result = PortSchema.safeParse(parsed);
      port = result.success ? result.data : undefined;
    }
  }

  return {
    ...global,
    command: "start",
    name: getFlagValue(args, "--name", "-n"),
    port,
    world: getFlagValue(args, "--world", "-w"),
    password: getFlagValue(args, "--password"),
    public: hasFlag(args, "--public"),
    crossplay: hasFlag(args, "--crossplay"),
    savedir: getFlagValue(args, "--savedir"),
    background: hasFlag(args, "--background", "-b"),
  };
}

/**
 * Parses stop command arguments
 */
function parseStopArgs(args: string[], global: GlobalArgs): StopArgs {
  const timeoutStr = getFlagValue(args, "--timeout", "-t");
  let timeout: number | undefined;

  if (timeoutStr) {
    const parsed = Number.parseInt(timeoutStr, 10);
    if (!Number.isNaN(parsed) && parsed > 0) {
      timeout = parsed;
    }
  }

  return {
    ...global,
    command: "stop",
    force: hasFlag(args, "--force", "-f"),
    timeout,
  };
}

/**
 * Parses install command arguments
 */
function parseInstallArgs(args: string[], global: GlobalArgs): InstallArgs {
  return {
    ...global,
    command: "install",
    dryRun: hasFlag(args, "--dry-run"),
    validate: hasFlag(args, "--validate"),
    force: hasFlag(args, "--force", "-f"),
  };
}

/**
 * Parses config command arguments
 */
function parseConfigArgs(args: string[], global: GlobalArgs): ConfigArgs {
  // Find subcommand (get, set, list, reset)
  const subcommands = ["get", "set", "list", "reset"];
  let subcommand: ConfigArgs["subcommand"] = "list";
  let argIndex = -1;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "config") {
      // Next non-flag arg might be subcommand
      for (let j = i + 1; j < args.length; j++) {
        if (!args[j].startsWith("-")) {
          if (subcommands.includes(args[j])) {
            subcommand = args[j] as ConfigArgs["subcommand"];
            argIndex = j;
          }
          break;
        }
      }
      break;
    }
  }

  // For get/set, the next args are key and value
  let key: string | undefined;
  let value: string | undefined;

  if (argIndex !== -1 && (subcommand === "get" || subcommand === "set")) {
    // Look for key and value after subcommand
    let found = 0;
    for (let i = argIndex + 1; i < args.length; i++) {
      if (!args[i].startsWith("-")) {
        if (found === 0) {
          key = args[i];
          found++;
        } else if (found === 1 && subcommand === "set") {
          value = args[i];
          break;
        }
      }
    }
  }

  return {
    ...global,
    command: "config",
    subcommand,
    key,
    value,
  };
}

/**
 * Parses worlds command arguments
 */
function parseWorldsArgs(args: string[], global: GlobalArgs): WorldsArgs {
  // Find subcommand (list, info, import, export, delete)
  const subcommands = ["list", "info", "import", "export", "delete"];
  let subcommand: WorldsArgs["subcommand"] = "list";
  let argIndex = -1;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "worlds") {
      for (let j = i + 1; j < args.length; j++) {
        if (!args[j].startsWith("-")) {
          if (subcommands.includes(args[j])) {
            subcommand = args[j] as WorldsArgs["subcommand"];
            argIndex = j;
          }
          break;
        }
      }
      break;
    }
  }

  // Get world name (next positional arg after subcommand)
  let name: string | undefined;
  if (argIndex !== -1) {
    for (let i = argIndex + 1; i < args.length; i++) {
      if (!args[i].startsWith("-")) {
        name = args[i];
        break;
      }
    }
  }

  return {
    ...global,
    command: "worlds",
    subcommand,
    name,
    path: getFlagValue(args, "--path"),
    force: hasFlag(args, "--force", "-f"),
  };
}

/**
 * Parses rcon command arguments
 */
function parseRconArgs(args: string[], global: GlobalArgs): RconArgs {
  // Find the command (everything after 'rcon' that's not a flag)
  let rconCommand: string | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "rcon") {
      // Look for the command after 'rcon' (first non-flag arg)
      for (let j = i + 1; j < args.length; j++) {
        if (!args[j].startsWith("-")) {
          rconCommand = args[j];
          break;
        }
      }
      break;
    }
  }

  const portStr = getFlagValue(args, "--port", "-p");
  let port: number | undefined;

  if (portStr) {
    const parsed = Number.parseInt(portStr, 10);
    if (!Number.isNaN(parsed) && parsed >= 1024 && parsed <= 65535) {
      port = parsed;
    }
  }

  const timeoutStr = getFlagValue(args, "--timeout", "-t");
  let timeout: number | undefined;

  if (timeoutStr) {
    const parsed = Number.parseInt(timeoutStr, 10);
    if (!Number.isNaN(parsed) && parsed > 0) {
      timeout = parsed;
    }
  }

  return {
    ...global,
    command: "rcon",
    rconCommand,
    host: getFlagValue(args, "--host", "-H"),
    port,
    password: getFlagValue(args, "--password", "-P"),
    timeout,
    interactive: hasFlag(args, "--interactive", "-i"),
  };
}

/**
 * Parses help command arguments
 */
function parseHelpArgs(args: string[], global: GlobalArgs): HelpArgs {
  // Get topic (next arg after help)
  let topic: string | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "help") {
      for (let j = i + 1; j < args.length; j++) {
        if (!args[j].startsWith("-")) {
          topic = args[j];
          break;
        }
      }
      break;
    }
  }

  return {
    ...global,
    command: "help",
    topic,
  };
}

/**
 * Parses doctor command arguments
 */
function parseDoctorArgs(args: string[], global: GlobalArgs): DoctorArgs {
  return {
    ...global,
    command: "doctor",
    fix: hasFlag(args, "--fix", "-f"),
  };
}

/**
 * Generates help text for the CLI
 * @param command Optional command to show help for
 * @returns Help text string
 */
export function getHelpText(command?: string): string {
  if (command) {
    return getCommandHelp(command);
  }

  return `
Land of OZ - Valheim Dedicated Server Manager

USAGE:
    valheim-dsm [OPTIONS] [COMMAND]

OPTIONS:
    -h, --help       Show this help message
    -v, --version    Show version information
    -d, --debug      Enable debug logging
    --json           Output results as JSON (machine-readable)
    -q, --quiet      Suppress non-essential output

COMMANDS:
    start            Start the Valheim server
    stop             Stop the Valheim server
    install          Install/update SteamCMD and Valheim
    config           Manage configuration
    worlds           Manage world saves
    rcon             Send RCON commands to server
    doctor           Diagnose common issues
    tui              Launch the TUI interface (default)
    help [COMMAND]   Show help for a command

Run 'valheim-dsm help <command>' for more information on a command.
`;
}

/**
 * Gets help text for a specific command
 */
function getCommandHelp(command: string): string {
  switch (command) {
    case "start":
      return `
Start the Valheim dedicated server

USAGE:
    valheim-dsm start [OPTIONS]

OPTIONS:
    -n, --name <NAME>      Server name (overrides config)
    -p, --port <PORT>      Server port (default: 2456)
    -w, --world <WORLD>    World name to load
    --password <PASS>      Server password
    --public               List server publicly
    --crossplay            Enable crossplay support
    --savedir <PATH>       Custom save directory
    -b, --background       Run in background

EXAMPLES:
    valheim-dsm start
    valheim-dsm start --name "My Server" --world "MyWorld"
    valheim-dsm start -p 2457 --public --crossplay
`;

    case "stop":
      return `
Stop the running Valheim server

USAGE:
    valheim-dsm stop [OPTIONS]

OPTIONS:
    -f, --force            Force kill without graceful shutdown
    -t, --timeout <MS>     Timeout before force kill (default: 30000)

EXAMPLES:
    valheim-dsm stop
    valheim-dsm stop --force
    valheim-dsm stop --timeout 60000
`;

    case "install":
      return `
Install or update SteamCMD and Valheim dedicated server

USAGE:
    valheim-dsm install [OPTIONS]

OPTIONS:
    --dry-run              Show what would be done without installing
    --validate             Validate existing installation
    -f, --force            Force reinstall even if already installed

EXAMPLES:
    valheim-dsm install
    valheim-dsm install --dry-run
    valheim-dsm install --force
`;

    case "config":
      return `
Manage server configuration

USAGE:
    valheim-dsm config <SUBCOMMAND> [OPTIONS]

SUBCOMMANDS:
    list                   Show all configuration (default)
    get <KEY>              Get a specific configuration value
    set <KEY> <VALUE>      Set a configuration value
    reset                  Reset configuration to defaults

KEYS:
    server.name            Server display name
    server.port            Server port (2456-65535)
    server.world           World name
    server.password        Server password
    server.public          List publicly (true/false)
    server.crossplay       Enable crossplay (true/false)
    watchdog.enabled       Auto-restart enabled (true/false)
    watchdog.maxRestarts   Max restart attempts

EXAMPLES:
    valheim-dsm config list
    valheim-dsm config get server.name
    valheim-dsm config set server.port 2457
    valheim-dsm config reset
`;

    case "worlds":
      return `
Manage Valheim world saves

USAGE:
    valheim-dsm worlds <SUBCOMMAND> [OPTIONS]

SUBCOMMANDS:
    list                   List available worlds (default)
    info <NAME>            Show details about a world
    import <NAME> --path   Import world files from a path
    export <NAME> --path   Export world files to a path
    delete <NAME>          Delete a world (requires --force)

OPTIONS:
    --path <PATH>          Path for import/export operations
    -f, --force            Required for delete, skip confirmation

EXAMPLES:
    valheim-dsm worlds list
    valheim-dsm worlds info MyWorld
    valheim-dsm worlds export MyWorld --path ./backup
    valheim-dsm worlds import MyWorld --path ./worlds
    valheim-dsm worlds delete OldWorld --force
`;

    case "tui":
      return `
Launch the Terminal User Interface

USAGE:
    valheim-dsm tui
    valheim-dsm --tui
    valheim-dsm          (default when no command)

The TUI provides an interactive interface for managing your
Valheim server with real-time status, log viewing, and
configuration editing.

KEYBOARD SHORTCUTS:
    1-4                Navigate screens
    Q or Ctrl+C        Quit
    S                  Start server (from Dashboard)
    X                  Stop server (from Dashboard)
`;

    case "rcon":
      return `
Send RCON commands to a running Valheim server

USAGE:
    valheim-dsm rcon <COMMAND> [OPTIONS]
    valheim-dsm rcon --interactive

OPTIONS:
    -H, --host <HOST>      Server hostname (default: localhost)
    -p, --port <PORT>      RCON port (default: 2458)
    -P, --password <PASS>  RCON password (or set via config)
    -t, --timeout <MS>     Command timeout (default: 5000)
    -i, --interactive      Start interactive RCON session

COMMANDS:
    save                   Force world save
    info                   Show server information
    kick <player>          Kick a player
    ban <player>           Ban a player
    unban <player>         Unban a player
    banned                 List banned players
    permitted              List permitted players

NOTE:
    RCON requires BepInEx + RCON mod installed on the server.
    Set password via: valheim-dsm config set rcon.password <pass>

EXAMPLES:
    valheim-dsm rcon save
    valheim-dsm rcon "kick PlayerName" --password secret
    valheim-dsm rcon --interactive -H 192.168.1.100
`;

    case "doctor":
      return `
Diagnose common issues with your Valheim server setup

USAGE:
    valheim-dsm doctor [OPTIONS]

OPTIONS:
    -f, --fix              Attempt to automatically fix issues
    --json                 Output results as JSON

CHECKS:
    - SteamCMD installation and version
    - Valheim dedicated server installation
    - Configuration file validity
    - Port availability (UDP 2456-2458)
    - Directory permissions
    - Required dependencies
    - World file integrity

EXAMPLES:
    valheim-dsm doctor
    valheim-dsm doctor --fix
    valheim-dsm doctor --json
`;

    default:
      return `Unknown command: ${command}\n\nRun 'valheim-dsm --help' for available commands.`;
  }
}
