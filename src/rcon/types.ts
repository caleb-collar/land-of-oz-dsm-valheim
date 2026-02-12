/**
 * RCON types and response handling
 * Defines types for the Source RCON protocol client
 */

/** RCON client configuration */
export type RconConfig = {
  host: string;
  port: number;
  password: string;
  timeout?: number;
};

/** RCON packet structure */
export type RconPacket = {
  size: number;
  id: number;
  type: number;
  body: string;
};

/** RCON response from server */
export type RconResponse = {
  id: number;
  type: number;
  body: string;
};

/** RCON error codes */
export type RconErrorCode =
  | "DISCONNECTED"
  | "AUTH_FAILED"
  | "TIMEOUT"
  | "CONNECTION_REFUSED"
  | "PROTOCOL_ERROR"
  | "UNKNOWN";

/** Custom error class for RCON operations */
export class RconError extends Error {
  readonly code: RconErrorCode;

  constructor(code: RconErrorCode, message: string) {
    super(message);
    this.name = "RconError";
    this.code = code;
  }
}

/** RCON manager configuration (extends base config with manager-specific options) */
export type RconManagerConfig = {
  host: string;
  port: number;
  password: string;
  timeout: number;
  enabled: boolean;
  autoReconnect: boolean;
};

/** RCON connection state */
export type ConnectionState =
  | "connected"
  | "disconnected"
  | "connecting"
  | "error";

/** RCON manager callbacks for state updates */
export type RconManagerCallbacks = {
  onConnectionStateChange: (state: ConnectionState) => void;
  onPlayerListUpdate: (players: string[]) => void;
  pollInterval: number;
};
