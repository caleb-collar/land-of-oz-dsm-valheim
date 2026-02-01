/**
 * useWorlds hook - World management for TUI
 */

import { useCallback, useEffect } from "react";
import {
  backupWorld as backupWorldFile,
  deleteWorld as deleteWorldFile,
  exportWorld as exportWorldFile,
  importWorld as importWorldFile,
  listWorlds,
  type WorldInfo,
} from "../../valheim/worlds.js";
import { useStore } from "../store.js";

/**
 * Hook for managing Valheim worlds
 */
export function useWorlds() {
  const worlds = useStore((s) => s.worlds.worlds);
  const loading = useStore((s) => s.worlds.loading);
  const error = useStore((s) => s.worlds.error);
  const selectedIndex = useStore((s) => s.worlds.selectedIndex);
  const activeWorld = useStore((s) => s.config.world);
  const actions = useStore((s) => s.actions);

  /**
   * Refresh the worlds list
   */
  const refresh = useCallback(async () => {
    actions.setWorldsLoading(true);
    actions.setWorldsError(null);

    try {
      const discoveredWorlds = await listWorlds();
      actions.setWorlds(discoveredWorlds);
      actions.addLog("info", `Found ${discoveredWorlds.length} worlds`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load worlds";
      actions.setWorldsError(message);
      actions.addLog("error", `Failed to load worlds: ${message}`);
    } finally {
      actions.setWorldsLoading(false);
    }
  }, [actions]);

  /**
   * Set the active world for the server
   */
  const setActive = useCallback(
    async (name: string) => {
      actions.updateConfig({ world: name });
      actions.addLog("info", `Set active world to: ${name}`);
    },
    [actions]
  );

  /**
   * Import a world from external files
   */
  const importWorld = useCallback(
    async (dbPath: string, fwlPath?: string) => {
      actions.setWorldsLoading(true);
      actions.setWorldsError(null);

      try {
        // Auto-detect .fwl path if not provided
        const autoFwlPath = fwlPath ?? dbPath.replace(/\.db$/, ".fwl");

        const imported = await importWorldFile(dbPath, autoFwlPath);
        actions.addLog("info", `Imported world: ${imported.name}`);

        // Refresh the list
        await refresh();

        return imported;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to import world";
        actions.setWorldsError(message);
        actions.addLog("error", `Failed to import world: ${message}`);
        throw err;
      } finally {
        actions.setWorldsLoading(false);
      }
    },
    [actions, refresh]
  );

  /**
   * Export a world to a target directory
   */
  const exportWorld = useCallback(
    async (name: string, targetDir: string) => {
      actions.setWorldsLoading(true);
      actions.setWorldsError(null);

      try {
        await exportWorldFile(name, targetDir);
        actions.addLog("info", `Exported world "${name}" to: ${targetDir}`);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to export world";
        actions.setWorldsError(message);
        actions.addLog("error", `Failed to export world: ${message}`);
        throw err;
      } finally {
        actions.setWorldsLoading(false);
      }
    },
    [actions]
  );

  /**
   * Delete a world
   */
  const deleteWorld = useCallback(
    async (name: string) => {
      actions.setWorldsLoading(true);
      actions.setWorldsError(null);

      try {
        await deleteWorldFile(name);
        actions.addLog("info", `Deleted world: ${name}`);

        // If this was the active world, clear it
        if (activeWorld === name) {
          actions.updateConfig({ world: "" });
        }

        // Refresh the list
        await refresh();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to delete world";
        actions.setWorldsError(message);
        actions.addLog("error", `Failed to delete world: ${message}`);
        throw err;
      } finally {
        actions.setWorldsLoading(false);
      }
    },
    [actions, activeWorld, refresh]
  );

  /**
   * Create a backup of a world
   */
  const backupWorld = useCallback(
    async (name: string, backupDir: string) => {
      actions.setWorldsLoading(true);
      actions.setWorldsError(null);

      try {
        const backupPath = await backupWorldFile(name, backupDir);
        actions.addLog("info", `Backed up world "${name}" to: ${backupPath}`);
        return backupPath;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to backup world";
        actions.setWorldsError(message);
        actions.addLog("error", `Failed to backup world: ${message}`);
        throw err;
      } finally {
        actions.setWorldsLoading(false);
      }
    },
    [actions]
  );

  /**
   * Select a world by index
   */
  const select = useCallback(
    (index: number) => {
      actions.setWorldsSelectedIndex(index);
    },
    [actions]
  );

  /**
   * Get the currently selected world
   */
  const getSelectedWorld = useCallback((): WorldInfo | null => {
    return worlds[selectedIndex] ?? null;
  }, [worlds, selectedIndex]);

  return {
    worlds,
    loading,
    error,
    selectedIndex,
    activeWorld,
    refresh,
    setActive,
    importWorld,
    exportWorld,
    deleteWorld,
    backupWorld,
    select,
    getSelectedWorld,
  };
}

/**
 * Hook to load worlds on mount
 */
export function useWorldsSync() {
  const { refresh } = useWorlds();

  useEffect(() => {
    refresh();
  }, [refresh]);
}
