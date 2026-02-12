/**
 * Valheim admin list management and command execution
 * Manages admin, banned, and permitted player lists
 * Supports RCON when available, falls back to file-based lists
 */

import * as fs from "node:fs/promises";
import { dirname, join } from "node:path";
import { RconClient, RconError } from "../rcon/mod.js";

/** Helper to ensure a file exists, creating parent directories if needed */
async function ensureFile(path: string): Promise<void> {
  try {
    await fs.access(path);
  } catch {
    await fs.mkdir(dirname(path), { recursive: true });
    await fs.writeFile(path, "");
  }
}

/** Types of player lists */
export type ListType = "admin" | "banned" | "permitted";

/** Valheim console commands (for reference) */
export type AdminCommand = {
  name: string;
  description: string;
  requiresAdmin: boolean;
};

/** Available Valheim console commands */
export const VALHEIM_COMMANDS: AdminCommand[] = [
  {
    name: "help",
    description: "Show available commands",
    requiresAdmin: false,
  },
  { name: "kick [name/ip]", description: "Kick a player", requiresAdmin: true },
  { name: "ban [name/ip]", description: "Ban a player", requiresAdmin: true },
  { name: "unban [ip]", description: "Unban a player", requiresAdmin: true },
  { name: "banned", description: "List banned players", requiresAdmin: true },
  { name: "save", description: "Force world save", requiresAdmin: true },
  { name: "info", description: "Show server info", requiresAdmin: false },
];

/** RCON configuration for command execution */
export type RconCommandConfig = {
  host: string;
  port: number;
  password: string;
  timeout?: number;
};

/** Global RCON client for persistent connection */
let rconClient: RconClient | null = null;

/**
 * Connect to RCON server
 * @param config RCON configuration
 */
export async function connectRcon(config: RconCommandConfig): Promise<void> {
  if (rconClient?.isConnected()) {
    return;
  }

  rconClient = new RconClient({
    host: config.host,
    port: config.port,
    password: config.password,
    timeout: config.timeout ?? 5000,
  });

  await rconClient.connect();
}

/**
 * Disconnect from RCON server
 */
export function disconnectRcon(): void {
  if (rconClient) {
    rconClient.disconnect();
    rconClient = null;
  }
}

/**
 * Check if RCON is connected
 */
export function isRconConnected(): boolean {
  return rconClient?.isConnected() ?? false;
}

/**
 * Send a command via RCON
 * @param command Command to send
 * @returns Response from server
 * @throws RconError if not connected or command fails
 */
export async function sendRconCommand(command: string): Promise<string> {
  if (!rconClient?.isConnected()) {
    throw new RconError("DISCONNECTED", "RCON not connected");
  }

  return await rconClient.send(command);
}

/**
 * Send a command, preferring RCON if available
 * Falls back to returning an error message if RCON is not connected
 * @param command Command to send
 * @param rconConfig Optional RCON config for one-shot connection
 * @returns Response or error message
 */
export async function sendServerCommand(
  command: string,
  rconConfig?: RconCommandConfig
): Promise<{ success: boolean; response: string }> {
  // Try existing RCON connection first
  if (rconClient?.isConnected()) {
    try {
      const response = await rconClient.send(command);
      return { success: true, response };
    } catch (error: unknown) {
      if (error instanceof RconError) {
        return { success: false, response: `RCON error: ${error.message}` };
      }
      throw error;
    }
  }

  // Try one-shot RCON if config provided
  if (rconConfig) {
    const client = new RconClient({
      host: rconConfig.host,
      port: rconConfig.port,
      password: rconConfig.password,
      timeout: rconConfig.timeout ?? 5000,
    });

    try {
      await client.connect();
      const response = await client.send(command);
      client.disconnect();
      return { success: true, response };
    } catch (error: unknown) {
      if (error instanceof RconError) {
        return { success: false, response: `RCON error: ${error.message}` };
      }
      throw error;
    }
  }

  // No RCON available
  return {
    success: false,
    response:
      "RCON not available. Configure RCON or use file-based management.",
  };
}

/**
 * Gets the file path for a player list
 * @param listType Type of list
 * @param savedir Server save directory
 * @returns Full path to the list file
 */
