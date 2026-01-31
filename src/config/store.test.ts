/**
 * Integration tests for configuration persistence
 */

import { assertEquals, assertExists } from "@std/assert";
import {
  addWorld,
  closeConfig,
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
} from "./store.ts";

// Use a test database path by temporarily modifying the module's behavior
// These tests verify the full persistence cycle

Deno.test({
  name: "loadConfig returns valid defaults on first load",
  async fn() {
    // Reset to ensure fresh state
    await resetConfig();

    const config = await loadConfig();

    assertExists(config);
    assertEquals(config.version, 1);
    assertEquals(config.server.name, "Land of OZ Valheim");
    assertEquals(config.server.port, 2456);
    assertEquals(config.server.world, "Dedicated");
    assertEquals(config.watchdog.enabled, true);
    assertEquals(config.tui.colorScheme, "dark");
    assertEquals(config.worlds.length, 0);
    assertEquals(config.activeWorld, null);

    await closeConfig();
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "saveConfig and loadConfig roundtrip works",
  async fn() {
    await resetConfig();
    const original = await loadConfig();

    // Modify some values
    original.server.name = "Test Server";
    original.server.port = 2460;
    original.autoUpdate = false;

    // Save and reload
    await saveConfig(original);
    const loaded = await loadConfig();

    assertEquals(loaded.server.name, "Test Server");
    assertEquals(loaded.server.port, 2460);
    assertEquals(loaded.autoUpdate, false);

    // Cleanup
    await resetConfig();
    await closeConfig();
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "updateConfig merges partial config correctly",
  async fn() {
    await resetConfig();

    // Update just one field
    await updateConfig({ autoUpdate: false });

    const config = await loadConfig();
    assertEquals(config.autoUpdate, false);
    // Other defaults should remain
    assertEquals(config.server.name, "Land of OZ Valheim");

    // Cleanup
    await resetConfig();
    await closeConfig();
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "updateServerConfig updates server section only",
  async fn() {
    await resetConfig();

    await updateServerConfig({
      name: "Updated Server",
      port: 2458,
      crossplay: true,
    });

    const config = await loadConfig();
    assertEquals(config.server.name, "Updated Server");
    assertEquals(config.server.port, 2458);
    assertEquals(config.server.crossplay, true);
    // Other server defaults remain
    assertEquals(config.server.world, "Dedicated");
    assertEquals(config.server.public, false);

    // Cleanup
    await resetConfig();
    await closeConfig();
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "updateWatchdogConfig updates watchdog section only",
  async fn() {
    await resetConfig();

    await updateWatchdogConfig({
      enabled: false,
      maxRestarts: 10,
    });

    const config = await loadConfig();
    assertEquals(config.watchdog.enabled, false);
    assertEquals(config.watchdog.maxRestarts, 10);
    // Other watchdog defaults remain
    assertEquals(config.watchdog.restartDelay, 5000);

    // Cleanup
    await resetConfig();
    await closeConfig();
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "updateTuiConfig updates TUI section only",
  async fn() {
    await resetConfig();

    await updateTuiConfig({
      colorScheme: "light",
      animationsEnabled: false,
    });

    const config = await loadConfig();
    assertEquals(config.tui.colorScheme, "light");
    assertEquals(config.tui.animationsEnabled, false);
    // Other TUI defaults remain
    assertEquals(config.tui.logMaxLines, 100);

    // Cleanup
    await resetConfig();
    await closeConfig();
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "resetConfig restores all defaults",
  async fn() {
    // First modify config
    await updateConfig({ autoUpdate: false });
    await updateServerConfig({ name: "Modified", port: 9999 });

    // Reset
    await resetConfig();
    const config = await loadConfig();

    // Verify defaults restored
    assertEquals(config.server.name, "Land of OZ Valheim");
    assertEquals(config.server.port, 2456);
    assertEquals(config.autoUpdate, true);

    await closeConfig();
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

// World management tests

Deno.test({
  name: "addWorld adds a new world",
  async fn() {
    await resetConfig();

    await addWorld({ name: "TestWorld1" });

    const worlds = await getWorlds();
    assertEquals(worlds.length, 1);
    assertEquals(worlds[0].name, "TestWorld1");

    await resetConfig();
    await closeConfig();
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "addWorld does not duplicate worlds",
  async fn() {
    await resetConfig();

    await addWorld({ name: "DuplicateWorld" });
    await addWorld({ name: "DuplicateWorld" });

    const worlds = await getWorlds();
    assertEquals(worlds.length, 1);

    await resetConfig();
    await closeConfig();
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "addWorld preserves optional fields",
  async fn() {
    await resetConfig();

    await addWorld({
      name: "WorldWithSeed",
      seed: "abc123",
      saveDir: "/custom/path",
    });

    const worlds = await getWorlds();
    assertEquals(worlds.length, 1);
    assertEquals(worlds[0].name, "WorldWithSeed");
    assertEquals(worlds[0].seed, "abc123");
    assertEquals(worlds[0].saveDir, "/custom/path");

    await resetConfig();
    await closeConfig();
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "removeWorld removes existing world",
  async fn() {
    await resetConfig();

    await addWorld({ name: "ToRemove" });
    await addWorld({ name: "ToKeep" });

    let worlds = await getWorlds();
    assertEquals(worlds.length, 2);

    await removeWorld("ToRemove");

    worlds = await getWorlds();
    assertEquals(worlds.length, 1);
    assertEquals(worlds[0].name, "ToKeep");

    await resetConfig();
    await closeConfig();
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "removeWorld clears activeWorld if it was the active one",
  async fn() {
    await resetConfig();

    await addWorld({ name: "ActiveWorld" });
    await setActiveWorld("ActiveWorld");

    let active = await getActiveWorld();
    assertEquals(active?.name, "ActiveWorld");

    await removeWorld("ActiveWorld");

    active = await getActiveWorld();
    assertEquals(active, null);

    await resetConfig();
    await closeConfig();
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "setActiveWorld sets the active world",
  async fn() {
    await resetConfig();

    await addWorld({ name: "World1" });
    await addWorld({ name: "World2" });

    await setActiveWorld("World1");

    let active = await getActiveWorld();
    assertEquals(active?.name, "World1");

    await setActiveWorld("World2");

    active = await getActiveWorld();
    assertEquals(active?.name, "World2");

    await resetConfig();
    await closeConfig();
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "setActiveWorld(null) clears active world",
  async fn() {
    await resetConfig();

    await addWorld({ name: "SomeWorld" });
    await setActiveWorld("SomeWorld");

    let active = await getActiveWorld();
    assertEquals(active?.name, "SomeWorld");

    await setActiveWorld(null);

    active = await getActiveWorld();
    assertEquals(active, null);

    await resetConfig();
    await closeConfig();
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "setActiveWorld throws for nonexistent world",
  async fn() {
    await resetConfig();

    let threw = false;
    try {
      await setActiveWorld("NonExistent");
    } catch (e) {
      threw = true;
      assertEquals((e as Error).message.includes("not found"), true);
    }

    assertEquals(threw, true);

    await closeConfig();
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "getWorlds returns empty array initially",
  async fn() {
    await resetConfig();

    const worlds = await getWorlds();
    assertEquals(Array.isArray(worlds), true);
    assertEquals(worlds.length, 0);

    await closeConfig();
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "getActiveWorld returns null initially",
  async fn() {
    await resetConfig();

    const active = await getActiveWorld();
    assertEquals(active, null);

    await closeConfig();
  },
  sanitizeResources: false,
  sanitizeOps: false,
});
