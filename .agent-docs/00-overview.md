# 00 - Project Overview

## Land of OZ - Valheim DSM

A container-free, virtualization-free dedicated server manager for Valheim,
built with Deno and featuring a beautiful animated TUI.

## Vision

Provide the easiest possible Valheim server hosting experience for home users
and small communities. No Docker, no VMs, no complex configuration - just run
the executable and manage your server through an intuitive terminal interface.

## Core Value Propositions

1. **Zero Containerization**: Native process management, works directly on
   Windows/Mac/Linux
2. **Beautiful TUI**: Animated "cyber-viking" aesthetic with real-time updates
3. **Automatic Updates**: SteamCMD integration keeps Valheim current
4. **Crash Recovery**: Watchdog ensures the server stays online
5. **Full Configuration**: Every Valheim server setting exposed in organized
   menus

## Technology Choices

### Why Deno?

- TypeScript-first with built-in type checking
- Secure by default (explicit permissions)
- npm compatibility for Ink/React ecosystem
- Built-in KV storage for configuration
- Single executable compilation for distribution

### Why Ink?

- React paradigm for terminal UIs
- Flexbox layout via Yoga
- Component reusability
- Hooks for state management
- Active community and ecosystem

### Why Zustand?

- Minimal boilerplate
- React 18 compatible
- TypeScript-first
- No providers needed
- Works great with Ink

### Why ASCII Motion?

- Creates engaging animated headers
- MCP integration for AI-assisted art creation
- JSON export format for embedding
- Efficient frame-based animation

## Quick Start Development

```bash
# Clone and enter
cd land-of-oz-dsm-valheim

# Run in dev mode (with hot reload)
deno task dev

# Run tests
deno test

# Format/lint
deno fmt && deno lint
```

## Implementation Roadmap

```
Phase 1: Foundation (src/config, src/utils)
    ↓
Phase 2: Core (src/steamcmd, src/server)
    ↓
Phase 3: TUI (src/tui)
    ↓
Phase 4: CLI (src/cli, main.ts)
    ↓
Phase 5: Polish (testing, docs, compilation)
```

## Success Metrics

- [ ] Server starts and stays running
- [ ] TUI renders all three zones correctly
- [ ] Settings persist between restarts
- [ ] Watchdog recovers from crashes
- [ ] Works on Windows, Mac, and Linux
- [ ] Update checks and installs via SteamCMD

## Agent Quality Assurance

### Pre-Implementation Checklist

Before writing any code:

- [ ] Read AGENTS.md for coding standards
- [ ] Review relevant .agent-docs/ files for the feature
- [ ] Check current project compiles: `deno check main.ts src/**/*.ts`
- [ ] Understand existing patterns in codebase

### Implementation Checklist

While implementing:

- [ ] Follow established patterns (see existing files for reference)
- [ ] Export all public APIs from `mod.ts` barrel files
- [ ] Add JSDoc comments to functions and types
- [ ] Handle errors appropriately (don't swallow exceptions)
- [ ] Use cross-platform path handling (`@std/path`)

### Post-Implementation Verification

**MUST complete before finishing:**

```bash
# Step 1: Type check (REQUIRED - must pass)
deno check main.ts src/**/*.ts src/**/*.tsx

# Step 2: Lint (REQUIRED - must pass)
deno lint

# Step 3: Format (recommended)
deno fmt

# Step 4: Test (REQUIRED if tests exist)
deno test --allow-all --unstable-kv

# Step 5: Runtime verification (REQUIRED)
deno task start --version
deno task start --config
```

### Error Resolution Protocol

If any check fails:

1. **Read the error message carefully**
2. **Identify the root cause** (import issue, type mismatch, etc.)
3. **Fix the issue** in the appropriate file
4. **Re-run the failing check** to confirm the fix
5. **Run all checks again** to ensure no regressions

### Phase Completion Gates

Each phase has specific verification requirements:

| Phase   | Verification Command                | Expected Result      |
| ------- | ----------------------------------- | -------------------- |
| Phase 1 | `deno task start --config`          | Shows configuration  |
| Phase 2 | `deno task start install --dry-run` | Shows SteamCMD steps |
| Phase 3 | `deno task start --tui`             | TUI renders          |
| Phase 4 | `deno task start --help`            | Shows all commands   |

### Never Complete Without

1. ✅ `deno check` passes with exit code 0
2. ✅ `deno lint` passes with no errors
3. ✅ `deno task start --version` runs successfully
4. ✅ Summary of changes provided
5. ✅ Next steps documented for following agent