function getListPath(listType: ListType, savedir: string): string {
  const filenames = {
    admin: "adminlist.txt",
    banned: "bannedlist.txt",
    permitted: "permittedlist.txt",
  };
  return join(savedir, filenames[listType]);
}

/**
 * Adds a Steam ID to the permitted players list
 * @param steamId Steam64 ID to add
 * @param savedir Server save directory
 */
export async function addToPermittedList(
  steamId: string,
  savedir: string
): Promise<void> {
  const path = getListPath("permitted", savedir);
  await ensureFile(path);

  const content = await fs.readFile(path, "utf-8").catch(() => "");
  const lines = content.split("\n").map((l) => l.trim());

  if (!lines.includes(steamId)) {
    const newContent = content.trim()
      ? `${content.trim()}\n${steamId}\n`
      : `${steamId}\n`;
    await fs.writeFile(path, newContent);
  }
}

/**
 * Adds a Steam ID to the admin list
 * @param steamId Steam64 ID to add
 * @param savedir Server save directory
 */
export async function addToAdminList(
  steamId: string,
  savedir: string
): Promise<void> {
  const path = getListPath("admin", savedir);
  await ensureFile(path);

  const content = await fs.readFile(path, "utf-8").catch(() => "");
  const lines = content.split("\n").map((l) => l.trim());

  if (!lines.includes(steamId)) {
    const newContent = content.trim()
      ? `${content.trim()}\n${steamId}\n`
      : `${steamId}\n`;
    await fs.writeFile(path, newContent);
  }
}

/**
 * Adds a Steam ID to the ban list
 * @param steamId Steam64 ID to add
 * @param savedir Server save directory
 */
export async function addToBanList(
  steamId: string,
  savedir: string
): Promise<void> {
  const path = getListPath("banned", savedir);
  await ensureFile(path);

  const content = await fs.readFile(path, "utf-8").catch(() => "");
  const lines = content.split("\n").map((l) => l.trim());

  if (!lines.includes(steamId)) {
    const newContent = content.trim()
      ? `${content.trim()}\n${steamId}\n`
      : `${steamId}\n`;
    await fs.writeFile(path, newContent);
  }
}

/**
 * Removes a Steam ID from the ban list
 * @param steamId Steam64 ID to remove
 * @param savedir Server save directory
 */
export async function removeFromBanList(
  steamId: string,
  savedir: string
): Promise<void> {
  const path = getListPath("banned", savedir);

  try {
    const content = await fs.readFile(path, "utf-8");
    const lines = content
      .split("\n")
      .filter((line) => line.trim() !== steamId && line.trim() !== "");
    await fs.writeFile(path, `${lines.join("\n")}\n`);
  } catch {
    // File doesn't exist, nothing to remove
  }
}

/**
 * Removes a Steam ID from a player list
 * @param steamId Steam64 ID to remove
 * @param listType Type of list to remove from
 * @param savedir Server save directory
 */
export async function removeFromList(
  steamId: string,
  listType: ListType,
  savedir: string
): Promise<void> {
  const path = getListPath(listType, savedir);

  try {
    const content = await fs.readFile(path, "utf-8");
    const lines = content
      .split("\n")
      .filter((line) => line.trim() !== steamId && line.trim() !== "");
    await fs.writeFile(path, `${lines.join("\n")}\n`);
  } catch {
    // File doesn't exist, nothing to remove
  }
}

/**
 * Gets all Steam IDs from a player list
 * @param listType Type of list to read
 * @param savedir Server save directory
 * @returns Array of Steam64 IDs
 */
export async function getListContents(
  listType: ListType,
  savedir: string
): Promise<string[]> {
  const path = getListPath(listType, savedir);

  try {
    const content = await fs.readFile(path, "utf-8");
    return content
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("//"));
  } catch {
    return [];
  }
}

/**
 * Checks if a Steam ID is in a player list
 * @param steamId Steam64 ID to check
 * @param listType Type of list to check
 * @param savedir Server save directory
 * @returns True if the ID is in the list
 */
export async function isInList(
  steamId: string,
  listType: ListType,
  savedir: string
): Promise<boolean> {
  const contents = await getListContents(listType, savedir);
  return contents.includes(steamId);
}
