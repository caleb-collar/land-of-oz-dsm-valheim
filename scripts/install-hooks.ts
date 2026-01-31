/**
 * Install git hooks for the project
 * Run with: deno task hooks:install
 */

import { join } from "@std/path";

const HOOKS_DIR = ".git/hooks";
const SCRIPTS_DIR = "scripts";

const hooks = ["pre-commit"];

async function installHooks(): Promise<void> {
  console.log("Installing git hooks...\n");

  for (const hook of hooks) {
    const src = join(SCRIPTS_DIR, hook);
    const dest = join(HOOKS_DIR, hook);

    try {
      const content = await Deno.readTextFile(src);
      await Deno.writeTextFile(dest, content);

      // Make executable on Unix-like systems
      if (Deno.build.os !== "windows") {
        await Deno.chmod(dest, 0o755);
      }

      console.log(`✅ Installed: ${hook}`);
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        console.error(`❌ Source hook not found: ${src}`);
      } else {
        console.error(`❌ Failed to install ${hook}:`, error);
      }
    }
  }

  console.log("\nGit hooks installed successfully!");
  console.log(
    "Pre-commit hook will run 'deno fmt --check' and 'deno lint' before each commit.",
  );
}

if (import.meta.main) {
  installHooks();
}
