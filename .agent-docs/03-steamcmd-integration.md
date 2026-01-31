# 03 - SteamCMD Integration

## Overview

SteamCMD is used to download and update the Valheim dedicated server. This module handles automatic installation of SteamCMD itself, and manages Valheim installation/updates.

## SteamCMD Basics

- **Anonymous Login**: Valheim dedicated server is free and doesn't require Steam authentication
- **App ID**: Valheim Dedicated Server = `896660`
- **Platforms**: Windows, macOS (limited), Linux

## Platform Paths

```typescript
// src/steamcmd/paths.ts
import { join } from "@std/path";
import { getPlatform } from "../utils/platform.ts";

export type SteamPaths = {
  steamcmd: string; // SteamCMD executable
  steamcmdDir: string; // SteamCMD installation directory
  valheimDir: string; // Valheim dedicated server directory
  executable: string; // valheim_server.exe / valheim_server.x86_64
};

export function getSteamPaths(): SteamPaths {
  const platform = getPlatform();
  const home = Deno.env.get("HOME") ?? Deno.env.get("USERPROFILE") ?? "";

  switch (platform) {
    case "windows": {
      const localAppData =
        Deno.env.get("LOCALAPPDATA") ?? join(home, "AppData", "Local");
      const steamcmdDir = join(localAppData, "steamcmd");
      return {
        steamcmdDir,
        steamcmd: join(steamcmdDir, "steamcmd.exe"),
        valheimDir: join(
          steamcmdDir,
          "steamapps",
          "common",
          "Valheim dedicated server",
        ),
        executable: "valheim_server.exe",
      };
    }

    case "darwin": {
      const steamcmdDir = join(
        home,
        "Library",
        "Application Support",
        "steamcmd",
      );
      return {
        steamcmdDir,
        steamcmd: join(steamcmdDir, "steamcmd.sh"),
        valheimDir: join(
          steamcmdDir,
          "steamapps",
          "common",
          "Valheim dedicated server",
        ),
        executable: "valheim_server.x86_64",
      };
    }

    case "linux":
    default: {
      const steamcmdDir = join(home, ".local", "share", "steamcmd");
      return {
        steamcmdDir,
        steamcmd: join(steamcmdDir, "steamcmd.sh"),
        valheimDir: join(
          steamcmdDir,
          "steamapps",
          "common",
          "Valheim dedicated server",
        ),
        executable: "valheim_server.x86_64",
      };
    }
  }
}

export function getValheimExecutable(): string {
  const paths = getSteamPaths();
  return join(paths.valheimDir, paths.executable);
}

export async function isSteamCmdInstalled(): Promise<boolean> {
  const { steamcmd } = getSteamPaths();
  try {
    const stat = await Deno.stat(steamcmd);
    return stat.isFile;
  } catch {
    return false;
  }
}

export async function isValheimInstalled(): Promise<boolean> {
  const executable = getValheimExecutable();
  try {
    const stat = await Deno.stat(executable);
    return stat.isFile;
  } catch {
    return false;
  }
}
```

## SteamCMD Installer

