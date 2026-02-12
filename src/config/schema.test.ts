/**
 * Unit tests for configuration schemas
 */

import { describe, expect, it } from "vitest";
import {
  AppConfigSchema,
  BepInExConfigSchema,
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
} from "./schema.js";

describe("PresetSchema", () => {
  it("validates valid presets", () => {
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
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid presets", () => {
    const result = PresetSchema.safeParse("invalid");
    expect(result.success).toBe(false);
  });
});

describe("CombatModifierSchema", () => {
  it("validates all options", () => {
    const valid = ["veryeasy", "easy", "default", "hard", "veryhard"];

    for (const mod of valid) {
      const result = CombatModifierSchema.safeParse(mod);
      expect(result.success).toBe(true);
    }
  });
});

describe("DeathPenaltySchema", () => {
  it("validates all options", () => {
    const valid = ["casual", "veryeasy", "easy", "default", "hard", "hardcore"];

    for (const penalty of valid) {
      const result = DeathPenaltySchema.safeParse(penalty);
      expect(result.success).toBe(true);
    }
  });
});

describe("ResourceModifierSchema", () => {
  it("validates all options", () => {
    const valid = ["muchless", "less", "default", "more", "muchmore", "most"];

    for (const mod of valid) {
      const result = ResourceModifierSchema.safeParse(mod);
      expect(result.success).toBe(true);
    }
  });
});

describe("PortalModeSchema", () => {
  it("validates all options", () => {
    const valid = ["default", "casual", "hard", "veryhard"];

    for (const mode of valid) {
      const result = PortalModeSchema.safeParse(mode);
      expect(result.success).toBe(true);
    }
  });
});

describe("ModifiersSchema", () => {
  it("provides defaults", () => {
    const result = ModifiersSchema.parse({});

    expect(result.combat).toBe("default");
    expect(result.deathpenalty).toBe("default");
    expect(result.resources).toBe("default");
    expect(result.raids).toBe(true);
    expect(result.portals).toBe("default");
  });

  it("accepts full config", () => {
    const config = {
      combat: "hard",
      deathpenalty: "hardcore",
      resources: "less",
      raids: false,
      portals: "casual",
    };

    const result = ModifiersSchema.safeParse(config);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.combat).toBe("hard");
      expect(result.data.deathpenalty).toBe("hardcore");
      expect(result.data.resources).toBe("less");
      expect(result.data.raids).toBe(false);
      expect(result.data.portals).toBe("casual");
    }
  });
});

describe("WorldSchema", () => {
  it("validates valid world", () => {
    const world = { name: "MyWorld" };
    const result = WorldSchema.safeParse(world);
    expect(result.success).toBe(true);
  });

  it("accepts optional fields", () => {
    const world = {
      name: "TestWorld",
      seed: "abcdef123",
      saveDir: "/custom/path",
    };
    const result = WorldSchema.safeParse(world);
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const world = { name: "" };
    const result = WorldSchema.safeParse(world);
    expect(result.success).toBe(false);
  });

  it("rejects name over 64 chars", () => {
    const world = { name: "a".repeat(65) };
    const result = WorldSchema.safeParse(world);
    expect(result.success).toBe(false);
  });
});

describe("ServerConfigSchema", () => {
  it("provides all defaults", () => {
    const result = ServerConfigSchema.parse({});

    expect(result.name).toBe("Land of OZ Valheim");
    expect(result.port).toBe(2456);
    expect(result.password).toBe("");
    expect(result.world).toBe("Dedicated");
    expect(result.public).toBe(false);
    expect(result.crossplay).toBe(false);
    expect(result.saveinterval).toBe(1800);
    expect(result.backups).toBe(4);
  });

  it("validates port range", () => {
    // Valid port
    const valid = ServerConfigSchema.safeParse({ port: 2456 });
    expect(valid.success).toBe(true);

    // Too low
    const tooLow = ServerConfigSchema.safeParse({ port: 80 });
    expect(tooLow.success).toBe(false);

    // Too high
    const tooHigh = ServerConfigSchema.safeParse({ port: 70000 });
    expect(tooHigh.success).toBe(false);
  });

  it("validates password rules", () => {
    // Empty password is valid
    const empty = ServerConfigSchema.safeParse({ password: "" });
    expect(empty.success).toBe(true);

    // 5+ char password is valid
    const valid = ServerConfigSchema.safeParse({ password: "12345" });
    expect(valid.success).toBe(true);

    // 1-4 char password is invalid
    const invalid = ServerConfigSchema.safeParse({ password: "1234" });
    expect(invalid.success).toBe(false);
  });

  it("validates server name length", () => {
    // Min length
    const minValid = ServerConfigSchema.safeParse({ name: "A" });
    expect(minValid.success).toBe(true);

    // Max length
    const maxValid = ServerConfigSchema.safeParse({ name: "A".repeat(64) });
    expect(maxValid.success).toBe(true);

    // Too long
    const tooLong = ServerConfigSchema.safeParse({ name: "A".repeat(65) });
    expect(tooLong.success).toBe(false);

    // Empty (invalid)
    const empty = ServerConfigSchema.safeParse({ name: "" });
    expect(empty.success).toBe(false);
  });
});

