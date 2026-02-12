/**
 * RCON Client
 * Implements Source RCON protocol for communicating with game servers
 */

import { Socket } from "node:net";
import {
  decodePacket,
  encodePacket,
  hasCompletePacket,
  SERVERDATA_AUTH,
  SERVERDATA_AUTH_RESPONSE,
  SERVERDATA_EXECCOMMAND,
  SERVERDATA_RESPONSE_VALUE,
} from "./protocol.js";
import { type RconConfig, RconError } from "./types.js";

/** Default timeout in milliseconds */
const DEFAULT_TIMEOUT = 5000;

/**
 * Source RCON protocol client
 *
 * Usage:
 * ```ts
 * const client = new RconClient({ host: "localhost", port: 25575, password: "secret" });
 * await client.connect();
 * const response = await client.send("save");
 * await client.disconnect();
 * ```
 */
export class RconClient {
  private readonly host: string;
  private readonly port: number;
  private readonly password: string;
  private readonly timeout: number;
  private socket: Socket | null = null;
  private connected = false;
  private requestId = 0;
  private responseBuffer = Buffer.alloc(0);
  private pendingResponses = new Map<
    number,
    {
      resolve: (value: string) => void;
      reject: (reason: Error) => void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();

  constructor(config: RconConfig) {
    this.host = config.host;
    this.port = config.port;
    this.password = config.password;
    this.timeout = config.timeout ?? DEFAULT_TIMEOUT;
  }

  /**
   * Connect and authenticate with the RCON server
   * @throws RconError on connection or authentication failure
   */
  async connect(): Promise<void> {
    if (this.connected) return;

    return new Promise<void>((resolve, reject) => {
      const socket = new Socket();
      this.socket = socket;

      const connectTimer = setTimeout(() => {
        socket.destroy();
        reject(new RconError("TIMEOUT", "Connection timed out"));
      }, this.timeout);

      socket.on("error", (err) => {
        clearTimeout(connectTimer);
        this.cleanup();
        if (err.message.includes("ECONNREFUSED")) {
          reject(
            new RconError("CONNECTION_REFUSED", "Connection refused by server")
          );
        } else {
          reject(new RconError("UNKNOWN", err.message));
        }
      });

      socket.on("close", () => {
        this.cleanup();
      });

      socket.on("data", (data: Buffer) => {
        this.handleData(data);
      });

      socket.connect(this.port, this.host, () => {
        clearTimeout(connectTimer);

        // Send authentication
        this.authenticate()
          .then(() => {
            this.connected = true;
            resolve();
          })
          .catch((err) => {
            this.cleanup();
            reject(err);
          });
      });
    });
  }

  /**
   * Disconnect from the RCON server
   */
  disconnect(): void {
    this.cleanup();
  }

  /**
   * Send a command and receive the response
   * @param command Command string to send
   * @returns Server response string
   * @throws RconError if not connected or command fails
   */
  async send(command: string): Promise<string> {
    if (!this.connected || !this.socket) {
      throw new RconError("DISCONNECTED", "Not connected to RCON server");
    }

    const id = this.nextId();

    return new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingResponses.delete(id);
        reject(new RconError("TIMEOUT", "Command response timed out"));
      }, this.timeout);

      this.pendingResponses.set(id, { resolve, reject, timer });

      const packet = encodePacket(id, SERVERDATA_EXECCOMMAND, command);
      this.socket!.write(packet);
    });
  }

  /**
   * Check if the client is currently connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /** Send authentication packet and wait for response */
  private async authenticate(): Promise<void> {
    const id = this.nextId();

    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingResponses.delete(id);
        reject(new RconError("TIMEOUT", "Authentication timed out"));
      }, this.timeout);

      this.pendingResponses.set(id, {
        resolve: () => resolve(),
        reject,
        timer,
      });

      const packet = encodePacket(id, SERVERDATA_AUTH, this.password);
      this.socket!.write(packet);
    });
  }

  /** Handle incoming data from the socket */
  private handleData(data: Buffer): void {
    this.responseBuffer = Buffer.concat([this.responseBuffer, data]);

    while (hasCompletePacket(this.responseBuffer)) {
      const packet = decodePacket(this.responseBuffer);
      const totalPacketLen = 4 + packet.size;
      this.responseBuffer = this.responseBuffer.subarray(totalPacketLen);

      this.handlePacket(packet.id, packet.type, packet.body);
    }
  }

  /** Handle a decoded packet */
  private handlePacket(id: number, type: number, body: string): void {
    // Auth response check — id === -1 means auth failed
    if (type === SERVERDATA_AUTH_RESPONSE) {
      if (id === -1) {
        const pending = this.pendingResponses.get(this.requestId - 1);
        if (pending) {
          clearTimeout(pending.timer);
          this.pendingResponses.delete(this.requestId - 1);
          pending.reject(
            new RconError("AUTH_FAILED", "Authentication failed: bad password")
          );
        }
        return;
      }

      // Successful auth
      const pending = this.pendingResponses.get(id);
      if (pending) {
        clearTimeout(pending.timer);
        this.pendingResponses.delete(id);
        pending.resolve(body);
      }
      return;
    }

    if (type === SERVERDATA_RESPONSE_VALUE) {
      const pending = this.pendingResponses.get(id);
      if (pending) {
        clearTimeout(pending.timer);
        this.pendingResponses.delete(id);
        pending.resolve(body);
      }
    }
  }

  /** Generate the next request ID (wraps at 2^31 to stay within int32 range) */
  private nextId(): number {
    this.requestId = (this.requestId + 1) & 0x7fffffff;
    return this.requestId;
  }

  /** Clean up socket and pending responses */
  private cleanup(): void {
    this.connected = false;

    for (const [id, pending] of this.pendingResponses) {
      clearTimeout(pending.timer);
      pending.reject(new RconError("DISCONNECTED", "Connection closed"));
      this.pendingResponses.delete(id);
    }

    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.destroy();
      this.socket = null;
    }

    this.responseBuffer = Buffer.alloc(0);
  }
}

// Re-export RconError from types for convenience
export { RconError } from "./types.js";
