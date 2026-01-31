# Implementation Blueprint

## Land of OZ - Valheim Dedicated Server Manager

This document provides a phased implementation plan for AI agents working on
this project. Each phase builds on the previous one, with clear tasks,
verification steps, and completion criteria.

---

## Documentation References

Before starting any phase, read these files for context:

| Document                                 | Purpose                        |
| ---------------------------------------- | ------------------------------ |
| `README.md`                              | Architecture overview          |
| `AGENTS.md`                              | Coding standards & checklists  |
| `.agent-docs/00-overview.md`             | Project summary & QA checklist |
| `.agent-docs/01-tui-architecture.md`     | TUI components & Zustand store |
| `.agent-docs/02-process-management.md`   | Server process handling        |
| `.agent-docs/03-steamcmd-integration.md` | SteamCMD installer             |
| `.agent-docs/04-configuration.md`        | Deno KV configuration          |
| `.agent-docs/05-valheim-settings.md`     | Valheim server settings        |

---

## Phase 1: Foundation ✅ COMPLETE

**Status**: Implemented\
**Completed**: January 2026

### Tasks Completed

#### 1.1 deno.json Configuration

- [x] Added React/Ink imports (`npm:react@18`, `npm:ink@5`)
- [x] Added Zustand for state management (`npm:zustand@5`)
- [x] Added Zod for validation (`npm:zod@3`)
- [x] Added standard library imports (`@std/path`, `@std/fs`, `@std/assert`)
- [x] Configured JSX with `react-jsx` and `jsxImportSource`
- [x] Added `--unstable-kv` for Deno KV support
- [x] Created tasks: `dev`, `start`, `test`, `check`

#### 1.2 Directory Structure

- [x] `src/mod.ts` - Public API exports
- [x] `src/utils/mod.ts` - Utility exports
- [x] `src/utils/platform.ts` - OS detection, paths
- [x] `src/utils/logger.ts` - Structured logging
- [x] `src/config/mod.ts` - Config exports
- [x] `src/config/schema.ts` - Zod schemas
- [x] `src/config/defaults.ts` - Default values
- [x] `src/config/store.ts` - Deno KV persistence
- [x] `src/tui/mod.ts` - TUI placeholder
- [x] `assets/ascii/.gitkeep` - ASCII art placeholder

#### 1.3 Platform Utilities (`src/utils/platform.ts`)

- [x] `getPlatform()` - Returns "windows" | "darwin" | "linux"
- [x] `getConfigDir()` - Platform-specific config directory
- [x] `getLocalDataDir()` - Platform-specific local data directory
- [x] `getValheimSaveDir()` - Default Valheim worlds directory
- [x] `getAppConfigDir()` - oz-valheim config directory
- [x] `getSteamCmdDir()` - SteamCMD installation directory
- [x] `getValheimServerDir()` - Valheim server directory
- [x] `getValheimExecutable()` - Server executable path
- [x] `getSteamCmdExecutable()` - SteamCMD executable path

#### 1.4 Configuration Schemas (`src/config/schema.ts`)

- [x] `ServerConfigSchema` - Server settings with validation
- [x] `WatchdogConfigSchema` - Auto-restart settings
- [x] `TuiConfigSchema` - UI preferences
- [x] `AppConfigSchema` - Complete app configuration
- [x] Modifier schemas (combat, death penalty, resources, portals)
- [x] Type exports for all schemas

#### 1.5 Configuration Store (`src/config/store.ts`)

- [x] `loadConfig()` / `saveConfig()` - Deno KV persistence
- [x] `updateConfig()` / `updateServerConfig()` - Partial updates
- [x] `resetConfig()` - Reset to defaults
- [x] `closeConfig()` - Clean up KV connection
- [x] World management: `addWorld()`, `removeWorld()`, `setActiveWorld()`

#### 1.6 Main Entry Point (`main.ts`)

- [x] CLI argument parsing (--help, --version, --config, --tui)
- [x] Configuration initialization on first run
- [x] Placeholder commands for future phases
- [x] Graceful shutdown handling

### Verification Results

```bash
✅ deno check main.ts src/**/*.ts  # Passes
✅ deno lint                        # No errors
✅ deno task start --version        # Shows version
✅ deno task start --config         # Shows configuration
```

---

## Phase 2: Core Server Management ✅ COMPLETE

**Status**: Implemented\
**Completed**: January 2026

### Overview

Implement SteamCMD integration and Valheim process management. This phase
enables installing/updating Valheim and running the dedicated server.

### Tasks Completed

#### 2.1 SteamCMD Module (`src/steamcmd/`)

