# Copilot Workspace Instructions

## Project Overview

This is **oz-dsm-valheim**, a Valheim dedicated server manager with a terminal
user interface (TUI). It helps users install, configure, and manage Valheim
dedicated servers.

## Technology Stack

| Component | Technology | Version |
|-----------|------------|---------|
| Runtime | Node.js | 22.x |
| Language | TypeScript | 5.x |
| TUI Framework | Ink | 6.x |
| UI Library | React | 19.x |
| State | Zustand | 5.x |
| Validation | Zod | 4.x |
| Linting | Biome | 2.x |
| Testing | Vitest | 3.x |
| Config Storage | conf | 13.x |

## Coding Standards

### TypeScript Conventions

- Use `type` over `interface` for object shapes
- Prefer `const` assertions for literal types
- Use Zod for runtime validation
- Export from `mod.ts` barrel files

### File Naming

- Components: `PascalCase.tsx`
- Modules: `kebab-case.ts` or `camelCase.ts`
- Types: Colocate with implementation or in `types.ts`
- Tests: `*.test.ts` alongside source files

### Imports

```typescript
// Node.js built-ins with node: prefix
import path from "node:path";
import fs from "node:fs/promises";

// Third-party packages
import React from "react";
import { Box, Text } from "ink";
import { z } from "zod";

// Internal modules
import { useStore } from "../store.js";
```

### React/Ink Patterns

```tsx
import type { FC } from "react";
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

## Testing Requirements

- All new features need tests
- Test files go alongside source: `module.test.ts`
- Use Vitest patterns: `describe`, `it`, `expect`

```typescript
import { describe, expect, it } from "vitest";

describe("MyModule", () => {
  it("should do something", () => {
    expect(result).toBe(expected);
  });
});
```

## Development Commands

```bash
# Run application
npm start               # Direct run
npm run dev             # Watch mode

# Quality checks
npm run typecheck       # TypeScript
npm run lint            # Biome linting
npm test                # Vitest tests

# Building
npm run build           # tsup bundle
```

## Project Structure

```
oz-dsm-valheim/
├── main.ts                 # Entry point
├── src/
│   ├── mod.ts              # Public API exports
│   ├── cli/                # CLI argument parsing & commands
│   ├── config/             # Configuration schema & storage
│   ├── rcon/               # RCON protocol client
│   ├── server/             # Server process management
│   ├── steamcmd/           # SteamCMD installation
│   ├── tui/                # Terminal UI components
│   │   ├── components/     # Reusable UI components
│   │   ├── screens/        # Full-screen views
│   │   └── hooks/          # React hooks
│   ├── utils/              # Platform utilities, logging
│   └── valheim/            # Valheim-specific logic
└── assets/
    └── ascii/              # ASCII art assets
```

## Documentation

- `README.md` - User documentation
- `AGENTS.md` - AI agent workflow guide
- `BLUEPRINT.md` - Implementation phases
- `.agent-docs/` - Detailed specifications

## Important Notes

1. Use `useApp().exit()` in TUI, not `process.exit()`
2. Always use `node:path` for file paths
3. Test on Windows, Linux, and macOS
4. Bump version in `package.json` for all changes
5. Run `npm run typecheck` before committing
6. **TUI layout**: Every `.tsx` change must follow the TUI Layout Standards in
   `AGENTS.md` — use `flexShrink={0}` on fixed rows, `overflow="hidden"` on
   scrollable areas, and truncate all dynamic strings. Verify at 80×24 **and**
   120×40. See `.agent-docs/01-tui-architecture.md` § *Responsive Layout &
   Overlap Prevention* for full rules and the layout review checklist.
