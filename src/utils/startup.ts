/**
 * Startup task management utilities
 * Handles registering the server manager to run at system startup
 * across Windows (Task Scheduler), macOS (launchd), and Linux (systemd)
 */

import { exec } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { getLocalDataDir, getPlatform } from "./platform.js";

const execAsync = promisify(exec);

/** Task name used for all platforms */
const TASK_NAME = "oz-valheim-dsm";

/** Display name for the task */
const TASK_DESCRIPTION = "Land of OZ - Valheim Dedicated Server Manager";

/**
 * Result of a startup task operation
 */
export type StartupTaskResult = {
  success: boolean;
  message: string;
  requiresAdmin?: boolean;
};

/**
 * Checks if the startup task is already registered
 */
export async function isStartupTaskRegistered(): Promise<boolean> {
  const platform = getPlatform();

  switch (platform) {
    case "windows":
      return isWindowsTaskRegistered();
    case "darwin":
      return isMacLaunchdRegistered();
    case "linux":
      return isLinuxSystemdRegistered();
  }
}

/**
 * Registers the server manager to run at system startup
 */
export async function registerStartupTask(): Promise<StartupTaskResult> {
  const platform = getPlatform();

  switch (platform) {
    case "windows":
      return registerWindowsTask();
    case "darwin":
      return registerMacLaunchd();
    case "linux":
      return registerLinuxSystemd();
  }
}

/**
 * Removes the startup task registration
 */
