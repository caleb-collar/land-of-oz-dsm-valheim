/**
 * Unit tests for BepInEx installer
 */

import { describe, expect, it } from "vitest";
import { BEPINEX_URLS } from "./installer.js";

describe("BepInEx Installer", () => {
  describe("BEPINEX_URLS", () => {
    it("has valheimPack URL", () => {
      expect(BEPINEX_URLS.valheimPack).toBeDefined();
      expect(BEPINEX_URLS.valheimPack).toContain("thunderstore.io");
    });

    it("has generic fallback URL", () => {
      expect(BEPINEX_URLS.generic).toBeDefined();
      expect(BEPINEX_URLS.generic).toContain("github.com");
    });

    it("URLs are valid format", () => {
      expect(() => new URL(BEPINEX_URLS.valheimPack)).not.toThrow();
      expect(() => new URL(BEPINEX_URLS.generic)).not.toThrow();
    });
  });
});
