```prompt
# Dependency Update Guide

You are updating dependencies for the **oz-dsm-valheim** project. Follow these
guidelines to safely update packages.

## Pre-Update Checks

Before updating any dependencies:

1. Run `npm outdated` to see available updates
2. Run `npm audit` to check for security issues
3. Note which dependencies need major vs minor/patch updates

## Update Categories

### Patch Updates (0.0.X)
- **Risk**: Very low
- **Action**: Update immediately
- **Testing**: Run `npm test` after update

### Minor Updates (0.X.0)
- **Risk**: Low
- **Action**: Update with testing
- **Testing**: Run full test suite and typecheck

### Major Updates (X.0.0)
- **Risk**: High - Breaking changes possible
- **Action**: Review changelog and migration guides
- **Testing**: Comprehensive testing on all platforms

## Project-Specific Dependencies

| Package | Upgrade Notes |
|---------|---------------|
| React | Major updates affect all TUI components, upgrade with Ink |
| Ink | Must match React version, test TUI thoroughly |
| Zod | Check for schema API changes in major updates |
| Zustand | Generally safe updates, API stable |
| conf | Check storage format changes in major updates |
| fullscreen-ink | Check compatibility with Ink version |
| Biome | Run `biome migrate` for major updates |
| vitest | Check test API changes |

## Update Process

1. **Create feature branch** (optional for minor/patch):
   ```bash
   git checkout -b deps/update-$(date +%Y%m%d)
   ```

2. **Update packages**:
   ```bash
   # Specific package
   npm update <package-name>
   
   # All packages (respects semver ranges)
   npm update
   
   # Force major update
   npm install <package>@latest
   ```

3. **Verify after update**:
   ```bash
   npm run typecheck   # TypeScript
   npm run lint        # Biome linting
   npm test            # All tests
   npx tsx main.ts --version  # Runtime check
   ```

4. **Test TUI** (for UI-related deps):
   ```bash
   npx tsx main.ts tui
   # Test all screens, keyboard navigation
   ```

5. **Commit changes**:
   ```bash
   git add package.json package-lock.json
   git commit -m "deps: update dependencies to latest"
   ```

## Handling Breaking Changes

When a major update breaks something:

1. Check the package's CHANGELOG or migration guide
2. Search for specific error messages
3. Common issues:
   - React 19: Ref handling changed
   - Ink 6: Requires React 19
   - Zod 4: `.default({})` requires factory functions
   - Biome 2: Config format changed, run `biome migrate`

## Security Updates

For security vulnerabilities:

1. Run `npm audit` to see issues
2. Run `npm audit fix` for automatic patch updates
3. For major updates with vulnerabilities, evaluate risk vs effort
4. Document any intentionally deferred updates

## Verification Checklist

After updating:

- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] `npm test` all tests pass
- [ ] `npx tsx main.ts --version` runs
- [ ] `npx tsx main.ts tui` renders correctly
- [ ] No new deprecation warnings
- [ ] package-lock.json updated and committed
```
