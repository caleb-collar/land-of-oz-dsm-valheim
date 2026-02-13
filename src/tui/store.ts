/**
 * Zustand store for TUI state management
 * Manages server state, logs, UI state, and configuration
 */

import type { ReactNode } from "react";
import { create } from "zustand";
import type { StartupPhase } from "../server/logs.js";
import type { WorldInfo } from "../valheim/worlds.js";

/** Server status states */
export type ServerStatus = "offline" | "starting" | "online" | "stopping";

/** Available screens */
export type Screen =
  | "dashboard"
  | "settings"
  | "worlds"
  | "console"
  | "plugins";

/** Log entry severity levels */
export type LogLevel = "info" | "warn" | "error" | "debug";

/** Log entry source */
export type LogSource = "server" | "bepinex" | "app";

/** A single log entry */
export type LogEntry = {
  id: string;
  timestamp: Date;
  level: LogLevel;
  source: LogSource;
  message: string;
};

/** Difficulty modifiers */
export type CombatModifier =
  | "veryeasy"
  | "easy"
  | "default"
  | "hard"
  | "veryhard";
export type DeathPenalty =
  | "casual"
  | "veryeasy"
  | "easy"
  | "default"
  | "hard"
  | "hardcore";
export type ResourceModifier =
  | "muchless"
  | "less"
  | "default"
  | "more"
  | "muchmore"
  | "most";
export type PortalMode = "default" | "casual" | "hard" | "veryhard";
export type Preset =
  | "normal"
  | "casual"
  | "easy"
  | "hard"
  | "hardcore"
  | "immersive"
  | "hammer";

/** Server state slice */
type ServerState = {
  status: ServerStatus;
  pid: number | null;
  players: string[];
  uptime: number;
  world: string | null;
  version: string | null;
  updateAvailable: boolean;
  lastSave: Date | null;
  memoryUsage: number | null;
  /** True when a new world is being generated (can take over a minute) */
  worldGenerating: boolean;
  /** Detailed startup phase for status display */
  startupPhase: StartupPhase;
};

/** Logs state slice */
type LogsState = {
  entries: LogEntry[];
  maxEntries: number;
  filter: LogLevel | null;
  sourceFilter: LogSource | null;
};

/** UI state slice */
type UiState = {
  activeScreen: Screen;
  modalOpen: boolean;
  modalContent: ReactNode | null;
  selectedIndex: number;
  editingField: string | null;
};

/** Config state slice (synced with persistent config) */
type ConfigState = {
  serverName: string;
  port: number;
  password: string;
  world: string;
  public: boolean;
  crossplay: boolean;
  saveInterval: number;
  backups: number;
  backupShort: number;
  backupLong: number;
};

/** App-level config state slice */
type AppSettingsState = {
  steamcmdAutoInstall: boolean;
  autoUpdate: boolean;
};

/** Modifiers config state slice */
type ModifiersState = {
  preset: Preset | null;
  combat: CombatModifier;
  deathpenalty: DeathPenalty;
  resources: ResourceModifier;
  raids: boolean;
  portals: PortalMode;
};

/** Watchdog config state slice */
type WatchdogState = {
  enabled: boolean;
  maxRestarts: number;
  restartDelay: number;
  cooldownPeriod: number;
  backoffMultiplier: number;
};

/** TUI config state slice */
type TuiState = {
  colorScheme: "dark" | "light" | "auto";
  animationsEnabled: boolean;
  logMaxLines: number;
  refreshRate: number;
};

/** RCON state slice */
type RconState = {
  enabled: boolean;
  connected: boolean;
  port: number;
  password: string;
  host: string;
  timeout: number;
  autoReconnect: boolean;
};

/** Worlds state slice */
type WorldsState = {
  worlds: WorldInfo[];
  loading: boolean;
  error: string | null;
  selectedIndex: number;
  /** World names that have been configured but not yet generated (no files exist) */
  pendingWorldNames: string[];
};

/** SteamCMD state slice */
type SteamCmdState = {
  /** Whether SteamCMD is installed (null = not yet checked) */
  installed: boolean | null;
  /** Whether SteamCMD installation is in progress */
  installing: boolean;
  /** Current installation progress message */
  installProgress: string;
  /** Installation progress percentage (0-100) */
  installPercent: number;
  /** SteamCMD installation directory path */
  path: string | null;
};

