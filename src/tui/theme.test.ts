/**
 * Unit tests for TUI theme
 */

import { describe, expect, it } from "vitest";
import {
  borderStyles,
  getStatusColor,
  logColors,
  theme,
  valheimPalette,
} from "./theme.js";

describe("TUI theme", () => {
  describe("valheimPalette", () => {
    it("defines all Valheim colors", () => {
      expect(valheimPalette.mandarin).toBe("#F37A47");
      expect(valheimPalette.strawGold).toBe("#FCF983");
      expect(valheimPalette.brickyBrick).toBe("#B63C21");
      expect(valheimPalette.prune).toBe("#691E11");
      expect(valheimPalette.black).toBe("#000000");
      expect(valheimPalette.blackKnight).toBe("#001018");
      expect(valheimPalette.blueCollar).toBe("#01657C");
      expect(valheimPalette.waikiki).toBe("#018DA6");
    });

    it("all colors are hex format", () => {
      const hexRegex = /^#[0-9A-F]{6}$/i;

      for (const color of Object.values(valheimPalette)) {
        expect(color).toMatch(hexRegex);
      }
    });
  });

  describe("theme", () => {
    it("defines primary colors", () => {
      expect(theme.primary).toBe(valheimPalette.mandarin);
      expect(theme.secondary).toBe(valheimPalette.strawGold);
      expect(theme.accent).toBe(valheimPalette.waikiki);
    });

    it("defines state colors", () => {
      expect(theme.success).toBe("green");
      expect(theme.warning).toBe(valheimPalette.strawGold);
      expect(theme.error).toBe(valheimPalette.brickyBrick);
      expect(theme.muted).toBe("gray");
      expect(theme.info).toBe(valheimPalette.blueCollar);
    });

    it("defines server status colors", () => {
      expect(theme.serverOnline).toBe("green");
      expect(theme.serverStarting).toBe(valheimPalette.strawGold);
      expect(theme.serverOffline).toBe(valheimPalette.brickyBrick);
      expect(theme.serverStopping).toBe(valheimPalette.strawGold);
    });

    it("defines background color", () => {
      expect(theme.background).toBe(valheimPalette.blackKnight);
    });

    it("all theme properties are defined", () => {
      for (const value of Object.values(theme)) {
        expect(value).toBeDefined();
        expect(typeof value).toBe("string");
      }
    });
  });

  describe("logColors", () => {
    it("defines all log level colors", () => {
      expect(logColors.info).toBe("cyan");
      expect(logColors.warn).toBe("yellow");
      expect(logColors.error).toBe("red");
      expect(logColors.debug).toBe("gray");
    });

    it("has color for each log level", () => {
      const levels = ["info", "warn", "error", "debug"];

      for (const level of levels) {
        expect(logColors[level as keyof typeof logColors]).toBeDefined();
      }
    });
  });

  describe("getStatusColor", () => {
    it("returns correct color for online status", () => {
      const color = getStatusColor("online");

      expect(color).toBe(theme.serverOnline);
      expect(color).toBe("green");
    });

    it("returns correct color for starting status", () => {
      const color = getStatusColor("starting");

      expect(color).toBe(theme.serverStarting);
      expect(color).toBe(valheimPalette.strawGold);
    });

    it("returns correct color for stopping status", () => {
      const color = getStatusColor("stopping");

      expect(color).toBe(theme.serverStopping);
      expect(color).toBe(valheimPalette.strawGold);
    });

    it("returns correct color for offline status", () => {
      const color = getStatusColor("offline");

      expect(color).toBe(theme.serverOffline);
      expect(color).toBe(valheimPalette.brickyBrick);
    });

    it("handles all server states", () => {
      const states = ["offline", "starting", "online", "stopping"] as const;

      for (const state of states) {
        const color = getStatusColor(state);
        expect(color).toBeDefined();
        expect(typeof color).toBe("string");
      }
    });
  });

  describe("borderStyles", () => {
    it("defines all border styles", () => {
      expect(borderStyles.active).toBe("single");
      expect(borderStyles.inactive).toBe("single");
      expect(borderStyles.focus).toBe("double");
    });

    it("all border styles are valid", () => {
      const validStyles = ["single", "double"];

      for (const style of Object.values(borderStyles)) {
        expect(validStyles).toContain(style);
      }
    });
  });
});
