```prompt
# Release Preparation Guide

You are preparing a release for the **oz-dsm-valheim** project. Follow these
steps to ensure a quality release.

## Pre-Release Checklist

### 1. Code Quality

Run all quality checks:

```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Tests
npm test

# Build
npm run build
```

All checks must pass before proceeding.

### 2. Version Bump

Determine version bump type based on changes:

| Change Type | Bump | Example |
|-------------|------|---------|
| Breaking changes | MAJOR | 0.3.0 → 1.0.0 |
| New features | MINOR | 0.3.0 → 0.4.0 |
| Bug fixes | PATCH | 0.3.0 → 0.3.1 |

Bump the version:

```bash
# Patch release
npm version patch --no-git-tag-version

# Minor release
npm version minor --no-git-tag-version

# Major release
npm version major --no-git-tag-version
```

Or manually edit `package.json`:
```json
{
  "version": "X.Y.Z"
}
```

### 3. Changelog

Update or create `CHANGELOG.md`:

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added
- New feature description

### Changed
- Change description

### Fixed
- Bug fix description

### Security
- Security fix description
```

### 4. Documentation Review

Ensure documentation is current:

- [ ] README.md accurate for current features
- [ ] AGENTS.md matches current conventions
- [ ] CLI --help text is accurate
- [ ] .agent-docs/ files up to date

### 5. Final Testing

Manual testing checklist:

```bash
# CLI commands work
npx tsx main.ts --version
npx tsx main.ts --help
npx tsx main.ts doctor

# TUI renders correctly
npx tsx main.ts tui
# - Test all screens (Dashboard, Settings, Worlds, Console)
# - Test keyboard navigation
# - Test resize handling
```

### 6. Create Release Commit

Stage and commit all changes:

```bash
git add .
git commit -m "chore: prepare release v$(node -p "require('./package.json').version")"
```

### 7. Create Git Tag

```bash
# Create annotated tag
VERSION=$(node -p "require('./package.json').version")
git tag -a "v$VERSION" -m "Release v$VERSION"

# Push to trigger release workflow
git push origin main
git push origin "v$VERSION"
```

## Release Workflow

The GitHub Actions release workflow (`.github/workflows/release.yml`) will:

1. Build binaries for all platforms:
   - Windows x64
   - Linux x64
   - macOS x64
   - macOS ARM64

2. Generate SHA256 checksums

3. Create GitHub Release with:
   - Auto-generated changelog
   - Platform binaries
   - Checksum file

## Post-Release

After release is created:

1. **Verify release assets** are uploaded correctly
2. **Test a downloaded binary** works
3. **Update any external docs** or announcements
4. **Close related issues/milestones**

## Pre-Release Versions

For preview releases:

```bash
# Alpha
npm version 1.0.0-alpha.1 --no-git-tag-version

# Beta
npm version 1.0.0-beta.1 --no-git-tag-version

# Release Candidate
npm version 1.0.0-rc.1 --no-git-tag-version
```

Pre-release tags will be marked as pre-release on GitHub automatically.

## Rollback

If a release has critical issues:

1. Delete the release from GitHub (keeps tag)
2. Fix the issues
3. Create new patch release
4. Update changelog to note the issue
```
