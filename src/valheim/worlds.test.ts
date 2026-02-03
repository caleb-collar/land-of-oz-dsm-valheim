/**
 * Unit tests for Valheim world file management
 */

import { describe, expect, it } from "vitest";
import {
  getClientWorldsDir,
  getCloudWorldsDir,
  getDedicatedServerWorldsDir,
  getDefaultWorldsDir,
  getSourceLabel,
  type WorldSource,
} from "./worlds.js";

describe("world path utilities", () => {
  describe("getDedicatedServerWorldsDir", () => {
    it("returns valid path", () => {
      const dir = getDedicatedServerWorldsDir();

      expect(dir).toBeDefined();
      expect(dir).toContain("Valheim");
      expect(dir).toContain("worlds");
      expect(dir.endsWith("worlds")).toBe(true);
    });

    it("uses platform-specific base directory", () => {
      const dir = getDedicatedServerWorldsDir();
      const platform = process.platform;

      if (platform === "win32") {
        expect(dir).toContain("AppData");
        expect(dir).toContain("LocalLow");
      } else if (platform === "darwin") {
        expect(dir).toContain("Library");
        expect(dir).toContain("Application Support");
      } else {
        expect(dir).toContain(".config");
        expect(dir).toContain("unity3d");
      }
    });
  });

  describe("getClientWorldsDir", () => {
    it("returns valid path", () => {
      const dir = getClientWorldsDir();

      expect(dir).toBeDefined();
      expect(dir).toContain("Valheim");
      expect(dir).toContain("worlds_local");
    });

    it("differs from server worlds dir", () => {
      const serverDir = getDedicatedServerWorldsDir();
      const clientDir = getClientWorldsDir();

      expect(clientDir).not.toBe(serverDir);
      expect(clientDir).toContain("worlds_local");
      expect(serverDir.endsWith("worlds")).toBe(true);
    });
  });

  describe("getCloudWorldsDir", () => {
    it("returns valid path", () => {
      const dir = getCloudWorldsDir();

      expect(dir).toBeDefined();
      expect(dir).toContain("Valheim");
      expect(dir).toContain("worlds_local_cloud");
    });

    it("is separate from local and server dirs", () => {
      const serverDir = getDedicatedServerWorldsDir();
      const clientDir = getClientWorldsDir();
      const cloudDir = getCloudWorldsDir();

      expect(cloudDir).not.toBe(serverDir);
      expect(cloudDir).not.toBe(clientDir);
      expect(cloudDir).toContain("cloud");
    });
  });

  describe("getDefaultWorldsDir", () => {
    it("returns server worlds directory", () => {
      const defaultDir = getDefaultWorldsDir();
      const serverDir = getDedicatedServerWorldsDir();

      expect(defaultDir).toBe(serverDir);
    });

    it("returns valid path", () => {
      const dir = getDefaultWorldsDir();

      expect(dir).toBeDefined();
      expect(dir.length).toBeGreaterThan(0);
      expect(dir).toContain("worlds");
    });
  });
});

describe("getSourceLabel", () => {
  it("returns correct label for server source", () => {
    const label = getSourceLabel("server");

    expect(label).toBe("Server (Local)");
  });

  it("returns correct label for local source", () => {
    const label = getSourceLabel("local");

    expect(label).toBe("Client (Local)");
  });

  it("returns correct label for cloud source", () => {
    const label = getSourceLabel("cloud");

    expect(label).toBe("Client (Cloud)");
  });

  it("handles all WorldSource types", () => {
    const sources: WorldSource[] = ["server", "local", "cloud"];

    for (const source of sources) {
      const label = getSourceLabel(source);
      expect(label).toBeDefined();
      expect(label.length).toBeGreaterThan(0);
    }
  });
});

describe("world path consistency", () => {
  it("all paths share common Valheim base", () => {
    const serverDir = getDedicatedServerWorldsDir();
    const clientDir = getClientWorldsDir();
    const cloudDir = getCloudWorldsDir();

    // All should contain "Valheim" in the path
    expect(serverDir).toContain("Valheim");
    expect(clientDir).toContain("Valheim");
    expect(cloudDir).toContain("Valheim");
  });

  it("paths are absolute", () => {
    const serverDir = getDedicatedServerWorldsDir();
    const clientDir = getClientWorldsDir();
    const cloudDir = getCloudWorldsDir();

    // Absolute paths should start with drive letter on Windows or / on Unix
    const isAbsolute = (p: string) => p.startsWith("/") || /^[A-Z]:\\/i.test(p);

    expect(isAbsolute(serverDir)).toBe(true);
    expect(isAbsolute(clientDir)).toBe(true);
    expect(isAbsolute(cloudDir)).toBe(true);
  });

  it("paths use correct separators", () => {
    const serverDir = getDedicatedServerWorldsDir();

    // Should not mix separators
    const hasMixedSeparators =
      serverDir.includes("/") && serverDir.includes("\\");
    expect(hasMixedSeparators).toBe(false);
  });
});

describe("world source types", () => {
  it("server source is for dedicated servers", () => {
    const label = getSourceLabel("server");

    expect(label.toLowerCase()).toContain("server");
  });

  it("local source is for client single-player", () => {
    const label = getSourceLabel("local");

    expect(label.toLowerCase()).toContain("client");
    expect(label.toLowerCase()).toContain("local");
  });

  it("cloud source is for Steam Cloud saves", () => {
    const label = getSourceLabel("cloud");

    expect(label.toLowerCase()).toContain("client");
    expect(label.toLowerCase()).toContain("cloud");
  });
});
