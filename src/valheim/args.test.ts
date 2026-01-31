/**
 * Unit tests for Valheim server argument builder
 */

import { assertEquals, assertMatch } from "@std/assert";
import { buildServerArgs, parseServerArgs } from "./args.ts";
import type { ServerConfig } from "../config/schema.ts";

// Default test config matching ServerConfigSchema defaults
function getDefaultConfig(): ServerConfig {
  return {
    name: "Test Server",
    port: 2456,
    password: "testpass123",
    world: "TestWorld",
    public: false,
    crossplay: false,
    saveinterval: 1800,
    backups: 4,
    backupshort: 7200,
    backuplong: 43200,
    modifiers: {
      combat: "default",
      deathpenalty: "default",
      resources: "default",
      raids: true,
      portals: "default",
    },
  };
}

Deno.test("buildServerArgs includes headless flags", () => {
  const config = getDefaultConfig();
  const args = buildServerArgs(config);

  assertEquals(args.includes("-nographics"), true);
  assertEquals(args.includes("-batchmode"), true);
});

Deno.test("buildServerArgs includes required arguments", () => {
  const config = getDefaultConfig();
  const args = buildServerArgs(config);

  // Find name arg
  const nameIdx = args.indexOf("-name");
  assertEquals(nameIdx !== -1, true);
  assertEquals(args[nameIdx + 1], "Test Server");

  // Find port arg
  const portIdx = args.indexOf("-port");
  assertEquals(portIdx !== -1, true);
  assertEquals(args[portIdx + 1], "2456");

  // Find world arg
  const worldIdx = args.indexOf("-world");
  assertEquals(worldIdx !== -1, true);
  assertEquals(args[worldIdx + 1], "TestWorld");

  // Find password arg
  const passIdx = args.indexOf("-password");
  assertEquals(passIdx !== -1, true);
  assertEquals(args[passIdx + 1], "testpass123");
});

Deno.test("buildServerArgs includes public flag as 0", () => {
  const config = getDefaultConfig();
  config.public = false;
  const args = buildServerArgs(config);

  const publicIdx = args.indexOf("-public");
  assertEquals(publicIdx !== -1, true);
  assertEquals(args[publicIdx + 1], "0");
});

Deno.test("buildServerArgs includes public flag as 1 when true", () => {
  const config = getDefaultConfig();
  config.public = true;
  const args = buildServerArgs(config);

  const publicIdx = args.indexOf("-public");
  assertEquals(publicIdx !== -1, true);
  assertEquals(args[publicIdx + 1], "1");
});

Deno.test("buildServerArgs includes crossplay when enabled", () => {
  const config = getDefaultConfig();
  config.crossplay = true;
  const args = buildServerArgs(config);

  assertEquals(args.includes("-crossplay"), true);
});

Deno.test("buildServerArgs excludes crossplay when disabled", () => {
  const config = getDefaultConfig();
  config.crossplay = false;
  const args = buildServerArgs(config);

  assertEquals(args.includes("-crossplay"), false);
});

Deno.test("buildServerArgs includes savedir when specified", () => {
  const config = getDefaultConfig();
  config.savedir = "/custom/save/path";
  const args = buildServerArgs(config);

  const savedirIdx = args.indexOf("-savedir");
  assertEquals(savedirIdx !== -1, true);
  assertEquals(args[savedirIdx + 1], "/custom/save/path");
});

Deno.test("buildServerArgs excludes savedir when not specified", () => {
  const config = getDefaultConfig();
  delete config.savedir;
  const args = buildServerArgs(config);

  assertEquals(args.includes("-savedir"), false);
});

Deno.test("buildServerArgs includes logFile when specified", () => {
  const config = getDefaultConfig();
  config.logFile = "/var/log/valheim.log";
  const args = buildServerArgs(config);

  const logIdx = args.indexOf("-logFile");
  assertEquals(logIdx !== -1, true);
  assertEquals(args[logIdx + 1], "/var/log/valheim.log");
});

Deno.test("buildServerArgs includes save settings", () => {
  const config = getDefaultConfig();
  const args = buildServerArgs(config);

  // Save interval
  const saveIdx = args.indexOf("-saveinterval");
  assertEquals(saveIdx !== -1, true);
  assertEquals(args[saveIdx + 1], "1800");

  // Backups
  const backupsIdx = args.indexOf("-backups");
  assertEquals(backupsIdx !== -1, true);
  assertEquals(args[backupsIdx + 1], "4");

  // Backup short
  const shortIdx = args.indexOf("-backupshort");
  assertEquals(shortIdx !== -1, true);
  assertEquals(args[shortIdx + 1], "7200");

  // Backup long
  const longIdx = args.indexOf("-backuplong");
  assertEquals(longIdx !== -1, true);
  assertEquals(args[longIdx + 1], "43200");
});

Deno.test("buildServerArgs includes preset when specified", () => {
  const config = getDefaultConfig();
  config.preset = "hard";
  const args = buildServerArgs(config);

  const presetIdx = args.indexOf("-preset");
  assertEquals(presetIdx !== -1, true);
  assertEquals(args[presetIdx + 1], "hard");
});

