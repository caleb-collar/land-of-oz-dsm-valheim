/**
 * RCON Client Integration Tests
 *
 * Tests the RconClient against a mock RCON server to verify
 * connection, authentication, and command execution.
 *
 * Note: These tests use sanitizeResources: false and sanitizeOps: false
 * because the RCON client uses background read loops that are intentionally
 * not awaited (fire-and-forget pattern for continuous socket reading).
 */

import { assertEquals, assertRejects } from "@std/assert";
import { RconClient } from "./client.ts";
import { encodePacket, PacketType, RconError } from "./mod.ts";

/** Test options to disable sanitizers for integration tests */
const integrationTestOptions = {
  sanitizeResources: false,
  sanitizeOps: false,
};

/**
 * Creates a mock RCON server for testing
 */
function createMockRconServer(options: {
  port: number;
  password: string;
  responses?: Map<string, string>;
}): {
  start: () => Promise<void>;
  stop: () => void;
  getReceivedCommands: () => string[];
} {
  let listener: Deno.TcpListener | null = null;
  let connections: Deno.TcpConn[] = [];
  const receivedCommands: string[] = [];
  let running = false;

  const start = async () => {
    listener = Deno.listen({ port: options.port });
    running = true;

    (async () => {
      try {
        while (running && listener) {
          const conn = await listener.accept();
          connections.push(conn);
          handleConnection(conn);
        }
      } catch {
        // Listener closed
      }
    })();

    // Give the listener time to start
    await new Promise((resolve) => setTimeout(resolve, 50));
  };

  const handleConnection = async (conn: Deno.TcpConn) => {
    const buffer = new Uint8Array(4096);
    let receiveBuffer = new Uint8Array(0);

    try {
      while (running) {
        const bytesRead = await conn.read(buffer);
        if (bytesRead === null) break;

        // Append to buffer
        const newBuffer = new Uint8Array(receiveBuffer.length + bytesRead);
        newBuffer.set(receiveBuffer);
        newBuffer.set(buffer.subarray(0, bytesRead), receiveBuffer.length);
        receiveBuffer = newBuffer;

        // Process packets
        while (receiveBuffer.length >= 4) {
          const view = new DataView(receiveBuffer.buffer);
          const size = view.getInt32(0, true);
          const totalSize = size + 4;

          if (receiveBuffer.length < totalSize) break;

          // Extract packet
          const id = view.getInt32(4, true);
          const type = view.getInt32(8, true);

          // Extract body (between offset 12 and end - 2 null terminators)
          const bodyEnd = totalSize - 2;
          const bodyBytes = receiveBuffer.slice(12, bodyEnd);
          const body = new TextDecoder().decode(bodyBytes);

          // Remove processed packet
          receiveBuffer = receiveBuffer.slice(totalSize);

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
              await conn.write(response);
            } else {
              // Send auth failure (id = -1)
              const response = encodePacket({
                id: -1,
                type: PacketType.SERVERDATA_AUTH_RESPONSE,
                body: "",
              });
              await conn.write(response);
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
            await conn.write(response);
          }
        }
      }
    } catch {
      // Connection closed or error
    }
  };

  const stop = () => {
    running = false;
    for (const conn of connections) {
      try {
        conn.close();
      } catch {
        // Ignore
      }
    }
    connections = [];
    if (listener) {
      try {
        listener.close();
      } catch {
        // Ignore
      }
      listener = null;
    }
  };

  return {
    start,
    stop,
    getReceivedCommands: () => [...receivedCommands],
  };
}

// Find an available port for testing
function findAvailablePort(): number {
  const listener = Deno.listen({ port: 0 });
  const port = (listener.addr as Deno.NetAddr).port;
  listener.close();
  return port;
}

Deno.test(
  "RconClient - connects and authenticates successfully",
  integrationTestOptions,
  async () => {
    const port = findAvailablePort();
    const password = "testpassword";

    const server = createMockRconServer({ port, password });
    await server.start();

    try {
      const client = new RconClient({
        host: "127.0.0.1",
        port,
        password,
        timeout: 2000,
      });

      assertEquals(client.getState(), "disconnected");
      assertEquals(client.isConnected(), false);

      await client.connect();

      assertEquals(client.getState(), "connected");
      assertEquals(client.isConnected(), true);

      client.disconnect();

      assertEquals(client.getState(), "disconnected");
      assertEquals(client.isConnected(), false);
    } finally {
      server.stop();
    }
  },
);

Deno.test(
  "RconClient - rejects invalid password",
  integrationTestOptions,
  async () => {
    const port = findAvailablePort();
    const password = "correctpassword";

    const server = createMockRconServer({ port, password });
    await server.start();

    try {
      const client = new RconClient({
        host: "127.0.0.1",
        port,
        password: "wrongpassword",
        timeout: 2000,
      });

      await assertRejects(
        () => client.connect(),
        RconError,
        "Invalid RCON password",
      );

      assertEquals(client.getState(), "error");
    } finally {
      server.stop();
    }
  },
);

