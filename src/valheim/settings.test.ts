/**
 * Unit tests for Valheim settings definitions
 */

import { describe, expect, it } from "vitest";
import {
  CombatOptions,
  DeathPenaltyOptions,
  formatInterval,
  getCombatLabel,
  getDeathPenaltyLabel,
  getPortalLabel,
  getPresetLabel,
  getResourceLabel,
  PortalOptions,
  PresetOptions,
  ResourceOptions,
  ValheimSettings,
} from "./settings.js";

describe("ValheimSettings", () => {
  it("contains required server settings", () => {
    expect(ValheimSettings.name).toBeDefined();
    expect(ValheimSettings.port).toBeDefined();
    expect(ValheimSettings.world).toBeDefined();
    expect(ValheimSettings.password).toBeDefined();
  });

  it("name setting has correct metadata", () => {
    const setting = ValheimSettings.name;

    expect(setting.type).toBe("string");
    expect(setting.label).toBe("Server Name");
    expect(setting.required).toBe(true);
    expect(setting.min).toBe(1);
    expect(setting.max).toBe(64);
  });

  it("port setting has correct metadata", () => {
    const setting = ValheimSettings.port;

    expect(setting.type).toBe("number");
    expect(setting.default).toBe(2456);
    expect(setting.min).toBe(1024);
    expect(setting.max).toBe(65535);
  });

  it("password setting allows empty values", () => {
    const setting = ValheimSettings.password;

    expect(setting.required).toBe(false);
    expect(setting.secret).toBe(true);
    expect(setting.min).toBe(0);
  });

  it("boolean settings have correct types", () => {
    expect(ValheimSettings.public.type).toBe("boolean");
    expect(ValheimSettings.crossplay.type).toBe("boolean");
  });

  it("interval settings have units", () => {
    expect(ValheimSettings.saveinterval.unit).toBe("seconds");
    expect(ValheimSettings.backupshort.unit).toBe("seconds");
    expect(ValheimSettings.backuplong.unit).toBe("seconds");
  });

  it("all settings have labels and descriptions", () => {
    for (const [key, setting] of Object.entries(ValheimSettings)) {
      expect(setting.label, `${key} should have label`).toBeDefined();
      expect(
        setting.description,
        `${key} should have description`
      ).toBeDefined();
    }
  });
});

describe("PresetOptions", () => {
  it("contains all standard presets", () => {
    const values = PresetOptions.map((opt) => opt.value);

    expect(values).toContain("normal");
    expect(values).toContain("casual");
    expect(values).toContain("easy");
    expect(values).toContain("hard");
    expect(values).toContain("hardcore");
    expect(values).toContain("immersive");
    expect(values).toContain("hammer");
  });

  it("all presets have labels and descriptions", () => {
    for (const preset of PresetOptions) {
      expect(preset.value).toBeDefined();
      expect(preset.label).toBeDefined();
      expect(preset.description).toBeDefined();
    }
  });
});

describe("CombatOptions", () => {
  it("contains all combat difficulty levels", () => {
    const values = CombatOptions.map((opt) => opt.value);

    expect(values).toContain("veryeasy");
    expect(values).toContain("easy");
    expect(values).toContain("default");
    expect(values).toContain("hard");
    expect(values).toContain("veryhard");
  });

  it("all options have descriptions", () => {
    for (const option of CombatOptions) {
      expect(option.description).toBeDefined();
    }
  });
});

describe("DeathPenaltyOptions", () => {
  it("contains all death penalty levels", () => {
    const values = DeathPenaltyOptions.map((opt) => opt.value);

    expect(values).toContain("casual");
    expect(values).toContain("veryeasy");
    expect(values).toContain("easy");
    expect(values).toContain("default");
    expect(values).toContain("hard");
    expect(values).toContain("hardcore");
  });
});

describe("ResourceOptions", () => {
  it("contains all resource rate options", () => {
    const values = ResourceOptions.map((opt) => opt.value);

    expect(values).toContain("muchless");
    expect(values).toContain("less");
    expect(values).toContain("default");
    expect(values).toContain("more");
    expect(values).toContain("muchmore");
    expect(values).toContain("most");
  });

  it("resource rates are ordered from lowest to highest", () => {
    const descriptions = ResourceOptions.map((opt) => opt.description);

    expect(descriptions[0]).toContain("25%");
    expect(descriptions[1]).toContain("50%");
    expect(descriptions[5]).toContain("300%");
  });
});