describe("WatchdogConfigSchema", () => {
  it("provides defaults", () => {
    const result = WatchdogConfigSchema.parse({});

    expect(result.enabled).toBe(true);
    expect(result.maxRestarts).toBe(5);
    expect(result.restartDelay).toBe(5000);
    expect(result.cooldownPeriod).toBe(300000);
    expect(result.backoffMultiplier).toBe(2);
  });

  it("validates ranges", () => {
    // maxRestarts: 0-100
    const validMax = WatchdogConfigSchema.safeParse({ maxRestarts: 50 });
    expect(validMax.success).toBe(true);

    const invalidMax = WatchdogConfigSchema.safeParse({ maxRestarts: 101 });
    expect(invalidMax.success).toBe(false);

    // backoffMultiplier: 1-10
    const validBackoff = WatchdogConfigSchema.safeParse({
      backoffMultiplier: 5,
    });
    expect(validBackoff.success).toBe(true);

    const invalidBackoff = WatchdogConfigSchema.safeParse({
      backoffMultiplier: 11,
    });
    expect(invalidBackoff.success).toBe(false);
  });
});

describe("TuiConfigSchema", () => {
  it("provides defaults", () => {
    const result = TuiConfigSchema.parse({});

    expect(result.colorScheme).toBe("dark");
    expect(result.animationsEnabled).toBe(true);
    expect(result.logMaxLines).toBe(100);
    expect(result.refreshRate).toBe(1000);
  });

  it("validates colorScheme enum", () => {
    const valid = ["dark", "light", "auto"];
    for (const scheme of valid) {
      const result = TuiConfigSchema.safeParse({ colorScheme: scheme });
      expect(result.success).toBe(true);
    }

    const invalid = TuiConfigSchema.safeParse({ colorScheme: "invalid" });
    expect(invalid.success).toBe(false);
  });

  it("validates logMaxLines range", () => {
    // Min: 10
    const validMin = TuiConfigSchema.safeParse({ logMaxLines: 10 });
    expect(validMin.success).toBe(true);

    const invalidMin = TuiConfigSchema.safeParse({ logMaxLines: 5 });
    expect(invalidMin.success).toBe(false);

    // Max: 1000
    const validMax = TuiConfigSchema.safeParse({ logMaxLines: 1000 });
    expect(validMax.success).toBe(true);

    const invalidMax = TuiConfigSchema.safeParse({ logMaxLines: 1001 });
    expect(invalidMax.success).toBe(false);
  });
});

describe("AppConfigSchema", () => {
  it("provides complete defaults", () => {
    const result = AppConfigSchema.parse({});

    expect(result.version).toBe(1);
    expect(typeof result.server).toBe("object");
    expect(typeof result.watchdog).toBe("object");
    expect(typeof result.tui).toBe("object");
    expect(Array.isArray(result.worlds)).toBe(true);
    expect(result.worlds.length).toBe(0);
    expect(result.activeWorld).toBeNull();
    expect(result.steamcmdAutoInstall).toBe(true);
    expect(result.autoUpdate).toBe(true);
  });

  it("validates nested server config", () => {
    const config = {
      server: {
        name: "Custom Server",
        port: 2457,
        crossplay: true,
      },
    };

    const result = AppConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.server.name).toBe("Custom Server");
      expect(result.data.server.port).toBe(2457);
      expect(result.data.server.crossplay).toBe(true);
      // Defaults should fill in
      expect(result.data.server.password).toBe("");
      expect(result.data.server.world).toBe("Dedicated");
    }
  });

  it("validates worlds array", () => {
    const config = {
      worlds: [{ name: "World1" }, { name: "World2", seed: "myseed" }],
      activeWorld: "World1",
    };

    const result = AppConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.worlds.length).toBe(2);
      expect(result.data.worlds[0].name).toBe("World1");
      expect(result.data.worlds[1].seed).toBe("myseed");
      expect(result.data.activeWorld).toBe("World1");
    }
  });

  it("rejects invalid worlds", () => {
    const config = {
      worlds: [
        { name: "" }, // Invalid: empty name
      ],
    };

    const result = AppConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it("includes bepinex config with defaults", () => {
    const result = AppConfigSchema.parse({});

    expect(result.bepinex).toBeDefined();
    expect(result.bepinex.autoInstall).toBe(false);
    expect(result.bepinex.enabledPlugins).toEqual([]);
    expect(result.bepinex.customPluginPaths).toEqual([]);
  });

  it("defaults rcon.enabled to true", () => {
    const result = AppConfigSchema.parse({});
    expect(result.rcon.enabled).toBe(true);
  });
});

describe("BepInExConfigSchema", () => {
  it("provides defaults", () => {
    const result = BepInExConfigSchema.parse({});

    expect(result.autoInstall).toBe(false);
    expect(result.enabledPlugins).toEqual([]);
    expect(result.customPluginPaths).toEqual([]);
  });

  it("accepts valid config", () => {
    const config = {
      autoInstall: true,
      enabledPlugins: ["bepinex-rcon", "server-devcommands"],
      customPluginPaths: ["/custom/path"],
    };

    const result = BepInExConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.autoInstall).toBe(true);
      expect(result.data.enabledPlugins).toHaveLength(2);
      expect(result.data.customPluginPaths).toHaveLength(1);
    }
  });

  it("accepts partial config with defaults", () => {
    const config = { autoInstall: true };
    const result = BepInExConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.autoInstall).toBe(true);
      expect(result.data.enabledPlugins).toEqual([]);
    }
  });
});
