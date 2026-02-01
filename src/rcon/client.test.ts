/**
 * RCON Client Integration Tests
 *
 * Tests the RconClient against a mock RCON server to verify
 * connection, authentication, and command execution.
 */

import { createServer, type Server, type Socket } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { RconClient } from "./client.js";
import { encodePacket, PacketType, RconError } from "./mod.js";

/**
 * Creates a mock RCON server for testing
 */
function createMockRconServer(options: {
  port: number;
  password: string;
  responses?: Map<string, string>;
}): {
  start: () => Promise<void>;
  stop: () => Promise<void>;
  getReceivedCommands: () => string[];
} {
  let server: Server | null = null;
  const sockets: Set<Socket> = new Set();
  const receivedCommands: string[] = [];

  const start = async () => {
    return new Promise<void>((resolve, reject) => {
      server = createServer((socket) => {
        sockets.add(socket);
        let receiveBuffer = Buffer.alloc(0);

        socket.on("data", (data) => {
          // Append to buffer
          receiveBuffer = Buffer.concat([receiveBuffer, data]);

          // Process packets
          while (receiveBuffer.length >= 4) {
            const size = receiveBuffer.readInt32LE(0);
            const totalSize = size + 4;

            if (receiveBuffer.length < totalSize) break;

            // Extract packet
            const id = receiveBuffer.readInt32LE(4);
            const type = receiveBuffer.readInt32LE(8);

            // Extract body (between offset 12 and end - 2 null terminators)
            const bodyEnd = totalSize - 2;
            const bodyBytes = receiveBuffer.subarray(12, bodyEnd);
            const body = bodyBytes.toString("utf-8");

            // Remove processed packet
            receiveBuffer = receiveBuffer.subarray(totalSize);

            // Handle packet
            if (type === PacketType.SERVERDATA_AUTH) {
              // Authentication request
              if (body === options.password) {
                // Send auth success
                const response = encodePacket({
                  id,
                  type: PacketType.SERVERDATA_AUTH_RESPONSE,
                  body: "",
                });
                socket.write(response);
              } else {
                // Send auth failure (id = -1)
                const response = encodePacket({
                  id: -1,
                  type: PacketType.SERVERDATA_AUTH_RESPONSE,
                  body: "",
                });
                socket.write(response);
              }
            } else if (type === PacketType.SERVERDATA_EXECCOMMAND) {
              // Command execution
              receivedCommands.push(body);

              // Get response or use default
              const responseBody =
                options.responses?.get(body) ?? `Command executed: ${body}`;

              const response = encodePacket({
                id,
                type: PacketType.SERVERDATA_RESPONSE_VALUE,
                body: responseBody,
              });
              socket.write(response);
            }
          }
        });

        socket.on("close", () => {
          sockets.delete(socket);
        });

        socket.on("error", () => {
          sockets.delete(socket);
        });
      });

      server.on("error", reject);
      server.listen(options.port, "127.0.0.1", () => {
        resolve();
      });
    });
  };

  const stop = async () => {
    return new Promise<void>((resolve) => {
      for (const socket of sockets) {
        socket.destroy();
      }
      sockets.clear();
      if (server) {
        server.close(() => {
          server = null;
          resolve();
        });
      } else {
        resolve();
      }
    });
  };

  return {
    start,
    stop,
    getReceivedCommands: () => [...receivedCommands],
  };
}

// Find an available port for testing
function findAvailablePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address && typeof address === "object") {
        const port = address.port;
        server.close(() => resolve(port));
      } else {
        reject(new Error("Could not get port"));
      }
    });
    server.on("error", reject);
  });
}

