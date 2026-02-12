/**
 * Unit tests for BepInEx plugin manager
 */

import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("node:fs/promises", () => ({
  default: {
    access: vi.fn(),
    mkdir: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
    unlink: vi.fn(),
    rename: vi.fn(),
  },
}));

vi.mock("./paths.js", () => ({
  getPluginsPath: vi.fn(() => "/server/BepInEx/plugins"),
  getDisabledPluginsPath: vi.fn(() => "/server/BepInEx/plugins_disabled"),
  getConfigPath: vi.fn(() => "/server/BepInEx/config"),
  isBepInExInstalled: vi.fn(),
}));

import fs from "node:fs/promises";
import {
  disablePlugin,
  enablePlugin,
  getInstalledPlugins,
  getPluginConfig,
  getPluginDefinition,
  isPluginEnabled,
  isPluginInstalled,
  SUPPORTED_PLUGINS,
  uninstallPlugin,
  updatePluginConfig,
} from "./plugins.js";

afterEach(() => {
  vi.resetAllMocks();
});

describe("BepInEx Plugin Manager", () => {
  describe("SUPPORTED_PLUGINS", () => {
    it("has expected number of plugins", () => {
      expect(SUPPORTED_PLUGINS.length).toBe(2);
    });

    it("includes bepinex-rcon plugin", () => {
      const rcon = SUPPORTED_PLUGINS.find((p) => p.id === "bepinex-rcon");
      expect(rcon).toBeDefined();
      expect(rcon?.name).toBe("BepInEx.rcon");
      expect(rcon?.author).toBe("AviiNL");
      expect(rcon?.dllFile).toBe("rcon.dll");
      expect(rcon?.requiresBepInEx).toBe(true);
      expect(rcon?.category).toBe("core");
    });

    it("includes server-devcommands plugin", () => {
      const devCmd = SUPPORTED_PLUGINS.find(
        (p) => p.id === "server-devcommands"
      );
      expect(devCmd).toBeDefined();
      expect(devCmd?.name).toBe("Server DevCommands");
      expect(devCmd?.author).toBe("JereKuusela");
      expect(devCmd?.dllFile).toBe("ServerDevcommands.dll");
      expect(devCmd?.requiresBepInEx).toBe(true);
    });

    it("all plugins have valid download URLs", () => {
      for (const plugin of SUPPORTED_PLUGINS) {
        expect(() => new URL(plugin.downloadUrl)).not.toThrow();
      }
    });

    it("all plugins have config files", () => {
      for (const plugin of SUPPORTED_PLUGINS) {
        expect(plugin.configFile).toBeDefined();
        expect(plugin.configFile).toBeTruthy();
      }
    });
  });

  describe("getPluginDefinition", () => {
    it("returns plugin for valid IDs", () => {
      const rcon = getPluginDefinition("bepinex-rcon");
      expect(rcon).toBeDefined();
      expect(rcon?.id).toBe("bepinex-rcon");

      const devCmd = getPluginDefinition("server-devcommands");
      expect(devCmd).toBeDefined();
      expect(devCmd?.id).toBe("server-devcommands");
    });

    it("returns undefined for unknown IDs", () => {
      // @ts-expect-error Testing invalid input
      const result = getPluginDefinition("nonexistent");
      expect(result).toBeUndefined();
    });
  });

  describe("isPluginInstalled", () => {
    it("returns true when DLL is in plugins dir", async () => {
      vi.mocked(fs.access).mockResolvedValueOnce(undefined);

      const result = await isPluginInstalled("bepinex-rcon");
      expect(result).toBe(true);
    });

    it("returns true when DLL is in disabled dir", async () => {
      vi.mocked(fs.access)
        .mockRejectedValueOnce(new Error("ENOENT")) // plugins dir
        .mockResolvedValueOnce(undefined); // disabled dir

      const result = await isPluginInstalled("bepinex-rcon");
      expect(result).toBe(true);
    });

    it("returns false when DLL is nowhere", async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error("ENOENT"));

      const result = await isPluginInstalled("bepinex-rcon");
      expect(result).toBe(false);
    });

    it("returns false for unknown plugin", async () => {
      // @ts-expect-error Testing invalid input
      const result = await isPluginInstalled("nonexistent");
      expect(result).toBe(false);
    });
  });

  describe("isPluginEnabled", () => {
    it("returns true when DLL is in active plugins dir", async () => {
      vi.mocked(fs.access).mockResolvedValueOnce(undefined);

      const result = await isPluginEnabled("bepinex-rcon");
      expect(result).toBe(true);
    });

    it("returns false when DLL is not in active dir", async () => {
      vi.mocked(fs.access).mockRejectedValueOnce(new Error("ENOENT"));

      const result = await isPluginEnabled("bepinex-rcon");
      expect(result).toBe(false);
    });

    it("returns false for unknown plugin", async () => {
      // @ts-expect-error Testing invalid input
      const result = await isPluginEnabled("nonexistent");
      expect(result).toBe(false);
    });
  });

  describe("getInstalledPlugins", () => {
    it("returns all plugins with installed/enabled status", async () => {
      // bepinex-rcon: installed & enabled (access to plugins/rcon.dll succeeds)
      // server-devcommands: not installed
      vi.mocked(fs.access)
        // isPluginInstalled("bepinex-rcon") -> plugins dir
        .mockResolvedValueOnce(undefined)
        // isPluginEnabled("bepinex-rcon") -> plugins dir
        .mockResolvedValueOnce(undefined)
        // config check for bepinex-rcon
        .mockRejectedValueOnce(new Error("ENOENT"))
        // isPluginInstalled("server-devcommands") -> plugins dir
        .mockRejectedValueOnce(new Error("ENOENT"))
        // isPluginInstalled("server-devcommands") -> disabled dir
        .mockRejectedValueOnce(new Error("ENOENT"))
        // config check for server-devcommands
        .mockRejectedValueOnce(new Error("ENOENT"));

      const plugins = await getInstalledPlugins();
      expect(plugins).toHaveLength(2);

      const rcon = plugins.find((p) => p.id === "bepinex-rcon");
      expect(rcon?.enabled).toBe(true);

      const devCmd = plugins.find((p) => p.id === "server-devcommands");
      expect(devCmd?.version).toBeNull();
    });
  });

  describe("uninstallPlugin", () => {
    it("removes DLL from both directories", async () => {
      vi.mocked(fs.unlink).mockResolvedValue(undefined);

      await uninstallPlugin("bepinex-rcon");

      expect(fs.unlink).toHaveBeenCalledTimes(2);
    });

    it("ignores errors when files do not exist", async () => {
      vi.mocked(fs.unlink).mockRejectedValue(new Error("ENOENT"));

      await expect(uninstallPlugin("bepinex-rcon")).resolves.toBeUndefined();
    });

    it("throws for unknown plugin", async () => {
      // @ts-expect-error Testing invalid input
      await expect(uninstallPlugin("nonexistent")).rejects.toThrow(
        "Unknown plugin"
      );
    });
  });

  describe("enablePlugin", () => {
    it("moves DLL from disabled to active", async () => {
      // Check active dir: not found
      vi.mocked(fs.access)
        .mockRejectedValueOnce(new Error("ENOENT"))
        // Check disabled dir: found
        .mockResolvedValueOnce(undefined);
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.rename).mockResolvedValue(undefined);

      await enablePlugin("bepinex-rcon");

      expect(fs.rename).toHaveBeenCalled();
    });

    it("does nothing if already enabled", async () => {
      vi.mocked(fs.access).mockResolvedValueOnce(undefined);

      await enablePlugin("bepinex-rcon");
      expect(fs.rename).not.toHaveBeenCalled();
    });

    it("throws if plugin not installed", async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error("ENOENT"));

      await expect(enablePlugin("bepinex-rcon")).rejects.toThrow(
        "not installed"
      );
    });

    it("throws for unknown plugin", async () => {
      // @ts-expect-error Testing invalid input
      await expect(enablePlugin("nonexistent")).rejects.toThrow(
        "Unknown plugin"
      );
    });
  });

  describe("disablePlugin", () => {
    it("moves DLL from active to disabled", async () => {
      // Check disabled dir: not found
      vi.mocked(fs.access)
        .mockRejectedValueOnce(new Error("ENOENT"))
        // Check active dir: found
        .mockResolvedValueOnce(undefined);
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.rename).mockResolvedValue(undefined);

      await disablePlugin("bepinex-rcon");

      expect(fs.rename).toHaveBeenCalled();
    });

    it("does nothing if already disabled", async () => {
      vi.mocked(fs.access).mockResolvedValueOnce(undefined);

      await disablePlugin("bepinex-rcon");
      expect(fs.rename).not.toHaveBeenCalled();
    });

    it("throws if plugin not in active directory", async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error("ENOENT"));

      await expect(disablePlugin("bepinex-rcon")).rejects.toThrow(
        "not in the active plugins"
      );
    });

    it("throws for unknown plugin", async () => {
      // @ts-expect-error Testing invalid input
      await expect(disablePlugin("nonexistent")).rejects.toThrow(
        "Unknown plugin"
      );
    });
  });

  describe("getPluginConfig", () => {
    it("returns config content when file exists", async () => {
      vi.mocked(fs.readFile).mockResolvedValue("enabled = true\nport = 25575");

      const config = await getPluginConfig("bepinex-rcon");
      expect(config).toBe("enabled = true\nport = 25575");
    });

    it("returns null when config file missing", async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error("ENOENT"));

      const config = await getPluginConfig("bepinex-rcon");
      expect(config).toBeNull();
    });

    it("returns null for unknown plugin", async () => {
      // @ts-expect-error Testing invalid input
      const config = await getPluginConfig("nonexistent");
      expect(config).toBeNull();
    });
  });

  describe("updatePluginConfig", () => {
    it("writes config content to file", async () => {
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      await updatePluginConfig("bepinex-rcon", "enabled = true");

      expect(fs.mkdir).toHaveBeenCalled();
      expect(fs.writeFile).toHaveBeenCalled();
      const writeCall = vi.mocked(fs.writeFile).mock.calls[0];
      expect(writeCall[1]).toBe("enabled = true");
    });

    it("throws for plugin with no config file", async () => {
      await expect(
        updatePluginConfig("nonexistent" as never, "data")
      ).rejects.toThrow("no configuration file");
    });
  });
});