/** Valheim dedicated server state slice */
type ValheimServerState = {
  /** Whether Valheim server is installed (null = not yet checked) */
  installed: boolean | null;
  /** Whether Valheim installation is in progress */
  installing: boolean;
  /** Current installation progress message */
  installProgress: string;
  /** Installation progress percentage (0-100) */
  installPercent: number;
  /** Valheim server installation directory path */
  path: string | null;
  /** Whether installation verification passed */
  verified: boolean | null;
  /** Installed build ID */
  buildId: string | null;
};

/** BepInEx framework state slice */
type BepInExStoreState = {
  /** Whether BepInEx is installed (null = not yet checked) */
  installed: boolean | null;
  /** Whether BepInEx installation is in progress */
  installing: boolean;
  /** Current installation progress message */
  installProgress: string;
  /** Installation progress percentage (0-100) */
  installPercent: number;
  /** Detected BepInEx version */
  version: string | null;
  /** BepInEx installation path */
  path: string | null;
  /** Plugin states */
  plugins: {
    id: string;
    name: string;
    enabled: boolean;
    installed: boolean;
    installing: boolean;
  }[];
};

/** Admin role for a server user */
export type AdminRole = "player" | "admin" | "root";

/** Server user info */
export type ServerUser = {
  steamId: string;
  name?: string;
  role: AdminRole;
};

/** Admin management state slice */
type AdminStoreState = {
  admins: ServerUser[];
  rootUsers: string[];
  loading: boolean;
  error: string | null;
};

/** Store actions */
type Actions = {
  // Server actions
  setServerStatus: (status: ServerStatus) => void;
  setServerPid: (pid: number | null) => void;
  addPlayer: (name: string) => void;
  removePlayer: (name: string) => void;
  setPlayers: (players: string[]) => void;
  incrementUptime: () => void;
  resetUptime: () => void;
  setWorld: (world: string | null) => void;
  setServerVersion: (version: string | null) => void;
  setUpdateAvailable: (available: boolean) => void;
  setLastSave: (date: Date | null) => void;
  setMemoryUsage: (bytes: number | null) => void;
  setWorldGenerating: (generating: boolean) => void;
  setStartupPhase: (phase: StartupPhase) => void;

  // Logs actions
  addLog: (level: LogLevel, message: string, source?: LogSource) => void;
  clearLogs: () => void;
  setLogFilter: (filter: LogLevel | null) => void;
  setSourceFilter: (source: LogSource | null) => void;

  // UI actions
  setScreen: (screen: Screen) => void;
  openModal: (content: ReactNode) => void;
  closeModal: () => void;
  setSelectedIndex: (index: number) => void;
  setEditingField: (field: string | null) => void;

  // Config actions
  updateConfig: (partial: Partial<ConfigState>) => void;
  loadConfigFromStore: (config: ConfigState) => void;

  // App settings actions
  updateAppSettings: (partial: Partial<AppSettingsState>) => void;
  loadAppSettingsFromStore: (settings: AppSettingsState) => void;

  // Modifiers actions
  updateModifiers: (partial: Partial<ModifiersState>) => void;
  setPreset: (preset: Preset | null) => void;
  loadModifiersFromStore: (modifiers: ModifiersState) => void;

  // Watchdog actions
  updateWatchdog: (partial: Partial<WatchdogState>) => void;
  loadWatchdogFromStore: (watchdog: WatchdogState) => void;

  // TUI config actions
  updateTuiConfig: (partial: Partial<TuiState>) => void;
  loadTuiConfigFromStore: (tui: TuiState) => void;

  // RCON actions
  updateRcon: (partial: Partial<RconState>) => void;
  setRconConnected: (connected: boolean) => void;
  loadRconFromStore: (rcon: Omit<RconState, "connected">) => void;

  // Worlds actions
  setWorlds: (worlds: WorldInfo[]) => void;
  setWorldsLoading: (loading: boolean) => void;
  setWorldsError: (error: string | null) => void;
  setWorldsSelectedIndex: (index: number) => void;
  addPendingWorld: (name: string) => void;
  removePendingWorld: (name: string) => void;
  setPendingWorlds: (names: string[]) => void;

  // SteamCMD actions
  setSteamCmdInstalled: (installed: boolean | null) => void;
  setSteamCmdInstalling: (installing: boolean) => void;
  setSteamCmdInstallProgress: (message: string, percent: number) => void;
  setSteamCmdPath: (path: string | null) => void;
  resetSteamCmdInstall: () => void;

  // Valheim server actions
  setValheimInstalled: (installed: boolean | null) => void;
  setValheimInstalling: (installing: boolean) => void;
  setValheimInstallProgress: (message: string, percent: number) => void;
  setValheimPath: (path: string | null) => void;
  setValheimVerified: (verified: boolean | null) => void;
  setValheimBuildId: (buildId: string | null) => void;
  resetValheimInstall: () => void;

  // BepInEx actions
  setBepInExInstalled: (installed: boolean | null) => void;
  setBepInExInstalling: (installing: boolean) => void;
  setBepInExInstallProgress: (message: string, percent: number) => void;
  setBepInExVersion: (version: string | null) => void;
  setBepInExPath: (path: string | null) => void;
  setPlugins: (plugins: BepInExStoreState["plugins"]) => void;
  setPluginEnabled: (pluginId: string, enabled: boolean) => void;
  setPluginInstalled: (pluginId: string, installed: boolean) => void;
  setPluginInstalling: (pluginId: string, installing: boolean) => void;
  resetBepInExInstall: () => void;

  // Admin actions
  setAdmins: (admins: ServerUser[]) => void;
  setRootUsers: (rootUsers: string[]) => void;
  setAdminsLoading: (loading: boolean) => void;
  setAdminsError: (error: string | null) => void;
};

