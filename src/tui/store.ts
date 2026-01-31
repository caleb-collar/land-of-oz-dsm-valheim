/**
 * Zustand store for TUI state management
 * Manages server state, logs, UI state, and configuration
 */

import type { ReactNode } from "react";
import { create } from "zustand";

/** Server status states */
export type ServerStatus = "offline" | "starting" | "online" | "stopping";

/** Available screens */
export type Screen = "dashboard" | "settings" | "worlds" | "console";

/** Log entry severity levels */
export type LogLevel = "info" | "warn" | "error" | "debug";

/** A single log entry */
export type LogEntry = {
  id: string;
  timestamp: Date;
  level: LogLevel;
  message: string;
};

/** Server state slice */
type ServerState = {
  status: ServerStatus;
  pid: number | null;
  players: string[];
  uptime: number;
  world: string | null;
};

/** Logs state slice */
type LogsState = {
  entries: LogEntry[];
  maxEntries: number;
  filter: LogLevel | null;
};

/** UI state slice */
type UiState = {
  activeScreen: Screen;
  modalOpen: boolean;
  modalContent: ReactNode | null;
  selectedIndex: number;
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
};

/** RCON state slice */
type RconState = {
  enabled: boolean;
  connected: boolean;
  port: number;
  password: string;
  host: string;
};

/** Store actions */
type Actions = {
  // Server actions
  setServerStatus: (status: ServerStatus) => void;
  setServerPid: (pid: number | null) => void;
  addPlayer: (name: string) => void;
  removePlayer: (name: string) => void;
  incrementUptime: () => void;
  resetUptime: () => void;
  setWorld: (world: string | null) => void;

  // Logs actions
  addLog: (level: LogLevel, message: string) => void;
  clearLogs: () => void;
  setLogFilter: (filter: LogLevel | null) => void;

  // UI actions
  setScreen: (screen: Screen) => void;
  openModal: (content: ReactNode) => void;
  closeModal: () => void;
  setSelectedIndex: (index: number) => void;

  // Config actions
  updateConfig: (partial: Partial<ConfigState>) => void;
  loadConfigFromStore: (config: ConfigState) => void;

  // RCON actions
  updateRcon: (partial: Partial<RconState>) => void;
  setRconConnected: (connected: boolean) => void;
};

/** Complete store type */
export type Store = {
  server: ServerState;
  logs: LogsState;
  ui: UiState;
  config: ConfigState;
  rcon: RconState;
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
  },

  // Initial logs state
  logs: {
    entries: [],
    maxEntries: 100,
    filter: null,
  },

  // Initial UI state
  ui: {
    activeScreen: "dashboard",
    modalOpen: false,
    modalContent: null,
    selectedIndex: 0,
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
  },

  // Initial RCON state
  rcon: {
    enabled: false,
    connected: false,
    port: 25575,
    password: "",
    host: "localhost",
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

    // Logs actions
    addLog: (level, message) => {
      const entry: LogEntry = {
        id: createLogId(),
        timestamp: new Date(),
        level,
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

    // UI actions
    setScreen: (activeScreen) =>
      set((state) => ({
        ui: { ...state.ui, activeScreen, selectedIndex: 0 },
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

    // Config actions
    updateConfig: (partial) =>
      set((state) => ({
        config: { ...state.config, ...partial },
      })),

    loadConfigFromStore: (config) =>
      set(() => ({
        config,
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
  const { entries, filter } = state.logs;
  return filter ? entries.filter((e) => e.level === filter) : entries;
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
 * Selector for RCON state
 */
export const selectRcon = (state: Store) => state.rcon;

/**
 * Selector for actions
 */
export const selectActions = (state: Store) => state.actions;
