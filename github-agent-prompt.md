# Fix TypeScript/CommonJS Interop Bug with tar Package Import

## Problem Description

The `@caleb-collar/steamcmd` npm package crashes when running on Linux/macOS with the following error:

```
TypeError: Cannot read properties of undefined (reading 'x')
    at ClientRequest.<anonymous> (/node_modules/@caleb-collar/steamcmd/dist/download.js:148:37)
```

This occurs during SteamCMD installation when extracting tar.gz archives on Linux/macOS platforms.

## Root Cause

The compiled JavaScript in `dist/download.js` incorrectly accesses the `tar` package API:

**Current (broken) code:**
```javascript
const tar_1 = __importDefault(require("tar"));
// Later in the code:
.pipe(tar_1.default.x({ cwd: destDir }))
```

**Issue:** The `tar` package (v7.x) does not export a `default` property. It exports its API directly:
```javascript
// What tar actually exports:
module.exports = { x: Function, c: Function, t: Function, ... }
// NOT: module.exports.default = { ... }
```

So `tar_1.default` evaluates to `undefined`, causing the crash.

## Solution

Fix the TypeScript import in `src/download.ts` to prevent `__importDefault` from being used.

### Option 1: Use Namespace Import (Recommended)

**Change line in `src/download.ts`:**
```typescript
// FROM:
import tar from 'tar';

// TO:
import * as tar from 'tar';
```

This will compile to:
```javascript
const tar = require("tar");
// And use:
.pipe(tar.x({ cwd: destDir }))
```

### Option 2: Use Named Imports

```typescript
// FROM:
import tar from 'tar';

// TO:
import { x as extract } from 'tar';

// Then update usage:
.pipe(extract({ cwd: destDir }))
```

### Option 3: Adjust tsconfig.json

If you want to keep the default import style, modify `tsconfig.json`:

```json
{
  "compilerOptions": {
    "esModuleInterop": false,
    "allowSyntheticDefaultImports": false
  }
}
```

However, this may affect other imports, so **Option 1 is recommended**.

## Files to Modify

1. **`src/download.ts`** (primary fix)
   - Line that imports tar package
   - Ensure it uses `import * as tar from 'tar'`

2. **Additional locations to check:**
   - Search the codebase for any other `import tar from 'tar'` statements
   - Verify `unzipper` and other packages don't have the same issue

## Testing Requirements

After making changes:

1. **Build the package:**
   ```bash
   npm run build
   ```

2. **Verify the compiled output:**
   ```bash
   grep -n "tar.*require" dist/download.js
   # Should see: const tar = require("tar");
   # Should NOT see: __importDefault(require("tar"))
   ```

3. **Test on Linux/macOS:**
   ```bash
   # In a test project:
   npm install @caleb-collar/steamcmd
   node -e "require('@caleb-collar/steamcmd').ensureInstalled()"
   ```

4. **Verify tar extraction works:**
   - The installation should download and extract SteamCMD successfully
   - No "Cannot read properties of undefined" errors

## Expected Outcome

After the fix:
- ✅ SteamCMD installation works on Linux/macOS
- ✅ tar.gz extraction completes successfully  
- ✅ No TypeScript compilation errors
- ✅ No runtime errors related to tar package API

## Additional Context

- **Package version:** `@caleb-collar/steamcmd@1.1.0`
- **tar package version:** `^7.4.3`
- **Affected platforms:** Linux, macOS (Windows uses zip extraction, unaffected)
- **Related code:** The issue is in the `download()` function when `platformValue === 'darwin' || platformValue === 'linux'`

## Version Bump Recommendation

Since this is a bug fix that resolves a critical crash:
- Bump to `1.1.1` (patch version)
- Update CHANGELOG.md with bug fix details
- Consider adding a test case for tar extraction
