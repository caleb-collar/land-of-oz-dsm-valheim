/**
 * Default configuration values
 * These are used when initializing a fresh configuration
 */

import type { AppConfig } from "./schema.ts";

/** Default application configuration */
export const defaultConfig: AppConfig = {
  version: 1,
  server: {
    name: "Land of OZ Valheim",
    port: 2456,
    password: "",
    world: "Dedicated",
    public: false,
    crossplay: false,
    saveinterval: 1800,
    backups: 4,
    backupshort: 7200,
    backuplong: 43200,
    modifiers: {
      combat: "default",
      deathpenalty: "default",
      resources: "default",
      raids: true,
      portals: "default",
    },
  },
  watchdog: {
    enabled: true,
    maxRestarts: 5,
    restartDelay: 5000,
    cooldownPeriod: 300000,
    backoffMultiplier: 2,
  },
  tui: {
    colorScheme: "dark",
    animationsEnabled: true,
    logMaxLines: 100,
    refreshRate: 1000,
  },
  worlds: [],
  activeWorld: null,
  steamcmdAutoInstall: true,
  autoUpdate: true,
};
