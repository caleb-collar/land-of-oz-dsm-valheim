/**
 * RCON Client Implementation
 *
 * Provides a high-level API for connecting to RCON-enabled
 * Valheim servers (requires BepInEx + RCON mod).
 */

import { Socket } from "node:net";
import {
  createAuthPacket,
  createCommandPacket,
  decodePacket,
  isAuthFailure,
  isAuthSuccess,
} from "./protocol.js";
import {
  type RconConfig,
  RconError,
  type RconPacket,
  type RconState,
} from "./types.js";

/** Default configuration values */
const DEFAULT_TIMEOUT = 5000;
const DEFAULT_PORT = 25575;

/**
 * RCON Client for Valheim servers
 *
 * @example
 * ```typescript
 * const client = new RconClient({
 *   host: "localhost",
 *   port: 25575,
 *   password: "secret"
 * });
 *
 * await client.connect();
 * const response = await client.send("save");
 * console.log(response);
 * await client.disconnect();
 * ```
 */
export class RconClient {
  private socket: Socket | null = null;
  private state: RconState = "disconnected";
  private requestId = 0;
  private receiveBuffer = Buffer.alloc(0);
  private pendingRequests = new Map<
    number,
    {
      resolve: (value: string) => void;
      reject: (error: Error) => void;
      timeout: ReturnType<typeof setTimeout>;
    }
  >();

  constructor(private readonly config: RconConfig) {
    this.config.port = config.port ?? DEFAULT_PORT;
    this.config.timeout = config.timeout ?? DEFAULT_TIMEOUT;
  }

  /** Get current connection state */
  getState(): RconState {
    return this.state;
  }

  /** Check if connected and authenticated */
  isConnected(): boolean {
    return this.state === "connected";
  }

  /**
   * Connect and authenticate with the RCON server
   */
  async connect(): Promise<void> {
    if (this.state !== "disconnected" && this.state !== "error") {
      throw new RconError("CONNECTION_FAILED", `Already ${this.state}`);
    }

    this.state = "connecting";

    try {
      // Connect with timeout
      await this.connectWithTimeout();
      this.state = "authenticating";

      // Authenticate
      await this.authenticate();

      this.state = "connected";
    } catch (error) {
      this.state = "error";
      this.cleanup();
      throw error;
    }
  }

  /**
   * Disconnect from the RCON server
   */
  disconnect(): void {
    if (this.state === "disconnected") {
      return;
    }

    this.cleanup();
    this.state = "disconnected";
  }