```typescript
// src/steamcmd/installer.ts
import { ensureDir } from "@std/fs";
import { join } from "@std/path";
import { getPlatform } from "../utils/platform.ts";
import { getSteamPaths } from "./paths.ts";

const DOWNLOAD_URLS = {
  windows: "https://steamcdn-a.akamaihd.net/client/installer/steamcmd.zip",
  linux:
    "https://steamcdn-a.akamaihd.net/client/installer/steamcmd_linux.tar.gz",
  darwin:
    "https://steamcdn-a.akamaihd.net/client/installer/steamcmd_osx.tar.gz",
} as const;

export type InstallProgress = {
  stage: "downloading" | "extracting" | "verifying" | "complete" | "error";
  progress: number; // 0-100
  message: string;
};

export type ProgressCallback = (progress: InstallProgress) => void;

export async function installSteamCmd(
  onProgress?: ProgressCallback,
): Promise<void> {
  const platform = getPlatform();
  const { steamcmdDir } = getSteamPaths();

  const report = (progress: InstallProgress) => {
    onProgress?.(progress);
  };

  // Ensure directory exists
  await ensureDir(steamcmdDir);

  report({
    stage: "downloading",
    progress: 0,
    message: "Downloading SteamCMD...",
  });

  // Download
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
      const progress = Math.round((downloaded / total) * 50); // 0-50%
      report({
        stage: "downloading",
        progress,
        message: `Downloading: ${progress * 2}%`,
      });
    }
  }

  const data = new Uint8Array(downloaded);
  let offset = 0;
  for (const chunk of chunks) {
    data.set(chunk, offset);
    offset += chunk.length;
  }

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

  // On Linux/macOS, make executable
  if (platform !== "windows") {
    const { steamcmd } = getSteamPaths();
    await Deno.chmod(steamcmd, 0o755);
  }

  // Run initial update
  report({
    stage: "verifying",
    progress: 95,
    message: "Running initial update...",
  });
  await runSteamCmdUpdate();

  report({
    stage: "complete",
    progress: 100,
    message: "SteamCMD installed successfully",
  });
}

async function extractZip(data: Uint8Array, targetDir: string): Promise<void> {
  // Write temp file
  const tempPath = await Deno.makeTempFile({ suffix: ".zip" });
  await Deno.writeFile(tempPath, data);

  // Use PowerShell to extract on Windows
  const command = new Deno.Command("powershell", {
    args: [
      "-NoProfile",
      "-Command",
      `Expand-Archive -Path "${tempPath}" -DestinationPath "${targetDir}" -Force`,
    ],
  });

  const { code } = await command.output();
  await Deno.remove(tempPath);

  if (code !== 0) {
    throw new Error("Failed to extract ZIP archive");
  }
}

async function extractTarGz(
  data: Uint8Array,
  targetDir: string,
): Promise<void> {
  // Write temp file
  const tempPath = await Deno.makeTempFile({ suffix: ".tar.gz" });
  await Deno.writeFile(tempPath, data);

  // Use tar to extract
  const command = new Deno.Command("tar", {
    args: ["-xzf", tempPath, "-C", targetDir],
  });

  const { code } = await command.output();
  await Deno.remove(tempPath);

  if (code !== 0) {
    throw new Error("Failed to extract TAR.GZ archive");
  }
}

async function runSteamCmdUpdate(): Promise<void> {
  const { steamcmd } = getSteamPaths();

  const command = new Deno.Command(steamcmd, {
    args: ["+quit"],
    stdout: "null",
    stderr: "null",
  });

  await command.output();
}
```

## Valheim Updater

```typescript
// src/steamcmd/updater.ts
import { getSteamPaths, isValheimInstalled } from "./paths.ts";

const VALHEIM_APP_ID = "896660";

export type UpdateStatus = {
  stage: "checking" | "downloading" | "validating" | "complete" | "error";
  progress: number;
  message: string;
  needsUpdate?: boolean;
};

export type UpdateCallback = (status: UpdateStatus) => void;

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

  // Build SteamCMD command
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

  // Stream and parse output
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

  const { code } = await process.status;

  if (code !== 0) {
    report({ stage: "error", progress: 0, message: "Installation failed" });
    throw new Error("Valheim installation failed");
  }

  report({
    stage: "complete",
    progress: 100,
    message: "Valheim installed successfully",
  });
}

export async function updateValheim(
  onProgress?: UpdateCallback,
): Promise<boolean> {
  // This is the same as install - SteamCMD handles the diff
  await installValheim(onProgress);
  return true;
}

export async function checkForUpdates(): Promise<boolean> {
  // SteamCMD doesn't have a great way to check without downloading
  // Best approach: run app_update with a timeout and check if it starts downloading
  // For simplicity, we'll just return false and let the user trigger updates
  return false;
}

function parseUpdateProgress(line: string): UpdateStatus | null {
  // Parse SteamCMD output for progress indicators
  // Examples:
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

export async function getInstalledVersion(): Promise<string | null> {
  const { valheimDir } = getSteamPaths();

  // Check manifest file for version info
  const manifestPath = `${valheimDir}/../appmanifest_${VALHEIM_APP_ID}.acf`;

  try {
    const content = await Deno.readTextFile(manifestPath);
    const match = content.match(/"buildid"\s+"(\d+)"/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}
```

## Module Exports