/** Complete store type */
export type Store = {
  server: ServerState;
  logs: LogsState;
  ui: UiState;
  config: ConfigState;
  appSettings: AppSettingsState;
  modifiers: ModifiersState;
  watchdog: WatchdogState;
  tuiConfig: TuiState;
  rcon: RconState;
  worlds: WorldsState;
  steamcmd: SteamCmdState;
  valheim: ValheimServerState;
  bepinex: BepInExStoreState;
  admins: AdminStoreState;
  actions: Actions;
};

/**
 * Creates a unique ID for log entries
 */
function createLogId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Main Zustand store for TUI state
 */
export const useStore = create<Store>((set) => ({
  // Initial server state
  server: {
    status: "offline",
    pid: null,
    players: [],
    uptime: 0,
    world: null,
    version: null,
    updateAvailable: false,
    lastSave: null,
    memoryUsage: null,
    worldGenerating: false,
    startupPhase: "idle",
  },

  // Initial logs state
  logs: {
    entries: [],
    maxEntries: 100,
    filter: null,
    sourceFilter: null,
  },

  // Initial UI state
  ui: {
    activeScreen: "dashboard",
    modalOpen: false,
    modalContent: null,
    selectedIndex: 0,
    editingField: null,
  },

  // Initial config state (will be synced with persistent config)
  config: {
    serverName: "Land of OZ Valheim",
    port: 2456,
    password: "",
    world: "Dedicated",
    public: false,
    crossplay: false,
    saveInterval: 1800,
    backups: 4,
    backupShort: 7200,
    backupLong: 43200,
  },

  // Initial app settings state
  appSettings: {
    steamcmdAutoInstall: true,
    autoUpdate: true,
  },

  // Initial modifiers state
  modifiers: {
    preset: null,
    combat: "default",
    deathpenalty: "default",
    resources: "default",
    raids: true,
    portals: "default",
  },

  // Initial watchdog state
  watchdog: {
    enabled: true,
    maxRestarts: 5,
    restartDelay: 5000,
    cooldownPeriod: 300000,
    backoffMultiplier: 2,
  },

  // Initial TUI config state
  tuiConfig: {
    colorScheme: "dark",
    animationsEnabled: true,
    logMaxLines: 100,
    refreshRate: 1000,
  },

  // Initial RCON state (aligned with config/schema.ts defaults)
  rcon: {
    enabled: true,
    connected: false,
    port: 2458,
    password: "ChangeMe",
    host: "localhost",
    timeout: 5000,
    autoReconnect: true,
  },

  // Initial worlds state
  worlds: {
    worlds: [],
    loading: false,
    error: null,
    selectedIndex: 0,
    pendingWorldNames: [],
  },

  // Initial SteamCMD state
  steamcmd: {
    installed: null,
    installing: false,
    installProgress: "",
    installPercent: 0,
    path: null,
  },

  // Initial Valheim server state
  valheim: {
    installed: null,
    installing: false,
    installProgress: "",
    installPercent: 0,
    path: null,
    verified: null,
    buildId: null,
  },

  // Initial BepInEx state
  bepinex: {
    installed: null,
    installing: false,
    installProgress: "",
    installPercent: 0,
    version: null,
    path: null,
    plugins: [],
  },

  // Initial admin state
  admins: {
    admins: [],
    rootUsers: [],
    loading: false,
    error: null,
  },

  // Actions
  actions: {
    // Server actions
    setServerStatus: (status) =>
      set((state) => ({
        server: { ...state.server, status },
      })),

    setServerPid: (pid) =>
      set((state) => ({
        server: { ...state.server, pid },
      })),

    addPlayer: (name) =>
      set((state) => ({
        server: {
          ...state.server,
          players: state.server.players.includes(name)
            ? state.server.players
            : [...state.server.players, name],
        },
      })),

    removePlayer: (name) =>
      set((state) => ({
        server: {
          ...state.server,
          players: state.server.players.filter((p) => p !== name),
        },
      })),

    setPlayers: (players) =>
      set((state) => ({
        server: { ...state.server, players },
      })),

    incrementUptime: () =>
      set((state) => ({
        server: { ...state.server, uptime: state.server.uptime + 1 },
      })),

    resetUptime: () =>
      set((state) => ({
        server: { ...state.server, uptime: 0 },
      })),

    setWorld: (world) =>
      set((state) => ({
        server: { ...state.server, world },
      })),

    setServerVersion: (version) =>
      set((state) => ({
        server: { ...state.server, version },
      })),

    setUpdateAvailable: (updateAvailable) =>
      set((state) => ({
        server: { ...state.server, updateAvailable },
      })),

    setLastSave: (lastSave) =>
      set((state) => ({
        server: { ...state.server, lastSave },
      })),

    setMemoryUsage: (memoryUsage) =>
      set((state) => ({
        server: { ...state.server, memoryUsage },
      })),

    setWorldGenerating: (worldGenerating) =>
      set((state) => ({
        server: { ...state.server, worldGenerating },
      })),

    setStartupPhase: (startupPhase) =>
      set((state) => ({
        server: { ...state.server, startupPhase },
      })),

    // Logs actions
    addLog: (level, message, source = "server") => {
      const entry: LogEntry = {
        id: createLogId(),
        timestamp: new Date(),
        level,
        source,
        message,
      };
      set((state) => ({
        logs: {
          ...state.logs,
          entries: [...state.logs.entries, entry].slice(-state.logs.maxEntries),
        },
      }));
    },

    clearLogs: () =>
      set((state) => ({
        logs: { ...state.logs, entries: [] },
      })),

    setLogFilter: (filter) =>
      set((state) => ({
        logs: { ...state.logs, filter },
      })),

    setSourceFilter: (sourceFilter) =>
      set((state) => ({
        logs: { ...state.logs, sourceFilter },
      })),

    // UI actions
    setScreen: (activeScreen) =>
      set((state) => ({
        ui: { ...state.ui, activeScreen, selectedIndex: 0, editingField: null },
      })),

    openModal: (content) =>
      set((state) => ({
        ui: { ...state.ui, modalOpen: true, modalContent: content },
      })),

    closeModal: () =>
      set((state) => ({
        ui: { ...state.ui, modalOpen: false, modalContent: null },
      })),

    setSelectedIndex: (index) =>
      set((state) => ({
        ui: { ...state.ui, selectedIndex: index },
      })),

    setEditingField: (editingField) =>
      set((state) => ({
        ui: { ...state.ui, editingField },
      })),

    // Config actions
    updateConfig: (partial) =>
      set((state) => ({
        config: { ...state.config, ...partial },
      })),

    loadConfigFromStore: (config) =>
      set(() => ({
        config,
      })),

    // App settings actions
    updateAppSettings: (partial) =>
      set((state) => ({
        appSettings: { ...state.appSettings, ...partial },
      })),

    loadAppSettingsFromStore: (settings) =>
      set(() => ({
        appSettings: settings,
      })),

    // Modifiers actions
    updateModifiers: (partial) =>
      set((state) => ({
        modifiers: { ...state.modifiers, ...partial },
      })),

    setPreset: (preset) =>
      set((state) => ({
        modifiers: { ...state.modifiers, preset },
      })),

    loadModifiersFromStore: (modifiers) =>
      set(() => ({
        modifiers,
      })),

    // Watchdog actions
    updateWatchdog: (partial) =>
      set((state) => ({
        watchdog: { ...state.watchdog, ...partial },
      })),

    loadWatchdogFromStore: (watchdog) =>
      set(() => ({
        watchdog,
      })),

    // TUI config actions
    updateTuiConfig: (partial) =>
      set((state) => ({
        tuiConfig: { ...state.tuiConfig, ...partial },
      })),

    loadTuiConfigFromStore: (tuiConfig) =>
      set(() => ({
        tuiConfig,
      })),

    // RCON actions
    updateRcon: (partial) =>
      set((state) => ({
        rcon: { ...state.rcon, ...partial },
      })),

    setRconConnected: (connected) =>
      set((state) => ({
        rcon: { ...state.rcon, connected },
      })),

    loadRconFromStore: (rcon) =>
      set((state) => ({
        rcon: { ...state.rcon, ...rcon },
      })),

    // Worlds actions
    setWorlds: (worlds) =>
      set((state) => ({
        worlds: { ...state.worlds, worlds },
      })),

    setWorldsLoading: (loading) =>
      set((state) => ({
        worlds: { ...state.worlds, loading },
      })),

    setWorldsError: (error) =>
      set((state) => ({
        worlds: { ...state.worlds, error },
      })),

    setWorldsSelectedIndex: (selectedIndex) =>
      set((state) => ({
        worlds: { ...state.worlds, selectedIndex },
      })),

    addPendingWorld: (name) =>
      set((state) => {
        // Don't add duplicates
        if (state.worlds.pendingWorldNames.includes(name)) {
          return state;
        }
        return {
          worlds: {
            ...state.worlds,
            pendingWorldNames: [...state.worlds.pendingWorldNames, name],
          },
        };
      }),

    removePendingWorld: (name) =>
      set((state) => ({
        worlds: {
          ...state.worlds,
          pendingWorldNames: state.worlds.pendingWorldNames.filter(
            (n) => n !== name
          ),
        },
      })),

    setPendingWorlds: (names) =>
      set((state) => ({
        worlds: { ...state.worlds, pendingWorldNames: names },
      })),

    // SteamCMD actions
    setSteamCmdInstalled: (installed) =>
      set((state) => ({
        steamcmd: { ...state.steamcmd, installed },
      })),

    setSteamCmdInstalling: (installing) =>
      set((state) => ({
        steamcmd: { ...state.steamcmd, installing },
      })),

    setSteamCmdInstallProgress: (message, percent) =>
      set((state) => ({
        steamcmd: {
          ...state.steamcmd,
          installProgress: message,
          installPercent: percent,
        },
      })),

    setSteamCmdPath: (path) =>
      set((state) => ({
        steamcmd: { ...state.steamcmd, path },
      })),

    resetSteamCmdInstall: () =>
      set((state) => ({
        steamcmd: {
          ...state.steamcmd,
          installing: false,
          installProgress: "",
          installPercent: 0,
        },
      })),

    // Valheim server actions
    setValheimInstalled: (installed) =>
      set((state) => ({
        valheim: { ...state.valheim, installed },
      })),

    setValheimInstalling: (installing) =>
      set((state) => ({
        valheim: { ...state.valheim, installing },
      })),

    setValheimInstallProgress: (message, percent) =>
      set((state) => ({
        valheim: {
          ...state.valheim,
          installProgress: message,
          installPercent: percent,
        },
      })),

    setValheimPath: (path) =>
      set((state) => ({
        valheim: { ...state.valheim, path },
      })),

    setValheimVerified: (verified) =>
      set((state) => ({
        valheim: { ...state.valheim, verified },
      })),

    setValheimBuildId: (buildId) =>
      set((state) => ({
        valheim: { ...state.valheim, buildId },
      })),

    resetValheimInstall: () =>
      set((state) => ({
        valheim: {
          ...state.valheim,
          installing: false,
          installProgress: "",
          installPercent: 0,
        },
      })),

    // BepInEx actions
    setBepInExInstalled: (installed) =>
      set((state) => ({
        bepinex: { ...state.bepinex, installed },
      })),

    setBepInExInstalling: (installing) =>
      set((state) => ({
        bepinex: { ...state.bepinex, installing },
      })),

    setBepInExInstallProgress: (message, percent) =>
      set((state) => ({
        bepinex: {
          ...state.bepinex,
          installProgress: message,
          installPercent: percent,
        },
      })),

    setBepInExVersion: (version) =>
      set((state) => ({
        bepinex: { ...state.bepinex, version },
      })),

    setBepInExPath: (bepinexPath) =>
      set((state) => ({
        bepinex: { ...state.bepinex, path: bepinexPath },
      })),

    setPlugins: (plugins) =>
      set((state) => ({
        bepinex: { ...state.bepinex, plugins },
      })),

    setPluginEnabled: (pluginId, enabled) =>
      set((state) => ({
        bepinex: {
          ...state.bepinex,
          plugins: state.bepinex.plugins.map((p) =>
            p.id === pluginId ? { ...p, enabled } : p
          ),
        },
      })),

    setPluginInstalled: (pluginId, installed) =>
      set((state) => ({
        bepinex: {
          ...state.bepinex,
          plugins: state.bepinex.plugins.map((p) =>
            p.id === pluginId ? { ...p, installed } : p
          ),
        },
      })),

    setPluginInstalling: (pluginId, installing) =>
      set((state) => ({
        bepinex: {
          ...state.bepinex,
          plugins: state.bepinex.plugins.map((p) =>
            p.id === pluginId ? { ...p, installing } : p
          ),
        },
      })),

    resetBepInExInstall: () =>
      set((state) => ({
        bepinex: {
          ...state.bepinex,
          installing: false,
          installProgress: "",
          installPercent: 0,
        },
      })),

    // Admin actions
    setAdmins: (admins) =>
      set((state) => ({
        admins: { ...state.admins, admins },
      })),

    setRootUsers: (rootUsers) =>
      set((state) => ({
        admins: { ...state.admins, rootUsers },
      })),

    setAdminsLoading: (loading) =>
      set((state) => ({
        admins: { ...state.admins, loading },
      })),

    setAdminsError: (error) =>
      set((state) => ({
        admins: { ...state.admins, error },
      })),
  },
}));

