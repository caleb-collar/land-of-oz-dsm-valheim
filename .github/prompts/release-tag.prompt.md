# Generate Release Tag for oz-dsm-valheim

Generate the git commands to create and push a release tag for **oz-dsm-valheim**.

## Instructions

1. Read the current version from `package.json`
2. Generate the appropriate git tag command using the version
3. Include commands for both creating and pushing the tag

## Expected Output

Provide the following:

1. **Current Version**: Display the version from package.json
2. **Tag Name**: The tag name in format `v{VERSION}` (e.g., `v1.2.3`)
3. **Commands**: The git commands to create and push the tag

### Tag Creation Commands

```bash
# Create annotated tag with release message
git tag -a v{VERSION} -m "Release oz-dsm-valheim v{VERSION}"

# Push the tag to origin (triggers release workflow)
git push origin v{VERSION}
```

## Pre-release Checklist

Before creating the tag, verify:

- [ ] All tests pass: `npm test`
- [ ] TypeScript compiles: `npm run typecheck`
- [ ] Linting passes: `npm run lint`
- [ ] Version in package.json is correct
- [ ] All changes are committed
- [ ] Working on the correct branch (main/master)

## Release Workflow

Pushing a tag matching `v*` will trigger the GitHub Actions release workflow which:

1. Builds the application with `npm run build`
2. Creates platform-specific binaries (Windows, Linux, macOS)
3. Generates SHA256 checksums for all artifacts
4. Creates a GitHub Release with auto-generated changelog
5. Attaches all binaries and checksums to the release

## Example

If package.json contains `"version": "1.2.3"`:

```bash
# Verify we're ready for release
npm test && npm run typecheck && npm run lint

# Create the tag
git tag -a v1.2.3 -m "Release oz-dsm-valheim v1.2.3"

# Push to trigger release
git push origin v1.2.3
```