export async function unregisterStartupTask(): Promise<StartupTaskResult> {
  const platform = getPlatform();

  switch (platform) {
    case "windows":
      return unregisterWindowsTask();
    case "darwin":
      return unregisterMacLaunchd();
    case "linux":
      return unregisterLinuxSystemd();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Windows Task Scheduler
// ─────────────────────────────────────────────────────────────────────────────

async function isWindowsTaskRegistered(): Promise<boolean> {
  try {
    const { stdout } = await execAsync(
      `schtasks /Query /TN "${TASK_NAME}" 2>nul`,
      { shell: "cmd.exe" }
    );
    return stdout.includes(TASK_NAME);
  } catch {
    return false;
  }
}

async function registerWindowsTask(): Promise<StartupTaskResult> {
  try {
    // Get the path to the node executable and main script
    const nodeExe = process.execPath;
    const mainScript = path.resolve(process.cwd(), "main.ts");

    // Check if we're running from a built distribution
    const distMain = path.resolve(process.cwd(), "dist", "main.js");
    let command: string;
    let args: string;

    try {
      await fs.access(distMain);
      // Running from built distribution
      command = nodeExe;
      args = distMain;
    } catch {
      // Running in development with tsx
      command = "npx";
      args = `tsx "${mainScript}"`;
    }

    // Build the schtasks command
    // ONLOGON trigger runs when any user logs on
    // /RL HIGHEST runs with highest privileges available
    const schtasksCmd = [
      "schtasks",
      "/Create",
      "/F", // Force overwrite if exists
      `/TN "${TASK_NAME}"`,
      `/TR "\\"${command}\\" ${args}"`,
      "/SC ONLOGON",
      "/RL HIGHEST",
      `/DELAY 0000:30`, // 30 second delay after logon
    ].join(" ");

    await execAsync(schtasksCmd, { shell: "cmd.exe" });

    return {
      success: true,
      message: `Startup task "${TASK_NAME}" registered successfully. The server manager will start automatically when you log in.`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    // Check for access denied error
    if (message.includes("Access is denied") || message.includes("5")) {
      return {
        success: false,
        message:
          "Administrator privileges required to create startup task. Please run as administrator.",
        requiresAdmin: true,
      };
    }

    return {
      success: false,
      message: `Failed to register startup task: ${message}`,
    };
  }
}

async function unregisterWindowsTask(): Promise<StartupTaskResult> {
  try {
    await execAsync(`schtasks /Delete /TN "${TASK_NAME}" /F`, {
      shell: "cmd.exe",
    });

    return {
      success: true,
      message: `Startup task "${TASK_NAME}" removed successfully.`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes("cannot find the file")) {
      return {
        success: true,
        message: "Startup task was not registered.",
      };
    }

    return {
      success: false,
      message: `Failed to remove startup task: ${message}`,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// macOS launchd
// ─────────────────────────────────────────────────────────────────────────────

function getMacPlistPath(): string {
  const home = process.env.HOME ?? "/Users";
  return path.join(home, "Library", "LaunchAgents", `com.${TASK_NAME}.plist`);
}

async function isMacLaunchdRegistered(): Promise<boolean> {
  try {
    await fs.access(getMacPlistPath());
    return true;
  } catch {
    return false;
  }
}

async function registerMacLaunchd(): Promise<StartupTaskResult> {
  try {
    const plistPath = getMacPlistPath();
    const nodeExe = process.execPath;
    const mainScript = path.resolve(process.cwd(), "main.ts");
    const distMain = path.resolve(process.cwd(), "dist", "main.js");

    let programArgs: string[];

    try {
      await fs.access(distMain);
      programArgs = [nodeExe, distMain];
    } catch {
      // Development mode - use tsx
      const npxPath = path.join(path.dirname(nodeExe), "npx");
      programArgs = [npxPath, "tsx", mainScript];
    }

    const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.${TASK_NAME}</string>
    <key>ProgramArguments</key>
    <array>
        ${programArgs.map((arg) => `<string>${arg}</string>`).join("\n        ")}
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <false/>
    <key>WorkingDirectory</key>
    <string>${process.cwd()}</string>
    <key>StandardOutPath</key>
    <string>${path.join(getLocalDataDir(), TASK_NAME, "stdout.log")}</string>
    <key>StandardErrorPath</key>
    <string>${path.join(getLocalDataDir(), TASK_NAME, "stderr.log")}</string>
</dict>
</plist>
`;

    // Ensure LaunchAgents directory exists
    await fs.mkdir(path.dirname(plistPath), { recursive: true });

    // Write the plist file
    await fs.writeFile(plistPath, plistContent, "utf-8");

    // Load the launch agent
    await execAsync(`launchctl load "${plistPath}"`);

    return {
      success: true,
      message: `Launch agent registered successfully. The server manager will start automatically when you log in.`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to register launch agent: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

async function unregisterMacLaunchd(): Promise<StartupTaskResult> {
  try {
    const plistPath = getMacPlistPath();

    // Try to unload first (ignore errors if not loaded)
    try {
      await execAsync(`launchctl unload "${plistPath}"`);
    } catch {
      // Ignore - may not be loaded
    }

    // Remove the plist file
    try {
      await fs.unlink(plistPath);
    } catch {
      // File may not exist
    }

    return {
      success: true,
      message: "Launch agent removed successfully.",
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to remove launch agent: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Linux systemd (user service)
// ─────────────────────────────────────────────────────────────────────────────

function getLinuxServicePath(): string {
  const configHome =
    process.env.XDG_CONFIG_HOME ?? path.join(process.env.HOME ?? "", ".config");
  return path.join(configHome, "systemd", "user", `${TASK_NAME}.service`);
}

async function isLinuxSystemdRegistered(): Promise<boolean> {
  try {
    await fs.access(getLinuxServicePath());
    return true;
  } catch {
    return false;
  }
}

async function registerLinuxSystemd(): Promise<StartupTaskResult> {
  try {
    const servicePath = getLinuxServicePath();
    const nodeExe = process.execPath;
    const mainScript = path.resolve(process.cwd(), "main.ts");
    const distMain = path.resolve(process.cwd(), "dist", "main.js");

    let execStart: string;

    try {
      await fs.access(distMain);
      execStart = `${nodeExe} ${distMain}`;
    } catch {
      // Development mode - use npx tsx
      execStart = `npx tsx ${mainScript}`;
    }

    const serviceContent = `[Unit]
Description=${TASK_DESCRIPTION}
After=network.target

[Service]
Type=simple
ExecStart=${execStart}
WorkingDirectory=${process.cwd()}
Restart=on-failure
RestartSec=10

[Install]
WantedBy=default.target
`;

    // Ensure systemd user directory exists
    await fs.mkdir(path.dirname(servicePath), { recursive: true });

    // Write the service file
    await fs.writeFile(servicePath, serviceContent, "utf-8");

    // Reload systemd and enable the service
    await execAsync("systemctl --user daemon-reload");
    await execAsync(`systemctl --user enable ${TASK_NAME}`);

    return {
      success: true,
      message: `Systemd user service registered and enabled. The server manager will start automatically when you log in.`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to register systemd service: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

async function unregisterLinuxSystemd(): Promise<StartupTaskResult> {
  try {
    const servicePath = getLinuxServicePath();

    // Disable and stop the service
    try {
      await execAsync(`systemctl --user disable ${TASK_NAME}`);
      await execAsync(`systemctl --user stop ${TASK_NAME}`);
    } catch {
      // Ignore - may not be enabled/running
    }

    // Remove the service file
    try {
      await fs.unlink(servicePath);
    } catch {
      // File may not exist
    }

    // Reload systemd
    await execAsync("systemctl --user daemon-reload");

    return {
      success: true,
      message: "Systemd user service removed successfully.",
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to remove systemd service: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
