/**
 * Unit tests for BepInEx plugin manager
 */

import { describe, expect, it } from "vitest";
import { getPluginDefinition, SUPPORTED_PLUGINS } from "./plugins.js";

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
});
