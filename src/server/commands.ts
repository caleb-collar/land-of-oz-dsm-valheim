/**
 * Valheim admin list management
 * Manages admin, banned, and permitted player lists
 */

import { join } from "@std/path";
import { ensureFile } from "@std/fs";

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
  savedir: string,
): Promise<void> {
  const path = getListPath("permitted", savedir);
  await ensureFile(path);

  const content = await Deno.readTextFile(path).catch(() => "");
  const lines = content.split("\n").map((l) => l.trim());

  if (!lines.includes(steamId)) {
    const newContent = content.trim()
      ? `${content.trim()}\n${steamId}\n`
      : `${steamId}\n`;
    await Deno.writeTextFile(path, newContent);
  }
}

/**
 * Adds a Steam ID to the admin list
 * @param steamId Steam64 ID to add
 * @param savedir Server save directory
 */
export async function addToAdminList(
  steamId: string,
  savedir: string,
): Promise<void> {
  const path = getListPath("admin", savedir);
  await ensureFile(path);

  const content = await Deno.readTextFile(path).catch(() => "");
  const lines = content.split("\n").map((l) => l.trim());

  if (!lines.includes(steamId)) {
    const newContent = content.trim()
      ? `${content.trim()}\n${steamId}\n`
      : `${steamId}\n`;
    await Deno.writeTextFile(path, newContent);
  }
}

/**
 * Adds a Steam ID to the ban list
 * @param steamId Steam64 ID to add
 * @param savedir Server save directory
 */
export async function addToBanList(
  steamId: string,
  savedir: string,
): Promise<void> {
  const path = getListPath("banned", savedir);
  await ensureFile(path);

  const content = await Deno.readTextFile(path).catch(() => "");
  const lines = content.split("\n").map((l) => l.trim());

  if (!lines.includes(steamId)) {
    const newContent = content.trim()
      ? `${content.trim()}\n${steamId}\n`
      : `${steamId}\n`;
    await Deno.writeTextFile(path, newContent);
  }
}

/**
 * Removes a Steam ID from the ban list
 * @param steamId Steam64 ID to remove
 * @param savedir Server save directory
 */
export async function removeFromBanList(
  steamId: string,
  savedir: string,
): Promise<void> {
  const path = getListPath("banned", savedir);

  try {
    const content = await Deno.readTextFile(path);
    const lines = content
      .split("\n")
      .filter((line) => line.trim() !== steamId && line.trim() !== "");
    await Deno.writeTextFile(path, lines.join("\n") + "\n");
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
  savedir: string,
): Promise<void> {
  const path = getListPath(listType, savedir);

  try {
    const content = await Deno.readTextFile(path);
    const lines = content
      .split("\n")
      .filter((line) => line.trim() !== steamId && line.trim() !== "");
    await Deno.writeTextFile(path, lines.join("\n") + "\n");
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
  savedir: string,
): Promise<string[]> {
  const path = getListPath(listType, savedir);

  try {
    const content = await Deno.readTextFile(path);
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
  savedir: string,
): Promise<boolean> {
  const contents = await getListContents(listType, savedir);
  return contents.includes(steamId);
}
