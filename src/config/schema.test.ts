/**
 * Unit tests for configuration schemas
 */

import { assertEquals } from "@std/assert";
import {
  AppConfigSchema,
  CombatModifierSchema,
  DeathPenaltySchema,
  ModifiersSchema,
  PortalModeSchema,
  PresetSchema,
  ResourceModifierSchema,
  ServerConfigSchema,
  TuiConfigSchema,
  WatchdogConfigSchema,
  WorldSchema,
} from "./schema.ts";

// Preset schema tests
Deno.test("PresetSchema validates valid presets", () => {
  const validPresets = [
    "normal",
    "casual",
    "easy",
    "hard",
    "hardcore",
    "immersive",
    "hammer",
  ];

  for (const preset of validPresets) {
    const result = PresetSchema.safeParse(preset);
    assertEquals(result.success, true, `Should accept preset: ${preset}`);
  }
});

Deno.test("PresetSchema rejects invalid presets", () => {
  const result = PresetSchema.safeParse("invalid");
  assertEquals(result.success, false);
});

// Combat modifier tests
Deno.test("CombatModifierSchema validates all options", () => {
  const valid = ["veryeasy", "easy", "default", "hard", "veryhard"];

  for (const mod of valid) {
    const result = CombatModifierSchema.safeParse(mod);
    assertEquals(result.success, true, `Should accept: ${mod}`);
  }
});

// Death penalty tests
Deno.test("DeathPenaltySchema validates all options", () => {
  const valid = ["casual", "veryeasy", "easy", "default", "hard", "hardcore"];

  for (const penalty of valid) {
    const result = DeathPenaltySchema.safeParse(penalty);
    assertEquals(result.success, true, `Should accept: ${penalty}`);
  }
});

// Resource modifier tests
Deno.test("ResourceModifierSchema validates all options", () => {
  const valid = ["muchless", "less", "default", "more", "muchmore", "most"];

  for (const mod of valid) {
    const result = ResourceModifierSchema.safeParse(mod);
    assertEquals(result.success, true, `Should accept: ${mod}`);
  }
});

// Portal mode tests
Deno.test("PortalModeSchema validates all options", () => {
  const valid = ["default", "casual", "hard", "veryhard"];

  for (const mode of valid) {
    const result = PortalModeSchema.safeParse(mode);
    assertEquals(result.success, true, `Should accept: ${mode}`);
  }
});

// Modifiers schema tests
Deno.test("ModifiersSchema provides defaults", () => {
  const result = ModifiersSchema.parse({});

  assertEquals(result.combat, "default");
  assertEquals(result.deathpenalty, "default");
  assertEquals(result.resources, "default");
  assertEquals(result.raids, true);
  assertEquals(result.portals, "default");
});

Deno.test("ModifiersSchema accepts full config", () => {
  const config = {
    combat: "hard",
    deathpenalty: "hardcore",
    resources: "less",
    raids: false,
    portals: "casual",
  };

  const result = ModifiersSchema.safeParse(config);
  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.data.combat, "hard");
    assertEquals(result.data.deathpenalty, "hardcore");
    assertEquals(result.data.resources, "less");
    assertEquals(result.data.raids, false);
    assertEquals(result.data.portals, "casual");
  }
});

// World schema tests
Deno.test("WorldSchema validates valid world", () => {
  const world = { name: "MyWorld" };
  const result = WorldSchema.safeParse(world);
  assertEquals(result.success, true);
});

Deno.test("WorldSchema accepts optional fields", () => {
  const world = {
    name: "TestWorld",
    seed: "abcdef123",
    saveDir: "/custom/path",
  };
  const result = WorldSchema.safeParse(world);
  assertEquals(result.success, true);
});

Deno.test("WorldSchema rejects empty name", () => {
  const world = { name: "" };
  const result = WorldSchema.safeParse(world);
  assertEquals(result.success, false);
});

Deno.test("WorldSchema rejects name over 64 chars", () => {
  const world = { name: "a".repeat(65) };
  const result = WorldSchema.safeParse(world);
  assertEquals(result.success, false);
});

// Server config tests
Deno.test("ServerConfigSchema provides all defaults", () => {
  const result = ServerConfigSchema.parse({});

  assertEquals(result.name, "Land of OZ Valheim");
  assertEquals(result.port, 2456);
  assertEquals(result.password, "");
  assertEquals(result.world, "Dedicated");
  assertEquals(result.public, false);
  assertEquals(result.crossplay, false);
  assertEquals(result.saveinterval, 1800);
  assertEquals(result.backups, 4);
});

Deno.test("ServerConfigSchema validates port range", () => {
  // Valid port
  const valid = ServerConfigSchema.safeParse({ port: 2456 });
  assertEquals(valid.success, true);

  // Too low
  const tooLow = ServerConfigSchema.safeParse({ port: 80 });
  assertEquals(tooLow.success, false);

  // Too high
  const tooHigh = ServerConfigSchema.safeParse({ port: 70000 });
  assertEquals(tooHigh.success, false);
});

Deno.test("ServerConfigSchema validates password rules", () => {
  // Empty password is valid
  const empty = ServerConfigSchema.safeParse({ password: "" });
  assertEquals(empty.success, true);

  // 5+ char password is valid
  const valid = ServerConfigSchema.safeParse({ password: "12345" });
  assertEquals(valid.success, true);

  // 1-4 char password is invalid
  const invalid = ServerConfigSchema.safeParse({ password: "1234" });
  assertEquals(invalid.success, false);
});