- [x] mod.ts - Module exports
- [x] paths.ts - Platform-specific paths, getSteamPaths(), isSteamCmdInstalled()
- [x] installer.ts - SteamCMD auto-installer with progress callback
- [x] updater.ts - Valheim installation/updates, getInstalledVersion()

#### 2.2 Server Module (`src/server/`)

- [x] mod.ts - Module exports
- [x] process.ts - ValheimProcess class with start/stop/kill methods
- [x] watchdog.ts - Crash detection & auto-restart with exponential backoff
- [x] logs.ts - Log parsing and streaming
- [x] commands.ts - Admin/ban/permitted list management

#### 2.3 CLI Commands

- [x] `oz-valheim install` - Install SteamCMD and Valheim
- [x] `oz-valheim start` - Start the server with watchdog
- [x] `oz-valheim stop` - Stop the server

### Verification Results

```bash
✅ deno check main.ts src/**/*.ts  # Passes
✅ deno lint                        # No errors
✅ deno task start --help           # Shows install/start/stop commands
✅ deno task start install --dry-run # Shows installation status
```

---

## Phase 3: TUI Development ✅ COMPLETE

**Status**: Implemented\
**Completed**: January 2026

### Overview

Build the terminal user interface using Ink (React for terminals) with Zustand
state management. The TUI has a three-zone layout: Header, Main Content, and Log
Feed.

### Tasks Completed

#### 3.1 Zustand Store (`src/tui/store.ts`)

- [x] Server state (status, pid, players, uptime)
- [x] Logs state (entries, filter, maxEntries)
- [x] UI state (activeScreen, modal, selectedIndex)
- [x] Config state (serverName, port, world, etc.)
- [x] Actions for all state mutations
- [x] Selector functions for optimized renders

#### 3.2 Theme (`src/tui/theme.ts`)

- [x] Primary: cyan
- [x] Success: green (online)
- [x] Warning: yellow (starting/stopping)
- [x] Error: red (offline/crashed)
- [x] Muted: gray (borders, inactive)
- [x] Log level colors
- [x] Status color helper function

#### 3.3 Root App Component (`src/tui/App.tsx`)

- [x] Three-zone layout with flexbox
- [x] Zone 1: Header (animated logo, status)
- [x] Zone 2: Main Content (Menu + Content area)
- [x] Zone 3: Log Feed (scrollable logs)
- [x] Keyboard handling (1-4, Q/Ctrl+C)
- [x] Config sync on mount

#### 3.4 Components (`src/tui/components/`)

- [x] Header.tsx - Animated ASCII logo + server status
- [x] Menu.tsx - Navigation menu with keyboard shortcuts
- [x] MenuItem.tsx - Single menu item with hotkey
- [x] LogFeed.tsx - Log display with filtering
- [x] LogEntry.tsx - Single log entry with timestamps
- [x] StatusBar.tsx - Server status indicator
- [x] Modal.tsx - Overlay dialog with ESC handling
- [x] mod.ts - Barrel exports

#### 3.5 Screens (`src/tui/screens/`)

- [x] Dashboard.tsx - Server status, players, quick actions (S/X)
- [x] Settings.tsx - Server configuration with navigation
- [x] Worlds.tsx - World management (placeholder)
- [x] Console.tsx - Log viewer with filtering and scrolling
- [x] mod.ts - Barrel exports

#### 3.6 Hooks (`src/tui/hooks/`)

- [x] useServer.ts - Server start/stop/kill, uptime counter
- [x] useLogs.ts - Log management, stream subscription
- [x] useConfig.ts - Configuration CRUD, persistence sync
- [x] mod.ts - Barrel exports

#### 3.7 ASCII Header Asset

- [x] Created assets/ascii/header.json with logo frames

#### 3.8 Module Exports

- [x] Updated src/tui/mod.ts with all exports
- [x] launchTui() renders Ink App component
- [x] Added @types/react for JSX runtime support

### Verification Results

```bash
✅ deno check main.ts src/**/*.ts src/**/*.tsx  # Passes
✅ deno lint                                      # No errors
✅ deno fmt                                       # Formatted
✅ deno task start --version                      # Shows version
✅ deno task start --help                         # Shows TUI option
```

---

## Phase 4: CLI & Polish ⬜ NOT STARTED

**Status**: Ready to implement\
**Dependencies**: Phase 1 ✅, Phase 2 ✅, Phase 3 ✅

### Overview

Complete CLI functionality, add Valheim-specific features, and polish the
application.

### Tasks

#### 4.1 Argument Parser (`src/cli/args.ts`)

Full argument parsing with:

- Subcommands: start, stop, install, config, tui
- Flags: --port, --world, --password, etc.
- Help text generation

#### 4.2 Command Handlers (`src/cli/commands/`)

