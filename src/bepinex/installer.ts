/**
 * BepInEx installer
 * Downloads and installs the BepInEx framework for Valheim dedicated server
 */

import { createWriteStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { getValheimServerDir } from "../utils/platform.js";
import {
  getBepInExPath,
  getConfigPath,
  getDisabledPluginsPath,
  getPluginsPath,
  isBepInExInstalled,
} from "./paths.js";

/** BepInEx download URLs */
export const BEPINEX_URLS = {
  /** Valheim-specific BepInEx pack (recommended) */
  valheimPack:
    "https://valheim.thunderstore.io/package/download/denikson/BepInExPack_Valheim/5.4.2202/",
  /** Fallback: Generic BepInEx x64 */
  generic:
    "https://github.com/BepInEx/BepInEx/releases/download/v5.4.21/BepInEx_x64_5.4.21.0.zip",
} as const;

/** Installation progress callback */
export type BepInExInstallProgress = {
  stage: "downloading" | "extracting" | "configuring" | "complete" | "error";
  message: string;
  progress: number; // 0-100
};

/** Progress callback type */
export type BepInExProgressCallback = (
  progress: BepInExInstallProgress
) => void;

/**
 * Downloads a file from a URL to a local path
 * @param url The URL to download from
 * @param destPath The local file path to save to
 * @param onProgress Optional progress callback
 */
async function downloadFile(
  url: string,
  destPath: string,
  onProgress?: BepInExProgressCallback
): Promise<void> {
  onProgress?.({
    stage: "downloading",
    message: `Downloading from ${new URL(url).hostname}...`,
    progress: 10,
  });

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Download failed: ${response.status} ${response.statusText}`
    );
  }

  if (!response.body) {
    throw new Error("Download failed: no response body");
  }

  const fileStream = createWriteStream(destPath);

  // Convert web ReadableStream to Node.js Readable
  const { Readable } = await import("node:stream");
  const nodeStream = Readable.fromWeb(
    response.body as import("node:stream/web").ReadableStream
  );

  await pipeline(nodeStream, fileStream);

  onProgress?.({
    stage: "downloading",
    message: "Download complete",
    progress: 40,
  });
}

/**
 * Extracts a zip file to a directory
 * Uses Node.js built-in zip support (Node 22+)
 * @param zipPath Path to the zip file
 * @param destDir Destination directory
 * @param onProgress Optional progress callback
 */
async function extractZip(
  zipPath: string,
  destDir: string,
  onProgress?: BepInExProgressCallback
): Promise<void> {
  onProgress?.({
    stage: "extracting",
    message: "Extracting files...",
    progress: 50,
  });

  // Use child_process to extract zip since Node.js doesn't have built-in zip
  const { exec } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const execAsync = promisify(exec);

  const platform = process.platform;

  if (platform === "win32") {
    // Use PowerShell on Windows
    // Escape single quotes for PowerShell string literals
    const safeZip = zipPath.replace(/'/g, "''");
    const safeDest = destDir.replace(/'/g, "''");
    await execAsync(
      `powershell -Command "Expand-Archive -Path '${safeZip}' -DestinationPath '${safeDest}' -Force"`
    );
  } else {
    // Use unzip on Linux/macOS
    await execAsync(`unzip -o "${zipPath}" -d "${destDir}"`);
  }

  onProgress?.({
    stage: "extracting",
    message: "Extraction complete",
    progress: 70,
  });
}

/**
 * Downloads and installs BepInEx for Valheim dedicated server
 * @param onProgress Optional progress callback
 * @param valheimPath Optional override for the Valheim server directory
 */
export async function installBepInEx(
  onProgress?: BepInExProgressCallback,
  valheimPath?: string
): Promise<void> {
  const serverDir = valheimPath ?? getValheimServerDir();

  // Verify Valheim server directory exists
  try {
    await fs.access(serverDir);
  } catch {
    throw new Error(
      `Valheim server directory not found: ${serverDir}. Install Valheim first.`
    );
  }

  // Create temp directory for download
  const tempDir = path.join(serverDir, ".bepinex_temp");
  await fs.mkdir(tempDir, { recursive: true });

  const zipPath = path.join(tempDir, "bepinex.zip");

  try {
    // Download BepInEx
    await downloadFile(BEPINEX_URLS.valheimPack, zipPath, onProgress);

    // Extract to temp directory first
    const extractDir = path.join(tempDir, "extracted");
    await fs.mkdir(extractDir, { recursive: true });
    await extractZip(zipPath, extractDir, onProgress);

    onProgress?.({
      stage: "configuring",
      message: "Installing BepInEx files...",
      progress: 75,
    });

    // BepInExPack_Valheim extracts with a specific structure
    // It may have a top-level "BepInExPack_Valheim" folder
    // or directly contain BepInEx/, doorstop_config.ini, winhttp.dll
    const extractedContents = await fs.readdir(extractDir);

    let sourceDir = extractDir;

    // Check if there's a nested directory (Thunderstore package format)
    for (const item of extractedContents) {
      const itemPath = path.join(extractDir, item);
      const stat = await fs.stat(itemPath);
      if (stat.isDirectory() && item.toLowerCase().includes("bepinex")) {
        // Check if this subdirectory contains the actual BepInEx files
        const subContents = await fs.readdir(itemPath);
        if (
          subContents.some(
            (f) =>
              f === "BepInEx" ||
              f === "doorstop_config.ini" ||
              f === "winhttp.dll"
          )
        ) {
          sourceDir = itemPath;
          break;
        }
      }
    }

    // Copy files to Valheim server directory
    await copyDirectory(sourceDir, serverDir);

    onProgress?.({
      stage: "configuring",
      message: "Creating plugin directories...",
      progress: 85,
    });

    // Ensure directories exist
    await fs.mkdir(getPluginsPath(valheimPath), { recursive: true });
    await fs.mkdir(getDisabledPluginsPath(valheimPath), { recursive: true });
    await fs.mkdir(getConfigPath(valheimPath), { recursive: true });

    onProgress?.({
      stage: "complete",
      message: "BepInEx installed successfully!",
      progress: 100,
    });
  } catch (error) {
    onProgress?.({
      stage: "error",
      message: `Installation failed: ${error instanceof Error ? error.message : String(error)}`,
      progress: 0,
    });
    throw error;
  } finally {
    // Clean up temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Recursively copies a directory, overwriting existing files
 * @param src Source directory
 * @param dest Destination directory
 */
async function copyDirectory(src: string, dest: string): Promise<void> {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

/**
 * Uninstalls BepInEx from the Valheim server directory
 * @param valheimPath Optional override for the Valheim server directory
 */
export async function uninstallBepInEx(valheimPath?: string): Promise<void> {
  const serverDir = valheimPath ?? getValheimServerDir();
  const bepInExDir = getBepInExPath(valheimPath);

  // Remove BepInEx directory
  try {
    await fs.rm(bepInExDir, { recursive: true, force: true });
  } catch {
    // Directory may not exist
  }

  // Remove doorstop files
  const doorstopFiles = [
    "doorstop_config.ini",
    "winhttp.dll",
    ".doorstop_version",
  ];

  for (const file of doorstopFiles) {
    try {
      await fs.unlink(path.join(serverDir, file));
    } catch {
      // File may not exist
    }
  }
}

/**
 * Verifies the BepInEx installation is complete and functional
 * @param valheimPath Optional override for the Valheim server directory
 * @returns Object with validation status and message
 */
export async function verifyBepInExSetup(
  valheimPath?: string
): Promise<{ valid: boolean; message: string }> {
  const installed = await isBepInExInstalled(valheimPath);
  if (!installed) {
    return { valid: false, message: "BepInEx is not installed" };
  }

  const serverDir = valheimPath ?? getValheimServerDir();

  // Check for doorstop (required for BepInEx to load)
  const doorstopConfig = path.join(serverDir, "doorstop_config.ini");
  try {
    await fs.access(doorstopConfig);
  } catch {
    return {
      valid: false,
      message: "doorstop_config.ini missing - BepInEx may not load",
    };
  }

  // Check for winhttp.dll on Windows
  if (process.platform === "win32") {
    const winhttp = path.join(serverDir, "winhttp.dll");
    try {
      await fs.access(winhttp);
    } catch {
      return {
        valid: false,
        message: "winhttp.dll missing - BepInEx proxy not installed",
      };
    }
  }

  return { valid: true, message: "BepInEx installation verified" };
}
