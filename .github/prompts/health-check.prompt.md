# Repository Health Check Agent

You are tasked with performing a comprehensive health check and improvement pass
on this Deno-based repository. Your goal is to ensure the codebase follows best
practices, dependencies are current, configurations are correct, and critical
code areas are robust.

## Pre-Check: Understand the Project

Before making any changes:

1. Read `AGENTS.md` and `README.md` to understand the project structure and
   conventions
2. Review `.agent-docs/` for detailed implementation specifications
3. Understand this is a Deno 2.x project using Ink (React for terminals),
   Zustand, and Zod

## Health Check Phases

Execute each phase in order, fixing issues as you find them.

---

### Phase 1: Dependency Audit

**Objective:** Ensure all dependencies are up to date and correctly specified.

#### Tasks:

1. **Check deno.json imports** for outdated packages:
   - JSR packages (`jsr:@std/*`) - verify latest versions
   - npm packages (`npm:*`) - check for major/minor updates
   - Run: `deno outdated` (if available) or manually check package registries

2. **Verify import map correctness:**
   - All imports resolve correctly
   - No duplicate or conflicting entries
   - React 19 compatibility with Ink 6

3. **Check for security advisories:**
   - Review npm packages for known vulnerabilities
   - Consider running: `deno info --json main.ts` to inspect dependency tree

4. **Update strategy:**
   - Update patch versions immediately
   - Test minor version updates before committing
   - Major version updates require careful review and testing

---

### Phase 2: Configuration Validation

**Objective:** Ensure all configuration files are correct and follow best
practices.

#### deno.json Checks:

- [ ] `tasks` are correctly defined and functional
- [ ] `imports` use specific version pinning (avoid `@latest`)
- [ ] `compilerOptions` are correct for React JSX
- [ ] `unstable` features are documented and necessary
- [ ] Consider adding `lint` and `fmt` configuration if missing

#### .gitignore Checks:

- [ ] All build outputs are ignored (`/dist/`, `/build/`)
- [ ] Deno-specific ignores (`.deno/`, `node_modules/`)
- [ ] Sensitive files excluded (`.env*`, credentials)
- [ ] IDE files ignored (`.idea/`, `.vscode/settings.json`)
- [ ] OS-specific files ignored (`.DS_Store`, `Thumbs.db`)
- [ ] Project-specific ignores (SteamCMD, server files, world saves)
- [ ] No important files accidentally ignored

#### Other Config Files:

- [ ] Check for `.vscode/` settings if present (launch configs, recommended
      extensions)
- [ ] Verify any CI/CD configuration in `.github/workflows/`
- [ ] Check for missing configs (`.editorconfig`, `renovate.json`, etc.)

---

### Phase 3: Code Quality & Linting

**Objective:** Ensure code follows Deno and project conventions.

#### Run Quality Tools:

```bash
# Type checking
deno check main.ts src/**/*.ts src/**/*.tsx

# Linting
deno lint

# Formatting
deno fmt --check

# If formatting issues found:
deno fmt
```

#### Fix Common Issues:

- Unused imports or variables
- Incorrect TypeScript types
- Missing JSDoc on public APIs
- Inconsistent formatting
- Prefer `type` over `interface` per project conventions

---

### Phase 4: Test Suite Validation

**Objective:** Ensure all tests pass and coverage is adequate.

#### Run Tests:

```bash
deno test --allow-all --unstable-kv
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

#### Fix Failing Tests:

- Investigate root cause
- Update tests if expectations are outdated
- Fix implementation bugs if tests are correct

---

### Phase 5: Build & Runtime Verification

**Objective:** Ensure the application builds and runs correctly.

#### Verification Commands:

```bash
# Verify app starts
deno task start --version
deno task start --help

# Type check passes
deno task check

# Development mode works
# (start and immediately stop)
deno task dev &
sleep 2
# Kill the process
```

#### Check for:

- [ ] No runtime errors on startup
- [ ] CLI commands work as expected
- [ ] TUI renders without errors (if applicable)
- [ ] No deprecation warnings

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
   - Windows/Linux/macOS path handling
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
- [ ] AGENTS.md conventions match actual code
- [ ] `.agent-docs/` files are up to date
- [ ] JSDoc comments on public APIs
- [ ] CLI help text is accurate

---

## Output Requirements

After completing the health check, provide a summary report:

### Summary Report Template

```markdown
## Health Check Report

**Date:** [Current Date] **Overall Health:** [Good/Fair/Needs Attention]

### Dependencies

- Updated: [list of updated packages]
- Current: [packages already at latest]
- Held: [packages intentionally not updated, with reason]

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

### Build Status

- Type Check: [pass/fail]
- Runtime: [pass/fail]
- CLI Commands: [pass/fail]

### Critical Improvements Made

1. [Description of improvement]
2. [Description of improvement]

### Remaining Issues

1. [Issue requiring manual attention]
2. [Issue requiring manual attention]

### Recommendations

1. [Future improvement suggestion]
2. [Future improvement suggestion]
```

---

## Important Guidelines

1. **Make incremental changes** - Don't refactor everything at once
2. **Test after each change** - Run `deno check` and `deno test` frequently
3. **Preserve functionality** - Health improvements should not break existing
   features
4. **Document changes** - Update relevant documentation when making significant
   changes
5. **Commit logically** - Group related changes together
6. **Ask before major changes** - If a fix requires significant refactoring,
   discuss first

## Verification Checklist

Before completing the health check:

- [ ] `deno check main.ts src/**/*.ts src/**/*.tsx` passes
- [ ] `deno lint` reports no errors
- [ ] `deno fmt --check` passes
- [ ] `deno test --allow-all --unstable-kv` all tests pass
- [ ] `deno task start --version` runs successfully
- [ ] No regressions in existing functionality
