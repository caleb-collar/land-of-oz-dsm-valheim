/**
 * Valheim server argument builder
 * Converts configuration into CLI arguments for the Valheim dedicated server
 */

import type { Modifiers, ServerConfig } from "../config/schema.js";

/**
 * Builds command line arguments from server configuration
 * @param config Server configuration object
 * @returns Array of command line arguments
 */
export function buildServerArgs(config: ServerConfig): string[] {
  const args: string[] = [
    // Always run headless
    "-nographics",
    "-batchmode",
  ];

  // Required arguments
  args.push("-name", config.name);
  args.push("-port", String(config.port));
  args.push("-world", config.world);
  args.push("-password", config.password);

  // Boolean as 0/1
  args.push("-public", config.public ? "1" : "0");

  // Optional paths
  if (config.savedir) {
    args.push("-savedir", config.savedir);
  }

  if (config.logFile) {
    args.push("-logFile", config.logFile);
  }

  // Save settings
  if (config.saveinterval) {
    args.push("-saveinterval", String(config.saveinterval));
  }

  if (config.backups) {
    args.push("-backups", String(config.backups));
  }

  if (config.backupshort) {
    args.push("-backupshort", String(config.backupshort));
  }

  if (config.backuplong) {
    args.push("-backuplong", String(config.backuplong));
  }

  // Crossplay (flag only, no value)
  if (config.crossplay) {
    args.push("-crossplay");
  }

  // Preset
  if (config.preset) {
    args.push("-preset", config.preset);
  }

  // Modifiers
  if (config.modifiers) {
    const modifierArgs = buildModifierArgs(config.modifiers);
    args.push(...modifierArgs);
  }

  return args;
}

/**
 * Builds modifier arguments from modifier configuration
 * @param modifiers Modifier settings
 * @returns Array of modifier arguments
 */
function buildModifierArgs(modifiers: Modifiers): string[] {
  const args: string[] = [];

  if (modifiers.combat && modifiers.combat !== "default") {
    args.push("-modifier", "combat", modifiers.combat);
  }

  if (modifiers.deathpenalty && modifiers.deathpenalty !== "default") {
    args.push("-modifier", "deathpenalty", modifiers.deathpenalty);
  }

  if (modifiers.resources && modifiers.resources !== "default") {
    args.push("-modifier", "resources", modifiers.resources);
  }

  if (modifiers.raids === false) {
    args.push("-modifier", "raids", "none");
  }

  if (modifiers.portals && modifiers.portals !== "default") {
    args.push("-modifier", "portals", modifiers.portals);
  }

  return args;
}

/**
 * Parses an argument string back into key-value pairs
 * Useful for debugging or displaying current arguments
 * @param args Array of command line arguments
 * @returns Record of argument key to value
 */
export function parseServerArgs(args: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  let i = 0;

  while (i < args.length) {
    const arg = args[i];

    if (arg.startsWith("-")) {
      const key = arg.replace(/^-+/, "");

      // Check if next arg is a value or another flag
      if (i + 1 < args.length && !args[i + 1].startsWith("-")) {
        result[key] = args[i + 1];
        i += 2;
      } else {
        // Flag without value (e.g., -crossplay)
        result[key] = "true";
        i += 1;
      }
    } else {
      i += 1;
    }
  }

  return result;
}
