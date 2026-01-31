# 01 - TUI Architecture

## Overview

The TUI is built with Ink 5.x (React for terminals) using a three-zone layout.
This document covers component structure, state management, and rendering
patterns.

## Layout Structure

```
┌─────────────────────────────────────────────────────────────────────┐
│ ZONE 1: HEADER (fixed height: 6-8 rows)                             │
│ - Animated ASCII logo via ASCII Motion                              │
│ - Server status indicator (colored dot + text)                      │
│ - Version info                                                      │
├─────────────────────────────────────────────────────────────────────┤
│ ZONE 2: MAIN CONTENT (flexGrow: 1)                                  │
│ ┌─────────────────┐ ┌─────────────────────────────────────────────┐ │
│ │ NAVIGATION      │ │ CONTENT AREA                                │ │
│ │ (fixed 20 cols) │ │ (flexGrow: 1)                               │ │
│ │                 │ │                                              │ │
│ │ [1] Dashboard   │ │ Screen-specific content renders here        │ │
│ │ [2] Settings    │ │                                              │ │
│ │ [3] Worlds      │ │                                              │ │
│ │ [4] Console     │ │                                              │ │
│ │ [Q] Quit        │ │                                              │ │
│ └─────────────────┘ └─────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────┤
│ ZONE 3: LOG FEED (fixed height: 8-10 rows)                          │
│ - Scrollable log entries                                            │
│ - Color-coded by level (info=cyan, warn=yellow, error=red)          │
│ - Timestamp + message                                               │
└─────────────────────────────────────────────────────────────────────┘
```

## Component Hierarchy

```
App.tsx
├── Header.tsx
│   └── AnimatedLogo.tsx (ASCII Motion content)
├── StatusBar.tsx
├── MainContent.tsx
│   ├── Menu.tsx
│   │   └── MenuItem.tsx
│   └── ContentArea.tsx
│       ├── Dashboard.tsx (screen)
│       ├── Settings.tsx (screen)
│       │   └── SettingsGroup.tsx
│       ├── Worlds.tsx (screen)
│       │   └── WorldCard.tsx
│       └── Console.tsx (screen)
│           └── CommandInput.tsx
├── LogFeed.tsx
│   └── LogEntry.tsx
└── Modal.tsx (overlay)
```

## Entry Point

```tsx
// main.ts
import { render } from "ink";
import React from "react";
import { App } from "./src/tui/App.tsx";

if (import.meta.main) {
  const args = Deno.args;

  if (args.includes("--tui") || args[0] === "tui") {
    render(<App />);
  } else {
    // CLI mode
  }
}
```

## Root App Component

```tsx
// src/tui/App.tsx
import React, { FC } from "react";
import { Box, useApp, useInput } from "ink";
import { Header } from "./components/Header.tsx";
import { Menu } from "./components/Menu.tsx";
import { LogFeed } from "./components/LogFeed.tsx";
import { Dashboard } from "./screens/Dashboard.tsx";
import { Settings } from "./screens/Settings.tsx";
import { useStore } from "./store.ts";

export const App: FC = () => {
  const { exit } = useApp();
  const activeScreen = useStore((s) => s.ui.activeScreen);
  const setScreen = useStore((s) => s.actions.setScreen);

  useInput((input, key) => {
    if (input === "q" || (key.ctrl && input === "c")) {
      exit();
    }
    if (input === "1") setScreen("dashboard");
    if (input === "2") setScreen("settings");
    if (input === "3") setScreen("worlds");
    if (input === "4") setScreen("console");
  });

  const screens: Record<string, FC> = {
    dashboard: Dashboard,
    settings: Settings,
    worlds: Worlds,
    console: Console,
  };
  const Screen = screens[activeScreen] ?? Dashboard;

  return (
    <Box flexDirection="column" height="100%">
      {/* Zone 1: Header */}
      <Header />

      {/* Zone 2: Main Content */}
      <Box flexGrow={1} flexDirection="row">
        <Menu />
        <Box flexGrow={1} borderStyle="single" borderColor="gray">
          <Screen />
        </Box>
      </Box>

      {/* Zone 3: Log Feed */}
      <LogFeed />
    </Box>
  );
};
```

## Color Palette

```typescript
// src/tui/theme.ts
export const theme = {
  primary: "cyan", // Main accent, active items
  secondary: "white", // Default text
  accent: "magenta", // Highlights, animations
  success: "green", // Server online, success messages
  warning: "yellow", // Warnings
  error: "red", // Errors, server offline
  muted: "gray", // Inactive items, borders

  // Status colors
  serverOnline: "green",
  serverStarting: "yellow",
  serverOffline: "red",
  serverStopping: "yellow",
} as const;
```

## Zustand Store