Deno.test("ServerConfigSchema validates server name length", () => {
  // Min length
  const minValid = ServerConfigSchema.safeParse({ name: "A" });
  assertEquals(minValid.success, true);

  // Max length
  const maxValid = ServerConfigSchema.safeParse({ name: "A".repeat(64) });
  assertEquals(maxValid.success, true);

  // Too long
  const tooLong = ServerConfigSchema.safeParse({ name: "A".repeat(65) });
  assertEquals(tooLong.success, false);

  // Empty (invalid)
  const empty = ServerConfigSchema.safeParse({ name: "" });
  assertEquals(empty.success, false);
});

// Watchdog config tests
Deno.test("WatchdogConfigSchema provides defaults", () => {
  const result = WatchdogConfigSchema.parse({});

  assertEquals(result.enabled, true);
  assertEquals(result.maxRestarts, 5);
  assertEquals(result.restartDelay, 5000);
  assertEquals(result.cooldownPeriod, 300000);
  assertEquals(result.backoffMultiplier, 2);
});

Deno.test("WatchdogConfigSchema validates ranges", () => {
  // maxRestarts: 0-100
  const validMax = WatchdogConfigSchema.safeParse({ maxRestarts: 50 });
  assertEquals(validMax.success, true);

  const invalidMax = WatchdogConfigSchema.safeParse({ maxRestarts: 101 });
  assertEquals(invalidMax.success, false);

  // backoffMultiplier: 1-10
  const validBackoff = WatchdogConfigSchema.safeParse({ backoffMultiplier: 5 });
  assertEquals(validBackoff.success, true);

  const invalidBackoff = WatchdogConfigSchema.safeParse({
    backoffMultiplier: 11,
  });
  assertEquals(invalidBackoff.success, false);
});

// TUI config tests
Deno.test("TuiConfigSchema provides defaults", () => {
  const result = TuiConfigSchema.parse({});

  assertEquals(result.colorScheme, "dark");
  assertEquals(result.animationsEnabled, true);
  assertEquals(result.logMaxLines, 100);
  assertEquals(result.refreshRate, 1000);
});

Deno.test("TuiConfigSchema validates colorScheme enum", () => {
  const valid = ["dark", "light", "auto"];
  for (const scheme of valid) {
    const result = TuiConfigSchema.safeParse({ colorScheme: scheme });
    assertEquals(result.success, true, `Should accept: ${scheme}`);
  }

  const invalid = TuiConfigSchema.safeParse({ colorScheme: "invalid" });
  assertEquals(invalid.success, false);
});

Deno.test("TuiConfigSchema validates logMaxLines range", () => {
  // Min: 10
  const validMin = TuiConfigSchema.safeParse({ logMaxLines: 10 });
  assertEquals(validMin.success, true);

  const invalidMin = TuiConfigSchema.safeParse({ logMaxLines: 5 });
  assertEquals(invalidMin.success, false);

  // Max: 1000
  const validMax = TuiConfigSchema.safeParse({ logMaxLines: 1000 });
  assertEquals(validMax.success, true);

  const invalidMax = TuiConfigSchema.safeParse({ logMaxLines: 1001 });
  assertEquals(invalidMax.success, false);
});

// App config tests
Deno.test("AppConfigSchema provides complete defaults", () => {
  const result = AppConfigSchema.parse({});

  assertEquals(result.version, 1);
  assertEquals(typeof result.server, "object");
  assertEquals(typeof result.watchdog, "object");
  assertEquals(typeof result.tui, "object");
  assertEquals(Array.isArray(result.worlds), true);
  assertEquals(result.worlds.length, 0);
  assertEquals(result.activeWorld, null);
  assertEquals(result.steamcmdAutoInstall, true);
  assertEquals(result.autoUpdate, true);
});

Deno.test("AppConfigSchema validates nested server config", () => {
  const config = {
    server: {
      name: "Custom Server",
      port: 2457,
      crossplay: true,
    },
  };

  const result = AppConfigSchema.safeParse(config);
  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.data.server.name, "Custom Server");
    assertEquals(result.data.server.port, 2457);
    assertEquals(result.data.server.crossplay, true);
    // Defaults should fill in
    assertEquals(result.data.server.password, "");
    assertEquals(result.data.server.world, "Dedicated");
  }
});

Deno.test("AppConfigSchema validates worlds array", () => {
  const config = {
    worlds: [{ name: "World1" }, { name: "World2", seed: "myseed" }],
    activeWorld: "World1",
  };

  const result = AppConfigSchema.safeParse(config);
  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.data.worlds.length, 2);
    assertEquals(result.data.worlds[0].name, "World1");
    assertEquals(result.data.worlds[1].seed, "myseed");
    assertEquals(result.data.activeWorld, "World1");
  }
});

Deno.test("AppConfigSchema rejects invalid worlds", () => {
  const config = {
    worlds: [
      { name: "" }, // Invalid: empty name
    ],
  };

  const result = AppConfigSchema.safeParse(config);
  assertEquals(result.success, false);
});
