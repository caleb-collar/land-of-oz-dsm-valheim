/**
 * RCON Client Implementation
 *
 * Provides a high-level API for connecting to RCON-enabled
 * Valheim servers (requires BepInEx + RCON mod).
 */

import {
  type RconConfig,
  RconError,
  type RconPacket,
  type RconState,
} from "./types.ts";
import {
  createAuthPacket,
  createCommandPacket,
  decodePacket,
  isAuthFailure,
  isAuthSuccess,
} from "./protocol.ts";

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
  private connection: Deno.TcpConn | null = null;
  private state: RconState = "disconnected";
  private requestId = 0;
  private receiveBuffer = new Uint8Array(0);
  private pendingRequests = new Map<
    number,
    {
      resolve: (value: string) => void;
      reject: (error: Error) => void;
      timeout: number;
    }
  >();
  private readLoop: Promise<void> | null = null;

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
      this.connection = await this.connectWithTimeout();
      this.state = "authenticating";

      // Start read loop
      this.readLoop = this.startReadLoop();

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
      await this.connection!.write(packet);
    } catch (error) {
      this.pendingRequests.delete(id);
      this.state = "error";
      throw new RconError(
        "DISCONNECTED",
        `Failed to send command: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    return response;
  }

  private async connectWithTimeout(): Promise<Deno.TcpConn> {
    const timeout = this.config.timeout ?? DEFAULT_TIMEOUT;

    const connectPromise = Deno.connect({
      hostname: this.config.host,
      port: this.config.port,
    });

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(
          new RconError("TIMEOUT", `Connection timeout after ${timeout}ms`),
        );
      }, timeout);
    });

    return await Promise.race([connectPromise, timeoutPromise]);
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
          new RconError("TIMEOUT", `Authentication timeout after ${timeout}ms`),
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
    await this.connection!.write(packet);

    // Wait for response and validate
    const response = await authPromise;

    if (isAuthFailure(response)) {
      throw new RconError("AUTH_FAILED", "Invalid RCON password");
    }

    if (!isAuthSuccess(response, id)) {
      throw new RconError(
        "AUTH_FAILED",
        "Unexpected authentication response",
      );
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

  private async startReadLoop(): Promise<void> {
    const buffer = new Uint8Array(4096);

    try {
      while (this.connection) {
        const bytesRead = await this.connection.read(buffer);

        if (bytesRead === null) {
          // Connection closed
          break;
        }

        // Append to receive buffer
        const newBuffer = new Uint8Array(
          this.receiveBuffer.length + bytesRead,
        );
        newBuffer.set(this.receiveBuffer);
        newBuffer.set(buffer.subarray(0, bytesRead), this.receiveBuffer.length);
        this.receiveBuffer = newBuffer;

        // Process complete packets
        this.processPackets();
      }
    } catch (error) {
      // Connection error
      if (this.state === "connected") {
        this.state = "error";
        const errorMessage = error instanceof Error
          ? error.message
          : String(error);
        // Reject all pending requests
        for (const [id, request] of this.pendingRequests) {
          request.reject(
            new RconError("DISCONNECTED", `Connection lost: ${errorMessage}`),
          );
          this.pendingRequests.delete(id);
        }
      }
    }
  }

  private processPackets(): void {
    while (this.receiveBuffer.length > 0) {
      try {
        const result = decodePacket(this.receiveBuffer);
        if (!result) {
          // Incomplete packet, wait for more data
          break;
        }

        const { packet, bytesRead } = result;

        // Remove processed bytes
        this.receiveBuffer = this.receiveBuffer.slice(bytesRead);

        // Handle packet
        this.handlePacket(packet);
      } catch (error) {
        // Protocol error, reject all pending requests
        const errorMessage = error instanceof Error
          ? error.message
          : String(error);
        for (const [id, request] of this.pendingRequests) {
          request.reject(new RconError("PROTOCOL_ERROR", errorMessage));
          this.pendingRequests.delete(id);
        }
        break;
      }
    }
  }

  private handlePacket(packet: RconPacket): void {
    const request = this.pendingRequests.get(packet.id);
    if (request) {
      this.pendingRequests.delete(packet.id);
      request.resolve(packet.body);
    }
    // Packets without matching requests are ignored
  }

  private nextRequestId(): number {
    // Use incrementing IDs, wrap at max safe int
    this.requestId = (this.requestId + 1) % 0x7FFFFFFF;
    return this.requestId;
  }

  private cleanup(): void {
    // Clear all pending requests
    for (const [id, request] of this.pendingRequests) {
      clearTimeout(request.timeout);
      request.reject(new RconError("DISCONNECTED", "Connection closed"));
      this.pendingRequests.delete(id);
    }

    // Close connection
    if (this.connection) {
      try {
        this.connection.close();
      } catch {
        // Ignore close errors
      }
      this.connection = null;
    }

    // Clear buffer
    this.receiveBuffer = new Uint8Array(0);
  }
}
