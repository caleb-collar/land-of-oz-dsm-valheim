/**
 * Integration tests for configuration persistence
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  addWorld,
  getActiveWorld,
  getWorlds,
  loadConfig,
  removeWorld,
  resetConfig,
  saveConfig,
  setActiveWorld,
  updateConfig,
  updateServerConfig,
  updateTuiConfig,
  updateWatchdogConfig,
} from "./store.js";

describe("config store", () => {
  beforeEach(async () => {
    await resetConfig();
  });

  afterEach(async () => {
    await resetConfig();
  });

  it("loadConfig returns valid defaults on first load", async () => {
    const config = await loadConfig();

    expect(config).toBeDefined();
    expect(config.version).toBe(1);
    expect(config.server.name).toBe("Land of OZ Valheim");
    expect(config.server.port).toBe(2456);
    expect(config.server.world).toBe("Dedicated");
    expect(config.watchdog.enabled).toBe(true);
    expect(config.tui.colorScheme).toBe("dark");
    expect(config.worlds.length).toBe(0);
    expect(config.activeWorld).toBeNull();
  });

  it("saveConfig and loadConfig roundtrip works", async () => {
    const original = await loadConfig();

    // Modify some values
    original.server.name = "Test Server";
    original.server.port = 2460;
    original.autoUpdate = false;

    // Save and reload
    await saveConfig(original);
    const loaded = await loadConfig();

    expect(loaded.server.name).toBe("Test Server");
    expect(loaded.server.port).toBe(2460);
    expect(loaded.autoUpdate).toBe(false);
  });

  it("updateConfig merges partial config correctly", async () => {
    // Update just one field
    await updateConfig({ autoUpdate: false });

    const config = await loadConfig();
    expect(config.autoUpdate).toBe(false);
    // Other defaults should remain
    expect(config.server.name).toBe("Land of OZ Valheim");
  });

  it("updateConfig deep-merges nested sections", async () => {
    // Set some initial custom values
    await updateServerConfig({ name: "Custom Name", port: 2460 });

    // Now update only port via updateConfig — name must survive
    await updateConfig({ server: { port: 9999 } as never });

    const config = await loadConfig();
    expect(config.server.port).toBe(9999);
    expect(config.server.name).toBe("Custom Name");
    // Defaults for other server fields still intact
    expect(config.server.world).toBe("Dedicated");
  });

  it("updateServerConfig updates server section only", async () => {
    await updateServerConfig({
      name: "Updated Server",
      port: 2458,
      crossplay: true,
    });

    const config = await loadConfig();
    expect(config.server.name).toBe("Updated Server");
    expect(config.server.port).toBe(2458);
    expect(config.server.crossplay).toBe(true);
    // Other server defaults remain
    expect(config.server.world).toBe("Dedicated");
    expect(config.server.public).toBe(false);
  });

  it("updateWatchdogConfig updates watchdog section only", async () => {
    await updateWatchdogConfig({
      enabled: false,
      maxRestarts: 10,
    });

    const config = await loadConfig();
    expect(config.watchdog.enabled).toBe(false);
    expect(config.watchdog.maxRestarts).toBe(10);
    // Other watchdog defaults remain
    expect(config.watchdog.restartDelay).toBe(5000);
  });

  it("updateTuiConfig updates TUI section only", async () => {
    await updateTuiConfig({
      colorScheme: "light",
      animationsEnabled: false,
    });

    const config = await loadConfig();
    expect(config.tui.colorScheme).toBe("light");
    expect(config.tui.animationsEnabled).toBe(false);
    // Other TUI defaults remain
    expect(config.tui.logMaxLines).toBe(100);
  });

  it("resetConfig restores all defaults", async () => {
    // First modify config
    await updateConfig({ autoUpdate: false });
    await updateServerConfig({ name: "Modified", port: 9999 });

    // Reset
    await resetConfig();
    const config = await loadConfig();

    // Verify defaults restored
    expect(config.server.name).toBe("Land of OZ Valheim");
    expect(config.server.port).toBe(2456);
    expect(config.autoUpdate).toBe(true);
  });
});

describe("world management", () => {
  beforeEach(async () => {
    await resetConfig();
  });

  afterEach(async () => {
    await resetConfig();
  });

  it("addWorld adds a new world", async () => {
    await addWorld({ name: "TestWorld1" });

    const worlds = await getWorlds();
    expect(worlds.length).toBe(1);
    expect(worlds[0].name).toBe("TestWorld1");
  });

  it("addWorld does not duplicate worlds", async () => {
    await addWorld({ name: "DuplicateWorld" });
    await addWorld({ name: "DuplicateWorld" });

    const worlds = await getWorlds();
    expect(worlds.length).toBe(1);
  });

  it("addWorld preserves optional fields", async () => {
    await addWorld({
      name: "WorldWithSeed",
      seed: "abc123",
      saveDir: "/custom/path",
    });

    const worlds = await getWorlds();
    expect(worlds.length).toBe(1);
    expect(worlds[0].name).toBe("WorldWithSeed");
    expect(worlds[0].seed).toBe("abc123");
    expect(worlds[0].saveDir).toBe("/custom/path");
  });

  it("removeWorld removes existing world", async () => {
    await addWorld({ name: "ToRemove" });
    await addWorld({ name: "ToKeep" });

    let worlds = await getWorlds();
    expect(worlds.length).toBe(2);

    await removeWorld("ToRemove");

    worlds = await getWorlds();
    expect(worlds.length).toBe(1);
    expect(worlds[0].name).toBe("ToKeep");
  });

  it("removeWorld clears activeWorld if it was the active one", async () => {
    await addWorld({ name: "ActiveWorld" });
    await setActiveWorld("ActiveWorld");

    let active = await getActiveWorld();
    expect(active?.name).toBe("ActiveWorld");

    await removeWorld("ActiveWorld");

    active = await getActiveWorld();
    expect(active).toBeNull();
  });

  it("setActiveWorld sets the active world", async () => {
    await addWorld({ name: "World1" });
    await addWorld({ name: "World2" });

    await setActiveWorld("World1");

    let active = await getActiveWorld();
    expect(active?.name).toBe("World1");

    await setActiveWorld("World2");

    active = await getActiveWorld();
    expect(active?.name).toBe("World2");
  });

  it("setActiveWorld(null) clears active world", async () => {
    await addWorld({ name: "SomeWorld" });
    await setActiveWorld("SomeWorld");

    let active = await getActiveWorld();
    expect(active?.name).toBe("SomeWorld");

    await setActiveWorld(null);

    active = await getActiveWorld();
    expect(active).toBeNull();
  });

  it("setActiveWorld throws for nonexistent world", async () => {
    await expect(setActiveWorld("NonExistent")).rejects.toThrow("not found");
  });

  it("getWorlds returns empty array initially", async () => {
    const worlds = await getWorlds();
    expect(Array.isArray(worlds)).toBe(true);
    expect(worlds.length).toBe(0);
  });

  it("getActiveWorld returns null initially", async () => {
    const active = await getActiveWorld();
    expect(active).toBeNull();
  });
});
