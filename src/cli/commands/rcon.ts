/**
 * RCON command handler
 * Send commands to a running Valheim server via Source RCON protocol
 */

import * as readline from "node:readline";
import { loadConfig } from "../../config/mod.js";
import { RconClient, RconError } from "../../rcon/mod.js";
import type { RconArgs } from "../args.js";

/**
 * Resolves RCON connection parameters from args + stored config
 */
async function resolveRconConfig(args: RconArgs) {
  const config = await loadConfig();
  return {
    host: args.host ?? "localhost",
    port: args.port ?? config.rcon.port ?? 25575,
    password: args.password ?? config.rcon.password ?? "",
    timeout: args.timeout ?? config.rcon.timeout ?? 5000,
  };
}

/**
 * Send a single RCON command and print the response
 */
export async function rconCommand(args: RconArgs): Promise<void> {
  if (!args.rconCommand) {
    console.error("Error: No command specified.");
    console.log("Usage: valheim-dsm rcon <command> [options]");
    console.log("       valheim-dsm rcon --interactive");
    return;
  }

  const rconCfg = await resolveRconConfig(args);

  if (!rconCfg.password) {
    console.error("Error: RCON password is required.");
    console.log("Set it with: valheim-dsm config set rcon.password <password>");
    console.log("Or pass it with: valheim-dsm rcon --password <password>");
    return;
  }

  const client = new RconClient({
    host: rconCfg.host,
    port: rconCfg.port,
    password: rconCfg.password,
    timeout: rconCfg.timeout,
  });

  try {
    await client.connect();
    const response = await client.send(args.rconCommand);
    if (response) {
      console.log(response);
    }
  } catch (error) {
    if (error instanceof RconError) {
      console.error(`RCON Error (${error.code}): ${error.message}`);
    } else {
      console.error(`Error: ${error}`);
    }
    process.exitCode = 1;
  } finally {
    client.disconnect();
  }
}

/**
 * Start an interactive RCON session (REPL)
 */
export async function interactiveRcon(args: RconArgs): Promise<void> {
  const rconCfg = await resolveRconConfig(args);

  if (!rconCfg.password) {
    console.error("Error: RCON password is required.");
    console.log("Set it with: valheim-dsm config set rcon.password <password>");
    return;
  }

  const client = new RconClient({
    host: rconCfg.host,
    port: rconCfg.port,
    password: rconCfg.password,
    timeout: rconCfg.timeout,
  });

  try {
    console.log(`Connecting to ${rconCfg.host}:${rconCfg.port}...`);
    await client.connect();
    console.log("Connected! Type commands, or 'quit' to exit.\n");
  } catch (error) {
    if (error instanceof RconError) {
      console.error(`Failed to connect (${error.code}): ${error.message}`);
    } else {
      console.error(`Failed to connect: ${error}`);
    }
    return;
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "rcon> ",
  });

  rl.prompt();

  rl.on("line", async (line) => {
    const cmd = line.trim();

    if (!cmd) {
      rl.prompt();
      return;
    }

    if (cmd === "quit" || cmd === "exit") {
      rl.close();
      return;
    }

    try {
      const response = await client.send(cmd);
      if (response) {
        console.log(response);
      }
    } catch (error) {
      if (error instanceof RconError) {
        console.error(`Error (${error.code}): ${error.message}`);
        if (error.code === "DISCONNECTED") {
          console.error("Connection lost. Exiting...");
          rl.close();
          return;
        }
      } else {
        console.error(`Error: ${error}`);
      }
    }

    rl.prompt();
  });

  rl.on("close", () => {
    client.disconnect();
    console.log("\nDisconnected.");
  });
}
