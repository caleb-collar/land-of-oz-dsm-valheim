/**
 * Install git hooks for the project
 * Run with: npx tsx scripts/install-hooks.ts
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";

const HOOKS_DIR = ".git/hooks";
const SCRIPTS_DIR = "scripts";

const hooks = ["pre-commit"];

async function installHooks(): Promise<void> {
  console.log("Installing git hooks...\n");

  for (const hook of hooks) {
    const src = path.join(SCRIPTS_DIR, hook);
    const dest = path.join(HOOKS_DIR, hook);

    try {
      const content = await fs.readFile(src, "utf-8");
      await fs.writeFile(dest, content);

      // Make executable on Unix-like systems
      if (process.platform !== "win32") {
        await fs.chmod(dest, 0o755);
      }

      console.log(`✅ Installed: ${hook}`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        console.error(`❌ Source hook not found: ${src}`);
      } else {
        console.error(`❌ Failed to install ${hook}:`, error);
      }
    }
  }

  console.log("\nGit hooks installed successfully!");
  console.log(
    "Pre-commit hook will run 'npx biome check' and 'npx tsc --noEmit' before each commit."
  );
}

installHooks();
