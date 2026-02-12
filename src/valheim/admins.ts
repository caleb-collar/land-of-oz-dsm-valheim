/**
 * Admin role management for Valheim dedicated server
 *
 * Manages admin and root user roles:
 * - Admin users: Listed in adminlist.txt (can use admin commands)
 * - Root users: Listed in Server DevCommands config (bypass all command restrictions)
 *
 * Role hierarchy: player → admin → root
 */

import fs from "node:fs/promises";
import path from "node:path";
import { getValheimSaveDir, getValheimServerDir } from "../utils/platform.js";
import { addToList, isInList, readList, removeFromList } from "./lists.js";

/** Admin role for a server user */
export type AdminRole = "player" | "admin" | "root";

/** Server user info */
export type ServerUser = {
  steamId: string;
  name?: string;
  role: AdminRole;
  addedAt?: Date;
};

/** Admin capabilities by role */
export const ROLE_CAPABILITIES = {
  player: [] as string[],
  admin: [
    "kick",
    "ban",
    "playerlist",
    "broadcast",
    "event",
    "stopevent",
    "randomevent",
    "setkey",
    "removekey",
    "listkeys",
    "skiptime",
    "sleep",
    "find",
    "info",
  ],
  root: ["*"], // All commands, bypasses disable_command
} as const;

/**
 * Validates a Steam64 ID format.
 * Steam64 IDs are 17-digit numbers starting with 7656119.
 */
export function isValidSteam64Id(id: string): boolean {
  return /^7656119\d{10}$/.test(id);
}

/**
 * Validates a Steam ID and returns a detailed result.
 */
export function validateSteamId(id: string): {
  valid: boolean;
  error?: string;
} {
  if (!id) return { valid: false, error: "Steam ID required" };
  if (!/^\d+$/.test(id))
    return { valid: false, error: "Steam ID must be numeric" };
  if (id.length !== 17)
    return { valid: false, error: "Steam64 ID must be 17 digits" };
  if (!id.startsWith("7656119"))
    return { valid: false, error: "Invalid Steam64 ID prefix" };
  return { valid: true };
}

/**
 * Gets the path to the adminlist.txt file.
 * Admin lists are stored in the Valheim save directory.
 */
export function getAdminListPath(savedir?: string): string {
  const dir = savedir ?? getValheimSaveDir();
  return path.join(dir, "adminlist.txt");
}

/**
 * Gets the path to the bannedlist.txt file.
 */
export function getBanListPath(savedir?: string): string {
  const dir = savedir ?? getValheimSaveDir();
  return path.join(dir, "bannedlist.txt");
}

/**
 * Gets the path to the permittedlist.txt file.
 */
export function getPermittedListPath(savedir?: string): string {
  const dir = savedir ?? getValheimSaveDir();
  return path.join(dir, "permittedlist.txt");
}

/**
 * Gets the path to the Server DevCommands config file.
 * Root users are managed in this file.
 */
export function getDevCommandsConfigPath(valheimPath?: string): string {
  const dir = valheimPath ?? getValheimServerDir();
  return path.join(dir, "BepInEx", "config", "server_devcommands.cfg");
}

/**
 * Reads admin Steam IDs from adminlist.txt.
 */
export async function getAdmins(savedir?: string): Promise<ServerUser[]> {
  const dir = savedir ?? getValheimSaveDir();
  try {
    const entries = await readList("admin", dir);
    return entries.map((steamId) => ({
      steamId,
      role: "admin" as AdminRole,
    }));
  } catch {
    return [];
  }
}

/**
 * Adds a Steam ID to adminlist.txt.
 */
export async function addAdmin(
  steamId: string,
  savedir?: string
): Promise<void> {
  const validation = validateSteamId(steamId);
  if (!validation.valid) {
    throw new Error(validation.error);
  }
  const dir = savedir ?? getValheimSaveDir();
  await addToList("admin", steamId, dir);
}

/**
 * Removes a Steam ID from adminlist.txt.
 */
export async function removeAdmin(
  steamId: string,
  savedir?: string
): Promise<void> {
  const dir = savedir ?? getValheimSaveDir();
  await removeFromList("admin", steamId, dir);
}

/**
 * Checks if a Steam ID is in the admin list.
 */
export async function isAdmin(
  steamId: string,
  savedir?: string
): Promise<boolean> {
  const dir = savedir ?? getValheimSaveDir();
  return isInList("admin", steamId, dir);
}

/**
 * Parses root_users from Server DevCommands config file.
 * The config file uses INI-like format with `root_users = id1,id2,...`
 */
