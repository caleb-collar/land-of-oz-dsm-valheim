/**
 * RCON command handler
 * Sends commands to Valheim server via RCON protocol
 */

import { RconClient, RconError } from "../../rcon/mod.ts";
import { loadConfig } from "../../config/mod.ts";
import type { RconArgs } from "../args.ts";

/**
 * Execute an RCON command
 */
export async function rconCommand(args: RconArgs): Promise<void> {
  const config = await loadConfig();

  // Build RCON config from args and stored config
  const host = args.host ?? "localhost";
  const port = args.port ?? config.rcon.port;
  const password = args.password ?? config.rcon.password;
  const timeout = args.timeout ?? config.rcon.timeout;

  if (!password) {
    console.error("Error: RCON password required");
    console.error(
      "Set via --password flag or 'oz-valheim config set rcon.password <password>'",
    );
    Deno.exit(1);
  }

  if (!args.rconCommand) {
    console.error("Error: No command specified");
    console.error("Usage: oz-valheim rcon <command> [options]");
    Deno.exit(1);
  }

  const client = new RconClient({
    host,
    port,
    password,
    timeout,
  });

  try {
    if (args.debug) {
      console.log(`Connecting to RCON at ${host}:${port}...`);
    }

    await client.connect();

    if (args.debug) {
      console.log("Connected, sending command...");
    }

    const response = await client.send(args.rconCommand);

    if (response.trim()) {
      console.log(response);
    } else {
      console.log("Command executed (no response)");
    }
  } catch (error) {
    if (error instanceof RconError) {
      switch (error.code) {
        case "CONNECTION_FAILED":
          console.error(`Failed to connect to ${host}:${port}`);
          console.error(
            "Make sure the server has RCON enabled (requires BepInEx + RCON mod)",
          );
          break;
        case "AUTH_FAILED":
          console.error("Authentication failed: Invalid RCON password");
          break;
        case "TIMEOUT":
          console.error(`Connection timed out after ${timeout}ms`);
          break;
        case "DISCONNECTED":
          console.error("Connection lost");
          break;
        default:
          console.error(`RCON error: ${error.message}`);
      }
    } else {
      console.error(
        `Error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    Deno.exit(1);
  } finally {
    client.disconnect();
  }
}

/**
 * Run an interactive RCON session
 */
export async function interactiveRcon(args: RconArgs): Promise<void> {
  const config = await loadConfig();

  const host = args.host ?? "localhost";
  const port = args.port ?? config.rcon.port;
  const password = args.password ?? config.rcon.password;
  const timeout = args.timeout ?? config.rcon.timeout;

  if (!password) {
    console.error("Error: RCON password required");
    Deno.exit(1);
  }

  const client = new RconClient({
    host,
    port,
    password,
    timeout,
  });

  console.log(`Connecting to RCON at ${host}:${port}...`);

  try {
    await client.connect();
    console.log("Connected! Type 'exit' or 'quit' to disconnect.\n");

    // Read lines from stdin
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();

    while (true) {
      await Deno.stdout.write(encoder.encode("rcon> "));

      const buf = new Uint8Array(1024);
      const n = await Deno.stdin.read(buf);

      if (n === null) {
        break;
      }

      const line = decoder.decode(buf.subarray(0, n)).trim();

      if (!line) {
        continue;
      }

      if (line === "exit" || line === "quit") {
        console.log("Disconnecting...");
        break;
      }

      try {
        const response = await client.send(line);
        if (response.trim()) {
          console.log(response);
        }
      } catch (error) {
        if (error instanceof RconError && error.code === "DISCONNECTED") {
          console.error("Connection lost");
          break;
        }
        console.error(
          `Error: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  } catch (error) {
    if (error instanceof RconError) {
      console.error(`RCON error: ${error.message}`);
    } else {
      console.error(
        `Error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    Deno.exit(1);
  } finally {
    client.disconnect();
  }
}
