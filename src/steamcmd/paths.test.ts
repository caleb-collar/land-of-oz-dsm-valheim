/**
 * Integration tests for SteamCMD module
 * Uses @caleb-collar/steamcmd package
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the @caleb-collar/steamcmd package - must be inline, not using variables
vi.mock("@caleb-collar/steamcmd", () => ({
  default: {
    getInfo: () => ({
      directory:
        process.platform === "win32"
          ? "C:\\Users\\TestUser\\AppData\\Local\\steamcmd"
          : "/home/testuser/.local/share/steamcmd",
      executable:
        process.platform === "win32"
          ? "C:\\Users\\TestUser\\AppData\\Local\\steamcmd\\steamcmd.exe"
          : "/home/testuser/.local/share/steamcmd/steamcmd.sh",
      platform: process.platform,
      isSupported: true,
    }),
    isInstalled: () => Promise.resolve(false),
  },
}));

// Import after mock setup
import {
  getSteamPaths,
  getValheimExecutablePath,
  isSteamCmdInstalled,
  isValheimInstalled,
} from "./paths.js";

describe("SteamCMD paths", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getSteamPaths returns valid paths object", () => {
    const paths = getSteamPaths();

    expect(paths.steamcmdDir).toBeDefined();
    expect(paths.steamcmd).toBeDefined();
    expect(paths.valheimDir).toBeDefined();
    expect(paths.executable).toBeDefined();

    expect(typeof paths.steamcmdDir).toBe("string");
    expect(typeof paths.steamcmd).toBe("string");
    expect(typeof paths.valheimDir).toBe("string");
    expect(typeof paths.executable).toBe("string");
  });

  it("getSteamPaths returns platform-appropriate executable names", () => {
    const paths = getSteamPaths();
    const platform = process.platform;

    if (platform === "win32") {
      expect(paths.steamcmd).toMatch(/steamcmd\.exe$/);
      expect(paths.executable).toBe("valheim_server.exe");
    } else {
      expect(paths.steamcmd).toMatch(/steamcmd\.sh$/);
      expect(paths.executable).toBe("valheim_server.x86_64");
    }
  });

  it("getSteamPaths includes steamapps/common in valheim path", () => {
    const paths = getSteamPaths();

    expect(paths.valheimDir).toMatch(/steamapps/);
    expect(paths.valheimDir).toMatch(/common/);
    expect(paths.valheimDir).toMatch(/Valheim dedicated server/);
  });

  it("isSteamCmdInstalled returns a boolean", async () => {
    const installed = await isSteamCmdInstalled();

    expect(typeof installed).toBe("boolean");
    expect(installed).toBe(false);
  });

  it("isValheimInstalled returns a boolean", async () => {
    const installed = await isValheimInstalled();

    expect(typeof installed).toBe("boolean");
  });

  it("getValheimExecutablePath returns full path", () => {
    const execPath = getValheimExecutablePath();
    const paths = getSteamPaths();

    expect(typeof execPath).toBe("string");
    expect(execPath).toMatch(/Valheim dedicated server/);
    expect(execPath.includes(paths.executable)).toBe(true);
  });

  it("getSteamPaths paths are consistent", () => {
    const paths = getSteamPaths();

    // Executable should be inside its directory
    expect(paths.steamcmd.includes("steamcmd")).toBe(true);

    expect(paths.valheimDir.includes("Valheim dedicated server")).toBe(true);
  });
});
