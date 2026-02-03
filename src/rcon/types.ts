/**
 * RCON Types and Constants
 *
 * Implements Source RCON protocol types as used by BepInEx RCON mods.
 * @see https://developer.valvesoftware.com/wiki/Source_RCON_Protocol
 */

/** RCON packet types */
export const PacketType = {
  /** Authentication request */
  SERVERDATA_AUTH: 3,
  /** Authentication response */
  SERVERDATA_AUTH_RESPONSE: 2,
  /** Execute command */
  SERVERDATA_EXECCOMMAND: 2,
  /** Command response */
  SERVERDATA_RESPONSE_VALUE: 0,
} as const;

export type PacketType = (typeof PacketType)[keyof typeof PacketType];

/** RCON packet structure */
export type RconPacket = {
  /** Unique request ID */
  id: number;
  /** Packet type */
  type: PacketType;
  /** Packet body (command or response) */
  body: string;
};

/** RCON client configuration */
export type RconConfig = {
  /** Server hostname or IP */
  host: string;
  /** RCON port (default: 25575) */
  port: number;
  /** RCON password */
  password: string;
  /** Connection timeout in milliseconds (default: 5000) */
  timeout?: number;
  /** Auto-reconnect on disconnect (default: false) */
  autoReconnect?: boolean;
};

/** RCON connection state */
export type RconState =
  | "disconnected"
  | "connecting"
  | "authenticating"
  | "connected"
  | "error";

/** RCON error types */
export type RconErrorCode =
  | "CONNECTION_FAILED"
  | "AUTH_FAILED"
  | "TIMEOUT"
  | "DISCONNECTED"
  | "PROTOCOL_ERROR";

/** RCON error */
export class RconError extends Error {
  constructor(
    public readonly code: RconErrorCode,
    message: string
  ) {
    super(message);
    this.name = "RconError";
  }
}

/** Common Valheim server commands */
export const ValheimCommands = {
  // Server Management
  /** Force save world */
  SAVE: "save",
  /** Get server info */
  INFO: "info",
  /** Ping server */
  PING: "ping",

  // Player Management
  /** Kick player */
  kick: (player: string) => `kick ${player}`,
  /** Ban player */
  ban: (player: string) => `ban ${player}`,
  /** Unban player */
  unban: (player: string) => `unban ${player}`,
  /** List banned players */
  BANNED: "banned",
  /** List permitted players */
  PERMITTED: "permitted",

  // Time Control
  /** Sleep through night (skip to morning) */
  SLEEP: "sleep",
  /** Skip time by seconds */
  skiptime: (seconds: number) => `skiptime ${seconds}`,

  // Events
  /** Trigger specific event */
  event: (eventName: string) => `event ${eventName}`,
  /** Trigger random event */
  RANDOMEVENT: "randomevent",
  /** Stop current event */
  STOPEVENT: "stopevent",

  // World Management
  /** Remove all dropped items */
  REMOVEDROPS: "removedrops",
  /** Set a global key */
  setkey: (key: string) => `setkey ${key}`,
  /** Remove a global key */
  removekey: (key: string) => `removekey ${key}`,
  /** Reset all global keys */
  RESETKEYS: "resetkeys",
  /** List all global keys */
  LISTKEYS: "listkeys",

  // Performance
  /** Set LOD bias (0-5, lower = better performance) */
  lodbias: (value: number) => `lodbias ${value}`,
  /** Set LOD distance (100-6000) */
  loddist: (value: number) => `loddist ${value}`,
} as const;

/** Valheim random events */
export const ValheimEvents = {
  ARMY_EIKTHYR: "army_eikthyr",
  ARMY_THEELDER: "army_theelder",
  ARMY_BONEMASS: "army_bonemass",
  ARMY_MODER: "army_moder",
  ARMY_GOBLIN: "army_goblin",
  FORESTTROLLS: "foresttrolls",
  SKELETONS: "skeletons",
  BLOBS: "blobs",
  WOLVES: "wolves",
  BATS: "bats",
  SERPENTS: "serpents",
} as const;

/** Global keys for boss defeats and progression */
export const ValheimGlobalKeys = {
  DEFEATED_EIKTHYR: "defeated_eikthyr",
  DEFEATED_GDKING: "defeated_gdking", // The Elder
  DEFEATED_BONEMASS: "defeated_bonemass",
  DEFEATED_DRAGON: "defeated_dragon", // Moder
  DEFEATED_GOBLINKING: "defeated_goblinking", // Yagluth
  DEFEATED_QUEEN: "defeated_queen",
  KILLED_TROLL: "KilledTroll",
  KILLED_BAT: "KilledBat",
  KILLED_SURTLING: "KilledSurtling",
} as const;
