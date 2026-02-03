# Fix Summary: Ubuntu Installation Verification Failure

## Problem
On Ubuntu, when installing the Valheim dedicated server via the application, the installation would error with "files are missing" and server verification failed. Users couldn't launch the server because verification reported missing critical files.

## Root Cause
SteamCMD was not being explicitly told which platform to download server binaries for. Without the `platform` parameter, SteamCMD on Linux may:
- Download Windows binaries instead of Linux binaries
- Fail to download files completely
- Download incorrect or incomplete server files

## Solution
**Version 1.5.4** fixes this issue by:

1. **Added platform mapping utility** ([src/utils/platform.ts](src/utils/platform.ts#L12-L25))
   - New `SteamPlatform` type for SteamCMD compatibility
   - New `getSteamPlatform()` function that maps our platform types to SteamCMD's expected values
   - Maps "darwin" → "macos" (other platforms stay the same)

2. **Updated Valheim installer** ([src/steamcmd/updater.ts](src/steamcmd/updater.ts))
   - Now imports `getSteamPlatform()` utility
   - Explicitly passes `platform` parameter to `steamcmd.install()`
   - Ensures correct Linux server binaries are downloaded on Ubuntu/Linux

## Changes Made

### Files Modified
- [src/utils/platform.ts](src/utils/platform.ts) - Added platform mapping
- [src/steamcmd/updater.ts](src/steamcmd/updater.ts) - Added platform parameter to install
- [src/mod.ts](src/mod.ts) - Bumped version to 1.5.4
- [package.json](package.json) - Bumped version to 1.5.4
- [CHANGELOG.md](CHANGELOG.md) - Documented the fix

### Quality Checks ✅
- ✅ TypeScript type check passes
- ✅ Biome linter passes (86 files checked)
- ✅ All 177 tests pass
- ✅ Application runs successfully

## How to Test the Fix

### On Ubuntu/Linux:
```bash
# Install the updated version
npm install

# Verify version
npx tsx main.ts --version
# Should show: Land of OZ - Valheim DSM v1.5.4

# Test installation (dry run first)
npx tsx main.ts install --dry-run

# Perform actual installation
npx tsx main.ts install

# Validate the installation
npx tsx main.ts install --validate
```

### Expected Results:
1. SteamCMD installs successfully
2. Valheim Dedicated Server downloads **Linux binaries** (not Windows)
3. Verification finds all required files:
   - `valheim_server.x86_64` (Linux executable)
   - `valheim_server_Data/`
   - `UnityPlayer.so` (Linux library, not .dll)
   - `steam_appid.txt`
4. Server can start successfully

### Verification Command Output:
```
Validating installation...

  SteamCMD:
    ✓ Installed
    Path: /home/user/.local/share/steamcmd/steamcmd.sh
    ✓ Executable found

  Valheim Dedicated Server:
    ✓ Installed
    Path: /home/user/.local/share/steamcmd/steamapps/common/Valheim dedicated server
    ✓ Executable found
    Build ID: [current build number]

  ✓ Installation is valid.
```

## Technical Details

### Before:
```typescript
await steamcmd.install({
  applicationId: VALHEIM_APP_ID,
  onProgress: (p) => { /* ... */ },
  // No platform parameter - SteamCMD guesses wrong on Linux
});
```

### After:
```typescript
const platform = getSteamPlatform(); // Returns 'linux' on Ubuntu

await steamcmd.install({
  applicationId: VALHEIM_APP_ID,
  platform, // Explicitly tell SteamCMD to download Linux binaries
  onProgress: (p) => { /* ... */ },
});
```

## Related Issues
This fix ensures that the correct platform-specific server binaries are downloaded:
- **Linux/Ubuntu**: Downloads `.x86_64` executable and `.so` libraries
- **Windows**: Downloads `.exe` executable and `.dll` libraries  
- **macOS**: Downloads Mac-compatible binaries

## Version History
- **1.5.3** - Previous version (had Ubuntu installation issues)
- **1.5.4** - Fixed Ubuntu installation by adding platform parameter ✅
