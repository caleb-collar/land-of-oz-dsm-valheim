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

## Phase 2: Core Server Management ⬜ NOT STARTED

**Status**: Ready to implement\
**Dependencies**: Phase 1 ✅

### Overview

Implement SteamCMD integration and Valheim process management. This phase
enables installing/updating Valheim and running the dedicated server.

### Tasks

#### 2.1 Create SteamCMD Module (`src/steamcmd/`)

Create the following files (see `.agent-docs/03-steamcmd-integration.md` for
implementation details):

```
src/steamcmd/
├── mod.ts          # Module exports
├── paths.ts        # Platform-specific paths
├── installer.ts    # SteamCMD auto-installer
└── updater.ts      # Valheim installation/updates
```

**paths.ts** - Implement:

- `getSteamPaths()` - Returns all Steam-related paths
- `isSteamCmdInstalled()` - Check if SteamCMD exists
- `isValheimInstalled()` - Check if Valheim server exists

**installer.ts** - Implement:

- `installSteamCmd(onProgress?)` - Download and extract SteamCMD
- Handle Windows (ZIP) and Linux/macOS (tar.gz)
- Progress callback for TUI integration

**updater.ts** - Implement:

- `installValheim(onProgress?)` - Install/update via SteamCMD
- `checkForUpdates()` - Check if update available
- `getInstalledVersion()` - Read current build ID
- Valheim App ID: `896660`

#### 2.2 Create Server Module (`src/server/`)

Create the following files (see `.agent-docs/02-process-management.md` for
implementation details):

```
src/server/
├── mod.ts          # Module exports
├── process.ts      # Valheim process wrapper
├── watchdog.ts     # Crash detection & auto-restart
├── logs.ts         # Log parsing and streaming
└── commands.ts     # Admin list management
```

**process.ts** - Implement:

- `ValheimProcess` class with start/stop/kill methods
- Process state machine: offline → starting → online → stopping
- stdout/stderr streaming and parsing
- Player join/leave event detection
- Graceful shutdown with SIGTERM

**watchdog.ts** - Implement:

- `Watchdog` class wrapping ValheimProcess
- Crash detection and auto-restart
- Exponential backoff for consecutive crashes
- Max restart limit with cooldown

**logs.ts** - Implement:

- `parseLogLine()` - Extract level and message
- `parseEvent()` - Detect player/world events
- `LogBuffer` class with subscribers

**commands.ts** - Implement:

- `addToAdminList()`, `addToBanList()`, `addToPermittedList()`
- `removeFromBanList()`
- `getListContents()` - Read admin/banned/permitted lists

#### 2.3 Add CLI Commands

Update `main.ts` to handle:

- `oz-valheim install` - Install SteamCMD and Valheim
- `oz-valheim start` - Start the server
- `oz-valheim stop` - Stop the server

Create `src/cli/commands/` if helpful for organization.

#### 2.4 Update mod.ts Exports

Ensure all new modules export from:

- `src/steamcmd/mod.ts`
- `src/server/mod.ts`
- `src/mod.ts` (top-level)

### Verification

Run these commands and fix any issues before completing:

```bash
# 1. Type check
deno check main.ts src/**/*.ts

# 2. Lint
deno lint

# 3. Format
deno fmt

# 4. Test SteamCMD check (should report not installed)
deno task start install --dry-run

# 5. Verify help shows new commands
deno task start --help
```

### Completion Criteria

- [ ] `deno check main.ts src/**/*.ts` exits with code 0
- [ ] `deno lint` reports no errors
- [ ] `deno task start --help` shows install/start/stop commands
- [ ] `deno task start install --dry-run` shows what would be installed
- [ ] All new functions have JSDoc comments
- [ ] Exports are properly barrel-exported from mod.ts files

---

## Phase 3: TUI Development ⬜ NOT STARTED

**Status**: Blocked by Phase 2\
**Dependencies**: Phase 1 ✅, Phase 2 ⬜

### Overview

Build the terminal user interface using Ink (React for terminals) with Zustand
state management. The TUI has a three-zone layout: Header, Main Content, and Log
Feed.

### Tasks

#### 3.1 Zustand Store (`src/tui/store.ts`)

See `.agent-docs/01-tui-architecture.md` for the full store implementation:

- Server state (status, pid, players, uptime)
- Logs state (entries, filter, maxEntries)
- UI state (activeScreen, modal)
- Config state (serverName, port, world, etc.)
- Actions for all state mutations

#### 3.2 Theme (`src/tui/theme.ts`)

Define color palette:

- Primary: cyan
- Success: green (online)
- Warning: yellow (starting/stopping)
- Error: red (offline/crashed)
- Muted: gray (borders, inactive)

#### 3.3 Root App Component (`src/tui/App.tsx`)

Three-zone layout:

- Zone 1: Header (fixed height) - Animated logo, status
- Zone 2: Main Content (flex) - Menu + Content area
- Zone 3: Log Feed (fixed height) - Scrollable logs

Keyboard handling:

- 1-4: Switch screens
- Q/Ctrl+C: Quit

#### 3.4 Components (`src/tui/components/`)

```
components/
├── Header.tsx       # Animated ASCII logo + status
├── Menu.tsx         # Navigation menu
├── MenuItem.tsx     # Single menu item
├── LogFeed.tsx      # Log display
├── LogEntry.tsx     # Single log entry
├── StatusBar.tsx    # Server status indicator
└── Modal.tsx        # Overlay dialog
```

#### 3.5 Screens (`src/tui/screens/`)

```
screens/
├── Dashboard.tsx    # Server status, quick actions
├── Settings.tsx     # Server configuration
├── Worlds.tsx       # World management
└── Console.tsx      # Log viewer, commands
```

#### 3.6 Hooks (`src/tui/hooks/`)

```
hooks/
├── useServer.ts     # Server start/stop/status
├── useLogs.ts       # Log streaming
└── useConfig.ts     # Configuration CRUD
```

#### 3.7 ASCII Motion Header

Create animated header using ASCII Motion MCP tools:

1. Use `mcp_ascii_motion__new_project` to create animation
2. Draw frames with logo text
3. Export to `assets/ascii/header.json`

#### 3.8 Update main.ts

- Add TUI launch with `ink.render(<App />)`
- Default to TUI mode when no arguments
- Handle `--tui` flag

### Verification

```bash
# 1. Type check (including .tsx files)
deno check main.ts src/**/*.ts src/**/*.tsx

# 2. Lint
deno lint

# 3. Launch TUI
deno task start --tui
# Should render three zones, respond to keyboard

# 4. Verify screens
# Press 1-4 to switch screens
# Press Q to quit
```

### Completion Criteria

- [ ] `deno check main.ts src/**/*.ts src/**/*.tsx` exits with code 0
- [ ] `deno lint` reports no errors
- [ ] `deno task start` launches TUI by default
- [ ] TUI renders all three zones correctly
- [ ] Keyboard navigation works (1-4, Q)
- [ ] Screens render appropriate content
- [ ] Animated header displays

---

## Phase 4: CLI & Polish ⬜ NOT STARTED

**Status**: Blocked by Phase 3\
**Dependencies**: Phase 1 ✅, Phase 2 ⬜, Phase 3 ⬜

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
