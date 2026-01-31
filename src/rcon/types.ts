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
  /** Force save world */
  SAVE: "save",
  /** Get server info */
  INFO: "info",
  /** Ping server */
  PING: "ping",
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
} as const;
