# Repository Health Check Agent

You are tasked with performing a comprehensive health check and improvement pass
on the **oz-dsm-valheim** repository. Your goal is to ensure the codebase follows
best practices, dependencies are current, configurations are correct, and critical
code areas are robust.

## Pre-Check: Understand the Project

Before making any changes:

1. Read `AGENTS.md` and `README.md` to understand the project structure and
   conventions
2. Review `.agent-docs/` for detailed implementation specifications
3. Understand this is a **Node.js 22.x** project using:
   - **Ink 5.x** (React 18 for terminals) for the TUI
   - **Zustand 5.x** for state management
   - **Zod 3.x** for runtime validation
   - **Biome** for linting and formatting
   - **Vitest** for testing
   - **tsx** for TypeScript execution

## Health Check Phases

Execute each phase in order, fixing issues as you find them.

---

### Phase 1: Dependency Audit

**Objective:** Ensure all dependencies are up to date and correctly specified.

#### Tasks:

1. **Check package.json dependencies** for outdated packages:
   - Run: `npm outdated` to see available updates
   - Review both `dependencies` and `devDependencies`

2. **Verify dependency compatibility:**
   - React 18 compatibility with Ink 5
   - All peer dependencies satisfied
   - No conflicting version requirements

3. **Check for security advisories:**
   - Run: `npm audit` to check for vulnerabilities
   - Run: `npm audit fix` for automatic fixes (patch updates only)
   - Review any high/critical vulnerabilities

4. **Update strategy:**
   - Update patch versions immediately
   - Test minor version updates before committing
   - Major version updates require careful review and testing
   - Use Renovate (renovate.json) for automated dependency updates

---

### Phase 2: Configuration Validation

**Objective:** Ensure all configuration files are correct and follow best
practices.

#### package.json Checks:

- [ ] `scripts` are correctly defined and functional
- [ ] Dependencies use specific version pinning (avoid `*` or `latest`)
- [ ] `engines` field specifies Node.js >=22.0.0
- [ ] `type: "module"` is set for ES modules

#### tsconfig.json Checks:

- [ ] `jsx: "react-jsx"` for React 18 JSX transform
- [ ] `module: "NodeNext"` and `moduleResolution: "NodeNext"`
- [ ] `strict: true` for type safety
- [ ] Path aliases work correctly

#### biome.json Checks:

- [ ] Linter rules are appropriate
- [ ] Formatter settings match project conventions
- [ ] Ignored files are correct

#### .gitignore Checks:

- [ ] All build outputs are ignored (`/dist/`, `/build/`)
- [ ] Node.js ignores (`node_modules/`, `*.log`)
- [ ] Sensitive files excluded (`.env*`, credentials)
- [ ] IDE files ignored (`.idea/`, `.vscode/settings.json`)
- [ ] OS-specific files ignored (`.DS_Store`, `Thumbs.db`)
- [ ] Project-specific ignores (SteamCMD, server files, world saves)
- [ ] No important files accidentally ignored

#### Other Config Files:

- [ ] `.vscode/extensions.json` - recommended extensions
- [ ] `.vscode/settings.json` - Biome integration
- [ ] `.github/workflows/` - CI/CD workflows pass
- [ ] `renovate.json` - dependency update automation
- [ ] `vitest.config.ts` - test configuration

---

### Phase 3: Code Quality & Linting

**Objective:** Ensure code follows Node.js and project conventions.

#### Run Quality Tools:

```bash
# Type checking
npm run typecheck

# Linting and formatting check
npm run lint

# Auto-fix linting and formatting issues
npm run lint:fix

# Format only
npm run format
```

#### Fix Common Issues:

- Unused imports or variables
- Incorrect TypeScript types
- Missing JSDoc on public APIs
- Inconsistent formatting
- Prefer `type` over `interface` per project conventions
- Use `node:` prefix for Node.js built-in imports

---

### Phase 4: Test Suite Validation

**Objective:** Ensure all tests pass and coverage is adequate.

#### Run Tests:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

#### Analyze Results:

- [ ] All tests pass
- [ ] No skipped tests without explanation
- [ ] Test files follow naming convention (`*.test.ts`)
- [ ] Critical functionality has test coverage:
  - Configuration schema validation
  - Platform detection utilities
  - CLI argument parsing
  - SteamCMD path resolution
  - RCON protocol encoding/decoding

#### Fix Failing Tests:

- Investigate root cause
- Update tests if expectations are outdated
- Fix implementation bugs if tests are correct

