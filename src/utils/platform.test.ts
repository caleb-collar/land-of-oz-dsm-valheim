/**
 * Unit tests for platform utilities
 */

import { assertEquals, assertMatch } from "@std/assert";
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
} from "./platform.ts";

Deno.test("getPlatform returns valid platform", () => {
  const platform = getPlatform();
  const validPlatforms: Platform[] = ["windows", "darwin", "linux"];
  assertEquals(
    validPlatforms.includes(platform),
    true,
    `Expected valid platform, got ${platform}`,
  );
});

Deno.test("getHomeDir returns non-empty string", () => {
  const home = getHomeDir();
  assertEquals(typeof home, "string");
  assertEquals(home.length > 0, true, "Home directory should not be empty");
});

Deno.test("getConfigDir returns valid path", () => {
  const configDir = getConfigDir();
  assertEquals(typeof configDir, "string");
  assertEquals(
    configDir.length > 0,
    true,
    "Config directory should not be empty",
  );

  const platform = getPlatform();
  if (platform === "windows") {
    // Should contain AppData or Roaming
    assertMatch(configDir, /AppData|Roaming/i);
  } else if (platform === "darwin") {
    assertMatch(configDir, /Library\/Application Support/);
  } else {
    // Linux: should be .config or XDG_CONFIG_HOME
    assertMatch(configDir, /\.config|XDG_CONFIG/);
  }
});

Deno.test("getLocalDataDir returns valid path", () => {
  const localDataDir = getLocalDataDir();
  assertEquals(typeof localDataDir, "string");
  assertEquals(
    localDataDir.length > 0,
    true,
    "Local data directory should not be empty",
  );
});

Deno.test("getValheimSaveDir returns valid path with worlds_local", () => {
  const saveDir = getValheimSaveDir();
  assertEquals(typeof saveDir, "string");
  assertMatch(saveDir, /worlds_local/);

  const platform = getPlatform();
  if (platform === "windows" || platform === "darwin") {
    assertMatch(saveDir, /IronGate/);
  } else {
    assertMatch(saveDir, /unity3d.*IronGate/);
  }
});

Deno.test("getAppConfigDir returns oz-valheim path", () => {
  const appDir = getAppConfigDir();
  assertEquals(typeof appDir, "string");
  assertMatch(appDir, /oz-valheim/);
});

Deno.test("getSteamCmdDir returns steamcmd path", () => {
  const steamCmdDir = getSteamCmdDir();
  assertEquals(typeof steamCmdDir, "string");
  assertMatch(steamCmdDir, /steamcmd/);
});

Deno.test("getValheimServerDir returns Valheim server path", () => {
  const serverDir = getValheimServerDir();
  assertEquals(typeof serverDir, "string");
  assertMatch(serverDir, /Valheim dedicated server/);
  assertMatch(serverDir, /steamapps.*common/);
});

Deno.test("getValheimExecutable returns platform-specific executable", () => {
  const executable = getValheimExecutable();
  assertEquals(typeof executable, "string");

  const platform = getPlatform();
  if (platform === "windows") {
    assertMatch(executable, /valheim_server\.exe$/);
  } else {
    assertMatch(executable, /valheim_server\.x86_64$/);
  }
});

Deno.test("getSteamCmdExecutable returns platform-specific executable", () => {
  const executable = getSteamCmdExecutable();
  assertEquals(typeof executable, "string");

  const platform = getPlatform();
  if (platform === "windows") {
    assertMatch(executable, /steamcmd\.exe$/);
  } else {
    assertMatch(executable, /steamcmd\.sh$/);
  }
});

Deno.test("path functions are consistent with each other", () => {
  const configDir = getConfigDir();
  const appConfigDir = getAppConfigDir();

  // App config dir should be inside config dir
  assertEquals(
    appConfigDir.startsWith(configDir) || appConfigDir.includes("oz-valheim"),
    true,
    "App config should be oz-valheim inside config dir",
  );

  const steamCmdDir = getSteamCmdDir();

  // SteamCMD dir should reference local data
  assertEquals(
    steamCmdDir.includes("steamcmd"),
    true,
    "SteamCMD dir should contain 'steamcmd'",
  );
});
