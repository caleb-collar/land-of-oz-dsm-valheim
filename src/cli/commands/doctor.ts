/**
 * Doctor command - Diagnose common issues
 * Checks SteamCMD, Valheim, config, ports, permissions
 * Uses @caleb-collar/steamcmd package for SteamCMD checks
 */

import { exec } from "node:child_process";
import fs from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import { promisify } from "node:util";
import steamcmd from "@caleb-collar/steamcmd";
import { type AppConfig, loadConfig } from "../../config/mod.js";
import {
  getInstalledVersion,
  getSteamPaths,
  isSteamCmdInstalled,
  isValheimInstalled,
} from "../../steamcmd/mod.js";
import { getPlatform, getValheimSaveDir } from "../../utils/platform.js";
import type { DoctorArgs } from "../args.js";

const execAsync = promisify(exec);

/** Result of a single check */
export type CheckResult = {
  name: string;
  status: "pass" | "warn" | "fail";
  message: string;
  fixable?: boolean;
};

/** Overall diagnostic report */
export type DiagnosticReport = {
  timestamp: string;
  platform: string;
  nodeVersion: string;
  checks: CheckResult[];
  summary: {
    passed: number;
    warnings: number;
    failed: number;
  };
};

/**
 * Check if a file or directory exists
 */
async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a port is available
 */
async function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close();
      resolve(true);
    });
    server.listen(port, "0.0.0.0");
  });
}

/**
 * Run SteamCMD installation check
 */
async function checkSteamCmd(): Promise<CheckResult> {
  const info = steamcmd.getInfo();

  if (!info.isSupported) {
    return {
      name: "SteamCMD Installation",
      status: "fail",
      message: `Platform not supported: ${info.platform}`,
    };
  }

  if (await isSteamCmdInstalled()) {
    return {
      name: "SteamCMD Installation",
      status: "pass",
      message: `SteamCMD found at ${info.directory}`,
    };
  }

  return {
    name: "SteamCMD Installation",
    status: "fail",
    message: "SteamCMD not found. Run 'valheim-dsm install' to install.",
    fixable: true,
  };
}

/**
 * Run Valheim server installation check
 */
async function checkValheimServer(): Promise<CheckResult> {
  const paths = getSteamPaths();

  if (await isValheimInstalled()) {
    const version = await getInstalledVersion();
    return {
      name: "Valheim Server Installation",
      status: "pass",
      message: `Valheim server found at ${paths.valheimDir}${version ? ` (build ${version})` : ""}`,
    };
  }

  return {
    name: "Valheim Server Installation",
    status: "fail",
    message: "Valheim server not found. Run 'valheim-dsm install' to install.",
    fixable: true,
  };
}

/**
 * Check configuration validity
 */
async function checkConfig(): Promise<CheckResult> {
  try {
    const config = await loadConfig();

    // Check for required fields
    if (!config.server.world) {
      return {
        name: "Configuration",
        status: "warn",
        message:
          "No world name configured. Set with 'valheim-dsm config set server.world <name>'",
      };
    }

    if (config.server.port < 1024 || config.server.port > 65535) {
      return {
        name: "Configuration",
        status: "fail",
        message: `Invalid port ${config.server.port}. Must be between 1024-65535.`,
        fixable: true,
      };
    }

    return {
      name: "Configuration",
      status: "pass",
      message: `Configuration valid (server: ${config.server.name}, world: ${config.server.world})`,
    };
  } catch (error) {
    return {
      name: "Configuration",
      status: "fail",
      message: `Failed to load configuration: ${error}`,
      fixable: true,
    };
  }
}

/**
 * Check Valheim save directory
 */
async function checkSaveDirectory(): Promise<CheckResult> {
  const saveDir = getValheimSaveDir();

  if (await exists(saveDir)) {
    return {
      name: "Save Directory",
      status: "pass",
      message: `Save directory exists at ${saveDir}`,
    };
  }

  return {
    name: "Save Directory",
    status: "warn",
    message: `Save directory not found at ${saveDir}. Will be created on first run.`,
  };
}