```typescript
// src/tui/store.ts
import { create } from "zustand";

type ServerStatus = "offline" | "starting" | "online" | "stopping";
type Screen = "dashboard" | "settings" | "worlds" | "console";

type LogLevel = "info" | "warn" | "error" | "debug";
type LogEntry = {
  id: string;
  timestamp: Date;
  level: LogLevel;
  message: string;
};

type Store = {
  // Server state
  server: {
    status: ServerStatus;
    pid: number | null;
    players: string[];
    uptime: number; // seconds
    world: string | null;
  };

  // Logs
  logs: {
    entries: LogEntry[];
    maxEntries: number;
    filter: LogLevel | null;
  };

  // UI state
  ui: {
    activeScreen: Screen;
    modalOpen: boolean;
    modalContent: React.ReactNode | null;
  };

  // Configuration
  config: {
    serverName: string;
    port: number;
    password: string;
    world: string;
    public: boolean;
    crossplay: boolean;
    // ... other settings
  };

  // Actions
  actions: {
    // Server
    setServerStatus: (status: ServerStatus) => void;
    setServerPid: (pid: number | null) => void;
    addPlayer: (name: string) => void;
    removePlayer: (name: string) => void;
    incrementUptime: () => void;

    // Logs
    addLog: (level: LogLevel, message: string) => void;
    clearLogs: () => void;
    setLogFilter: (filter: LogLevel | null) => void;

    // UI
    setScreen: (screen: Screen) => void;
    openModal: (content: React.ReactNode) => void;
    closeModal: () => void;

    // Config
    updateConfig: (partial: Partial<Store["config"]>) => void;
  };
};

export const useStore = create<Store>((set, get) => ({
  server: {
    status: "offline",
    pid: null,
    players: [],
    uptime: 0,
    world: null,
  },

  logs: {
    entries: [],
    maxEntries: 100,
    filter: null,
  },

  ui: {
    activeScreen: "dashboard",
    modalOpen: false,
    modalContent: null,
  },

  config: {
    serverName: "Land of OZ Valheim",
    port: 2456,
    password: "",
    world: "Dedicated",
    public: false,
    crossplay: false,
  },

  actions: {
    setServerStatus: (status) =>
      set((s) => ({ server: { ...s.server, status } })),

    setServerPid: (pid) => set((s) => ({ server: { ...s.server, pid } })),

    addPlayer: (name) =>
      set((s) => ({
        server: { ...s.server, players: [...s.server.players, name] },
      })),

    removePlayer: (name) =>
      set((s) => ({
        server: {
          ...s.server,
          players: s.server.players.filter((p) => p !== name),
        },
      })),

    incrementUptime: () =>
      set((s) => ({
        server: { ...s.server, uptime: s.server.uptime + 1 },
      })),

    addLog: (level, message) => {
      const entry: LogEntry = {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        level,
        message,
      };
      set((s) => ({
        logs: {
          ...s.logs,
          entries: [...s.logs.entries, entry].slice(-s.logs.maxEntries),
        },
      }));
    },

    clearLogs: () => set((s) => ({ logs: { ...s.logs, entries: [] } })),

    setLogFilter: (filter) => set((s) => ({ logs: { ...s.logs, filter } })),

    setScreen: (activeScreen) =>
      set((s) => ({ ui: { ...s.ui, activeScreen } })),

    openModal: (content) =>
      set((s) => ({ ui: { ...s.ui, modalOpen: true, modalContent: content } })),

    closeModal: () =>
      set((s) => ({ ui: { ...s.ui, modalOpen: false, modalContent: null } })),

    updateConfig: (partial) =>
      set((s) => ({ config: { ...s.config, ...partial } })),
  },
}));
```

## Key Components

### Header.tsx

```tsx
import React, { FC, useEffect, useState } from "react";
import { Box, Text } from "ink";
import { useStore } from "../store.ts";
import { theme } from "../theme.ts";

// ASCII art frames loaded from assets/ascii/header.json
import headerFrames from "../../assets/ascii/header.json";

export const Header: FC = () => {
  const status = useStore((s) => s.server.status);
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setFrame((f) => (f + 1) % headerFrames.length);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const statusColor = theme[`server${capitalize(status)}`];

  return (
    <Box flexDirection="column" paddingX={1}>
      <Text>{headerFrames[frame]}</Text>
      <Box justifyContent="space-between">
        <Text>
          Server: <Text color={statusColor}>● {status.toUpperCase()}</Text>
        </Text>
        <Text dimColor>v1.0.0</Text>
      </Box>
    </Box>
  );
};
```

### LogFeed.tsx

