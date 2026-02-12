/**
 * Tests for BepInEx.rcon plugin configuration reader/writer
 */

import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BEPINEX_RCON_DEFAULT_PASSWORD,
  BEPINEX_RCON_DEFAULT_PORT,
  parseRconConfig,
  RCON_CONFIG_FILE,
  rconPluginConfigExists,
  readRconPluginConfig,
  serializeRconConfig,
  writeRconPluginConfig,
} from "./rcon-config.js";

// Mock the paths module
vi.mock("./paths.js", () => ({
  getConfigPath: vi.fn(() => "/mock/valheim/BepInEx/config"),
}));

// Mock fs/promises
vi.mock("node:fs/promises", () => ({
  default: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    access: vi.fn(),
    mkdir: vi.fn(),
  },
}));

describe("rcon-config", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("constants", () => {
    it("has correct config file name", () => {
      expect(RCON_CONFIG_FILE).toBe("nl.avii.plugins.rcon.cfg");
    });

    it("has correct default port", () => {
      expect(BEPINEX_RCON_DEFAULT_PORT).toBe(2458);
    });
    it("has correct default password", () => {
      expect(BEPINEX_RCON_DEFAULT_PASSWORD).toBe("ChangeMe");
    });
  });

  describe("parseRconConfig", () => {
    it("parses a complete config", () => {
      const content = [
        "[rcon]",
        "",
        "## Enable RCON Communication",
        "enabled = true",
        "",
        "## Port to use for RCON Communication",
        "port = 2458",
        "",
        "## Password to use for RCON Communication",
        "password = mysecret",
      ].join("\n");

      const result = parseRconConfig(content);
      expect(result).toEqual({
        enabled: true,
        port: 2458,
        password: "mysecret",
      });
    });

    it("parses disabled config", () => {
      const content = "enabled = false\nport = 3000\npassword = test123";
      const result = parseRconConfig(content);
      expect(result).toEqual({
        enabled: false,
        port: 3000,
        password: "test123",
      });
    });

    it("uses defaults for missing fields", () => {
      const content = "[rcon]\n";
      const result = parseRconConfig(content);
      expect(result).toEqual({
        enabled: true,
        port: BEPINEX_RCON_DEFAULT_PORT,
        password: BEPINEX_RCON_DEFAULT_PASSWORD,
      });
    });

    it("handles empty content", () => {
      const result = parseRconConfig("");
      expect(result).toEqual({
        enabled: true,
        port: BEPINEX_RCON_DEFAULT_PORT,
        password: BEPINEX_RCON_DEFAULT_PASSWORD,
      });
    });

    it("handles empty password", () => {
      const content = "password = \nport = 2458";
      const result = parseRconConfig(content);
      expect(result.password).toBe("");
    });

    it("ignores comments and section headers", () => {
      const content = [
        "# This is a comment",
        "## BepInEx double hash comment",
        "[rcon]",
        "port = 5000",
        "# Another comment",
        "# Setting type: String",
        "password = secret",
      ].join("\n");

      const result = parseRconConfig(content);
      expect(result.port).toBe(5000);
      expect(result.password).toBe("secret");
    });

    it("handles case-insensitive keys", () => {
      const content = "Port = 9999\nPassword = upper\nEnabled = false";
      const result = parseRconConfig(content);
      expect(result.port).toBe(9999);
      expect(result.password).toBe("upper");
      expect(result.enabled).toBe(false);
    });

    it("rejects ports outside valid range", () => {
      const content = "port = 100";
      const result = parseRconConfig(content);
      // Should keep default since 100 < 1024
      expect(result.port).toBe(BEPINEX_RCON_DEFAULT_PORT);
    });

    it("rejects ports above 65535", () => {
      const content = "port = 99999";
      const result = parseRconConfig(content);
      expect(result.port).toBe(BEPINEX_RCON_DEFAULT_PORT);
    });

    it("handles non-numeric port gracefully", () => {
      const content = "port = abc";
      const result = parseRconConfig(content);
      expect(result.port).toBe(BEPINEX_RCON_DEFAULT_PORT);
    });

    it("handles lines without equals sign", () => {
      const content = "some random line\nport = 2460";
      const result = parseRconConfig(content);
      expect(result.port).toBe(2460);
    });

    it("handles spaces around values", () => {
      const content = "  port  =  2460  \n  password  =  spaced  ";
      const result = parseRconConfig(content);
      expect(result.port).toBe(2460);
      expect(result.password).toBe("spaced");
    });

    it("handles password with special characters", () => {
      const content = "password = p@ss=w0rd!#$%";
      const result = parseRconConfig(content);
      expect(result.password).toBe("p@ss=w0rd!#$%");
    });

    it("handles password with equals sign", () => {
      // Only the first = should be used as separator
      const content = "password = has=equals=in=it";
      const result = parseRconConfig(content);
      expect(result.password).toBe("has=equals=in=it");
    });
  });

  describe("serializeRconConfig", () => {
    it("serializes a config to INI format", () => {
      const config = { enabled: true, port: 2458, password: "secret" };
      const result = serializeRconConfig(config);

      expect(result).toContain("[rcon]");
      expect(result).toContain("enabled = true");
      expect(result).toContain("port = 2458");
      expect(result).toContain("password = secret");
    });

    it("serializes disabled config", () => {
      const config = { enabled: false, port: 3000, password: "" };
      const result = serializeRconConfig(config);

      expect(result).toContain("enabled = false");
      expect(result).toContain("port = 3000");
      expect(result).toContain("password = ");
    });

    it("round-trips through parse and serialize", () => {
      const original = { enabled: true, port: 5000, password: "roundtrip" };
      const serialized = serializeRconConfig(original);
      const parsed = parseRconConfig(serialized);

      expect(parsed).toEqual(original);
    });
  });

  describe("readRconPluginConfig", () => {
    it("returns null when config file does not exist", async () => {
      vi.mocked(fs.readFile).mockRejectedValueOnce(
        new Error("ENOENT: no such file")
      );

      const result = await readRconPluginConfig("/mock/valheim");
      expect(result).toBeNull();
    });

    it("reads and parses existing config", async () => {
      vi.mocked(fs.readFile).mockResolvedValueOnce(
        "[rcon]\nport = 2460\npassword = test"
      );

      const result = await readRconPluginConfig("/mock/valheim");
      expect(result).toEqual({
        enabled: true,
        port: 2460,
        password: "test",
      });
    });

    it("calls readFile with the correct path", async () => {
      vi.mocked(fs.readFile).mockRejectedValueOnce(new Error("ENOENT"));

      await readRconPluginConfig("/mock/valheim");

      expect(fs.readFile).toHaveBeenCalledWith(
        path.join("/mock/valheim/BepInEx/config", RCON_CONFIG_FILE),
        "utf-8"
      );
    });
  });

  describe("writeRconPluginConfig", () => {
    it("writes config to the correct path", async () => {
      vi.mocked(fs.mkdir).mockResolvedValueOnce(undefined);
      vi.mocked(fs.writeFile).mockResolvedValueOnce(undefined);

      const config = { enabled: true, port: 2458, password: "write-test" };
      await writeRconPluginConfig(config, "/mock/valheim");

      expect(fs.mkdir).toHaveBeenCalledWith("/mock/valheim/BepInEx/config", {
        recursive: true,
      });
      expect(fs.writeFile).toHaveBeenCalledWith(
        path.join("/mock/valheim/BepInEx/config", RCON_CONFIG_FILE),
        expect.stringContaining("port = 2458"),
        "utf-8"
      );
    });
  });

  describe("rconPluginConfigExists", () => {
    it("returns true when config file exists", async () => {
      vi.mocked(fs.access).mockResolvedValueOnce(undefined);

      const result = await rconPluginConfigExists("/mock/valheim");
      expect(result).toBe(true);
    });

    it("returns false when config file does not exist", async () => {
      vi.mocked(fs.access).mockRejectedValueOnce(new Error("ENOENT"));

      const result = await rconPluginConfigExists("/mock/valheim");
      expect(result).toBe(false);
    });
  });
});