---

### Phase 5: Build & Runtime Verification

**Objective:** Ensure the application builds and runs correctly.

#### Verification Commands:

```bash
# Verify CLI version displays
npx tsx main.ts --version

# Verify CLI help displays
npx tsx main.ts --help

# Type check passes
npm run typecheck

# Build for production
npm run build

# Run diagnostics
npx tsx main.ts doctor
```

#### Check for:

- [ ] No runtime errors on startup
- [ ] CLI commands work as expected (`start`, `stop`, `config`, `worlds`, `rcon`, `doctor`)
- [ ] TUI renders without errors
- [ ] No deprecation warnings
- [ ] Version bumped appropriately (see AGENTS.md Version Management)

---

### Phase 6: Critical Code Review

**Objective:** Identify and improve critical areas of the codebase.

#### High-Priority Areas:

1. **Error Handling**
   - Check for uncaught promise rejections
   - Verify try/catch blocks in async functions
   - Ensure user-friendly error messages

2. **Security**
   - No hardcoded credentials or secrets
   - Proper input validation with Zod
   - Safe path handling (no path traversal vulnerabilities)
   - RCON password handling is secure

3. **Process Management**
   - Graceful shutdown handling (SIGINT/SIGTERM)
   - Child process cleanup
   - Watchdog reliability

4. **Cross-Platform Compatibility**
   - Windows/Linux/macOS path handling (use `node:path`)
   - Platform-specific code uses proper detection
   - No hardcoded paths

5. **Type Safety**
   - No `any` types without justification
   - Proper null/undefined handling
   - Zod schemas match TypeScript types

---

### Phase 7: Documentation Review

**Objective:** Ensure documentation is current and complete.

#### Check:

- [ ] README.md accurately describes the project
- [ ] README.md has Quick Start and Troubleshooting sections
- [ ] AGENTS.md conventions match actual code
- [ ] AGENTS.md Version Management section is followed
- [ ] `.agent-docs/` files are up to date
- [ ] JSDoc comments on public APIs
- [ ] CLI help text is accurate
- [ ] CONTRIBUTING.md has dev setup instructions

---

## Output Requirements

After completing the health check, provide a summary report:

### Summary Report Template

```markdown
## Health Check Report

**Date:** [Current Date]
**Package:** oz-dsm-valheim
**Version:** [version from package.json]
**Overall Health:** [Good/Fair/Needs Attention]

### Dependencies

- Updated: [list of updated packages]
- Current: [packages already at latest]
- Held: [packages intentionally not updated, with reason]
- Security: [npm audit results]

### Configuration

- Issues Found: [count]
- Issues Fixed: [count]
- Changes Made: [list]

### Code Quality

- Lint Errors: [count before → after]
- Type Errors: [count before → after]
- Formatting Issues: [fixed yes/no]

### Tests

- Total: [count]
- Passed: [count]
- Failed: [count]
- Skipped: [count]
- Coverage: [percentage if available]

### Build Status

- Type Check: [pass/fail]
- Build: [pass/fail]
- Runtime: [pass/fail]
- CLI Commands: [pass/fail]
- Doctor: [pass/fail]

### Critical Improvements Made

1. [Description of improvement]
2. [Description of improvement]

### Remaining Issues

1. [Issue requiring manual attention]
2. [Issue requiring manual attention]

### Recommendations

1. [Future improvement suggestion]
2. [Future improvement suggestion]

### Version Bump

- [ ] Version bumped in package.json (if changes were made)
- Type of bump: [major/minor/patch]
- Previous: [old version]
- New: [new version]
```

---

## Important Guidelines

1. **Make incremental changes** - Don't refactor everything at once
2. **Test after each change** - Run `npm run typecheck` and `npm test` frequently
3. **Preserve functionality** - Health improvements should not break existing
   features
4. **Document changes** - Update relevant documentation when making significant
   changes
5. **Commit logically** - Group related changes together
6. **Ask before major changes** - If a fix requires significant refactoring,
   discuss first
7. **Bump version** - Follow AGENTS.md Version Management for semantic versioning

## Verification Checklist

Before completing the health check:

- [ ] `npm run typecheck` passes with no errors
- [ ] `npm run lint` reports no errors
- [ ] `npm test` - all tests pass
- [ ] `npx tsx main.ts --version` runs successfully
- [ ] `npx tsx main.ts doctor` reports no critical issues
- [ ] No regressions in existing functionality
- [ ] Version bumped in package.json if changes were made