Deno.test("buildServerArgs excludes preset when not specified", () => {
  const config = getDefaultConfig();
  delete config.preset;
  const args = buildServerArgs(config);

  assertEquals(args.includes("-preset"), false);
});

Deno.test("buildServerArgs excludes default modifiers", () => {
  const config = getDefaultConfig();
  // All modifiers at default
  const args = buildServerArgs(config);

  // -modifier should not appear when all are default
  assertEquals(args.includes("-modifier"), false);
});

Deno.test("buildServerArgs includes non-default combat modifier", () => {
  const config = getDefaultConfig();
  config.modifiers = {
    ...config.modifiers,
    combat: "hard",
  };
  const args = buildServerArgs(config);

  const modIdx = args.indexOf("-modifier");
  assertEquals(modIdx !== -1, true);
  assertEquals(args[modIdx + 1], "combat");
  assertEquals(args[modIdx + 2], "hard");
});

Deno.test("buildServerArgs includes non-default deathpenalty modifier", () => {
  const config = getDefaultConfig();
  config.modifiers = {
    ...config.modifiers,
    deathpenalty: "hardcore",
  };
  const args = buildServerArgs(config);

  const argStr = args.join(" ");
  assertMatch(argStr, /\-modifier deathpenalty hardcore/);
});

Deno.test("buildServerArgs includes non-default resources modifier", () => {
  const config = getDefaultConfig();
  config.modifiers = {
    ...config.modifiers,
    resources: "muchmore",
  };
  const args = buildServerArgs(config);

  const argStr = args.join(" ");
  assertMatch(argStr, /\-modifier resources muchmore/);
});

Deno.test("buildServerArgs includes raids=none when disabled", () => {
  const config = getDefaultConfig();
  config.modifiers = {
    ...config.modifiers,
    raids: false,
  };
  const args = buildServerArgs(config);

  const argStr = args.join(" ");
  assertMatch(argStr, /\-modifier raids none/);
});

Deno.test("buildServerArgs excludes raids when enabled (default)", () => {
  const config = getDefaultConfig();
  config.modifiers = {
    ...config.modifiers,
    raids: true,
  };
  const args = buildServerArgs(config);

  const argStr = args.join(" ");
  assertEquals(argStr.includes("-modifier raids"), false);
});

Deno.test("buildServerArgs includes non-default portals modifier", () => {
  const config = getDefaultConfig();
  config.modifiers = {
    ...config.modifiers,
    portals: "casual",
  };
  const args = buildServerArgs(config);

  const argStr = args.join(" ");
  assertMatch(argStr, /\-modifier portals casual/);
});

Deno.test("buildServerArgs handles multiple modifiers", () => {
  const config = getDefaultConfig();
  config.modifiers = {
    combat: "veryhard",
    deathpenalty: "casual",
    resources: "less",
    raids: false,
    portals: "hard",
  };
  const args = buildServerArgs(config);

  const argStr = args.join(" ");
  assertMatch(argStr, /\-modifier combat veryhard/);
  assertMatch(argStr, /\-modifier deathpenalty casual/);
  assertMatch(argStr, /\-modifier resources less/);
  assertMatch(argStr, /\-modifier raids none/);
  assertMatch(argStr, /\-modifier portals hard/);
});

// parseServerArgs tests

Deno.test("parseServerArgs parses flag with value", () => {
  const args = ["-name", "MyServer", "-port", "2456"];
  const parsed = parseServerArgs(args);

  assertEquals(parsed["name"], "MyServer");
  assertEquals(parsed["port"], "2456");
});

Deno.test("parseServerArgs parses flag without value", () => {
  const args = ["-crossplay", "-nographics"];
  const parsed = parseServerArgs(args);

  assertEquals(parsed["crossplay"], "true");
  assertEquals(parsed["nographics"], "true");
});

Deno.test("parseServerArgs handles mixed flags", () => {
  const args = ["-name", "Test", "-crossplay", "-port", "2457"];
  const parsed = parseServerArgs(args);

  assertEquals(parsed["name"], "Test");
  assertEquals(parsed["crossplay"], "true");
  assertEquals(parsed["port"], "2457");
});

Deno.test("parseServerArgs handles double dashes", () => {
  const args = ["--name", "Server", "--port", "2456"];
  const parsed = parseServerArgs(args);

  assertEquals(parsed["name"], "Server");
  assertEquals(parsed["port"], "2456");
});

Deno.test("parseServerArgs handles empty array", () => {
  const args: string[] = [];
  const parsed = parseServerArgs(args);

  assertEquals(Object.keys(parsed).length, 0);
});

Deno.test("buildServerArgs and parseServerArgs roundtrip", () => {
  const config = getDefaultConfig();
  config.name = "Roundtrip Test";
  config.port = 2460;
  config.public = true;

  const args = buildServerArgs(config);
  const parsed = parseServerArgs(args);

  assertEquals(parsed["name"], "Roundtrip Test");
  assertEquals(parsed["port"], "2460");
  assertEquals(parsed["public"], "1");
  assertEquals(parsed["world"], "TestWorld");
});