```typescript
// src/steamcmd/mod.ts
export {
  getSteamPaths,
  isSteamCmdInstalled,
  isValheimInstalled,
  getValheimExecutable,
} from "./paths.ts";
export { installSteamCmd, type InstallProgress } from "./installer.ts";
export {
  installValheim,
  updateValheim,
  checkForUpdates,
  getInstalledVersion,
  type UpdateStatus,
} from "./updater.ts";
```

## CLI Integration

```typescript
// src/cli/commands/install.ts
import {
  isSteamCmdInstalled,
  installSteamCmd,
  isValheimInstalled,
  installValheim,
} from "../../steamcmd/mod.ts";

export async function installCommand(options: {
  steamcmd?: boolean;
  valheim?: boolean;
}): Promise<void> {
  // Default: install everything needed
  const installAll = !options.steamcmd && !options.valheim;

  if (installAll || options.steamcmd) {
    const installed = await isSteamCmdInstalled();
    if (!installed) {
      console.log("Installing SteamCMD...");
      await installSteamCmd((progress) => {
        process.stdout.write(`\r${progress.message}`);
      });
      console.log(); // newline
    } else {
      console.log("SteamCMD already installed.");
    }
  }

  if (installAll || options.valheim) {
    // SteamCMD is required for Valheim
    const steamInstalled = await isSteamCmdInstalled();
    if (!steamInstalled) {
      console.error("SteamCMD is required. Run with --steamcmd first.");
      return;
    }

    const valheimInstalled = await isValheimInstalled();
    if (!valheimInstalled) {
      console.log("Installing Valheim Dedicated Server...");
    } else {
      console.log("Updating Valheim Dedicated Server...");
    }

    await installValheim((status) => {
      process.stdout.write(`\r${status.message}`);
    });
    console.log(); // newline
  }

  console.log("Done!");
}
```

## TUI Integration

```typescript
// In Settings screen or dedicated Install screen
import { FC, useState } from "react";
import { Box, Text } from "ink";
import { isSteamCmdInstalled, installSteamCmd, isValheimInstalled, installValheim } from "../../steamcmd/mod.ts";

export const InstallPanel: FC = () => {
  const [status, setStatus] = useState<string>("Checking...");
  const [progress, setProgress] = useState(0);
  const [installing, setInstalling] = useState(false);

  const handleInstall = async () => {
    setInstalling(true);

    if (!(await isSteamCmdInstalled())) {
      await installSteamCmd((p) => {
        setStatus(p.message);
        setProgress(p.progress);
      });
    }

    if (!(await isValheimInstalled())) {
      await installValheim((p) => {
        setStatus(p.message);
        setProgress(p.progress);
      });
    }

    setInstalling(false);
    setStatus("Ready");
  };

  return (
    <Box flexDirection="column">
      <Text>{status}</Text>
      {installing && (
        <Box>
          <Text>[{"█".repeat(Math.floor(progress / 5))}{"░".repeat(20 - Math.floor(progress / 5))}] {progress}%</Text>
        </Box>
      )}
    </Box>
  );
};
```

## Dependencies for Different Platforms

### Windows

- PowerShell (for ZIP extraction)
- No additional dependencies

### Linux

- `tar` (usually pre-installed)
- `lib32gcc-s1` or `lib32gcc1` (for SteamCMD)
- May need: `apt install lib32gcc-s1`

### macOS

- `tar` (pre-installed)
- Note: macOS support for Valheim server is limited

## Error Handling

```typescript
export class SteamCmdError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "SteamCmdError";
  }
}

export const SteamErrors = {
  DOWNLOAD_FAILED: (status: number) =>
    new SteamCmdError(
      `Download failed with status ${status}`,
      "DOWNLOAD_FAILED",
    ),

  EXTRACTION_FAILED: () =>
    new SteamCmdError("Failed to extract archive", "EXTRACTION_FAILED"),

  INSTALL_FAILED: (appId: string) =>
    new SteamCmdError(`Failed to install app ${appId}`, "INSTALL_FAILED"),

  NOT_INSTALLED: () =>
    new SteamCmdError("SteamCMD is not installed", "NOT_INSTALLED"),

  NETWORK_ERROR: (url: string) =>
    new SteamCmdError(`Network error downloading ${url}`, "NETWORK_ERROR"),
};
```
