/**
 * Worlds command handler
 * Manages Valheim world saves
 */

import type { WorldsArgs } from "../args.ts";
import {
  deleteWorld,
  exportWorld,
  getDefaultWorldsDir,
  getWorldInfo,
  importWorld,
  listWorlds,
} from "../../valheim/mod.ts";

/**
 * Handles the worlds command
 * @param args Parsed worlds command arguments
 */
export async function worldsCommand(args: WorldsArgs): Promise<void> {
  switch (args.subcommand) {
    case "list":
      await listWorldsCommand();
      break;
    case "info":
      await worldInfoCommand(args.name);
      break;
    case "import":
      await importWorldCommand(args.name, args.path);
      break;
    case "export":
      await exportWorldCommand(args.name, args.path);
      break;
    case "delete":
      await deleteWorldCommand(args.name, args.force);
      break;
    default:
      await listWorldsCommand();
  }
}

/**
 * Lists all available worlds
 */
async function listWorldsCommand(): Promise<void> {
  const worldsDir = getDefaultWorldsDir();
  console.log(`\nWorlds directory: ${worldsDir}`);
  console.log("");

  try {
    const worlds = await listWorlds();

    if (worlds.length === 0) {
      console.log("No worlds found.");
      console.log("");
      console.log(
        "Worlds are created when you first start the server with a world name.",
      );
      console.log(
        "You can also import existing worlds with 'oz-valheim worlds import'.",
      );
      return;
    }

    console.log("Available worlds:\n");

    for (const world of worlds) {
      const sizeKb = Math.round(world.size / 1024);
      const sizeMb = (world.size / (1024 * 1024)).toFixed(2);
      const sizeStr = sizeKb > 1024 ? `${sizeMb} MB` : `${sizeKb} KB`;
      const dateStr = world.modified.toLocaleDateString();
      const timeStr = world.modified.toLocaleTimeString();

      console.log(`  ${world.name}`);
      console.log(`    Size: ${sizeStr}`);
      console.log(`    Modified: ${dateStr} ${timeStr}`);
      console.log("");
    }

    console.log(`Total: ${worlds.length} world(s)`);
  } catch (error) {
    if ((error as Error).message.includes("NotFound")) {
      console.log("Worlds directory does not exist yet.");
      console.log("It will be created when you first start the server.");
    } else {
      console.error(`Error listing worlds: ${(error as Error).message}`);
      Deno.exit(1);
    }
  }
}

/**
 * Shows information about a specific world
 */
async function worldInfoCommand(name: string | undefined): Promise<void> {
  if (!name) {
    console.error("Error: World name is required.");
    console.log("Usage: oz-valheim worlds info <name>");
    Deno.exit(1);
  }

  try {
    const world = await getWorldInfo(name);

    if (!world) {
      console.error(`Error: World '${name}' not found.`);
      console.log("\nUse 'oz-valheim worlds list' to see available worlds.");
      Deno.exit(1);
    }

    console.log(`\nWorld: ${world.name}`);
    console.log("");
    console.log("Files:");
    console.log(`  Database: ${world.dbPath}`);
    console.log(`  Metadata: ${world.fwlPath}`);
    console.log("");

    const sizeMb = (world.size / (1024 * 1024)).toFixed(2);
    console.log(`Size: ${sizeMb} MB`);
    console.log(`Last modified: ${world.modified.toLocaleString()}`);

    // Try to read additional info from .fwl file
    try {
      const fwlContent = await Deno.readTextFile(world.fwlPath);
      // FWL format is simple - look for seed info
      if (fwlContent.length > 0) {
        console.log("");
        console.log(
          "Note: Use this world name in your server config to load it.",
        );
      }
    } catch {
      // FWL read failed, that's OK
    }
  } catch (error) {
    console.error(`Error: ${(error as Error).message}`);
    Deno.exit(1);
  }
}

/**
 * Imports world files from a path
 */
async function importWorldCommand(
  name: string | undefined,
  path: string | undefined,
): Promise<void> {
  if (!name) {
    console.error("Error: World name is required.");
    console.log("Usage: oz-valheim worlds import <name> --path <source>");
    Deno.exit(1);
  }

  if (!path) {
    console.error("Error: Source path is required.");
    console.log("Usage: oz-valheim worlds import <name> --path <source>");
    Deno.exit(1);
  }

  // Determine db and fwl paths
  const dbPath = path.endsWith(".db") ? path : `${path}/${name}.db`;
  const fwlPath = dbPath.replace(".db", ".fwl");

  console.log(`\nImporting world '${name}'...`);
  console.log(`  From: ${path}`);

  try {
    // Check if source files exist
    try {
      await Deno.stat(dbPath);
      await Deno.stat(fwlPath);
    } catch {
      console.error(`\nError: World files not found.`);
      console.log(`  Expected: ${dbPath}`);
      console.log(`  Expected: ${fwlPath}`);
      Deno.exit(1);
    }

    const world = await importWorld(dbPath, fwlPath);

    console.log("");
    console.log(`✓ World '${world.name}' imported successfully.`);
    console.log(`  Location: ${world.dbPath}`);
    console.log("");
    console.log(
      "You can now use this world by setting 'server.world' to this name.",
    );
  } catch (error) {
    console.error(`\nError importing world: ${(error as Error).message}`);
    Deno.exit(1);
  }
}

/**
 * Exports world files to a path
 */
async function exportWorldCommand(
  name: string | undefined,
  path: string | undefined,
): Promise<void> {
  if (!name) {
    console.error("Error: World name is required.");
    console.log("Usage: oz-valheim worlds export <name> --path <destination>");
    Deno.exit(1);
  }

  if (!path) {
    console.error("Error: Destination path is required.");
    console.log("Usage: oz-valheim worlds export <name> --path <destination>");
    Deno.exit(1);
  }

  console.log(`\nExporting world '${name}'...`);
  console.log(`  To: ${path}`);

  try {
    // Check if world exists
    const world = await getWorldInfo(name);
    if (!world) {
      console.error(`\nError: World '${name}' not found.`);
      Deno.exit(1);
    }

    await exportWorld(name, path);

    console.log("");
    console.log(`✓ World '${name}' exported successfully.`);
    console.log(`  Database: ${path}/${name}.db`);
    console.log(`  Metadata: ${path}/${name}.fwl`);
  } catch (error) {
    console.error(`\nError exporting world: ${(error as Error).message}`);
    Deno.exit(1);
  }
}

/**
 * Deletes a world (requires --force)
 */
async function deleteWorldCommand(
  name: string | undefined,
  force: boolean | undefined,
): Promise<void> {
  if (!name) {
    console.error("Error: World name is required.");
    console.log("Usage: oz-valheim worlds delete <name> --force");
    Deno.exit(1);
  }

  if (!force) {
    console.error("Error: Deleting a world requires the --force flag.");
    console.log("");
    console.log("This will permanently delete the world and all backups.");
    console.log(`Run: oz-valheim worlds delete ${name} --force`);
    Deno.exit(1);
  }

  console.log(`\nDeleting world '${name}'...`);

  try {
    // Check if world exists
    const world = await getWorldInfo(name);
    if (!world) {
      console.error(`\nError: World '${name}' not found.`);
      Deno.exit(1);
    }

    await deleteWorld(name);

    console.log("");
    console.log(`✓ World '${name}' deleted.`);
  } catch (error) {
    console.error(`\nError deleting world: ${(error as Error).message}`);
    Deno.exit(1);
  }
}
