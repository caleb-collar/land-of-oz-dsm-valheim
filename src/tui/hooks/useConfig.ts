/**
 * useConfig hook - Configuration management
 */

import { useCallback, useEffect } from "react";
import {
  loadConfig,
  updateConfig as persistConfig,
  updateServerConfig as persistServerConfig,
  updateTuiConfig as persistTuiConfig,
  updateWatchdogConfig as persistWatchdogConfig,
} from "../../config/mod.js";
import { useStore } from "../store.js";

/**
 * Hook for managing server configuration
 */
export function useConfig() {
  const config = useStore((s) => s.config);
  const modifiers = useStore((s) => s.modifiers);
  const watchdog = useStore((s) => s.watchdog);
  const tuiConfig = useStore((s) => s.tuiConfig);
  const rcon = useStore((s) => s.rcon);
  const actions = useStore((s) => s.actions);

  /**
   * Update server configuration (both store and persistent)
   */
  const updateServerConfig = useCallback(
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
    [actions]
  );

  /**
   * Update modifiers configuration
   */
  const updateModifiers = useCallback(
    async (partial: Partial<typeof modifiers>) => {
      // Update store immediately
      actions.updateModifiers(partial);

      // Persist to disk
      try {
        const stored = await loadConfig();
        const newModifiers = { ...stored.server.modifiers, ...partial };

        // Handle preset separately
        if (partial.preset !== undefined) {
          await persistServerConfig({ preset: partial.preset ?? undefined });
        }

        // Handle modifiers
        const { preset, ...modifiersOnly } = partial;
        if (Object.keys(modifiersOnly).length > 0) {
          await persistServerConfig({
            modifiers: newModifiers as typeof stored.server.modifiers,
          });
        }
      } catch (error) {
        actions.addLog("error", `Failed to save modifiers: ${error}`);
      }
    },
    [actions]
  );

  /**
   * Update watchdog configuration
   */
  const updateWatchdogConfig = useCallback(
    async (partial: Partial<typeof watchdog>) => {
      // Update store immediately
      actions.updateWatchdog(partial);

      // Persist to disk
      try {
        await persistWatchdogConfig(partial);
      } catch (error) {
        actions.addLog("error", `Failed to save watchdog config: ${error}`);
      }
    },
    [actions]
  );

  /**
   * Update TUI configuration
   */
  const updateTuiSettings = useCallback(
    async (partial: Partial<typeof tuiConfig>) => {
      // Update store immediately
      actions.updateTuiConfig(partial);

      // Persist to disk
      try {
        await persistTuiConfig(partial);
      } catch (error) {
        actions.addLog("error", `Failed to save TUI config: ${error}`);
      }
    },
    [actions]
  );

  /**
   * Update RCON configuration
   */
  const updateRconConfig = useCallback(
    async (partial: Partial<Omit<typeof rcon, "connected">>) => {
      // Update store immediately
      actions.updateRcon(partial);

      // Persist to disk
      try {
        await persistConfig({
          rcon: {
            ...(await loadConfig()).rcon,
            ...partial,
          },
        });
      } catch (error) {
        actions.addLog("error", `Failed to save RCON config: ${error}`);
      }
    },
    [actions]
  );

  /**
   * Reload all configuration from disk
   */
  const reload = useCallback(async () => {
    try {
      const stored = await loadConfig();

      // Load server config
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

      // Load modifiers
      actions.loadModifiersFromStore({
        preset: stored.server.preset ?? null,
        combat: stored.server.modifiers.combat,
        deathpenalty: stored.server.modifiers.deathpenalty,
        resources: stored.server.modifiers.resources,
        raids: stored.server.modifiers.raids,
        portals: stored.server.modifiers.portals,
      });

      // Load watchdog config
      actions.loadWatchdogFromStore({
        enabled: stored.watchdog.enabled,
        maxRestarts: stored.watchdog.maxRestarts,
        restartDelay: stored.watchdog.restartDelay,
        cooldownPeriod: stored.watchdog.cooldownPeriod,
        backoffMultiplier: stored.watchdog.backoffMultiplier,
      });

      // Load TUI config
      actions.loadTuiConfigFromStore({
        colorScheme: stored.tui.colorScheme,
        animationsEnabled: stored.tui.animationsEnabled,
        logMaxLines: stored.tui.logMaxLines,
        refreshRate: stored.tui.refreshRate,
      });

      // Load RCON config
      actions.loadRconFromStore({
        enabled: stored.rcon.enabled,
        host: "localhost", // Default host, not stored currently
        port: stored.rcon.port,
        password: stored.rcon.password,
        timeout: stored.rcon.timeout,
        autoReconnect: stored.rcon.autoReconnect,
      });

      actions.addLog("info", "Configuration reloaded");
    } catch (error) {
      actions.addLog("error", `Failed to reload config: ${error}`);
    }
  }, [actions]);

  return {
    config,
    modifiers,
    watchdog,
    tuiConfig,
    rcon,
    updateServerConfig,
    updateModifiers,
    updateWatchdogConfig,
    updateTuiSettings,
    updateRconConfig,
    reload,
    // Legacy alias
    update: updateServerConfig,
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

        // Load server config
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

        // Load modifiers
        actions.loadModifiersFromStore({
          preset: stored.server.preset ?? null,
          combat: stored.server.modifiers.combat,
          deathpenalty: stored.server.modifiers.deathpenalty,
          resources: stored.server.modifiers.resources,
          raids: stored.server.modifiers.raids,
          portals: stored.server.modifiers.portals,
        });

        // Load watchdog config
        actions.loadWatchdogFromStore({
          enabled: stored.watchdog.enabled,
          maxRestarts: stored.watchdog.maxRestarts,
          restartDelay: stored.watchdog.restartDelay,
          cooldownPeriod: stored.watchdog.cooldownPeriod,
          backoffMultiplier: stored.watchdog.backoffMultiplier,
        });

        // Load TUI config
        actions.loadTuiConfigFromStore({
          colorScheme: stored.tui.colorScheme,
          animationsEnabled: stored.tui.animationsEnabled,
          logMaxLines: stored.tui.logMaxLines,
          refreshRate: stored.tui.refreshRate,
        });

        // Load RCON config
        actions.loadRconFromStore({
          enabled: stored.rcon.enabled,
          host: "localhost",
          port: stored.rcon.port,
          password: stored.rcon.password,
          timeout: stored.rcon.timeout,
          autoReconnect: stored.rcon.autoReconnect,
        });
      } catch {
        // If config loading fails, keep defaults
      }
    };

    syncConfig();
  }, [actions]);
}