describe("PortalOptions", () => {
  it("contains all portal restriction options", () => {
    const values = PortalOptions.map((opt) => opt.value);

    expect(values).toContain("default");
    expect(values).toContain("casual");
    expect(values).toContain("hard");
    expect(values).toContain("veryhard");
  });
});

describe("getPresetLabel", () => {
  it("returns label for valid preset", () => {
    expect(getPresetLabel("normal")).toBe("Normal");
    expect(getPresetLabel("hardcore")).toBe("Hardcore");
    expect(getPresetLabel("hammer")).toBe("Hammer");
  });

  it("returns value for unknown preset", () => {
    expect(getPresetLabel("unknown")).toBe("unknown");
    expect(getPresetLabel("custom")).toBe("custom");
  });

  it("handles empty string", () => {
    expect(getPresetLabel("")).toBe("");
  });
});

describe("getCombatLabel", () => {
  it("returns label for valid combat level", () => {
    expect(getCombatLabel("veryeasy")).toBe("Very Easy");
    expect(getCombatLabel("default")).toBe("Default");
    expect(getCombatLabel("veryhard")).toBe("Very Hard");
  });

  it("returns value for unknown level", () => {
    expect(getCombatLabel("unknown")).toBe("unknown");
  });
});

describe("getDeathPenaltyLabel", () => {
  it("returns label for valid penalty level", () => {
    expect(getDeathPenaltyLabel("casual")).toBe("Casual");
    expect(getDeathPenaltyLabel("default")).toBe("Default");
    expect(getDeathPenaltyLabel("hardcore")).toBe("Hardcore");
  });

  it("returns value for unknown level", () => {
    expect(getDeathPenaltyLabel("unknown")).toBe("unknown");
  });
});

describe("getResourceLabel", () => {
  it("returns label for valid resource rate", () => {
    expect(getResourceLabel("muchless")).toBe("Much Less");
    expect(getResourceLabel("default")).toBe("Default");
    expect(getResourceLabel("most")).toBe("Most");
  });

  it("returns value for unknown rate", () => {
    expect(getResourceLabel("unknown")).toBe("unknown");
  });
});

describe("getPortalLabel", () => {
  it("returns label for valid portal setting", () => {
    expect(getPortalLabel("default")).toBe("Default");
    expect(getPortalLabel("casual")).toBe("Casual");
    expect(getPortalLabel("veryhard")).toBe("Very Hard");
  });

  it("returns value for unknown setting", () => {
    expect(getPortalLabel("unknown")).toBe("unknown");
  });
});

describe("formatInterval", () => {
  it("formats seconds when less than 60", () => {
    expect(formatInterval(30)).toBe("30 seconds");
    expect(formatInterval(45)).toBe("45 seconds");
    expect(formatInterval(1)).toBe("1 seconds");
  });

  it("formats minutes when between 60 and 3599", () => {
    expect(formatInterval(60)).toBe("1 minute");
    expect(formatInterval(120)).toBe("2 minutes");
    expect(formatInterval(1800)).toBe("30 minutes");
    expect(formatInterval(3540)).toBe("59 minutes");
  });

  it("formats hours when 3600 or more", () => {
    expect(formatInterval(3600)).toBe("1 hour");
    expect(formatInterval(7200)).toBe("2 hours");
    expect(formatInterval(43200)).toBe("12 hours");
  });

  it("uses singular for 1 minute", () => {
    expect(formatInterval(60)).toBe("1 minute");
    expect(formatInterval(90)).toBe("2 minutes"); // Rounds to 2
  });

  it("uses singular for 1 hour", () => {
    expect(formatInterval(3600)).toBe("1 hour");
    expect(formatInterval(5400)).toBe("2 hours"); // Rounds to 2
  });

  it("rounds to nearest unit", () => {
    expect(formatInterval(90)).toBe("2 minutes"); // 1.5 minutes -> 2
    expect(formatInterval(5400)).toBe("2 hours"); // 1.5 hours -> 2
  });

  it("handles edge cases", () => {
    expect(formatInterval(0)).toBe("0 seconds");
    expect(formatInterval(59)).toBe("59 seconds");
    expect(formatInterval(3599)).toBe("60 minutes");
  });
});
