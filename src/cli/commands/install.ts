/**
 * Install command handler
 * Installs/updates SteamCMD and Valheim dedicated server
 */

import * as fs from "node:fs/promises";
import {
  getInstalledVersion,
  getSteamPaths,
  installSteamCmd,
  installValheim,
  isSteamCmdInstalled,
  isValheimInstalled,
} from "../../steamcmd/mod.js";
import type { InstallArgs } from "../args.js";

/**
 * Handles the install command
 * @param args Parsed install command arguments
 */
export async function installCommand(args: InstallArgs): Promise<void> {
  const steamInstalled = await isSteamCmdInstalled();
  const valheimInstalled = await isValheimInstalled();
  const paths = getSteamPaths();

  // Dry run - show status only
  if (args.dryRun) {
    await showDryRunStatus(steamInstalled, valheimInstalled, paths);
    return;
  }

  // Validate existing installation
  if (args.validate) {
    await validateInstallation(steamInstalled, valheimInstalled, paths);
    return;
  }

  // Force reinstall or normal install
  await performInstallation(
    steamInstalled,
    valheimInstalled,
    args.force,
    paths
  );
}

/**
 * Shows installation status without making changes
 */
async function showDryRunStatus(
  steamInstalled: boolean,
  valheimInstalled: boolean,
  paths: ReturnType<typeof getSteamPaths>
): Promise<void> {
  console.log("\nInstallation Status (dry run):\n");
  console.log("  SteamCMD:");
  console.log(
    `    Status: ${steamInstalled ? "Installed ✓" : "Not installed"}`
  );
  console.log(`    Path: ${paths.steamcmd}`);
  console.log("");
  console.log("  Valheim Dedicated Server:");
  console.log(
    `    Status: ${valheimInstalled ? "Installed ✓" : "Not installed"}`
  );
  console.log(`    Path: ${paths.valheimDir}`);

  if (valheimInstalled) {
    const version = await getInstalledVersion();
    if (version) {
      console.log(`    Build ID: ${version}`);
    }
  }

  console.log("");

  if (!steamInstalled || !valheimInstalled) {
    console.log("  Actions that would be taken:");
    if (!steamInstalled) {
      console.log("    • Download and install SteamCMD");
    }
    if (!valheimInstalled) {
      console.log("    • Download and install Valheim Dedicated Server");
    }
    console.log("");
    console.log("  Run 'oz-valheim install' to perform these actions.");
  } else {
    console.log("  ✓ Everything is already installed.");
    console.log("  Run 'oz-valheim install' to check for updates.");
  }
}

/**
 * Validates existing installation
 */
async function validateInstallation(
  steamInstalled: boolean,
  valheimInstalled: boolean,
  paths: ReturnType<typeof getSteamPaths>
): Promise<void> {
  console.log("\nValidating installation...\n");

  let valid = true;

  // Check SteamCMD
  console.log("  SteamCMD:");
  if (steamInstalled) {
    console.log("    ✓ Installed");
    console.log(`    Path: ${paths.steamcmd}`);

    // Check if executable exists
    try {
      const stat = await fs.stat(paths.steamcmd);
      if (stat.isFile()) {
        console.log("    ✓ Executable found");
      }
    } catch {
      console.log("    ✗ Executable not found");
      valid = false;
    }
  } else {
    console.log("    ✗ Not installed");
    valid = false;
  }

  console.log("");

  // Check Valheim
  console.log("  Valheim Dedicated Server:");
  if (valheimInstalled) {
    console.log("    ✓ Installed");
    console.log(`    Path: ${paths.valheimDir}`);

    // Check if executable exists
    const exePath = `${paths.valheimDir}/${paths.executable}`;
    try {
      const stat = await fs.stat(exePath);
      if (stat.isFile()) {
        console.log("    ✓ Executable found");
      }
    } catch {
      console.log("    ✗ Executable not found");
      valid = false;
    }

    const version = await getInstalledVersion();
    if (version) {
      console.log(`    Build ID: ${version}`);
    }
  } else {
    console.log("    ✗ Not installed");
    valid = false;
  }

  console.log("");

  if (valid) {
    console.log("  ✓ Installation is valid.");
  } else {
    console.log(
      "  ✗ Installation has issues. Run 'oz-valheim install' to fix."
    );
    process.exit(1);
  }
}

/**
 * Performs installation/update of SteamCMD and Valheim
 */
async function performInstallation(
  steamInstalled: boolean,
  valheimInstalled: boolean,
  force: boolean,
  paths: ReturnType<typeof getSteamPaths>
): Promise<void> {
  // Install SteamCMD if needed or forced
  if (!steamInstalled || force) {
    if (force && steamInstalled) {
      console.log("\nForce reinstalling SteamCMD...\n");
    } else {
      console.log("\nInstalling SteamCMD...\n");
    }

    await installSteamCmd((progress) => {
      const bar = createProgressBar(progress.progress);
      process.stdout.write(`\r  ${bar} ${progress.message}`);
    });
    console.log("\n");
  } else {
    console.log("\n✓ SteamCMD is already installed.");
  }

  // Install/update Valheim
  if (!valheimInstalled) {
    console.log("\nInstalling Valheim Dedicated Server...\n");
  } else if (force) {
    console.log("\nForce reinstalling Valheim Dedicated Server...\n");
  } else {
    console.log("\nChecking for Valheim updates...\n");
  }

  await installValheim((status) => {
    const bar = createProgressBar(status.progress);
    process.stdout.write(`\r  ${bar} ${status.message}                    `);
  });
  console.log("\n");

  const version = await getInstalledVersion();
  console.log("\n✓ Installation complete!");
  if (version) {
    console.log(`  Build ID: ${version}`);
  }
  console.log(`  Server path: ${paths.valheimDir}`);
  console.log("");
  console.log("Run 'oz-valheim start' to start the server.");
}

/**
 * Creates a simple text progress bar
 */
function createProgressBar(percent: number): string {
  const width = 20;
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;
  return `[${"█".repeat(filled)}${"░".repeat(empty)}] ${percent
    .toString()
    .padStart(3)}%`;
}
