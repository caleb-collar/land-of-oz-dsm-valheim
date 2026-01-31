/**
 * Valheim Dedicated Server installer and updater
 * Uses SteamCMD to download and update Valheim
 */

import { getSteamPaths } from "./paths.ts";

/** Valheim Dedicated Server Steam App ID */
export const VALHEIM_APP_ID = "896660";

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
 * Installs or updates Valheim Dedicated Server via SteamCMD
 * @param onProgress Optional callback for progress updates
 * @throws Error if installation fails
 */
export async function installValheim(
  onProgress?: UpdateCallback,
): Promise<void> {
  const { steamcmd, steamcmdDir } = getSteamPaths();

  const report = (status: UpdateStatus) => {
    onProgress?.(status);
  };

  report({
    stage: "downloading",
    progress: 0,
    message: "Starting Valheim installation...",
  });

  // Build SteamCMD command arguments
  // Note: force_install_dir must be the parent of steamapps, not the app folder
  const args = [
    "+force_install_dir",
    steamcmdDir,
    "+login",
    "anonymous",
    "+app_update",
    VALHEIM_APP_ID,
    "validate",
    "+quit",
  ];

  const command = new Deno.Command(steamcmd, {
    args,
    stdout: "piped",
    stderr: "piped",
  });

  const process = command.spawn();

  // Stream and parse output for progress
  const decoder = new TextDecoder();
  const reader = process.stdout.getReader();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const progress = parseUpdateProgress(line);
      if (progress) {
        report(progress);
      }
    }
  }

  const status = await process.status;

  if (!status.success) {
    report({ stage: "error", progress: 0, message: "Installation failed" });
    throw new Error(`Valheim installation failed with code ${status.code}`);
  }

  report({
    stage: "complete",
    progress: 100,
    message: "Valheim installed successfully",
  });
}

/**
 * Updates Valheim Dedicated Server
 * This is the same as install - SteamCMD handles incremental updates
 * @param onProgress Optional callback for progress updates
 * @returns True if update was successful
 */
export async function updateValheim(
  onProgress?: UpdateCallback,
): Promise<boolean> {
  await installValheim(onProgress);
  return true;
}

/**
 * Checks if a Valheim update is available
 * Note: SteamCMD doesn't provide a clean way to check without downloading
 * @returns True if update may be available (always returns false currently)
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

  // Check manifest file for version info
  const manifestPath = `${steamcmdDir}/steamapps/appmanifest_${VALHEIM_APP_ID}.acf`;

  try {
    const content = await Deno.readTextFile(manifestPath);
    const match = content.match(/"buildid"\s+"(\d+)"/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * Parses SteamCMD output for progress indicators
 * @param line Output line to parse
 * @returns UpdateStatus if progress detected, null otherwise
 */
function parseUpdateProgress(line: string): UpdateStatus | null {
  // Parse SteamCMD output patterns:
  // "Update state (0x61) downloading, progress: 50.23 (524288000 / 1043496960)"
  // "Update state (0x5) verifying install, progress: 23.45 (245366784 / 1043496960)"
  // "Success! App '896660' fully installed."

  const downloadMatch = line.match(/downloading, progress: ([\d.]+)/);
  if (downloadMatch) {
    const progress = Math.round(parseFloat(downloadMatch[1]));
    return {
      stage: "downloading",
      progress,
      message: `Downloading: ${progress}%`,
    };
  }

  const verifyMatch = line.match(/verifying install, progress: ([\d.]+)/);
  if (verifyMatch) {
    const progress = Math.round(parseFloat(verifyMatch[1]));
    return {
      stage: "validating",
      progress,
      message: `Validating: ${progress}%`,
    };
  }

  if (line.includes("Success!") && line.includes("fully installed")) {
    return {
      stage: "complete",
      progress: 100,
      message: "Installation complete",
    };
  }

  if (line.includes("Error!") || line.includes("FAILED")) {
    return {
      stage: "error",
      progress: 0,
      message: line.trim(),
    };
  }

  return null;
}
