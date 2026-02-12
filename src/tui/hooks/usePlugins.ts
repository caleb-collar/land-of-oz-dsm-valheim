/**
 * usePlugins hook
 * Manages BepInEx and plugin state for the Plugins screen
 */

import { useCallback, useEffect } from "react";
import {
  disablePlugin,
  enablePlugin,
  getBepInExPath,
  getBepInExVersion,
  getInstalledPlugins,
  installBepInEx,
  installPlugin as installPluginFn,
  isBepInExInstalled,
  type PluginId,
  SUPPORTED_PLUGINS,
  uninstallBepInEx,
  uninstallPlugin as uninstallPluginFn,
} from "../../bepinex/mod.js";
import { useStore } from "../store.js";

/**
 * Hook for managing BepInEx and plugin state
 */
export function usePlugins() {
  const bepinex = useStore((s) => s.bepinex);
  const valheimPath = useStore((s) => s.valheim.path);
  const addLog = useStore((s) => s.actions.addLog);
  const setBepInExInstalled = useStore((s) => s.actions.setBepInExInstalled);
  const setBepInExInstalling = useStore((s) => s.actions.setBepInExInstalling);
  const setBepInExInstallProgress = useStore(
    (s) => s.actions.setBepInExInstallProgress
  );
  const setBepInExVersion = useStore((s) => s.actions.setBepInExVersion);
  const setBepInExPath = useStore((s) => s.actions.setBepInExPath);
  const setPlugins = useStore((s) => s.actions.setPlugins);
  const setPluginEnabled = useStore((s) => s.actions.setPluginEnabled);
  const setPluginInstalledStore = useStore((s) => s.actions.setPluginInstalled);
  const setPluginInstalling = useStore((s) => s.actions.setPluginInstalling);
  const resetBepInExInstall = useStore((s) => s.actions.resetBepInExInstall);

  // Check BepInEx status on mount
  const refreshBepInEx = useCallback(async () => {
    try {
      const installed = await isBepInExInstalled(valheimPath ?? undefined);
      setBepInExInstalled(installed);

      if (installed) {
        const version = await getBepInExVersion(valheimPath ?? undefined);
        setBepInExVersion(version);
        setBepInExPath(getBepInExPath(valheimPath ?? undefined));
      } else {
        setBepInExVersion(null);
        setBepInExPath(null);
      }
    } catch {
      setBepInExInstalled(false);
    }
  }, [valheimPath, setBepInExInstalled, setBepInExVersion, setBepInExPath]);

  // Refresh plugin states
  const refreshPlugins = useCallback(async () => {
    try {
      const installed = await getInstalledPlugins(valheimPath ?? undefined);

      const pluginStates = SUPPORTED_PLUGINS.map((def) => {
        const inst = installed.find((i) => i.id === def.id);
        return {
          id: def.id,
          name: def.name,
          enabled: inst?.enabled ?? false,
          installed: inst?.version !== null,
          installing: false,
        };
      });

      setPlugins(pluginStates);
    } catch {
      // Plugins may not be accessible
    }
  }, [valheimPath, setPlugins]);

  // Initial load
  useEffect(() => {
    refreshBepInEx().then(() => refreshPlugins());
  }, [refreshBepInEx, refreshPlugins]);

  // Install BepInEx
  const handleInstallBepInEx = useCallback(async () => {
    setBepInExInstalling(true);
    addLog("info", "Installing BepInEx framework...");

    try {
      await installBepInEx((progress) => {
        setBepInExInstallProgress(progress.message, progress.progress);
        if (progress.stage === "complete") {
          addLog("info", "BepInEx installed successfully!");
        }
      }, valheimPath ?? undefined);

      setBepInExInstalled(true);
      await refreshBepInEx();
      await refreshPlugins();
    } catch (error) {
      addLog(
        "error",
        `BepInEx installation failed: ${error instanceof Error ? error.message : String(error)}`
      );
      setBepInExInstalled(false);
    } finally {
      resetBepInExInstall();
    }
  }, [
    valheimPath,
    addLog,
    setBepInExInstalling,
    setBepInExInstallProgress,
    setBepInExInstalled,
    resetBepInExInstall,
    refreshBepInEx,
    refreshPlugins,
  ]);

  // Uninstall BepInEx
  const handleUninstallBepInEx = useCallback(async () => {
    addLog("info", "Uninstalling BepInEx...");
    try {
      await uninstallBepInEx(valheimPath ?? undefined);
      setBepInExInstalled(false);
      setBepInExVersion(null);
      setBepInExPath(null);
      setPlugins([]);
      addLog("info", "BepInEx uninstalled successfully");
    } catch (error) {
      addLog(
        "error",
        `BepInEx uninstall failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }, [
    valheimPath,
    addLog,
    setBepInExInstalled,
    setBepInExVersion,
    setBepInExPath,
    setPlugins,
  ]);

  // Install a plugin
  const handleInstallPlugin = useCallback(
    async (pluginId: string) => {
      setPluginInstalling(pluginId, true);
      addLog("info", `Installing plugin: ${pluginId}...`);

      try {
        await installPluginFn(
          pluginId as PluginId,
          (progress) => {
            addLog("info", progress.message);
          },
          valheimPath ?? undefined
        );

        setPluginInstalledStore(pluginId, true);
        setPluginEnabled(pluginId, true);
        addLog("info", `Plugin ${pluginId} installed successfully!`);
      } catch (error) {
        addLog(
          "error",
          `Plugin install failed: ${error instanceof Error ? error.message : String(error)}`
        );
      } finally {
        setPluginInstalling(pluginId, false);
      }
    },
    [
      valheimPath,
      addLog,
      setPluginInstalling,
      setPluginInstalledStore,
      setPluginEnabled,
    ]
  );

  // Uninstall a plugin
  const handleUninstallPlugin = useCallback(
    async (pluginId: string) => {
      addLog("info", `Uninstalling plugin: ${pluginId}...`);
      try {
        await uninstallPluginFn(pluginId as PluginId, valheimPath ?? undefined);
        setPluginInstalledStore(pluginId, false);
        setPluginEnabled(pluginId, false);
        addLog("info", `Plugin ${pluginId} uninstalled`);
      } catch (error) {
        addLog(
          "error",
          `Plugin uninstall failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    },
    [valheimPath, addLog, setPluginInstalledStore, setPluginEnabled]
  );

  // Toggle plugin enable/disable
  const handleTogglePlugin = useCallback(
    async (pluginId: string) => {
      const plugin = bepinex.plugins.find((p) => p.id === pluginId);
      if (!plugin) return;

      try {
        if (plugin.enabled) {
          await disablePlugin(pluginId as PluginId, valheimPath ?? undefined);
          setPluginEnabled(pluginId, false);
          addLog("info", `Plugin ${pluginId} disabled`);
        } else {
          await enablePlugin(pluginId as PluginId, valheimPath ?? undefined);
          setPluginEnabled(pluginId, true);
          addLog("info", `Plugin ${pluginId} enabled`);
        }
      } catch (error) {
        addLog(
          "error",
          `Toggle failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    },
    [bepinex.plugins, valheimPath, addLog, setPluginEnabled]
  );

  return {
    bepInExInstalled: bepinex.installed,
    bepInExInstalling: bepinex.installing,
    bepInExVersion: bepinex.version,
    bepInExPath: bepinex.path,
    installProgress: bepinex.installProgress,
    installPercent: bepinex.installPercent,
    plugins: bepinex.plugins,
    installBepInEx: handleInstallBepInEx,
    uninstallBepInEx: handleUninstallBepInEx,
    installPlugin: handleInstallPlugin,
    uninstallPlugin: handleUninstallPlugin,
    togglePlugin: handleTogglePlugin,
    refreshPlugins,
    refreshBepInEx,
  };
}