/**
 * Check port availability
 */
async function checkPorts(): Promise<CheckResult> {
  let config: AppConfig;
  try {
    config = await loadConfig();
  } catch {
    return {
      name: "Port Availability",
      status: "warn",
      message: "Could not load config to check ports",
    };
  }

  const port = config.server.port;
  const portsToCheck = [port, port + 1, port + 2];
  const unavailable: number[] = [];

  for (const p of portsToCheck) {
    if (!(await isPortAvailable(p))) {
      unavailable.push(p);
    }
  }

  if (unavailable.length === 0) {
    return {
      name: "Port Availability",
      status: "pass",
      message: `Ports ${portsToCheck.join(", ")} are available`,
    };
  }

  // If all 3 ports are unavailable, likely the server is running
  if (unavailable.length === 3) {
    return {
      name: "Port Availability",
      status: "warn",
      message: `Ports ${unavailable.join(", ")} in use (server may be running)`,
    };
  }

  return {
    name: "Port Availability",
    status: "fail",
    message: `Ports ${unavailable.join(", ")} are in use by another process`,
  };
}

/**
 * Check directory write permissions
 */
async function checkPermissions(): Promise<CheckResult> {
  const info = steamcmd.getInfo();
  const steamCmdDir = info.directory;
  const testFile = path.join(steamCmdDir, ".oz-test-write");

  try {
    await fs.mkdir(steamCmdDir, { recursive: true });
    await fs.writeFile(testFile, "test");
    await fs.unlink(testFile);
    return {
      name: "Directory Permissions",
      status: "pass",
      message: `Write access to ${steamCmdDir}`,
    };
  } catch (error) {
    return {
      name: "Directory Permissions",
      status: "fail",
      message: `No write access to ${steamCmdDir}: ${error}`,
    };
  }
}

/**
 * Check for Ubuntu/Debian 32-bit library dependencies
 * SteamCMD requires 32-bit libraries on 64-bit Linux systems
 */
async function checkLinux32BitLibs(): Promise<CheckResult> {
  const platform = getPlatform();

  // Only check on Linux
  if (platform !== "linux") {
    return {
      name: "32-bit Libraries (Linux)",
      status: "pass",
      message: "Not applicable on this platform",
    };
  }

  try {
    // Check if dpkg exists (Debian/Ubuntu-based systems)
    const { stdout: dpkgCheck } = await execAsync("which dpkg 2>/dev/null");
    if (!dpkgCheck.trim()) {
      // Not a Debian/Ubuntu system, skip this check
      return {
        name: "32-bit Libraries (Linux)",
        status: "pass",
        message: "Non-Debian system detected, assuming dependencies are met",
      };
    }

    // Check if i386 architecture is enabled
    const { stdout: archCheck } = await execAsync(
      "dpkg --print-foreign-architectures 2>/dev/null"
    );
    const hasI386 = archCheck.includes("i386");

    if (!hasI386) {
      return {
        name: "32-bit Libraries (Linux)",
        status: "fail",
        message:
          "i386 architecture not enabled. Run: sudo dpkg --add-architecture i386 && sudo apt update",
        fixable: false,
      };
    }

    // Check for required packages
    const requiredPackages = ["lib32gcc-s1", "lib32stdc++6", "libc6:i386"];
    const missingPackages: string[] = [];

    for (const pkg of requiredPackages) {
      try {
        const { stdout } = await execAsync(`dpkg -s ${pkg} 2>/dev/null`);
        if (!stdout.includes("Status: install ok installed")) {
          missingPackages.push(pkg);
        }
      } catch {
        missingPackages.push(pkg);
      }
    }

    if (missingPackages.length > 0) {
      return {
        name: "32-bit Libraries (Linux)",
        status: "fail",
        message: `Missing packages: ${missingPackages.join(", ")}. Install with: sudo apt install ${missingPackages.join(" ")}`,
        fixable: false,
      };
    }

    return {
      name: "32-bit Libraries (Linux)",
      status: "pass",
      message: "All required 32-bit libraries are installed",
    };
  } catch (error) {
    return {
      name: "32-bit Libraries (Linux)",
      status: "warn",
      message: `Could not verify 32-bit libraries: ${error}`,
    };
  }
}

