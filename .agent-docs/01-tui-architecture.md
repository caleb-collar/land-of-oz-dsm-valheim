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

const args = process.argv.slice(2);

if (args.includes("--tui") || args[0] === "tui") {
  render(<App />);
} else {
  // CLI mode
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
import { createRequire } from "node:module";

// Load ASCII art frames
const require = createRequire(import.meta.url);
const headerFrames = require("../../assets/ascii/header.json");

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
            color={
              activeScreen === item.screen ? theme.primary : theme.secondary
            }
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

---

## Responsive Layout & Overlap Prevention

> **This section is mandatory reading for any agent modifying `.tsx` files.**

Text overlap and misaligned layouts are the **single most frequent regression**
introduced during agentic development. The Ink/Yoga layout engine behaves
differently from browser CSS — it does **not** automatically wrap or scroll
content. Every element must be explicitly constrained.

### Terminal Size Targets

| Size | Columns × Rows | Purpose |
|------|-----------------|---------|
| Minimum | 80 × 24 | Must render with zero overlap or truncation artifacts |
| Comfortable | 120 × 40 | Optimise for this — show more data, wider columns |

### Mandatory Layout Rules

These rules apply to **every** `<Box>` and `<Text>` in the project:

#### Rule 1 — Fixed zones must not collapse

Any element with a known height (header, status rows, help bars, section
dividers) must set `flexShrink={0}` so Yoga never compresses it:

```tsx
// ✅ Header that keeps its height
<Box flexShrink={0} minHeight={1}>
  <Text bold>─ Server Status ─</Text>
</Box>

// ❌ Will be crushed to 0 when space is tight
<Box>
  <Text bold>─ Server Status ─</Text>
</Box>
```

#### Rule 2 — Scrollable zones must clip overflow

Content areas that hold dynamic lists, log entries, or long text must use
`flexGrow={1}` and `overflow="hidden"` together. This fills remaining space
while preventing content from pushing siblings off-screen:

```tsx
// ✅ Scrollable area that clips
<Box flexGrow={1} flexDirection="column" overflow="hidden">
  {logEntries.map(e => <LogEntry key={e.id} entry={e} />)}
</Box>

// ❌ Grows without clipping — long lists push footer off screen
<Box flexGrow={1} flexDirection="column">
  {logEntries.map(e => <LogEntry key={e.id} entry={e} />)}
</Box>
```

#### Rule 3 — Every info/status row needs `flexShrink={0}` + `minHeight={1}`

This is the most commonly missed rule. Without it, individual rows collapse to
zero height when the terminal is short:

```tsx
// ✅ Use the <Row> component from src/tui/components/Row.tsx
<Row label="Port" value="2456" />

// ✅ Or manually specify
<Box flexShrink={0} minHeight={1}>
  <Text>Port: </Text><Text color="cyan">2456</Text>
</Box>
```

#### Rule 4 — Truncate all dynamic/user-supplied strings

File paths, player names, log messages, world names, and any string whose
length is not known at compile time **must** be truncated to prevent horizontal
overflow:

```tsx
// ✅ Using Ink's built-in truncation
<Text dimColor wrap="truncate-end">{longPath}</Text>

// ✅ Using the project's TruncatedText component
import { TruncatedText } from "./TruncatedText.tsx";
<TruncatedText maxWidth={40}>{longPath}</TruncatedText>
```

Never render a raw dynamic string without a width constraint.

#### Rule 5 — Fixed-width label columns

When rendering key-value pairs, give the label a fixed `width` so values align
vertically regardless of label length:

```tsx
<Box flexShrink={0} minHeight={1}>
  <Box width={16}><Text>Server Name:</Text></Box>
  <Text color="cyan">Land of OZ</Text>
</Box>
```

#### Rule 6 — No unbounded horizontal content

Never place a `<Text>` with potentially long content inside a
`flexDirection="row"` `<Box>` without constraining it:

```tsx
// ✅ Value flexes, label stays fixed
<Box flexDirection="row" flexShrink={0}>
  <Box width={12}><Text>Path:</Text></Box>
  <Box flexShrink={1}><Text wrap="truncate-end">{path}</Text></Box>
</Box>

// ❌ Long path pushes "Actions" off the right edge
<Box flexDirection="row">
  <Text>{longPath}</Text>
  <Text>Actions</Text>
</Box>
```

#### Rule 7 — Modal constraints

Modals and overlays must not exceed the minimum terminal width. Cap modal width
to a concrete value (e.g., `width={70}`) or use a percentage-based approach
that degrades at 80 columns.

### Layout Review Checklist

Run this checklist **every time a `.tsx` file is created or modified**:

- [ ] Every non-scrollable row has `flexShrink={0}`
- [ ] The main scrollable content area has `overflow="hidden"`
- [ ] Long strings (paths, player names, logs) use `wrap="truncate-end"` or
      `<TruncatedText>`
- [ ] Label columns have a fixed `width`
- [ ] No `<Text>` with dynamic content sits in a row without a width constraint
- [ ] Modals and overlays don't exceed terminal width at 80 cols
- [ ] Help / action bars at the bottom are `flexShrink={0}`
- [ ] Visually verify at 80×24 (narrow) **and** 120×40 (wide)

### Reusable Layout Components

The project provides these components specifically to enforce consistency:

| Component | File | Purpose |
|-----------|------|---------|
| `<Row>` | `src/tui/components/Row.tsx` | Label-value pair with `flexShrink={0}` and `minHeight={1}` baked in |
| `<TruncatedText>` | `src/tui/components/TruncatedText.tsx` | Truncates to a given `maxWidth` with ellipsis |

**Prefer these over hand-rolling layout logic** for status rows and dynamic
strings. If you need behaviour they don't cover, extend them rather than
duplicating layout props across screens.

### Common Mistakes & Fixes

| Symptom | Cause | Fix |
|---------|-------|-----|
| Rows disappear in short terminals | Missing `flexShrink={0}` | Add `flexShrink={0} minHeight={1}` |
| Footer pushed off bottom of screen | Dynamic list has no `overflow="hidden"` | Add `overflow="hidden"` to the list container |
| Text bleeds past right edge | Dynamic string with no truncation | Use `wrap="truncate-end"` or `<TruncatedText>` |
| Values misaligned across rows | Labels have variable width | Give labels a fixed `width` |
| Modal clips or wraps oddly | No max width on modal | Set explicit `width` or `maxWidth` on the outer `<Box>` |
| Header/status bar shrinks to 1 line | `flexShrink` defaults to 1 | Set `flexShrink={0}` on the header `<Box>` |