```tsx
import React, { FC } from "react";
import { Box, Text } from "ink";
import { useStore } from "../store.ts";

const levelColors = {
  info: "cyan",
  warn: "yellow",
  error: "red",
  debug: "gray",
} as const;

export const LogFeed: FC = () => {
  const entries = useStore((s) => s.logs.entries);
  const filter = useStore((s) => s.logs.filter);

  const filtered = filter ? entries.filter((e) => e.level === filter) : entries;

  const visible = filtered.slice(-8); // Show last 8 entries

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor="gray"
      height={10}
      paddingX={1}
    >
      <Text bold dimColor>
        ─ Log Feed ─
      </Text>
      {visible.map((entry) => (
        <Box key={entry.id}>
          <Text dimColor>[{entry.timestamp.toLocaleTimeString()}]</Text>
          <Text color={levelColors[entry.level]}>
            {" "}
            [{entry.level.toUpperCase()}]
          </Text>
          <Text>{entry.message}</Text>
        </Box>
      ))}
    </Box>
  );
};
```

### Menu.tsx

```tsx
import React, { FC } from "react";
import { Box, Text } from "ink";
import { useStore } from "../store.ts";
import { theme } from "../theme.ts";

const menuItems = [
  { key: "1", label: "Dashboard", screen: "dashboard" },
  { key: "2", label: "Settings", screen: "settings" },
  { key: "3", label: "Worlds", screen: "worlds" },
  { key: "4", label: "Console", screen: "console" },
  { key: "Q", label: "Quit", screen: null },
] as const;

export const Menu: FC = () => {
  const activeScreen = useStore((s) => s.ui.activeScreen);

  return (
    <Box
      flexDirection="column"
      width={20}
      borderStyle="single"
      borderColor="gray"
      paddingX={1}
    >
      <Text bold dimColor>
        ─ Menu ─
      </Text>
      {menuItems.map((item) => (
        <Box key={item.key}>
          <Text
            color={activeScreen === item.screen
              ? theme.primary
              : theme.secondary}
            bold={activeScreen === item.screen}
          >
            [{item.key}] {item.label}
          </Text>
        </Box>
      ))}
    </Box>
  );
};
```

## Keyboard Bindings

| Key            | Action              | Context      |
| -------------- | ------------------- | ------------ |
| `1-4`          | Switch screens      | Global       |
| `Q` / `Ctrl+C` | Quit                | Global       |
| `↑/↓` or `j/k` | Navigate lists      | Lists        |
| `Enter`        | Select/confirm      | Lists, menus |
| `Esc`          | Close modal/go back | Modals       |
| `Tab`          | Next field          | Forms        |
| `Shift+Tab`    | Previous field      | Forms        |
| `S`            | Start server        | Dashboard    |
| `X`            | Stop server         | Dashboard    |

## Hooks

### useServer.ts

```tsx
import { useEffect } from "react";
import { useStore } from "../store.ts";

export function useServer() {
  const status = useStore((s) => s.server.status);
  const actions = useStore((s) => s.actions);

  const start = async () => {
    actions.setServerStatus("starting");
    actions.addLog("info", "Starting Valheim server...");
    // Spawn process, get PID
    // actions.setServerPid(pid);
    // On success:
    // actions.setServerStatus("online");
  };

  const stop = async () => {
    actions.setServerStatus("stopping");
    actions.addLog("info", "Stopping Valheim server...");
    // Send SIGTERM, wait
    // actions.setServerPid(null);
    // actions.setServerStatus("offline");
  };

  // Uptime counter
  useEffect(() => {
    if (status !== "online") return;

    const interval = setInterval(() => {
      actions.incrementUptime();
    }, 1000);

    return () => clearInterval(interval);
  }, [status]);

  return { status, start, stop };
}
```

### useLogs.ts

```tsx
import { useEffect, useRef } from "react";
import { useStore } from "../store.ts";

export function useLogs(logStream: AsyncIterable<string>) {
  const addLog = useStore((s) => s.actions.addLog);
  const streamRef = useRef(logStream);

  useEffect(() => {
    const run = async () => {
      for await (const line of streamRef.current) {
        const parsed = parseLogLine(line);
        addLog(parsed.level, parsed.message);
      }
    };
    run();
  }, []);
}

function parseLogLine(line: string) {
  // Parse Valheim log format
  if (line.includes("Error")) return { level: "error" as const, message: line };
  if (line.includes("Warning")) {
    return { level: "warn" as const, message: line };
  }
  return { level: "info" as const, message: line };
}
```

## Animation with ASCII Motion

The header animation is created using ASCII Motion MCP tools and exported as
JSON:

```json
// assets/ascii/header.json
[
  " ╦  ╔═╗╔╗╔╔╦╗  ╔═╗╔═╗  ╔═╗╔═╗ ",
  " ║  ╠═╣║║║ ║║  ║ ║╠╣   ║ ║╔═╝ ",
  " ╩═╝╚ ╚╝╚╝═╩╝  ╚═╝╚    ╚═╝╚═╝ "
]
```

To create new animations:

1. Use `mcp_ascii_motion__new_project` to start
2. Draw frames with `mcp_ascii_motion__set_cell`
3. Export with `mcp_ascii_motion__export_json`
