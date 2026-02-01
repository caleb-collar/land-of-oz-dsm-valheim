/**
 * SteamCMD automatic installer
 * Uses @caleb-collar/steamcmd package for installation
 */

import steamcmd from "@caleb-collar/steamcmd";

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
 * Maps steamcmd package progress phases to our InstallStage
 */
function mapPhaseToStage(phase: string): InstallStage {
  switch (phase) {
    case "downloading":
      return "downloading";
    case "extracting":
      return "extracting";
    case "verifying":
    case "initializing":
      return "verifying";
    case "complete":
      return "complete";
    default:
      return "downloading";
  }
}

/**
 * Downloads and installs SteamCMD for the current platform
 * @param onProgress Optional callback for progress updates
 * @throws Error if download or extraction fails
 */
export async function installSteamCmd(
  onProgress?: ProgressCallback
): Promise<void> {
  const report = (progress: InstallProgress) => {
    onProgress?.(progress);
  };

  report({
    stage: "downloading",
    progress: 0,
    message: "Downloading SteamCMD...",
  });

  try {
    await steamcmd.ensureInstalled({
      onProgress: (p) => {
        const stage = mapPhaseToStage(p.phase);
        const progress = p.percent ?? 0;

        let message: string;
        switch (stage) {
          case "downloading":
            message = `Downloading: ${progress}%`;
            break;
          case "extracting":
            message = "Extracting archive...";
            break;
          case "verifying":
            message = "Verifying installation...";
            break;
          case "complete":
            message = "SteamCMD installed successfully";
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
    });

    report({
      stage: "complete",
      progress: 100,
      message: "SteamCMD installed successfully",
    });
  } catch (error) {
    report({
      stage: "error",
      progress: 0,
      message: `Installation failed: ${error instanceof Error ? error.message : String(error)}`,
    });
    throw error;
  }
}
