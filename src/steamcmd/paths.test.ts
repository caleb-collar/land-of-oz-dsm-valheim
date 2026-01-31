/**
 * Integration tests for SteamCMD module (mocked)
 * These tests verify the module logic without actually calling SteamCMD
 */

import { describe, expect, it } from "vitest";
import { getPlatform } from "../utils/platform.js";
import {
  getSteamPaths,
  getValheimExecutablePath,
  isSteamCmdInstalled,
  isValheimInstalled,
} from "./paths.js";

describe("SteamCMD paths", () => {
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
    const platform = getPlatform();

    if (platform === "windows") {
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
