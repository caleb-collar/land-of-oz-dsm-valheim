/**
 * BepInEx plugin manager
 * Manages curated server-side plugins for Valheim dedicated server
 */

import { createWriteStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import {
  getConfigPath,
  getDisabledPluginsPath,
  getPluginsPath,
  isBepInExInstalled,
} from "./paths.js";
import type { InstalledPlugin, PluginDefinition, PluginId } from "./types.js";

/** Curated plugin definitions - server-side only, no client install required */
export const SUPPORTED_PLUGINS: PluginDefinition[] = [
  {
    id: "bepinex-rcon",
    name: "BepInEx.rcon",
    description: "RCON protocol library for remote server management",
    version: "1.0.4",
    author: "AviiNL",
    downloadUrl:
      "https://github.com/AviiNL/BepInEx.rcon/releases/download/v1.0.4/rcon.dll",
    dllFile: "rcon.dll",
    configFile: "nl.avii.plugins.rcon.cfg",
    requiresBepInEx: true,
    category: "core",
  },
  {
    id: "server-devcommands",
    name: "Server DevCommands",
    description: "Enhanced admin commands for server management",
    version: "1.74.0",
    author: "JereKuusela",
    downloadUrl:
      "https://valheim.thunderstore.io/package/download/JereKuusela/Server_devcommands/1.74.0/",
    dllFile: "ServerDevcommands.dll",
    configFile: "server_devcommands.cfg",
    requiresBepInEx: true,
    category: "core",
  },
];

/** Plugin installation progress callback */
export type PluginInstallProgress = {
  stage: "downloading" | "installing" | "configuring" | "complete" | "error";
  message: string;
  progress: number;
};

/** Progress callback type */
export type PluginProgressCallback = (progress: PluginInstallProgress) => void;

/**
 * Gets a plugin definition by its ID
 * @param pluginId The plugin identifier
 * @returns The plugin definition or undefined
 */
export function getPluginDefinition(
  pluginId: PluginId
): PluginDefinition | undefined {
  return SUPPORTED_PLUGINS.find((p) => p.id === pluginId);
}

/**
 * Checks if a specific plugin is installed (in the plugins directory)
 * @param pluginId The plugin identifier
 * @param valheimPath Optional override for the Valheim server directory
 * @returns True if the plugin DLL exists in the plugins directory
 */
export async function isPluginInstalled(
  pluginId: PluginId,
  valheimPath?: string
): Promise<boolean> {
  const plugin = getPluginDefinition(pluginId);
  if (!plugin) return false;

  const pluginsDir = getPluginsPath(valheimPath);
  const dllPath = path.join(pluginsDir, plugin.dllFile);

  try {
    await fs.access(dllPath);
    return true;
  } catch {
    // Also check disabled plugins directory
    const disabledDir = getDisabledPluginsPath(valheimPath);
    const disabledPath = path.join(disabledDir, plugin.dllFile);
    try {
      await fs.access(disabledPath);
      return true; // Installed but disabled
    } catch {
      return false;
    }
  }
}

/**
 * Checks if a plugin is currently enabled (in plugins/ not plugins_disabled/)
 * @param pluginId The plugin identifier
 * @param valheimPath Optional override for the Valheim server directory
 * @returns True if the plugin DLL is in the active plugins directory
 */
export async function isPluginEnabled(
  pluginId: PluginId,
  valheimPath?: string
): Promise<boolean> {
  const plugin = getPluginDefinition(pluginId);
  if (!plugin) return false;

  const pluginsDir = getPluginsPath(valheimPath);
  const dllPath = path.join(pluginsDir, plugin.dllFile);

  try {
    await fs.access(dllPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Gets information about all installed plugins
 * @param valheimPath Optional override for the Valheim server directory
 * @returns Array of installed plugin states
 */
export async function getInstalledPlugins(
  valheimPath?: string
): Promise<InstalledPlugin[]> {
  const results: InstalledPlugin[] = [];

  for (const plugin of SUPPORTED_PLUGINS) {
    const installed = await isPluginInstalled(plugin.id, valheimPath);
    const enabled = installed
      ? await isPluginEnabled(plugin.id, valheimPath)
      : false;

    // Check for config file
    let configPath: string | null = null;
    if (plugin.configFile) {
      const cfgPath = path.join(getConfigPath(valheimPath), plugin.configFile);
      try {
        await fs.access(cfgPath);
        configPath = cfgPath;
      } catch {
        // No config file yet
      }
    }

    results.push({
      id: plugin.id,
      enabled,
      version: installed ? plugin.version : null,
      configPath,
    });
  }

  return results;
}

/**
 * Installs a plugin by downloading its DLL
 * @param pluginId The plugin identifier
 * @param onProgress Optional progress callback
 * @param valheimPath Optional override for the Valheim server directory
 */
export async function installPlugin(
  pluginId: PluginId,
  onProgress?: PluginProgressCallback,
  valheimPath?: string
): Promise<void> {
  const plugin = getPluginDefinition(pluginId);
  if (!plugin) {
    throw new Error(`Unknown plugin: ${pluginId}`);
  }

  // Verify BepInEx is installed
  const bepInExOk = await isBepInExInstalled(valheimPath);
  if (!bepInExOk) {
    throw new Error("BepInEx must be installed first");
  }

  const pluginsDir = getPluginsPath(valheimPath);
  await fs.mkdir(pluginsDir, { recursive: true });

  onProgress?.({
    stage: "downloading",
    message: `Downloading ${plugin.name}...`,
    progress: 10,
  });

  // Determine if this is a direct DLL download or a zip package
  const isDirectDll = plugin.downloadUrl.endsWith(".dll");

  if (isDirectDll) {
    // Direct DLL download
    const dllPath = path.join(pluginsDir, plugin.dllFile);
    await downloadToFile(plugin.downloadUrl, dllPath);
  } else {
    // Zip/package download - extract and find the DLL
    const tempDir = path.join(pluginsDir, ".plugin_temp");
    await fs.mkdir(tempDir, { recursive: true });

    try {
      const zipPath = path.join(tempDir, `${pluginId}.zip`);
      await downloadToFile(plugin.downloadUrl, zipPath);

      onProgress?.({
        stage: "installing",
        message: `Extracting ${plugin.name}...`,
        progress: 50,
      });

      // Extract the zip
      await extractPluginZip(zipPath, tempDir);

      // Find and copy the DLL
      const dllFile = await findFile(tempDir, plugin.dllFile);
      if (!dllFile) {
        throw new Error(`DLL ${plugin.dllFile} not found in package`);
      }

      await fs.copyFile(dllFile, path.join(pluginsDir, plugin.dllFile));
    } finally {
      // Clean up temp
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  onProgress?.({
    stage: "complete",
    message: `${plugin.name} installed successfully!`,
    progress: 100,
  });
}

/**
 * Uninstalls a plugin by removing its DLL
 * @param pluginId The plugin identifier
 * @param valheimPath Optional override for the Valheim server directory
 */
export async function uninstallPlugin(
  pluginId: PluginId,
  valheimPath?: string
): Promise<void> {
  const plugin = getPluginDefinition(pluginId);
  if (!plugin) {
    throw new Error(`Unknown plugin: ${pluginId}`);
  }

  // Remove from plugins directory
  const pluginsDir = getPluginsPath(valheimPath);
  const dllPath = path.join(pluginsDir, plugin.dllFile);
  try {
    await fs.unlink(dllPath);
  } catch {
    // May not be in active plugins
  }

  // Remove from disabled directory
  const disabledDir = getDisabledPluginsPath(valheimPath);
  const disabledPath = path.join(disabledDir, plugin.dllFile);
  try {
    await fs.unlink(disabledPath);
  } catch {
    // May not be disabled
  }
}

/**
 * Enables a plugin by moving it from plugins_disabled/ to plugins/
 * @param pluginId The plugin identifier
 * @param valheimPath Optional override for the Valheim server directory
 */
export async function enablePlugin(
  pluginId: PluginId,
  valheimPath?: string
): Promise<void> {
  const plugin = getPluginDefinition(pluginId);
  if (!plugin) {
    throw new Error(`Unknown plugin: ${pluginId}`);
  }

  const pluginsDir = getPluginsPath(valheimPath);
  const disabledDir = getDisabledPluginsPath(valheimPath);
  const activePath = path.join(pluginsDir, plugin.dllFile);
  const disabledPath = path.join(disabledDir, plugin.dllFile);

  // Check if already enabled
  try {
    await fs.access(activePath);
    return; // Already enabled
  } catch {
    // Not in active, check disabled
  }

  // Move from disabled to active
  try {
    await fs.access(disabledPath);
    await fs.mkdir(pluginsDir, { recursive: true });
    await fs.rename(disabledPath, activePath);
  } catch {
    throw new Error(
      `Plugin ${plugin.name} is not installed. Install it first.`
    );
  }
}

/**
 * Disables a plugin by moving it from plugins/ to plugins_disabled/
 * @param pluginId The plugin identifier
 * @param valheimPath Optional override for the Valheim server directory
 */
export async function disablePlugin(
  pluginId: PluginId,
  valheimPath?: string
): Promise<void> {
  const plugin = getPluginDefinition(pluginId);
  if (!plugin) {
    throw new Error(`Unknown plugin: ${pluginId}`);
  }

  const pluginsDir = getPluginsPath(valheimPath);
  const disabledDir = getDisabledPluginsPath(valheimPath);
  const activePath = path.join(pluginsDir, plugin.dllFile);
  const disabledPath = path.join(disabledDir, plugin.dllFile);

  // Check if already disabled
  try {
    await fs.access(disabledPath);
    return; // Already disabled
  } catch {
    // Not disabled
  }

  // Move from active to disabled
  try {
    await fs.access(activePath);
    await fs.mkdir(disabledDir, { recursive: true });
    await fs.rename(activePath, disabledPath);
  } catch {
    throw new Error(
      `Plugin ${plugin.name} is not in the active plugins directory.`
    );
  }
}

/**
 * Reads a plugin's configuration file
 * @param pluginId The plugin identifier
 * @param valheimPath Optional override for the Valheim server directory
 * @returns Config file content as string, or null if not found
 */
export async function getPluginConfig(
  pluginId: PluginId,
  valheimPath?: string
): Promise<string | null> {
  const plugin = getPluginDefinition(pluginId);
  if (!plugin?.configFile) return null;

  const cfgPath = path.join(getConfigPath(valheimPath), plugin.configFile);
  try {
    return await fs.readFile(cfgPath, "utf-8");
  } catch {
    return null;
  }
}

/**
 * Writes content to a plugin's configuration file
 * @param pluginId The plugin identifier
 * @param content Configuration content to write
 * @param valheimPath Optional override for the Valheim server directory
 */
export async function updatePluginConfig(
  pluginId: PluginId,
  content: string,
  valheimPath?: string
): Promise<void> {
  const plugin = getPluginDefinition(pluginId);
  if (!plugin?.configFile) {
    throw new Error(`Plugin ${pluginId} has no configuration file`);
  }

  const configDir = getConfigPath(valheimPath);
  await fs.mkdir(configDir, { recursive: true });

  const cfgPath = path.join(configDir, plugin.configFile);
  await fs.writeFile(cfgPath, content, "utf-8");
}

// ── Internal helpers ──

/**
 * Downloads a file from a URL to a local path
 */
async function downloadToFile(url: string, destPath: string): Promise<void> {
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
  const { Readable } = await import("node:stream");
  const nodeStream = Readable.fromWeb(
    response.body as import("node:stream/web").ReadableStream
  );
  await pipeline(nodeStream, fileStream);
}

/**
 * Extracts a zip file to a directory
 */
async function extractPluginZip(
  zipPath: string,
  destDir: string
): Promise<void> {
  const { exec } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const execAsync = promisify(exec);

  if (process.platform === "win32") {
    // Escape single quotes for PowerShell string literals
    const safeZip = zipPath.replace(/'/g, "''");
    const safeDest = destDir.replace(/'/g, "''");
    await execAsync(
      `powershell -Command "Expand-Archive -Path '${safeZip}' -DestinationPath '${safeDest}' -Force"`
    );
  } else {
    await execAsync(`unzip -o "${zipPath}" -d "${destDir}"`);
  }
}

/**
 * Recursively finds a file by name in a directory
 */
async function findFile(dir: string, fileName: string): Promise<string | null> {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const found = await findFile(fullPath, fileName);
      if (found) return found;
    } else if (entry.name === fileName) {
      return fullPath;
    }
  }

  return null;
}