/**
 * Run all diagnostic checks
 */
async function runAllChecks(): Promise<DiagnosticReport> {
  const checks: CheckResult[] = [];

  // Run all checks
  checks.push(await checkSteamCmd());
  checks.push(await checkValheimServer());
  checks.push(await checkConfig());
  checks.push(await checkSaveDirectory());
  checks.push(await checkPorts());
  checks.push(await checkPermissions());
  checks.push(await checkLinux32BitLibs());

  // Calculate summary
  const summary = {
    passed: checks.filter((c) => c.status === "pass").length,
    warnings: checks.filter((c) => c.status === "warn").length,
    failed: checks.filter((c) => c.status === "fail").length,
  };

  return {
    timestamp: new Date().toISOString(),
    platform: getPlatform(),
    nodeVersion: process.version,
    checks,
    summary,
  };
}

/**
 * Format check result for console output
 */
function formatCheck(check: CheckResult, useColor = true): string {
  const icons = {
    pass: useColor ? "\x1b[32m✓\x1b[0m" : "[PASS]",
    warn: useColor ? "\x1b[33m⚠\x1b[0m" : "[WARN]",
    fail: useColor ? "\x1b[31m✗\x1b[0m" : "[FAIL]",
  };

  const fixHint = check.fixable ? " (fixable)" : "";
  return `${icons[check.status]} ${check.name}: ${check.message}${fixHint}`;
}

/**
 * Execute the doctor command
 */
export async function doctorCommand(args: DoctorArgs): Promise<void> {
  const report = await runAllChecks();

  // JSON output mode
  if (args.json) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  // Quiet mode - only show failures
  if (args.quiet) {
    const failures = report.checks.filter((c) => c.status === "fail");
    if (failures.length === 0) {
      console.log("All checks passed.");
    } else {
      for (const check of failures) {
        console.log(formatCheck(check, true));
      }
    }
    return;
  }

  // Normal output
  console.log("\n🔍 Valheim Server Diagnostics\n");
  console.log(`Platform: ${report.platform}`);
  console.log(`Node.js: ${report.nodeVersion}`);
  console.log(`Timestamp: ${report.timestamp}\n`);

  console.log("─".repeat(60));

  for (const check of report.checks) {
    console.log(formatCheck(check, true));
  }

  console.log("─".repeat(60));

  // Summary
  const { passed, warnings, failed } = report.summary;
  console.log(
    `\nSummary: ${passed} passed, ${warnings} warnings, ${failed} failed\n`
  );

  // Fix suggestions
  if (args.fix) {
    const fixable = report.checks.filter(
      (c) => c.fixable && c.status === "fail"
    );
    if (fixable.length > 0) {
      console.log("Attempting automatic fixes...\n");

      for (const check of fixable) {
        if (
          check.name === "SteamCMD Installation" ||
          check.name === "Valheim Server Installation"
        ) {
          console.log(`→ Run 'valheim-dsm install' to fix: ${check.name}`);
        } else if (check.name === "Configuration") {
          console.log(
            `→ Run 'valheim-dsm config reset' to reset configuration`
          );
        }
      }
    } else {
      console.log("No automatic fixes available for current issues.");
    }
  } else if (report.summary.failed > 0) {
    const hasFixable = report.checks.some(
      (c) => c.fixable && c.status === "fail"
    );
    if (hasFixable) {
      console.log(
        "Tip: Run 'valheim-dsm doctor --fix' to attempt automatic fixes."
      );
    }
  }

  // Exit with error code if there are failures
  if (failed > 0) {
    process.exitCode = 1;
  }
}