/**
 * Selector for server state
 */
export const selectServer = (state: Store) => state.server;

/**
 * Selector for logs
 */
export const selectLogs = (state: Store) => state.logs;

/**
 * Selector for filtered logs
 */
export const selectFilteredLogs = (state: Store) => {
  const { entries, filter, sourceFilter } = state.logs;
  let result = entries;

  if (filter) {
    result = result.filter((e) => e.level === filter);
  }
  if (sourceFilter) {
    result = result.filter((e) => e.source === sourceFilter);
  }

  return result;
};

/**
 * Selector for UI state
 */
export const selectUi = (state: Store) => state.ui;

/**
 * Selector for config
 */
export const selectConfig = (state: Store) => state.config;

/**
 * Selector for app settings
 */
export const selectAppSettings = (state: Store) => state.appSettings;

/**
 * Selector for modifiers
 */
export const selectModifiers = (state: Store) => state.modifiers;

/**
 * Selector for watchdog config
 */
export const selectWatchdog = (state: Store) => state.watchdog;

/**
 * Selector for TUI config
 */
export const selectTuiConfig = (state: Store) => state.tuiConfig;

/**
 * Selector for RCON state
 */
export const selectRcon = (state: Store) => state.rcon;

/**
 * Selector for worlds state
 */
export const selectWorlds = (state: Store) => state.worlds;

/**
 * Selector for SteamCMD state
 */
export const selectSteamCmd = (state: Store) => state.steamcmd;

/**
 * Selector for Valheim server state
 */
export const selectValheim = (state: Store) => state.valheim;

/**
 * Selector for BepInEx state
 */
export const selectBepInEx = (state: Store) => state.bepinex;

/**
 * Selector for admin state
 */
export const selectAdmins = (state: Store) => state.admins;

/**
 * Selector for actions
 */
export const selectActions = (state: Store) => state.actions;
