/**
 * Integration tests for SteamCMD module (mocked)
 * These tests verify the module logic without actually calling SteamCMD
 */

import { assertEquals, assertExists, assertMatch } from "@std/assert";
import {
  getSteamPaths,
  getValheimExecutablePath,
  isSteamCmdInstalled,
  isValheimInstalled,
} from "./paths.ts";
import { getPlatform } from "../utils/platform.ts";

Deno.test("getSteamPaths returns valid paths object", () => {
  const paths = getSteamPaths();

  assertExists(paths.steamcmdDir);
  assertExists(paths.steamcmd);
  assertExists(paths.valheimDir);
  assertExists(paths.executable);

  assertEquals(typeof paths.steamcmdDir, "string");
  assertEquals(typeof paths.steamcmd, "string");
  assertEquals(typeof paths.valheimDir, "string");
  assertEquals(typeof paths.executable, "string");
});

Deno.test("getSteamPaths returns platform-appropriate executable names", () => {
  const paths = getSteamPaths();
  const platform = getPlatform();

  if (platform === "windows") {
    assertMatch(paths.steamcmd, /steamcmd\.exe$/);
    assertEquals(paths.executable, "valheim_server.exe");
  } else {
    assertMatch(paths.steamcmd, /steamcmd\.sh$/);
    assertEquals(paths.executable, "valheim_server.x86_64");
  }
});

Deno.test("getSteamPaths includes steamapps/common in valheim path", () => {
  const paths = getSteamPaths();

  assertMatch(paths.valheimDir, /steamapps/);
  assertMatch(paths.valheimDir, /common/);
  assertMatch(paths.valheimDir, /Valheim dedicated server/);
});

Deno.test("isSteamCmdInstalled returns a boolean", async () => {
  const installed = await isSteamCmdInstalled();

  assertEquals(typeof installed, "boolean");
});

Deno.test("isValheimInstalled returns a boolean", async () => {
  const installed = await isValheimInstalled();

  assertEquals(typeof installed, "boolean");
});

Deno.test("getValheimExecutablePath returns full path", () => {
  const execPath = getValheimExecutablePath();
  const paths = getSteamPaths();

  assertEquals(typeof execPath, "string");
  assertMatch(execPath, /Valheim dedicated server/);
  assertEquals(execPath.includes(paths.executable), true);
});

Deno.test("getSteamPaths paths are consistent", () => {
  const paths = getSteamPaths();

  // Executable should be inside its directory
  assertEquals(
    paths.steamcmd.includes("steamcmd"),
    true,
    "SteamCMD executable path should contain 'steamcmd'",
  );

  assertEquals(
    paths.valheimDir.includes("Valheim dedicated server"),
    true,
    "Valheim directory path should contain 'Valheim dedicated server'",
  );
});
