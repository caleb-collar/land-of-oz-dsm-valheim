# AI Agent Implementation Guide

## Project Overview

This is **Land of OZ - Dedicated Server Manager for Valheim**, a Deno-based TUI
application for managing Valheim dedicated servers. The project uses Ink (React
for terminals) with ASCII Motion animations.

## Quick Reference

| Aspect         | Details                          |
| -------------- | -------------------------------- |
| Runtime        | Deno 2.x (TypeScript)            |
| TUI            | Ink 6.x (React) with Yoga layout |
| State          | Zustand                          |
| Config Storage | Deno KV                          |
| Animation      | ASCII Motion MCP tooling         |
| Entry Point    | `main.ts`                        |

## Implementation Priorities

### Phase 1: Foundation

1. Set up Deno configuration with npm specifiers for Ink/React
2. Create `src/` directory structure
3. Implement platform detection (`src/utils/platform.ts`)
4. Build configuration schema and storage (`src/config/`)

### Phase 2: Core Server Management

1. SteamCMD installer and path resolution (`src/steamcmd/`)
2. Valheim process wrapper (`src/server/process.ts`)
3. Watchdog for auto-restart (`src/server/watchdog.ts`)
4. Log parsing and streaming (`src/server/logs.ts`)

### Phase 3: TUI Development

1. Zustand store setup (`src/tui/store.ts`)
2. Root App component (`src/tui/App.tsx`)
3. Header with ASCII Motion animation (`src/tui/components/Header.tsx`)
4. Dashboard screen (`src/tui/screens/Dashboard.tsx`)
5. Settings panel (`src/tui/screens/Settings.tsx`)
6. Log feed component (`src/tui/components/LogFeed.tsx`)

### Phase 4: CLI & Polish

1. Argument parser (`src/cli/args.ts`)
2. Command handlers (`src/cli/commands/`)
3. World management (`src/valheim/worlds.ts`)

## Coding Standards

### TypeScript Conventions

- Use `type` over `interface` for object shapes
- Prefer `const` assertions for literal types
- Use Zod for runtime validation
- Export from `mod.ts` barrel files

### React/Ink Patterns

```tsx
// Functional components with FC type
import { FC } from "react";
import { Box, Text } from "ink";

type Props = {
  title: string;
  active?: boolean;
};

export const MenuItem: FC<Props> = ({ title, active = false }) => {
  return (
    <Box>
      <Text color={active ? "cyan" : "white"}>{title}</Text>
    </Box>
  );
};
```

### File Naming

- Components: `PascalCase.tsx`
- Modules: `kebab-case.ts` or `camelCase.ts`
- Types: Colocate with implementation or in `types.ts`
- Tests: `*.test.ts` alongside source files

### Deno Imports

```typescript
// Standard library
import { join } from "@std/path";
import { assertEquals } from "@std/assert";

// npm packages via npm: specifier
import React from "npm:react";
import { Box, render, Text } from "npm:ink";
import { create } from "npm:zustand";
```

## ASCII Motion MCP Tools

You have access to ASCII Motion MCP tools for creating animated ASCII art. Use
these for:

- The animated header/logo
- Loading spinners
- Transition effects
- Status indicators

Key tools to search for:

- `mcp_ascii_motion__new_project` - Create animation project
- `mcp_ascii_motion__set_cell` - Draw characters
- `mcp_ascii_motion__export_json` - Export for use in app

## Key Implementation Details

### deno.json Setup

```json
{
  "tasks": {
    "dev": "deno run --watch --allow-all main.ts",
    "start": "deno run --allow-all main.ts",
    "test": "deno test --allow-all",
    "check": "deno check src/**/*.ts src/**/*.tsx"
  },
  "imports": {
    "@std/assert": "jsr:@std/assert@1",
    "@std/path": "jsr:@std/path@1",
    "@std/fs": "jsr:@std/fs@1",
    "react": "npm:react@19",
    "ink": "npm:ink@6",
    "zustand": "npm:zustand@5",
    "zod": "npm:zod@4"
  },
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "react"
  }
}
```

### Platform Detection Pattern

```typescript
// src/utils/platform.ts
export type Platform = "windows" | "darwin" | "linux";

export function getPlatform(): Platform {
  const os = Deno.build.os;
  if (os === "windows") return "windows";
  if (os === "darwin") return "darwin";
  return "linux";
}

export function getConfigDir(): string {
  const platform = getPlatform();
  const home = Deno.env.get("HOME") ?? Deno.env.get("USERPROFILE") ?? "";

  switch (platform) {
    case "windows":
      return Deno.env.get("APPDATA") ?? join(home, "AppData", "Roaming");
    case "darwin":
      return join(home, "Library", "Application Support");
    default:
      return Deno.env.get("XDG_CONFIG_HOME") ?? join(home, ".config");
  }
}
```

