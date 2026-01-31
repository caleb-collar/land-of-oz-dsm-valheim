# 00 - Project Overview

## Land of OZ - Valheim DSM

A container-free, virtualization-free dedicated server manager for Valheim,
built with Node.js and featuring a beautiful animated TUI.

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

### Why Node.js?

- TypeScript-first with tsx for development
- Mature ecosystem with full npm support
- Excellent terminal resize event handling
- Cross-platform process management
- Single bundle compilation with tsup

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

# Install dependencies
npm install

# Run in dev mode (with hot reload)
npm run dev

# Run tests
npm test

# Lint/format
npm run lint
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
- [ ] Check current project compiles: `npm run typecheck`
- [ ] Understand existing patterns in codebase

### Implementation Checklist

While implementing:

- [ ] Follow established patterns (see existing files for reference)
- [ ] Export all public APIs from `mod.ts` barrel files
- [ ] Add JSDoc comments to functions and types
- [ ] Handle errors appropriately (don't swallow exceptions)
- [ ] Use cross-platform path handling (`node:path`)

### Post-Implementation Verification

**MUST complete before finishing:**

```bash
# Step 1: Type check (REQUIRED - must pass)
npm run typecheck

# Step 2: Lint (REQUIRED - must pass)
npm run lint

# Step 3: Test (REQUIRED if tests exist)
npm test

# Step 4: Runtime verification (REQUIRED)
npx tsx main.ts --version
npx tsx main.ts --config
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
| Phase 1 | `npx tsx main.ts --config`          | Shows configuration  |
| Phase 2 | `npx tsx main.ts install --dry-run` | Shows SteamCMD steps |
| Phase 3 | `npx tsx main.ts --tui`             | TUI renders          |
| Phase 4 | `npx tsx main.ts --help`            | Shows all commands   |

### Never Complete Without

1. ✅ `npm run typecheck` passes with exit code 0
2. ✅ `npm run lint` passes with no errors
3. ✅ `npx tsx main.ts --version` runs successfully
4. ✅ Summary of changes provided
5. ✅ Next steps documented for following agent
