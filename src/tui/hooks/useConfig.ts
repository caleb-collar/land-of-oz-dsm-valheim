/**
 * useConfig hook - Configuration management
 */

import { useCallback, useEffect } from "react";
import { useStore } from "../store.ts";
import {
  loadConfig,
  updateServerConfig as persistServerConfig,
} from "../../config/mod.ts";

/**
 * Hook for managing configuration
 */
export function useConfig() {
  const config = useStore((s) => s.config);
  const actions = useStore((s) => s.actions);

  /**
   * Update configuration (both store and persistent)
   */
  const update = useCallback(
    async (partial: Partial<typeof config>) => {
      // Update store immediately
      actions.updateConfig(partial);

      // Persist to disk - map TUI config state to server config
      try {
        const serverUpdate: Partial<{
          name: string;
          port: number;
          password: string;
          world: string;
          public: boolean;
          crossplay: boolean;
          saveinterval: number;
          backups: number;
        }> = {};

        if (partial.serverName !== undefined) {
          serverUpdate.name = partial.serverName;
        }
        if (partial.port !== undefined) serverUpdate.port = partial.port;
        if (partial.password !== undefined) {
          serverUpdate.password = partial.password;
        }
        if (partial.world !== undefined) serverUpdate.world = partial.world;
        if (partial.public !== undefined) serverUpdate.public = partial.public;
        if (partial.crossplay !== undefined) {
          serverUpdate.crossplay = partial.crossplay;
        }
        if (partial.saveInterval !== undefined) {
          serverUpdate.saveinterval = partial.saveInterval;
        }
        if (partial.backups !== undefined) {
          serverUpdate.backups = partial.backups;
        }

        if (Object.keys(serverUpdate).length > 0) {
          await persistServerConfig(serverUpdate);
        }
      } catch (error) {
        actions.addLog("error", `Failed to save config: ${error}`);
      }
    },
    [config, actions],
  );

  /**
   * Reload configuration from disk
   */
  const reload = useCallback(async () => {
    try {
      const stored = await loadConfig();
      actions.loadConfigFromStore({
        serverName: stored.server.name,
        port: stored.server.port,
        password: stored.server.password,
        world: stored.server.world,
        public: stored.server.public,
        crossplay: stored.server.crossplay,
        saveInterval: stored.server.saveinterval,
        backups: stored.server.backups,
      });
      actions.addLog("info", "Configuration reloaded");
    } catch (error) {
      actions.addLog("error", `Failed to reload config: ${error}`);
    }
  }, [actions]);

  return {
    config,
    update,
    reload,
  };
}

/**
 * Hook to sync store config with persistent config on mount
 */
export function useConfigSync() {
  const actions = useStore((s) => s.actions);

  useEffect(() => {
    const syncConfig = async () => {
      try {
        const stored = await loadConfig();
        actions.loadConfigFromStore({
          serverName: stored.server.name,
          port: stored.server.port,
          password: stored.server.password,
          world: stored.server.world,
          public: stored.server.public,
          crossplay: stored.server.crossplay,
          saveInterval: stored.server.saveinterval,
          backups: stored.server.backups,
        });
      } catch {
        // If config loading fails, keep defaults
      }
    };

    syncConfig();
  }, [actions]);
}
