/**
 * Unit tests for platform utilities
 */

import { describe, expect, it } from "vitest";
import {
  getAppConfigDir,
  getConfigDir,
  getHomeDir,
  getLocalDataDir,
  getPlatform,
  getSteamCmdDir,
  getSteamCmdExecutable,
  getValheimExecutable,
  getValheimSaveDir,
  getValheimServerDir,
  type Platform,
} from "./platform.js";

describe("platform utilities", () => {
  it("getPlatform returns valid platform", () => {
    const platform = getPlatform();
    const validPlatforms: Platform[] = ["windows", "darwin", "linux"];
    expect(validPlatforms.includes(platform)).toBe(true);
  });

  it("getHomeDir returns non-empty string", () => {
    const home = getHomeDir();
    expect(typeof home).toBe("string");
    expect(home.length).toBeGreaterThan(0);
  });

  it("getConfigDir returns valid path", () => {
    const configDir = getConfigDir();
    expect(typeof configDir).toBe("string");
    expect(configDir.length).toBeGreaterThan(0);

    const platform = getPlatform();
    if (platform === "windows") {
      expect(configDir).toMatch(/AppData|Roaming/i);
    } else if (platform === "darwin") {
      expect(configDir).toMatch(/Library\/Application Support/);
    } else {
      expect(configDir).toMatch(/\.config|XDG_CONFIG/);
    }
  });

  it("getLocalDataDir returns valid path", () => {
    const localDataDir = getLocalDataDir();
    expect(typeof localDataDir).toBe("string");
    expect(localDataDir.length).toBeGreaterThan(0);
  });

  it("getValheimSaveDir returns valid path with worlds_local", () => {
    const saveDir = getValheimSaveDir();
    expect(typeof saveDir).toBe("string");
    expect(saveDir).toMatch(/worlds_local/);

    const platform = getPlatform();
    if (platform === "windows" || platform === "darwin") {
      expect(saveDir).toMatch(/IronGate/);
    } else {
      expect(saveDir).toMatch(/unity3d.*IronGate/);
    }
  });

  it("getAppConfigDir returns oz-valheim path", () => {
    const appDir = getAppConfigDir();
    expect(typeof appDir).toBe("string");
    expect(appDir).toMatch(/oz-valheim/);
  });

  it("getSteamCmdDir returns steamcmd path", () => {
    const steamCmdDir = getSteamCmdDir();
    expect(typeof steamCmdDir).toBe("string");
    expect(steamCmdDir).toMatch(/steamcmd/);
  });

  it("getValheimServerDir returns Valheim server path", () => {
    const serverDir = getValheimServerDir();
    expect(typeof serverDir).toBe("string");
    expect(serverDir).toMatch(/Valheim dedicated server/);
    expect(serverDir).toMatch(/steamapps.*common/);
  });

  it("getValheimExecutable returns platform-specific executable", () => {
    const executable = getValheimExecutable();
    expect(typeof executable).toBe("string");

    const platform = getPlatform();
    if (platform === "windows") {
      expect(executable).toMatch(/valheim_server\.exe$/);
    } else {
      expect(executable).toMatch(/valheim_server\.x86_64$/);
    }
  });

  it("getSteamCmdExecutable returns platform-specific executable", () => {
    const executable = getSteamCmdExecutable();
    expect(typeof executable).toBe("string");

    const platform = getPlatform();
    if (platform === "windows") {
      expect(executable).toMatch(/steamcmd\.exe$/);
    } else {
      expect(executable).toMatch(/steamcmd\.sh$/);
    }
  });

  it("path functions are consistent with each other", () => {
    const configDir = getConfigDir();
    const appConfigDir = getAppConfigDir();

    expect(
      appConfigDir.startsWith(configDir) || appConfigDir.includes("oz-valheim")
    ).toBe(true);

    const steamCmdDir = getSteamCmdDir();
    expect(steamCmdDir.includes("steamcmd")).toBe(true);
  });
});