### Zustand Store Pattern

```typescript
// src/tui/store.ts
import { create } from "zustand";

type ServerStatus = "offline" | "starting" | "online" | "stopping";

type Store = {
  server: {
    status: ServerStatus;
    pid: number | null;
    players: string[];
  };
  logs: {
    entries: LogEntry[];
    filter: string | null;
  };
  ui: {
    activeScreen: string;
    modalOpen: boolean;
  };
  actions: {
    setServerStatus: (status: ServerStatus) => void;
    addLog: (entry: LogEntry) => void;
    setScreen: (screen: string) => void;
  };
};

export const useStore = create<Store>((set) => ({
  server: { status: "offline", pid: null, players: [] },
  logs: { entries: [], filter: null },
  ui: { activeScreen: "dashboard", modalOpen: false },
  actions: {
    setServerStatus: (status) =>
      set((state) => ({ server: { ...state.server, status } })),
    addLog: (entry) =>
      set((state) => ({
        logs: { ...state.logs, entries: [...state.logs.entries, entry] },
      })),
    setScreen: (screen) =>
      set((state) => ({ ui: { ...state.ui, activeScreen: screen } })),
  },
}));
```

## Documentation Structure

For detailed implementation guidance, see `.agent-docs/`:

- `00-overview.md` - Project summary and quick start
- `01-tui-architecture.md` - Ink components and layout
- `02-process-management.md` - Server lifecycle
- `03-steamcmd-integration.md` - Installation and updates
- `04-configuration.md` - Settings and persistence
- `05-valheim-settings.md` - Game-specific options

## Testing Strategy

- Unit tests for utility functions
- Integration tests for SteamCMD/process management
- Component tests for TUI (where possible)
- Run tests with: `deno test --allow-all`

## Common Pitfalls

1. **Ink requires React 19**: Use `npm:react@19` not `npm:react`
2. **JSX config**: Ensure `jsx: "react-jsx"` in deno.json
3. **Permissions**: Always use `--allow-all` during dev
4. **Windows paths**: Use `@std/path` join, not string concatenation
5. **Process cleanup**: Always handle SIGINT/SIGTERM for graceful shutdown

## Getting Help

- Check `README.md` for architecture diagrams
- Review `.agent-docs/` for detailed specs
- Run `deno doc src/mod.ts` for API documentation

## Agentic Workflow Checklists

### Before Starting Any Task

- [ ] Read relevant documentation (AGENTS.md, README.md, .agent-docs/)
- [ ] Understand the current project state
- [ ] Check for any existing errors: `deno check main.ts src/**/*.ts`
- [ ] Identify files that will be modified

### During Implementation

- [ ] Follow TypeScript conventions (use `type` over `interface`)
- [ ] Use Zod for runtime validation where needed
- [ ] Export from `mod.ts` barrel files
- [ ] Add JSDoc comments to public functions
- [ ] Use `@std/path` for cross-platform paths

### After Every File Edit

- [ ] Run `deno check` on modified files
- [ ] Fix any type errors immediately
- [ ] Verify imports are correct

### Before Completing Any Task

Run this verification sequence and fix any issues:

```bash
# 1. Type check all source files
deno check main.ts src/**/*.ts src/**/*.tsx

# 2. Run linter
deno lint

# 3. Format code
deno fmt

# 4. Run tests
deno test --allow-all --unstable-kv

# 5. Verify the app runs
deno task start --version
deno task start --help
```

### Mandatory Completion Checklist

**DO NOT mark a task as complete until ALL of these pass:**

1. **Type Check**: `deno check main.ts src/**/*.ts` exits with code 0
2. **Lint**: `deno lint` reports no errors
3. **Build/Run**: `deno task start --version` runs successfully
4. **No Regressions**: Previously working functionality still works
5. **Documentation**: Any new public APIs have JSDoc comments

### Troubleshooting Common Issues

| Problem                         | Solution                                                      |
| ------------------------------- | ------------------------------------------------------------- |
| `Module not found`              | Check import paths, ensure `mod.ts` exports                   |
| `JSR package not installed`     | Run `deno install` or check deno.json imports                 |
| `Deno.openKv is not a function` | Add `--unstable-kv` flag or `"unstable": ["kv"]` to deno.json |
| `Password validation failed`    | Check Zod schema allows empty strings where needed            |
| `Cannot find module 'react'`    | Ensure `"react": "npm:react@19"` in deno.json imports         |

### Handoff Protocol

When completing a phase/task, provide:

1. **Summary**: What was implemented
2. **Files Changed**: List of new/modified files
3. **Verification**: Evidence that checks pass (command output)
4. **Next Steps**: What the next agent should work on
5. **Known Issues**: Any remaining problems or TODOs
