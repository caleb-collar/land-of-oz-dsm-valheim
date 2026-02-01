/**
 * Unit tests for Valheim server argument builder
 */

import { describe, expect, it } from "vitest";
import type { ServerConfig } from "../config/schema.js";
import { buildServerArgs, parseServerArgs } from "./args.js";

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

describe("buildServerArgs", () => {
  it("includes headless flags", () => {
    const config = getDefaultConfig();
    const args = buildServerArgs(config);

    expect(args.includes("-nographics")).toBe(true);
    expect(args.includes("-batchmode")).toBe(true);
  });

  it("includes required arguments", () => {
    const config = getDefaultConfig();
    const args = buildServerArgs(config);

    // Find name arg
    const nameIdx = args.indexOf("-name");
    expect(nameIdx).not.toBe(-1);
    expect(args[nameIdx + 1]).toBe("Test Server");

    // Find port arg
    const portIdx = args.indexOf("-port");
    expect(portIdx).not.toBe(-1);
    expect(args[portIdx + 1]).toBe("2456");

    // Find world arg
    const worldIdx = args.indexOf("-world");
    expect(worldIdx).not.toBe(-1);
    expect(args[worldIdx + 1]).toBe("TestWorld");

    // Find password arg
    const passIdx = args.indexOf("-password");
    expect(passIdx).not.toBe(-1);
    expect(args[passIdx + 1]).toBe("testpass123");
  });

  it("includes public flag as 0", () => {
    const config = getDefaultConfig();
    config.public = false;
    const args = buildServerArgs(config);

    const publicIdx = args.indexOf("-public");
    expect(publicIdx).not.toBe(-1);
    expect(args[publicIdx + 1]).toBe("0");
  });

  it("includes public flag as 1 when true", () => {
    const config = getDefaultConfig();
    config.public = true;
    const args = buildServerArgs(config);

    const publicIdx = args.indexOf("-public");
    expect(publicIdx).not.toBe(-1);
    expect(args[publicIdx + 1]).toBe("1");
  });

  it("includes crossplay when enabled", () => {
    const config = getDefaultConfig();
    config.crossplay = true;
    const args = buildServerArgs(config);

    expect(args.includes("-crossplay")).toBe(true);
  });

  it("excludes crossplay when disabled", () => {
    const config = getDefaultConfig();
    config.crossplay = false;
    const args = buildServerArgs(config);

    expect(args.includes("-crossplay")).toBe(false);
  });

  it("includes savedir when specified", () => {
    const config = getDefaultConfig();
    config.savedir = "/custom/save/path";
    const args = buildServerArgs(config);

    const savedirIdx = args.indexOf("-savedir");
    expect(savedirIdx).not.toBe(-1);
    expect(args[savedirIdx + 1]).toBe("/custom/save/path");
  });

  it("excludes savedir when not specified", () => {
    const config = getDefaultConfig();
    config.savedir = undefined;
    const args = buildServerArgs(config);

    expect(args.includes("-savedir")).toBe(false);
  });

  it("includes logFile when specified", () => {
    const config = getDefaultConfig();
    config.logFile = "/var/log/valheim.log";
    const args = buildServerArgs(config);

    const logIdx = args.indexOf("-logFile");
    expect(logIdx).not.toBe(-1);
    expect(args[logIdx + 1]).toBe("/var/log/valheim.log");
  });

  it("includes save settings", () => {
    const config = getDefaultConfig();
    const args = buildServerArgs(config);

    // Save interval
    const saveIdx = args.indexOf("-saveinterval");
    expect(saveIdx).not.toBe(-1);
    expect(args[saveIdx + 1]).toBe("1800");

    // Backups
    const backupsIdx = args.indexOf("-backups");
    expect(backupsIdx).not.toBe(-1);
    expect(args[backupsIdx + 1]).toBe("4");

    // Backup short
    const shortIdx = args.indexOf("-backupshort");
    expect(shortIdx).not.toBe(-1);
    expect(args[shortIdx + 1]).toBe("7200");

    // Backup long
    const longIdx = args.indexOf("-backuplong");
    expect(longIdx).not.toBe(-1);
    expect(args[longIdx + 1]).toBe("43200");
  });

  it("includes preset when specified", () => {
    const config = getDefaultConfig();
    config.preset = "hard";
    const args = buildServerArgs(config);

    const presetIdx = args.indexOf("-preset");
    expect(presetIdx).not.toBe(-1);
    expect(args[presetIdx + 1]).toBe("hard");
  });

  it("excludes preset when not specified", () => {
    const config = getDefaultConfig();
    config.preset = undefined;
    const args = buildServerArgs(config);

    expect(args.includes("-preset")).toBe(false);
  });

  it("excludes default modifiers", () => {
    const config = getDefaultConfig();
    // All modifiers at default
    const args = buildServerArgs(config);

    // -modifier should not appear when all are default
    expect(args.includes("-modifier")).toBe(false);
  });

  it("includes non-default combat modifier", () => {
    const config = getDefaultConfig();
    config.modifiers = {
      ...config.modifiers,
      combat: "hard",
    };
    const args = buildServerArgs(config);

    const modIdx = args.indexOf("-modifier");
    expect(modIdx).not.toBe(-1);
    expect(args[modIdx + 1]).toBe("combat");
    expect(args[modIdx + 2]).toBe("hard");
  });

  it("includes non-default deathpenalty modifier", () => {
    const config = getDefaultConfig();
    config.modifiers = {
      ...config.modifiers,
      deathpenalty: "hardcore",
    };
    const args = buildServerArgs(config);

    const argStr = args.join(" ");
    expect(argStr).toMatch(/-modifier deathpenalty hardcore/);
  });

  it("includes non-default resources modifier", () => {
    const config = getDefaultConfig();
    config.modifiers = {
      ...config.modifiers,
      resources: "muchmore",
    };
    const args = buildServerArgs(config);

    const argStr = args.join(" ");
    expect(argStr).toMatch(/-modifier resources muchmore/);
  });

  it("includes raids=none when disabled", () => {
    const config = getDefaultConfig();
    config.modifiers = {
      ...config.modifiers,
      raids: false,
    };
    const args = buildServerArgs(config);

    const argStr = args.join(" ");
    expect(argStr).toMatch(/-modifier raids none/);
  });

  it("excludes raids when enabled (default)", () => {
    const config = getDefaultConfig();
    config.modifiers = {
      ...config.modifiers,
      raids: true,
    };
    const args = buildServerArgs(config);

    const argStr = args.join(" ");
    expect(argStr.includes("-modifier raids")).toBe(false);
  });

  it("includes non-default portals modifier", () => {
    const config = getDefaultConfig();
    config.modifiers = {
      ...config.modifiers,
      portals: "casual",
    };
    const args = buildServerArgs(config);

    const argStr = args.join(" ");
    expect(argStr).toMatch(/-modifier portals casual/);
  });

  it("handles multiple modifiers", () => {
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
    expect(argStr).toMatch(/-modifier combat veryhard/);
    expect(argStr).toMatch(/-modifier deathpenalty casual/);
    expect(argStr).toMatch(/-modifier resources less/);
    expect(argStr).toMatch(/-modifier raids none/);
    expect(argStr).toMatch(/-modifier portals hard/);
  });
});