  /**
   * Send a command and wait for response
   */
  async send(command: string): Promise<string> {
    if (this.state !== "connected") {
      throw new RconError("DISCONNECTED", "Not connected to RCON server");
    }

    const id = this.nextRequestId();
    const packet = createCommandPacket(id, command);

    // Create promise for response
    const response = this.waitForResponse(id);

    // Send packet
    try {
      await this.writeToSocket(packet);
    } catch (error) {
      this.pendingRequests.delete(id);
      this.state = "error";
      throw new RconError(
        "DISCONNECTED",
        `Failed to send command: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    return response;
  }

  private writeToSocket(data: Uint8Array): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new RconError("DISCONNECTED", "Not connected"));
        return;
      }
      this.socket.write(Buffer.from(data), (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  private connectWithTimeout(): Promise<void> {
    const timeout = this.config.timeout ?? DEFAULT_TIMEOUT;

    return new Promise((resolve, reject) => {
      const socket = new Socket();
      let connectTimeout: ReturnType<typeof setTimeout> | null = null;

      const cleanup = () => {
        if (connectTimeout) {
          clearTimeout(connectTimeout);
          connectTimeout = null;
        }
      };

      connectTimeout = setTimeout(() => {
        cleanup();
        socket.destroy();
        reject(
          new RconError("TIMEOUT", `Connection timeout after ${timeout}ms`)
        );
      }, timeout);

      socket.once("connect", () => {
        cleanup();
        this.socket = socket;
        this.setupSocketListeners();
        resolve();
      });

      socket.once("error", (err) => {
        cleanup();
        reject(
          new RconError(
            "CONNECTION_FAILED",
            `Failed to connect: ${err.message}`
          )
        );
      });

      socket.connect(this.config.port, this.config.host);
    });
  }

  private setupSocketListeners(): void {
    if (!this.socket) return;

    this.socket.on("data", (data: Buffer) => {
      // Append to receive buffer
      this.receiveBuffer = Buffer.concat([this.receiveBuffer, data]);

      // Process complete packets
      this.processPackets();
    });

    this.socket.on("error", (error) => {
      if (this.state === "connected") {
        this.state = "error";
        // Reject all pending requests
        for (const [id, request] of this.pendingRequests) {
          request.reject(
            new RconError("DISCONNECTED", `Connection lost: ${error.message}`)
          );
          this.pendingRequests.delete(id);
        }
      }
    });

    this.socket.on("close", () => {
      if (this.state === "connected") {
        this.state = "disconnected";
        // Reject all pending requests
        for (const [id, request] of this.pendingRequests) {
          request.reject(new RconError("DISCONNECTED", "Connection closed"));
          this.pendingRequests.delete(id);
        }
        this.pendingRequests.clear();
      }
    });
  }

  private async authenticate(): Promise<void> {
    const id = this.nextRequestId();
    const packet = createAuthPacket(id, this.config.password);

    // Create promise for auth response
    const authPromise = new Promise<RconPacket>((resolve, reject) => {
      const timeout = this.config.timeout ?? DEFAULT_TIMEOUT;
      const timeoutId = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(
          new RconError("TIMEOUT", `Authentication timeout after ${timeout}ms`)
        );
      }, timeout);

      // Store raw packet handler for auth
      this.pendingRequests.set(id, {
        resolve: (body: string) => {
          clearTimeout(timeoutId);
          resolve({ id, type: 2, body });
        },
        reject: (error: Error) => {
          clearTimeout(timeoutId);
          reject(error);
        },
        timeout: timeoutId,
      });
    });

    // Send auth packet
    await this.writeToSocket(packet);

    // Wait for response and validate
    const response = await authPromise;

    if (isAuthFailure(response)) {
      throw new RconError("AUTH_FAILED", "Invalid RCON password");
    }

    if (!isAuthSuccess(response, id)) {
      throw new RconError("AUTH_FAILED", "Unexpected authentication response");
    }
  }

  private waitForResponse(id: number): Promise<string> {
    const timeout = this.config.timeout ?? DEFAULT_TIMEOUT;

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new RconError("TIMEOUT", `Response timeout after ${timeout}ms`));
      }, timeout);

      this.pendingRequests.set(id, {
        resolve: (body: string) => {
          clearTimeout(timeoutId);
          resolve(body);
        },
        reject: (error: Error) => {
          clearTimeout(timeoutId);
          reject(error);
        },
        timeout: timeoutId,
      });
    });
  }

  private processPackets(): void {
    while (this.receiveBuffer.length > 0) {
      try {
        const result = decodePacket(new Uint8Array(this.receiveBuffer));
        if (!result) {
          // Incomplete packet, wait for more data
          break;
        }

        const { packet, bytesRead } = result;

        // Remove processed bytes
        this.receiveBuffer = this.receiveBuffer.subarray(bytesRead);

        // Handle packet
        this.handlePacket(packet);
      } catch (error) {
        // Protocol error, reject all pending requests
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        for (const [id, request] of this.pendingRequests) {
          request.reject(new RconError("PROTOCOL_ERROR", errorMessage));
          this.pendingRequests.delete(id);
        }
        break;
      }
    }
  }

  private handlePacket(packet: RconPacket): void {
    // Handle auth failure specially - id is -1, not the original request id
    if (isAuthFailure(packet) && this.state === "authenticating") {
      // Reject the first (auth) pending request
      for (const [id, request] of this.pendingRequests) {
        this.pendingRequests.delete(id);
        request.reject(new RconError("AUTH_FAILED", "Invalid RCON password"));
        break;
      }
      return;
    }

    const request = this.pendingRequests.get(packet.id);
    if (request) {
      this.pendingRequests.delete(packet.id);
      request.resolve(packet.body);
    }
    // Packets without matching requests are ignored
  }

  private nextRequestId(): number {
    // Use incrementing IDs, wrap at max safe int
    this.requestId = (this.requestId + 1) % 0x7fffffff;
    return this.requestId;
  }

  private cleanup(): void {
    // Clear all pending requests
    for (const [id, request] of this.pendingRequests) {
      clearTimeout(request.timeout);
      request.reject(new RconError("DISCONNECTED", "Connection closed"));
      this.pendingRequests.delete(id);
    }

    // Close socket
    if (this.socket) {
      try {
        this.socket.destroy();
      } catch {
        // Ignore close errors
      }
      this.socket = null;
    }

    // Clear buffer
    this.receiveBuffer = Buffer.alloc(0);
  }
}
