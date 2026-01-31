# Contributing to Land of OZ - Valheim DSM

Thank you for your interest in contributing! This guide will help you get
started.

## Development Setup

### Prerequisites

- **Node.js 22+**: [Download](https://nodejs.org/)
- **Git**: [Download](https://git-scm.com/)
- **VS Code** (recommended):
  [Download](https://code.visualstudio.com/)

### Getting Started

1. **Fork and clone the repository**

   ```bash
   git clone https://github.com/YOUR_USERNAME/valheim-dsm.git
   cd valheim-dsm
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

   This will also install git hooks automatically via the `prepare` script.

3. **Verify setup**

   ```bash
   npm run typecheck   # TypeScript type checking
   npm run lint        # Linting with Biome
   npm test            # Run tests
   ```

4. **Start development**

   ```bash
   npm run dev         # Watch mode with hot reload
   ```

### VS Code Setup

If you use VS Code, install the recommended extensions when prompted, or run:

```
Ctrl+Shift+P → "Extensions: Show Recommended Extensions"
```

The workspace is pre-configured for:

- Biome formatting on save
- TypeScript integration
- Spell checking

## Project Structure

```
oz-valheim/
├── main.ts              # Application entry point
├── src/
│   ├── cli/             # Command-line interface
│   ├── config/          # Configuration management
│   ├── rcon/            # RCON protocol client
│   ├── server/          # Server process management
│   ├── steamcmd/        # SteamCMD integration
│   ├── tui/             # Terminal UI (Ink/React)
│   ├── utils/           # Shared utilities
│   └── valheim/         # Valheim-specific features
├── assets/              # Static assets (ASCII art, etc.)
├── scripts/             # Build/dev scripts
└── .github/             # GitHub Actions workflows
```

## Development Workflow

### Making Changes

1. **Create a feature branch**

   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make your changes**

   - Follow the TypeScript conventions in `AGENTS.md`
   - Write tests for new functionality
   - Update documentation if needed

3. **Run checks before committing**

   ```bash
   npm run lint        # Check formatting and linting
   npm run typecheck   # Type check
   npm test            # Run tests
   ```

   The pre-commit hook will run these automatically.

4. **Commit with a descriptive message**

   ```bash
   git commit -m "feat: add world backup scheduling"
   ```

   Use conventional commit format when possible:
   - `feat:` - New feature
   - `fix:` - Bug fix
   - `docs:` - Documentation changes
   - `refactor:` - Code refactoring
   - `test:` - Adding or updating tests
   - `chore:` - Maintenance tasks

5. **Push and create a Pull Request**

   ```bash
   git push origin feature/my-feature
   ```

### Running Tests

```bash
npm test              # Run all tests once
npm run test:watch    # Watch mode
npm run test:coverage # With coverage report
```

### Building

```bash
npm run build         # Build with tsup
```

## Coding Standards

### TypeScript Conventions

- Use `type` over `interface` for object shapes
- Prefer `const` assertions for literal types
- Use Zod for runtime validation
- Export from `mod.ts` barrel files

### React/Ink Components

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

### File Naming

- Components: `PascalCase.tsx`
- Modules: `kebab-case.ts` or `camelCase.ts`
- Tests: `*.test.ts` alongside source files

### Imports

```typescript
// Node.js built-ins
import path from "node:path";
import fs from "node:fs/promises";

// npm packages
import React from "react";
import { Box, Text } from "ink";
import { create } from "zustand";

// Local imports
import { useStore } from "./store.ts";
```

## Getting Help

- **Check existing documentation**: `README.md`, `AGENTS.md`, `.agent-docs/`
- **Open an issue**: For bugs or feature requests
- **Discussions**: For questions or ideas

## License

By contributing, you agree that your contributions will be licensed under the
MIT License.
