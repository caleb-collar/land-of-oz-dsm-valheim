/**
 * SteamCMD automatic installer
 * Downloads and extracts SteamCMD for the current platform
 */

import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { getPlatform } from "../utils/platform.js";
import { getSteamPaths } from "./paths.js";

/** Download URLs for SteamCMD by platform */
const DOWNLOAD_URLS = {
  windows: "https://steamcdn-a.akamaihd.net/client/installer/steamcmd.zip",
  linux:
    "https://steamcdn-a.akamaihd.net/client/installer/steamcmd_linux.tar.gz",
  darwin:
    "https://steamcdn-a.akamaihd.net/client/installer/steamcmd_osx.tar.gz",
} as const;

/** Installation progress stages */
export type InstallStage =
  | "downloading"
  | "extracting"
  | "verifying"
  | "complete"
  | "error";

/** Progress update during installation */
export type InstallProgress = {
  stage: InstallStage;
  progress: number; // 0-100
  message: string;
};

/** Callback for installation progress updates */
export type ProgressCallback = (progress: InstallProgress) => void;

/**
 * Downloads and installs SteamCMD for the current platform
 * @param onProgress Optional callback for progress updates
 * @throws Error if download or extraction fails
 */
export async function installSteamCmd(
  onProgress?: ProgressCallback
): Promise<void> {
  const platform = getPlatform();
  const { steamcmdDir } = getSteamPaths();

  const report = (progress: InstallProgress) => {
    onProgress?.(progress);
  };

  // Ensure directory exists
  await fs.mkdir(steamcmdDir, { recursive: true });

  report({
    stage: "downloading",
    progress: 0,
    message: "Downloading SteamCMD...",
  });

  // Download SteamCMD archive
  const url = DOWNLOAD_URLS[platform];
  const response = await fetch(url);

  if (!response.ok) {
    report({
      stage: "error",
      progress: 0,
      message: `Download failed: ${response.status}`,
    });
    throw new Error(`Failed to download SteamCMD: ${response.status}`);
  }

  const total = Number(response.headers.get("content-length")) || 0;
  const chunks: Uint8Array[] = [];
  let downloaded = 0;

  const reader = response.body!.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    chunks.push(value);
    downloaded += value.length;

    if (total > 0) {
      const percent = Math.round((downloaded / total) * 50); // 0-50%
      report({
        stage: "downloading",
        progress: percent,
        message: `Downloading: ${percent * 2}%`,
      });
    }
  }

  // Combine chunks into single buffer
  const data = Buffer.concat(chunks);

  report({
    stage: "extracting",
    progress: 50,
    message: "Extracting archive...",
  });

  // Extract based on platform
  if (platform === "windows") {
    await extractZip(data, steamcmdDir);
  } else {
    await extractTarGz(data, steamcmdDir);
  }

  report({
    stage: "verifying",
    progress: 90,
    message: "Verifying installation...",
  });

  // On Linux/macOS, make the script executable
  if (platform !== "windows") {
    const { steamcmd } = getSteamPaths();
    await fs.chmod(steamcmd, 0o755);
  }

  // Run initial update to ensure SteamCMD is ready
  report({
    stage: "verifying",
    progress: 95,
    message: "Running initial SteamCMD update...",
  });
  await runSteamCmdUpdate();

  report({
    stage: "complete",
    progress: 100,
    message: "SteamCMD installed successfully",
  });
}

/**
 * Extracts a ZIP archive using PowerShell (Windows only)
 * @param data ZIP file contents
 * @param targetDir Target extraction directory
 */
async function extractZip(data: Buffer, targetDir: string): Promise<void> {
  // Write temp file
  const tempPath = path.join(os.tmpdir(), `steamcmd-${Date.now()}.zip`);
  await fs.writeFile(tempPath, data);

  try {
    // Use PowerShell to extract on Windows
    await new Promise<void>((resolve, reject) => {
      const proc = spawn("powershell", [
        "-NoProfile",
        "-Command",
        `Expand-Archive -Path "${tempPath}" -DestinationPath "${targetDir}" -Force`,
      ]);

      let stderr = "";
      proc.stderr.on("data", (chunk) => {
        stderr += chunk;
      });
      proc.on("close", (code) => {
        if (code !== 0) {
          reject(new Error(`Failed to extract ZIP archive: ${stderr}`));
        } else {
          resolve();
        }
      });
      proc.on("error", reject);
    });
  } finally {
    await fs.unlink(tempPath);
  }
}

/**
 * Extracts a TAR.GZ archive using tar command (Linux/macOS)
 * @param data TAR.GZ file contents
 * @param targetDir Target extraction directory
 */
async function extractTarGz(data: Buffer, targetDir: string): Promise<void> {
  // Write temp file
  const tempPath = path.join(os.tmpdir(), `steamcmd-${Date.now()}.tar.gz`);
  await fs.writeFile(tempPath, data);

  try {
    // Use tar to extract
    await new Promise<void>((resolve, reject) => {
      const proc = spawn("tar", ["-xzf", tempPath, "-C", targetDir]);

      let stderr = "";
      proc.stderr.on("data", (chunk) => {
        stderr += chunk;
      });
      proc.on("close", (code) => {
        if (code !== 0) {
          reject(new Error(`Failed to extract TAR.GZ archive: ${stderr}`));
        } else {
          resolve();
        }
      });
      proc.on("error", reject);
    });
  } finally {
    await fs.unlink(tempPath);
  }
}

/**
 * Runs SteamCMD initial update to download required files
 */
async function runSteamCmdUpdate(): Promise<void> {
  const { steamcmd } = getSteamPaths();

  await new Promise<void>((resolve, reject) => {
    const proc = spawn(steamcmd, ["+quit"], {
      stdio: ["ignore", "ignore", "ignore"],
    });

    proc.on("close", (code) => {
      // SteamCMD may return non-zero on first run, that's expected
      // as long as it creates the required files
      if (code !== 0 && code !== 7) {
        // Code 7 is "no updates available" which is fine
        console.warn(`SteamCMD initial update returned code ${code}`);
      }
      resolve();
    });
    proc.on("error", reject);
  });
}
