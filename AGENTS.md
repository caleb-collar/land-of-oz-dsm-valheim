# AI Agent Implementation Guide

## Project Overview

This is **Land of OZ - Dedicated Server Manager for Valheim**, a Node.js-based TUI
application for managing Valheim dedicated servers. The project uses Ink (React
for terminals) with ASCII Motion animations.

## Quick Reference

| Aspect         | Details                          |
| -------------- | -------------------------------- |
| Runtime        | Node.js 22.x (TypeScript)        |
| TUI            | Ink 5.x (React) with Yoga layout |
| State          | Zustand                          |
| Config Storage | conf (JSON)                      |
| Animation      | ASCII Motion MCP tooling         |
| Entry Point    | `main.ts`                        |

### Implementation Priorities

### Phase 1: Foundation

1. Set up package.json with dependencies for Ink/React
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

### Node.js Imports

```typescript
// Node.js built-ins
import path from "node:path";
import fs from "node:fs/promises";
import { spawn } from "node:child_process";

// npm packages
import React from "react";
import { Box, render, Text } from "ink";
import { create } from "zustand";
import { describe, expect, it } from "vitest";
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

### package.json Setup

```json
{
  "name": "oz-valheim",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch main.ts",
    "start": "tsx main.ts",
    "build": "tsup",
    "test": "vitest run",
    "lint": "biome check .",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "conf": "^13.0.1",
    "fullscreen-ink": "^0.0.2",
    "ink": "^5.1.0",
    "react": "^18.3.1",
    "zod": "^3.24.2",
    "zustand": "^5.0.3"
  },
  "devDependencies": {
    "@biomejs/biome": "^1.9.4",
    "@types/node": "^22.13.1",
    "@types/react": "^18.3.18",
    "tsx": "^4.19.2",
    "tsup": "^8.3.6",
    "typescript": "^5.7.3",
    "vitest": "^3.0.4"
  }
}
```

### Platform Detection Pattern

```typescript
// src/utils/platform.ts
import path from "node:path";

export type Platform = "windows" | "darwin" | "linux";

export function getPlatform(): Platform {
  const os = process.platform;
  if (os === "win32") return "windows";
  if (os === "darwin") return "darwin";
  return "linux";
}

export function getConfigDir(): string {
  const platform = getPlatform();
  const home = process.env.HOME ?? process.env.USERPROFILE ?? "";

  switch (platform) {
    case "windows":
      return process.env.APPDATA ?? path.join(home, "AppData", "Roaming");
    case "darwin":
      return path.join(home, "Library", "Application Support");
    default:
      return process.env.XDG_CONFIG_HOME ?? path.join(home, ".config");
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
- Run tests with: `npm test`

## Common Pitfalls

1. **Ink requires React 18**: Use `react@18` for compatibility with Ink 5
2. **JSX config**: Ensure `jsx: "react-jsx"` in tsconfig.json
3. **Windows paths**: Use `node:path` join, not string concatenation
4. **Process cleanup**: Always handle SIGINT/SIGTERM for graceful shutdown
5. **ES Modules**: Use `type: "module"` in package.json

## Getting Help

- Check `README.md` for architecture diagrams
- Review `.agent-docs/` for detailed specs
- Run `npm run typecheck` to validate TypeScript

## Agentic Workflow Checklists

### Before Starting Any Task

- [ ] Read relevant documentation (AGENTS.md, README.md, .agent-docs/)
- [ ] Understand the current project state
- [ ] Check for any existing errors: `npm run typecheck`
- [ ] Identify files that will be modified

### During Implementation

- [ ] Follow TypeScript conventions (use `type` over `interface`)
- [ ] Use Zod for runtime validation where needed
- [ ] Export from `mod.ts` barrel files
- [ ] Add JSDoc comments to public functions
- [ ] Use `node:path` for cross-platform paths

### After Every File Edit

- [ ] Run `npm run typecheck` on modified files
- [ ] Fix any type errors immediately
- [ ] Verify imports are correct

### Before Completing Any Task

Run this verification sequence and fix any issues:

```bash
# 1. Type check all source files
npm run typecheck

# 2. Run linter and formatter
npm run lint

# 3. Run tests
npm test

# 4. Verify the app runs
npx tsx main.ts --version
npx tsx main.ts --help
```

### Mandatory Completion Checklist

**DO NOT mark a task as complete until ALL of these pass:**

1. **Type Check**: `npm run typecheck` exits with code 0
2. **Lint**: `npm run lint` reports no errors
3. **Build/Run**: `npx tsx main.ts --version` runs successfully
4. **No Regressions**: Previously working functionality still works
5. **Documentation**: Any new public APIs have JSDoc comments

### Troubleshooting Common Issues

| Problem                      | Solution                                           |
| ---------------------------- | -------------------------------------------------- |
| `Module not found`           | Check import paths, ensure `mod.ts` exports        |
| `Cannot find module 'react'` | Run `npm install` to install dependencies          |
| `Permission denied`          | Use `chmod +x` on Linux/macOS for executables      |
| `Password validation failed` | Check Zod schema allows empty strings where needed |
| `Type errors in tests`       | Ensure vitest types are installed                  |

### Handoff Protocol

When completing a phase/task, provide:

1. **Summary**: What was implemented
2. **Files Changed**: List of new/modified files
3. **Verification**: Evidence that checks pass (command output)
4. **Next Steps**: What the next agent should work on
5. **Known Issues**: Any remaining problems or TODOs
