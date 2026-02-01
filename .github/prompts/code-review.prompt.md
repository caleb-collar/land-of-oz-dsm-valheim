```prompt
# Code Review Checklist

You are reviewing code for the **oz-dsm-valheim** project. Use this checklist
to ensure quality and consistency.

## Project Context

- **Stack**: Node.js 22.x, TypeScript, React 19 + Ink 6 (TUI)
- **State**: Zustand
- **Validation**: Zod
- **Linting**: Biome
- **Testing**: Vitest

## Review Checklist

### TypeScript & Types

- [ ] Uses `type` over `interface` for object shapes (project convention)
- [ ] No untyped `any` without justification
- [ ] Proper null/undefined handling
- [ ] Type exports are included where needed
- [ ] Zod schemas match TypeScript types

### Code Style

- [ ] Follows Biome formatting rules
- [ ] Uses `const` for variables that don't change
- [ ] Uses `node:` prefix for Node.js built-in imports
- [ ] Uses ES module syntax (`import`/`export`)
- [ ] File naming convention followed:
  - Components: `PascalCase.tsx`
  - Modules: `kebab-case.ts` or `camelCase.ts`
  - Types: Colocated or in `types.ts`
  - Tests: `*.test.ts`

### React/Ink (TUI Components)

- [ ] Components use `FC<Props>` typing
- [ ] Props use type definitions, not inline objects
- [ ] Uses `useApp().exit()` instead of `process.exit()`
- [ ] Keyboard handlers follow existing patterns
- [ ] Uses theme colors from `theme.ts`
- [ ] Proper component extraction (not too large)

### Error Handling

- [ ] Async functions have try/catch where appropriate
- [ ] User-facing errors are descriptive
- [ ] No swallowed exceptions without logging
- [ ] Graceful degradation when possible

### Testing

- [ ] New functionality has tests
- [ ] Tests are in `*.test.ts` files alongside source
- [ ] Uses vitest patterns (`describe`, `it`, `expect`)
- [ ] Edge cases considered
- [ ] No flaky or timing-dependent tests

### Security

- [ ] No hardcoded credentials or secrets
- [ ] User input validated with Zod
- [ ] Path operations use `node:path` (no concatenation)
- [ ] Sensitive data (passwords) not logged
- [ ] File operations don't allow path traversal

### Documentation

- [ ] Public functions have JSDoc comments
- [ ] Complex logic is commented
- [ ] README updated for user-facing changes
- [ ] AGENTS.md updated for new patterns

### Performance

- [ ] No unnecessary re-renders in React components
- [ ] Large data structures handled efficiently
- [ ] Async operations don't block UI
- [ ] Proper cleanup in `useEffect` hooks

### Cross-Platform

- [ ] Uses `node:path` for path operations
- [ ] Platform detection via `getPlatform()`
- [ ] No hardcoded paths (uses utility functions)
- [ ] Works on Windows, Linux, macOS

## Code Patterns

### Preferred Patterns

```typescript
// Type definition with type keyword
type Props = {
  name: string;
  active?: boolean;
};

// Functional component
export const Component: FC<Props> = ({ name, active = false }) => {
  return <Box><Text>{name}</Text></Box>;
};

// Zod schema with type export
export const ConfigSchema = z.object({
  port: z.number().min(1024).max(65535),
});
export type Config = z.infer<typeof ConfigSchema>;

// Node.js imports with prefix
import path from "node:path";
import { readFile } from "node:fs/promises";

// Error handling
try {
  await riskyOperation();
} catch (error) {
  const message = error instanceof Error ? error.message : "Unknown error";
  logger.error("Operation failed", { error: message });
  throw new AppError(`Failed: ${message}`);
}
```

### Anti-Patterns to Flag

```typescript
// ❌ interface instead of type
interface Props { ... }

// ❌ any without justification
function process(data: any) { ... }

// ❌ process.exit() in TUI context
process.exit(0);  // Use useApp().exit()

// ❌ Path concatenation
const file = dir + "/" + name;  // Use path.join()

// ❌ Unhandled promise rejection
asyncFunction();  // Needs await and error handling

// ❌ Hardcoded credentials
const password = "secret123";

// ❌ Missing null check
user.name.toUpperCase();  // user could be null
```

## Review Comments

When leaving review comments:

1. Be specific about the issue
2. Explain why it's a problem
3. Suggest a concrete fix
4. Cite the relevant project convention if applicable

Example:
> This function uses `interface Props`. Per project conventions (AGENTS.md),
> prefer `type Props = { ... }` for object shapes.
```
