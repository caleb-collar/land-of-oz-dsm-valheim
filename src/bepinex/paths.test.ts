/**
 * Unit tests for BepInEx path resolution and detection
 */

import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../utils/platform.js", () => ({
  getValheimServerDir: vi.fn(() => "/mock/server"),
}));

vi.mock("node:fs/promises", () => ({
  default: {
    access: vi.fn(),
    readFile: vi.fn(),
    readdir: vi.fn(),
    mkdir: vi.fn(),
  },
}));

import fs from "node:fs/promises";
import {
  getBepInExPath,
  getBepInExVersion,
  getConfigPath,
  getCorePath,
  getDisabledPluginsPath,
  getPluginsPath,
  isBepInExInstalled,
  verifyBepInExInstallation,
} from "./paths.js";

afterEach(() => {
  vi.resetAllMocks();
});

describe("BepInEx Paths", () => {
  describe("path getters", () => {
    it("getBepInExPath uses default server dir", () => {
      const result = getBepInExPath();
      expect(result).toContain("BepInEx");
    });

    it("getBepInExPath uses custom dir", () => {
      const result = getBepInExPath("/custom/server");
      expect(result).toContain("custom");
      expect(result).toContain("server");
      expect(result).toContain("BepInEx");
    });

    it("getPluginsPath appends plugins", () => {
      const result = getPluginsPath("/server");
      expect(result).toContain("BepInEx");
      expect(result).toContain("plugins");
    });

    it("getDisabledPluginsPath appends plugins_disabled", () => {
      const result = getDisabledPluginsPath("/server");
      expect(result).toContain("plugins_disabled");
    });

    it("getConfigPath appends config", () => {
      const result = getConfigPath("/server");
      expect(result).toContain("config");
    });

    it("getCorePath appends core", () => {
      const result = getCorePath("/server");
      expect(result).toContain("core");
    });
  });

  describe("isBepInExInstalled", () => {
    it("returns true when core DLL exists", async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined);
      const result = await isBepInExInstalled("/server");
      expect(result).toBe(true);
    });

    it("returns false when core DLL missing", async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error("ENOENT"));
      const result = await isBepInExInstalled("/server");
      expect(result).toBe(false);
    });
  });

  describe("getBepInExVersion", () => {
    it("reads version from changelog.txt", async () => {
      vi.mocked(fs.readFile).mockResolvedValue("Version 5.4.2202\nChanges...");
      const version = await getBepInExVersion("/server");
      expect(version).toBe("5.4.2202");
    });

    it("reads version with v prefix", async () => {
      vi.mocked(fs.readFile).mockResolvedValue("v5.4.21.0 release notes");
      const version = await getBepInExVersion("/server");
      expect(version).toBe("5.4.21.0");
    });

    it("falls back to core directory filenames", async () => {
      // changelog.txt fails
      vi.mocked(fs.readFile).mockRejectedValue(new Error("ENOENT"));
      // readdir returns files with version in name
      vi.mocked(fs.readdir).mockResolvedValue([
        "BepInEx_5.4.21.dll",
        "other.dll",
      ] as unknown as Awaited<ReturnType<typeof fs.readdir>>);
      // isBepInExInstalled -> access succeeds
      vi.mocked(fs.access).mockResolvedValue(undefined);

      const version = await getBepInExVersion("/server");
      expect(version).toBe("5.4.21");
    });

    it("returns 'unknown' when installed but version not found", async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error("ENOENT"));
      vi.mocked(fs.readdir).mockResolvedValue([
        "other.dll",
      ] as unknown as Awaited<ReturnType<typeof fs.readdir>>);
      // isBepInExInstalled -> access succeeds
      vi.mocked(fs.access).mockResolvedValue(undefined);

      const version = await getBepInExVersion("/server");
      expect(version).toBe("unknown");
    });

    it("returns null when not installed", async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error("ENOENT"));
      vi.mocked(fs.readdir).mockResolvedValue([]);
      vi.mocked(fs.access).mockRejectedValue(new Error("ENOENT"));

      const version = await getBepInExVersion("/server");
      expect(version).toBeNull();
    });

    it("returns null on unexpected error", async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error("ENOENT"));
      vi.mocked(fs.readdir).mockRejectedValue(new Error("EPERM"));

      const version = await getBepInExVersion("/server");
      expect(version).toBeNull();
    });
  });

  describe("verifyBepInExInstallation", () => {
    it("returns valid when all checks pass", async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined);
      const result = await verifyBepInExInstallation("/server");
      expect(result.valid).toBe(true);
      expect(result.message).toContain("verified");
    });

    it("returns invalid when BepInEx dir missing", async () => {
      vi.mocked(fs.access).mockRejectedValueOnce(new Error("ENOENT"));
      const result = await verifyBepInExInstallation("/server");
      expect(result.valid).toBe(false);
      expect(result.message).toContain("directory not found");
    });

    it("returns invalid when core DLL missing", async () => {
      vi.mocked(fs.access)
        .mockResolvedValueOnce(undefined) // BepInEx dir
        .mockRejectedValueOnce(new Error("ENOENT")); // core DLL
      const result = await verifyBepInExInstallation("/server");
      expect(result.valid).toBe(false);
      expect(result.message).toContain("core DLL not found");
    });

    it("creates plugins directory if missing", async () => {
      vi.mocked(fs.access)
        .mockResolvedValueOnce(undefined) // BepInEx dir
        .mockResolvedValueOnce(undefined) // core DLL
        .mockRejectedValueOnce(new Error("ENOENT")) // plugins dir
        .mockResolvedValueOnce(undefined); // config dir
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);

      const result = await verifyBepInExInstallation("/server");
      expect(result.valid).toBe(true);
      expect(fs.mkdir).toHaveBeenCalled();
    });

    it("creates config directory if missing", async () => {
      vi.mocked(fs.access)
        .mockResolvedValueOnce(undefined) // BepInEx dir
        .mockResolvedValueOnce(undefined) // core DLL
        .mockResolvedValueOnce(undefined) // plugins dir
        .mockRejectedValueOnce(new Error("ENOENT")); // config dir
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);

      const result = await verifyBepInExInstallation("/server");
      expect(result.valid).toBe(true);
      expect(fs.mkdir).toHaveBeenCalled();
    });
  });
});
