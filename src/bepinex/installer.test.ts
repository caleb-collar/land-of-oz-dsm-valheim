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
  BEPINEX_VERSIONS,
  uninstallBepInEx,
  verifyBepInExSetup,
} from "./installer.js";
import { isBepInExInstalled } from "./paths.js";

afterEach(() => {
  vi.resetAllMocks();
});

describe("BepInEx Installer", () => {
  describe("BEPINEX_VERSIONS", () => {
    it("has thunderstore version", () => {
      expect(BEPINEX_VERSIONS.thunderstore).toBeDefined();
      expect(BEPINEX_VERSIONS.thunderstore).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it("has github version", () => {
      expect(BEPINEX_VERSIONS.github).toBeDefined();
      expect(BEPINEX_VERSIONS.github).toMatch(/^\d+\.\d+\.\d+\.\d+$/);
    });
  });

  describe("BEPINEX_URLS", () => {
    it("has valheimPack URL pointing to thunderstore.io", () => {
      expect(BEPINEX_URLS.valheimPack).toBeDefined();
      expect(BEPINEX_URLS.valheimPack).toContain("thunderstore.io");
      expect(BEPINEX_URLS.valheimPack).toContain(BEPINEX_VERSIONS.thunderstore);
    });

    it("has platform-specific generic fallback URLs", () => {
      expect(BEPINEX_URLS.generic.win32).toContain("github.com");
      expect(BEPINEX_URLS.generic.linux).toContain("github.com");
      expect(BEPINEX_URLS.generic.darwin).toContain("github.com");
    });

    it("generic URLs include the correct version", () => {
      expect(BEPINEX_URLS.generic.win32).toContain(BEPINEX_VERSIONS.github);
      expect(BEPINEX_URLS.generic.linux).toContain(BEPINEX_VERSIONS.github);
      expect(BEPINEX_URLS.generic.darwin).toContain(BEPINEX_VERSIONS.github);
    });

    it("all URLs are valid format", () => {
      expect(() => new URL(BEPINEX_URLS.valheimPack)).not.toThrow();
      expect(() => new URL(BEPINEX_URLS.generic.win32)).not.toThrow();
      expect(() => new URL(BEPINEX_URLS.generic.linux)).not.toThrow();
      expect(() => new URL(BEPINEX_URLS.generic.darwin)).not.toThrow();
    });

    it("generic URLs contain correct platform identifiers", () => {
      expect(BEPINEX_URLS.generic.win32).toContain("win_x64");
      expect(BEPINEX_URLS.generic.linux).toContain("linux_x64");
      expect(BEPINEX_URLS.generic.darwin).toContain("macos_universal");
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