Deno.test(
  "RconClient - sends commands and receives responses",
  integrationTestOptions,
  async () => {
    const port = findAvailablePort();
    const password = "secret";

    const responses = new Map([
      ["save", "World saved successfully"],
      ["info", "Server: TestServer, Players: 3/10"],
      ["ping", "pong"],
    ]);

    const server = createMockRconServer({ port, password, responses });
    await server.start();

    try {
      const client = new RconClient({
        host: "127.0.0.1",
        port,
        password,
        timeout: 2000,
      });

      await client.connect();

      const saveResponse = await client.send("save");
      assertEquals(saveResponse, "World saved successfully");

      const infoResponse = await client.send("info");
      assertEquals(infoResponse, "Server: TestServer, Players: 3/10");

      const pingResponse = await client.send("ping");
      assertEquals(pingResponse, "pong");

      // Verify server received all commands
      const received = server.getReceivedCommands();
      assertEquals(received, ["save", "info", "ping"]);

      client.disconnect();
    } finally {
      server.stop();
    }
  },
);

Deno.test(
  "RconClient - handles default command response",
  integrationTestOptions,
  async () => {
    const port = findAvailablePort();
    const password = "test";

    const server = createMockRconServer({ port, password });
    await server.start();

    try {
      const client = new RconClient({
        host: "127.0.0.1",
        port,
        password,
        timeout: 2000,
      });

      await client.connect();

      const response = await client.send("unknown_command");
      assertEquals(response, "Command executed: unknown_command");

      client.disconnect();
    } finally {
      server.stop();
    }
  },
);

Deno.test("RconClient - throws when sending without connection", async () => {
  const client = new RconClient({
    host: "127.0.0.1",
    port: 12345,
    password: "test",
  });

  await assertRejects(
    () => client.send("save"),
    RconError,
    "Not connected to RCON server",
  );
});

Deno.test(
  "RconClient - throws when connecting twice",
  integrationTestOptions,
  async () => {
    const port = findAvailablePort();
    const password = "test";

    const server = createMockRconServer({ port, password });
    await server.start();

    try {
      const client = new RconClient({
        host: "127.0.0.1",
        port,
        password,
        timeout: 2000,
      });

      await client.connect();

      await assertRejects(
        () => client.connect(),
        RconError,
        "Already connected",
      );

      client.disconnect();
    } finally {
      server.stop();
    }
  },
);

Deno.test(
  "RconClient - connection timeout on unreachable host",
  integrationTestOptions,
  async () => {
    const client = new RconClient({
      host: "192.0.2.1", // TEST-NET-1, guaranteed unreachable
      port: 25575,
      password: "test",
      timeout: 500,
    });

    await assertRejects(() => client.connect(), RconError, "timeout");
  },
);

Deno.test(
  "RconClient - disconnect is idempotent",
  integrationTestOptions,
  async () => {
    const port = findAvailablePort();
    const password = "test";

    const server = createMockRconServer({ port, password });
    await server.start();

    try {
      const client = new RconClient({
        host: "127.0.0.1",
        port,
        password,
        timeout: 2000,
      });

      await client.connect();
      assertEquals(client.getState(), "connected");

      // First disconnect
      client.disconnect();
      assertEquals(client.getState(), "disconnected");

      // Second disconnect should be safe
      client.disconnect();
      assertEquals(client.getState(), "disconnected");
    } finally {
      server.stop();
    }
  },
);

Deno.test(
  "RconClient - handles multiple sequential commands",
  integrationTestOptions,
  async () => {
    const port = findAvailablePort();
    const password = "test";

    const server = createMockRconServer({ port, password });
    await server.start();

    try {
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
        assertEquals(response, `Command executed: command_${i}`);
      }

      const received = server.getReceivedCommands();
      assertEquals(received.length, 5);

      client.disconnect();
    } finally {
      server.stop();
    }
  },
);

Deno.test(
  "RconClient - handles commands with special characters",
  integrationTestOptions,
  async () => {
    const port = findAvailablePort();
    const password = "test";

    const responses = new Map([
      ["kick Player Name", "Player 'Player Name' kicked"],
      ["say Hello, World!", "Message sent"],
    ]);

    const server = createMockRconServer({ port, password, responses });
    await server.start();

    try {
      const client = new RconClient({
        host: "127.0.0.1",
        port,
        password,
        timeout: 2000,
      });

      await client.connect();

      const kickResponse = await client.send("kick Player Name");
      assertEquals(kickResponse, "Player 'Player Name' kicked");

      const sayResponse = await client.send("say Hello, World!");
      assertEquals(sayResponse, "Message sent");

      client.disconnect();
    } finally {
      server.stop();
    }
  },
);
