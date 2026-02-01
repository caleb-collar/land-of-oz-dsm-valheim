/**
 * Valheim Dedicated Server installer and updater
 * Uses @caleb-collar/steamcmd package for installation
 */

import fs from "node:fs/promises";
import steamcmd from "@caleb-collar/steamcmd";
import { getSteamPaths } from "./paths.js";

/** Valheim Dedicated Server Steam App ID */
export const VALHEIM_APP_ID = 896660;

/** Update status stages */
export type UpdateStage =
  | "checking"
  | "downloading"
  | "validating"
  | "complete"
  | "error";

/** Status update during installation/update */
export type UpdateStatus = {
  stage: UpdateStage;
  progress: number; // 0-100
  message: string;
  needsUpdate?: boolean;
};

/** Callback for update status updates */
export type UpdateCallback = (status: UpdateStatus) => void;

/**
 * Maps steamcmd package progress phases to our UpdateStage
 */
function mapPhaseToStage(phase: string): UpdateStage {
  switch (phase) {
    case "downloading":
      return "downloading";
    case "validating":
    case "verifying":
      return "validating";
    case "complete":
      return "complete";
    default:
      return "downloading";
  }
}

/**
 * Installs or updates Valheim Dedicated Server via SteamCMD
 * @param onProgress Optional callback for progress updates
 * @throws Error if installation fails
 */
export async function installValheim(
  onProgress?: UpdateCallback
): Promise<void> {
  const { steamcmdDir } = getSteamPaths();

  const report = (status: UpdateStatus) => {
    onProgress?.(status);
  };

  // Ensure SteamCMD is installed first
  const isInstalled = await steamcmd.isInstalled();
  if (!isInstalled) {
    report({
      stage: "error",
      progress: 0,
      message: "SteamCMD is not installed. Please install it first.",
    });
    throw new Error("SteamCMD is not installed");
  }

  // Ensure the steamcmd directory exists
  try {
    await fs.mkdir(steamcmdDir, { recursive: true });
  } catch {
    // Directory likely exists, continue
  }

  report({
    stage: "downloading",
    progress: 0,
    message: "Starting Valheim installation...",
  });

  try {
    await steamcmd.install({
      applicationId: VALHEIM_APP_ID,
      path: steamcmdDir,
      onProgress: (p) => {
        const stage = mapPhaseToStage(p.phase);
        const progress = p.percent ?? 0;

        let message: string;
        switch (stage) {
          case "downloading":
            message = `Downloading: ${progress}%`;
            break;
          case "validating":
            message = `Validating: ${progress}%`;
            break;
          case "complete":
            message = "Installation complete";
            break;
          default:
            message = p.phase;
        }

        report({
          stage,
          progress,
          message,
        });
      },
      onOutput: (data, _type) => {
        // Check for success/error messages in output
        if (data.includes("Success!") && data.includes("fully installed")) {
          report({
            stage: "complete",
            progress: 100,
            message: "Installation complete",
          });
        } else if (data.includes("Error!") || data.includes("FAILED")) {
          report({
            stage: "error",
            progress: 0,
            message: data.trim(),
          });
        }
      },
    });

    report({
      stage: "complete",
      progress: 100,
      message: "Valheim installed successfully",
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Provide more helpful error messages for common exit codes
    let helpfulMessage = `Installation failed: ${errorMessage}`;
    if (errorMessage.includes("code 7")) {
      helpfulMessage =
        "Installation failed: SteamCMD download error (exit code 7). This may be due to network issues, Steam server problems, or disk space. Try again in a few minutes.";
    } else if (errorMessage.includes("code 5")) {
      helpfulMessage =
        "Installation failed: SteamCMD package error (exit code 5). The SteamCMD installation may be corrupted. Try reinstalling SteamCMD.";
    }

    report({
      stage: "error",
      progress: 0,
      message: helpfulMessage,
    });
    throw error;
  }
}

/**
 * Updates Valheim Dedicated Server
 * This is the same as install - SteamCMD handles incremental updates
 * @param onProgress Optional callback for progress updates
 * @returns True if update was successful
 */
export async function updateValheim(
  onProgress?: UpdateCallback
): Promise<boolean> {
  await installValheim(onProgress);
  return true;
}

/**
 * Checks if a Valheim update is available
 * Note: This checks the installed version against Steam's latest
 * @returns True if update may be available
 */
export async function checkForUpdates(): Promise<boolean> {
  // SteamCMD doesn't have a reliable way to check updates without downloading
  // For now, we return false and let users trigger updates manually
  return await Promise.resolve(false);
}

/**
 * Gets the currently installed Valheim build ID
 * @returns Build ID string or null if not installed
 */
export async function getInstalledVersion(): Promise<string | null> {
  const { steamcmdDir } = getSteamPaths();

  try {
    const versionInfo = await steamcmd.getInstalledVersion({
      applicationId: VALHEIM_APP_ID,
      path: steamcmdDir,
    });

    return versionInfo?.buildId?.toString() ?? null;
  } catch {
    return null;
  }
}
