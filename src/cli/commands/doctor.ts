/**
 * Doctor command - Diagnose common issues
 * Checks SteamCMD, Valheim, config, ports, permissions
 */

import fs from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import { type AppConfig, loadConfig } from "../../config/mod.js";
import {
  getPlatform,
  getSteamCmdDir,
  getSteamCmdExecutable,
  getValheimExecutable,
  getValheimSaveDir,
  getValheimServerDir,
} from "../../utils/platform.js";
import type { DoctorArgs } from "../args.js";

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
  const steamCmdPath = getSteamCmdExecutable();
  const steamCmdDir = getSteamCmdDir();

  if (await exists(steamCmdPath)) {
    return {
      name: "SteamCMD Installation",
      status: "pass",
      message: `SteamCMD found at ${steamCmdDir}`,
    };
  }

  return {
    name: "SteamCMD Installation",
    status: "fail",
    message: "SteamCMD not found. Run 'oz-valheim install' to install.",
    fixable: true,
  };
}

/**
 * Run Valheim server installation check
 */
async function checkValheimServer(): Promise<CheckResult> {
  const valheimPath = getValheimExecutable();
  const valheimDir = getValheimServerDir();

  if (await exists(valheimPath)) {
    return {
      name: "Valheim Server Installation",
      status: "pass",
      message: `Valheim server found at ${valheimDir}`,
    };
  }

  return {
    name: "Valheim Server Installation",
    status: "fail",
    message: "Valheim server not found. Run 'oz-valheim install' to install.",
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
          "No world name configured. Set with 'oz-valheim config set server.world <name>'",
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
  const steamCmdDir = getSteamCmdDir();
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
          console.log(`→ Run 'oz-valheim install' to fix: ${check.name}`);
        } else if (check.name === "Configuration") {
          console.log(`→ Run 'oz-valheim config reset' to reset configuration`);
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
        "Tip: Run 'oz-valheim doctor --fix' to attempt automatic fixes."
      );
    }
  }

  // Exit with error code if there are failures
  if (failed > 0) {
    process.exitCode = 1;
  }
}