```
commands/
├── start.ts        # Start server with options
├── stop.ts         # Stop running server
├── install.ts      # SteamCMD/Valheim install
├── config.ts       # Get/set configuration
└── worlds.ts       # World management
```

#### 4.3 Valheim Module (`src/valheim/`)

```
valheim/
├── mod.ts          # Module exports
├── settings.ts     # Server argument builder
├── worlds.ts       # World file management
└── args.ts         # Valheim CLI argument builder
```

**worlds.ts** - Implement:

- `discoverWorlds()` - Find .db/.fwl pairs
- `importWorld()` - Copy world files
- `exportWorld()` - Backup world
- `deleteWorld()` - Remove world files

**args.ts** - Implement:

- `buildServerArgs(config)` - Convert config to CLI args
- Handle all Valheim server flags

#### 4.4 Integration Testing

- Test server start/stop cycle
- Test configuration persistence
- Test world management

#### 4.5 Documentation

- Update README.md with usage examples
- Add inline help text
- JSDoc all public APIs

### Verification

```bash
# 1. Full check
deno check main.ts src/**/*.ts src/**/*.tsx

# 2. Lint
deno lint

# 3. Run all tests
deno test --allow-all --unstable-kv

# 4. CLI help
deno task start --help
deno task start start --help
deno task start config --help

# 5. TUI functionality
deno task start --tui
```

### Completion Criteria

- [ ] All type checks pass
- [ ] All lint checks pass
- [ ] All tests pass
- [ ] CLI subcommands work correctly
- [ ] TUI fully functional
- [ ] World management works
- [ ] Documentation complete

---

## Phase 5: Testing & Compilation ⬜ NOT STARTED

**Status**: Blocked by Phase 4\
**Dependencies**: All previous phases

### Overview

Final testing, compilation to executable, and release preparation.

### Tasks

#### 5.1 Unit Tests

- Test utility functions
- Test configuration schema validation
- Test argument parsing

#### 5.2 Integration Tests

- Test SteamCMD installation (mocked)
- Test server process lifecycle
- Test config persistence

#### 5.3 Compilation

```bash
# Compile to single executable
deno compile --allow-all --unstable-kv --output oz-valheim main.ts

# Windows
deno compile --allow-all --unstable-kv --target x86_64-pc-windows-msvc --output oz-valheim.exe main.ts

# Linux
deno compile --allow-all --unstable-kv --target x86_64-unknown-linux-gnu --output oz-valheim main.ts
```

#### 5.4 Release

- Create GitHub release
- Attach compiled binaries
- Write release notes

### Completion Criteria

- [ ] All tests pass
- [ ] Compiled binary works on target platforms
- [ ] Documentation is complete
- [ ] Release is published

---

## Agent Handoff Protocol

When completing a phase, provide:

1. **Summary**: What was implemented
2. **Files Changed**: List of new/modified files
3. **Verification Output**: Terminal output showing checks pass
4. **Next Steps**: What the next agent should focus on
5. **Known Issues**: Any remaining problems or TODOs

### Example Handoff

```markdown
## Phase 2 Complete

### Summary

Implemented SteamCMD integration and Valheim process management.

### Files Changed

- src/steamcmd/mod.ts (new)
- src/steamcmd/paths.ts (new)
- src/steamcmd/installer.ts (new)
- src/steamcmd/updater.ts (new)
- src/server/mod.ts (new)
- src/server/process.ts (new)
- src/server/watchdog.ts (new)
- src/server/logs.ts (new)
- src/server/commands.ts (new)
- src/mod.ts (updated exports)
- main.ts (added install/start/stop commands)

### Verification
```

$ deno check main.ts src/\*_/_.ts Check main.ts Check src/steamcmd/mod.ts ... $
deno lint Checked 15 files $ deno task start --version Land of OZ - Valheim DSM
v0.1.0

```
### Next Steps
Phase 3: TUI Development - Start with Zustand store setup

### Known Issues
- macOS Valheim support is limited upstream
- RCON not yet implemented
```

---

## Quick Reference

### Deno Commands

```bash
deno task dev          # Run with hot reload
deno task start        # Run application
deno task test         # Run tests
deno task check        # Type check
deno lint              # Lint code
deno fmt               # Format code
```

### Key File Locations

| Purpose        | Path                       |
| -------------- | -------------------------- |
| Entry point    | `main.ts`                  |
| Public API     | `src/mod.ts`               |
| Config storage | `%APPDATA%/oz-valheim/`    |
| SteamCMD       | `%LOCALAPPDATA%/steamcmd/` |
| Valheim server | `.../steamapps/common/...` |

### Dependencies

```json
{
  "react": "npm:react@18",
  "ink": "npm:ink@5",
  "zustand": "npm:zustand@5",
  "zod": "npm:zod@3"
}
```