describe("RconClient", () => {
  let server: ReturnType<typeof createMockRconServer> | null = null;

  afterEach(async () => {
    if (server) {
      await server.stop();
      server = null;
    }
  });

  it("connects and authenticates successfully", async () => {
    const port = await findAvailablePort();
    const password = "testpassword";

    server = createMockRconServer({ port, password });
    await server.start();

    const client = new RconClient({
      host: "127.0.0.1",
      port,
      password,
      timeout: 2000,
    });

    expect(client.getState()).toBe("disconnected");
    expect(client.isConnected()).toBe(false);

    await client.connect();

    expect(client.getState()).toBe("connected");
    expect(client.isConnected()).toBe(true);

    client.disconnect();

    expect(client.getState()).toBe("disconnected");
    expect(client.isConnected()).toBe(false);
  });

  it("rejects invalid password", async () => {
    const port = await findAvailablePort();
    const password = "correctpassword";

    server = createMockRconServer({ port, password });
    await server.start();

    const client = new RconClient({
      host: "127.0.0.1",
      port,
      password: "wrongpassword",
      timeout: 2000,
    });

    await expect(client.connect()).rejects.toThrow("Invalid RCON password");

    expect(client.getState()).toBe("error");
  });

  it("sends commands and receives responses", async () => {
    const port = await findAvailablePort();
    const password = "secret";

    const responses = new Map([
      ["save", "World saved successfully"],
      ["info", "Server: TestServer, Players: 3/10"],
      ["ping", "pong"],
    ]);

    server = createMockRconServer({ port, password, responses });
    await server.start();

    const client = new RconClient({
      host: "127.0.0.1",
      port,
      password,
      timeout: 2000,
    });

    await client.connect();

    const saveResponse = await client.send("save");
    expect(saveResponse).toBe("World saved successfully");

    const infoResponse = await client.send("info");
    expect(infoResponse).toBe("Server: TestServer, Players: 3/10");

    const pingResponse = await client.send("ping");
    expect(pingResponse).toBe("pong");

    // Verify server received all commands
    const received = server.getReceivedCommands();
    expect(received).toEqual(["save", "info", "ping"]);

    client.disconnect();
  });

  it("handles default command response", async () => {
    const port = await findAvailablePort();
    const password = "test";

    server = createMockRconServer({ port, password });
    await server.start();

    const client = new RconClient({
      host: "127.0.0.1",
      port,
      password,
      timeout: 2000,
    });

    await client.connect();

    const response = await client.send("unknown_command");
    expect(response).toBe("Command executed: unknown_command");

    client.disconnect();
  });

  it("throws when sending without connection", async () => {
    const client = new RconClient({
      host: "127.0.0.1",
      port: 12345,
      password: "test",
    });

    await expect(client.send("save")).rejects.toThrow(
      "Not connected to RCON server"
    );
  });

  it("throws when connecting twice", async () => {
    const port = await findAvailablePort();
    const password = "test";

    server = createMockRconServer({ port, password });
    await server.start();

    const client = new RconClient({
      host: "127.0.0.1",
      port,
      password,
      timeout: 2000,
    });

    await client.connect();

    await expect(client.connect()).rejects.toThrow("Already connected");

    client.disconnect();
  });

  it("connection timeout on unreachable host", async () => {
    const client = new RconClient({
      host: "192.0.2.1", // TEST-NET-1, guaranteed unreachable
      port: 25575,
      password: "test",
      timeout: 500,
    });

    await expect(client.connect()).rejects.toThrow(RconError);
  });

  it("disconnect is idempotent", async () => {
    const port = await findAvailablePort();
    const password = "test";

    server = createMockRconServer({ port, password });
    await server.start();

    const client = new RconClient({
      host: "127.0.0.1",
      port,
      password,
      timeout: 2000,
    });

    await client.connect();
    expect(client.getState()).toBe("connected");

    // First disconnect
    client.disconnect();
    expect(client.getState()).toBe("disconnected");

    // Second disconnect should be safe
    client.disconnect();
    expect(client.getState()).toBe("disconnected");
  });

  it("handles multiple sequential commands", async () => {
    const port = await findAvailablePort();
    const password = "test";

    server = createMockRconServer({ port, password });
    await server.start();

    const client = new RconClient({
      host: "127.0.0.1",
      port,
      password,
      timeout: 2000,
    });

    await client.connect();

    // Send multiple commands sequentially
    for (let i = 0; i < 5; i++) {
      const response = await client.send(`command_${i}`);
      expect(response).toBe(`Command executed: command_${i}`);
    }

    const received = server.getReceivedCommands();
    expect(received.length).toBe(5);

    client.disconnect();
  });

  it("handles commands with special characters", async () => {
    const port = await findAvailablePort();
    const password = "test";

    const responses = new Map([
      ["kick Player Name", "Player 'Player Name' kicked"],
      ["say Hello, World!", "Message sent"],
    ]);

    server = createMockRconServer({ port, password, responses });
    await server.start();

    const client = new RconClient({
      host: "127.0.0.1",
      port,
      password,
      timeout: 2000,
    });

    await client.connect();

    const kickResponse = await client.send("kick Player Name");
    expect(kickResponse).toBe("Player 'Player Name' kicked");

    const sayResponse = await client.send("say Hello, World!");
    expect(sayResponse).toBe("Message sent");

    client.disconnect();
  });
});