describe("parseServerArgs", () => {
  it("parses flag with value", () => {
    const args = ["-name", "MyServer", "-port", "2456"];
    const parsed = parseServerArgs(args);

    expect(parsed.name).toBe("MyServer");
    expect(parsed.port).toBe("2456");
  });

  it("parses flag without value", () => {
    const args = ["-crossplay", "-nographics"];
    const parsed = parseServerArgs(args);

    expect(parsed.crossplay).toBe("true");
    expect(parsed.nographics).toBe("true");
  });

  it("handles mixed flags", () => {
    const args = ["-name", "Test", "-crossplay", "-port", "2457"];
    const parsed = parseServerArgs(args);

    expect(parsed.name).toBe("Test");
    expect(parsed.crossplay).toBe("true");
    expect(parsed.port).toBe("2457");
  });

  it("handles double dashes", () => {
    const args = ["--name", "Server", "--port", "2456"];
    const parsed = parseServerArgs(args);

    expect(parsed.name).toBe("Server");
    expect(parsed.port).toBe("2456");
  });

  it("handles empty array", () => {
    const args: string[] = [];
    const parsed = parseServerArgs(args);

    expect(Object.keys(parsed).length).toBe(0);
  });

  it("buildServerArgs and parseServerArgs roundtrip", () => {
    const config = getDefaultConfig();
    config.name = "Roundtrip Test";
    config.port = 2460;
    config.public = true;

    const args = buildServerArgs(config);
    const parsed = parseServerArgs(args);

    expect(parsed.name).toBe("Roundtrip Test");
    expect(parsed.port).toBe("2460");
    expect(parsed.public).toBe("1");
    expect(parsed.world).toBe("TestWorld");
  });
});
