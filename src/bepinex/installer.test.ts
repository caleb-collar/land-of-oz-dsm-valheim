/**
 * Unit tests for BepInEx installer
 */

import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("node:fs/promises", () => ({
  default: {
    access: vi.fn(),
    rm: vi.fn(),
    unlink: vi.fn(),
    mkdir: vi.fn(),
  },
}));

vi.mock("../utils/platform.js", () => ({
  getValheimServerDir: vi.fn(() => "/mock/server"),
}));

vi.mock("./paths.js", () => ({
  getBepInExPath: vi.fn(() => "/mock/server/BepInEx"),
  getPluginsPath: vi.fn(() => "/mock/server/BepInEx/plugins"),
  getDisabledPluginsPath: vi.fn(() => "/mock/server/BepInEx/plugins_disabled"),
  getConfigPath: vi.fn(() => "/mock/server/BepInEx/config"),
  isBepInExInstalled: vi.fn(),
}));

import fs from "node:fs/promises";
import {
  BEPINEX_URLS,
  uninstallBepInEx,
  verifyBepInExSetup,
} from "./installer.js";
import { isBepInExInstalled } from "./paths.js";

afterEach(() => {
  vi.resetAllMocks();
});

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

  describe("uninstallBepInEx", () => {
    it("removes BepInEx directory and doorstop files", async () => {
      vi.mocked(fs.rm).mockResolvedValue(undefined);
      vi.mocked(fs.unlink).mockResolvedValue(undefined);

      await uninstallBepInEx("/server");

      expect(fs.rm).toHaveBeenCalledWith(expect.stringContaining("BepInEx"), {
        recursive: true,
        force: true,
      });
      // doorstop_config.ini, winhttp.dll, .doorstop_version
      expect(fs.unlink).toHaveBeenCalledTimes(3);
    });

    it("ignores errors when files do not exist", async () => {
      vi.mocked(fs.rm).mockRejectedValue(new Error("ENOENT"));
      vi.mocked(fs.unlink).mockRejectedValue(new Error("ENOENT"));

      await expect(uninstallBepInEx("/server")).resolves.toBeUndefined();
    });

    it("uses default server dir when none provided", async () => {
      vi.mocked(fs.rm).mockResolvedValue(undefined);
      vi.mocked(fs.unlink).mockResolvedValue(undefined);

      await uninstallBepInEx();
      expect(fs.rm).toHaveBeenCalled();
    });
  });

  describe("verifyBepInExSetup", () => {
    it("returns invalid when BepInEx not installed", async () => {
      vi.mocked(isBepInExInstalled).mockResolvedValue(false);

      const result = await verifyBepInExSetup("/server");
      expect(result.valid).toBe(false);
      expect(result.message).toContain("not installed");
    });

    it("returns invalid when doorstop config missing", async () => {
      vi.mocked(isBepInExInstalled).mockResolvedValue(true);
      vi.mocked(fs.access).mockRejectedValueOnce(new Error("ENOENT"));

      const result = await verifyBepInExSetup("/server");
      expect(result.valid).toBe(false);
      expect(result.message).toContain("doorstop_config.ini");
    });

    it("returns valid when all checks pass (non-Windows)", async () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, "platform", { value: "linux" });

      vi.mocked(isBepInExInstalled).mockResolvedValue(true);
      vi.mocked(fs.access).mockResolvedValue(undefined);

      const result = await verifyBepInExSetup("/server");
      expect(result.valid).toBe(true);
      expect(result.message).toContain("verified");

      Object.defineProperty(process, "platform", { value: originalPlatform });
    });
  });
});