async function parseRootUsersFromConfig(configPath: string): Promise<string[]> {
  try {
    const content = await fs.readFile(configPath, "utf-8");
    const lines = content.split("\n");

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("root_users") && trimmed.includes("=")) {
        const value = trimmed.split("=").slice(1).join("=").trim();
        if (!value) return [];
        return value
          .split(",")
          .map((id) => id.trim())
          .filter((id) => id.length > 0);
      }
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Writes root_users to Server DevCommands config file.
 * Updates or adds the root_users line in the config.
 */
async function writeRootUsersToConfig(
  configPath: string,
  rootUsers: string[]
): Promise<void> {
  const newValue = `root_users = ${rootUsers.join(",")}`;

  try {
    const content = await fs.readFile(configPath, "utf-8");
    const lines = content.split("\n");
    let found = false;

    const updatedLines = lines.map((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("root_users") && trimmed.includes("=")) {
        found = true;
        return newValue;
      }
      return line;
    });

    if (!found) {
      updatedLines.push(
        "",
        "## Root users (bypass command restrictions)",
        newValue
      );
    }

    await fs.writeFile(configPath, updatedLines.join("\n"));
  } catch {
    // Config file doesn't exist, create it
    await fs.mkdir(path.dirname(configPath), { recursive: true });
    await fs.writeFile(
      configPath,
      `## Server DevCommands Configuration\n## Auto-generated by OZ-Valheim DSM\n\n${newValue}\n`
    );
  }
}

/**
 * Gets root user Steam IDs from Server DevCommands config.
 */
export async function getRootUsers(valheimPath?: string): Promise<string[]> {
  const configPath = getDevCommandsConfigPath(valheimPath);
  return parseRootUsersFromConfig(configPath);
}

/**
 * Adds a Steam ID to the root users list.
 */
export async function addRootUser(
  steamId: string,
  valheimPath?: string
): Promise<void> {
  const validation = validateSteamId(steamId);
  if (!validation.valid) {
    throw new Error(validation.error);
  }
  const configPath = getDevCommandsConfigPath(valheimPath);
  const rootUsers = await parseRootUsersFromConfig(configPath);
  if (!rootUsers.includes(steamId)) {
    rootUsers.push(steamId);
    await writeRootUsersToConfig(configPath, rootUsers);
  }
}

/**
 * Removes a Steam ID from the root users list.
 */
export async function removeRootUser(
  steamId: string,
  valheimPath?: string
): Promise<void> {
  const configPath = getDevCommandsConfigPath(valheimPath);
  const rootUsers = await parseRootUsersFromConfig(configPath);
  const filtered = rootUsers.filter((id) => id !== steamId);
  await writeRootUsersToConfig(configPath, filtered);
}

/**
 * Checks if a Steam ID is a root user.
 */
export async function isRootUser(
  steamId: string,
  valheimPath?: string
): Promise<boolean> {
  const rootUsers = await getRootUsers(valheimPath);
  return rootUsers.includes(steamId);
}

/**
 * Gets the role of a user by checking admin and root lists.
 * Priority: root > admin > player
 */
export async function getUserRole(
  steamId: string,
  savedir?: string,
  valheimPath?: string
): Promise<AdminRole> {
  const dir = savedir ?? getValheimSaveDir();

  // Check root first (higher priority)
  const rootUser = await isRootUser(steamId, valheimPath);
  if (rootUser) return "root";

  // Check admin
  const adminUser = await isAdmin(steamId, dir);
  if (adminUser) return "admin";

  return "player";
}

/**
 * Sets a user's role. Manages both adminlist.txt and root_users config.
 *
 * - player: Remove from both admin and root lists
 * - admin: Add to admin list, remove from root
 * - root: Add to both admin and root lists (root users should also be admins)
 */
export async function setUserRole(
  steamId: string,
  role: AdminRole,
  savedir?: string,
  valheimPath?: string
): Promise<void> {
  const validation = validateSteamId(steamId);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const dir = savedir ?? getValheimSaveDir();

  switch (role) {
    case "player":
      await removeAdmin(steamId, dir);
      await removeRootUser(steamId, valheimPath);
      break;
    case "admin":
      await addAdmin(steamId, dir);
      await removeRootUser(steamId, valheimPath);
      break;
    case "root":
      await addAdmin(steamId, dir);
      await addRootUser(steamId, valheimPath);
      break;
  }
}

/**
 * Promotes a user to the next role level.
 * player → admin → root
 * Returns the new role.
 */
export async function promoteUser(
  steamId: string,
  savedir?: string,
  valheimPath?: string
): Promise<AdminRole> {
  const currentRole = await getUserRole(steamId, savedir, valheimPath);

  switch (currentRole) {
    case "player": {
      await setUserRole(steamId, "admin", savedir, valheimPath);
      return "admin";
    }
    case "admin": {
      await setUserRole(steamId, "root", savedir, valheimPath);
      return "root";
    }
    case "root":
      return "root"; // Already max
  }
}

/**
 * Demotes a user to the previous role level.
 * root → admin → player
 * Returns the new role.
 */
export async function demoteUser(
  steamId: string,
  savedir?: string,
  valheimPath?: string
): Promise<AdminRole> {
  const currentRole = await getUserRole(steamId, savedir, valheimPath);

  switch (currentRole) {
    case "root": {
      await setUserRole(steamId, "admin", savedir, valheimPath);
      return "admin";
    }
    case "admin": {
      await setUserRole(steamId, "player", savedir, valheimPath);
      return "player";
    }
    case "player":
      return "player"; // Already min
  }
}
