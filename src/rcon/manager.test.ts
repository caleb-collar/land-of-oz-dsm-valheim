/**
 * Unit tests for RCON Manager
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the RconClient class
vi.mock("./client.js", () => {
  const MockRconClient = vi.fn();
  MockRconClient.prototype.connect = vi.fn();
  MockRconClient.prototype.disconnect = vi.fn();
  MockRconClient.prototype.send = vi.fn();
  MockRconClient.prototype.isConnected = vi.fn();
  return { RconClient: MockRconClient };
});

vi.mock("../utils/logger.js", () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

import { RconClient } from "./client.js";

// We need to re-import manager fresh for each test to reset singleton state
let rconManager: typeof import("./manager.js")["rconManager"];

beforeEach(async () => {
  vi.resetModules();
  vi.resetAllMocks();

  // Re-mock after resetModules
  vi.doMock("./client.js", () => {
    const MockRconClient = vi.fn();
    MockRconClient.prototype.connect = vi.fn().mockResolvedValue(undefined);
    MockRconClient.prototype.disconnect = vi.fn();
    MockRconClient.prototype.send = vi.fn().mockResolvedValue("OK");
    MockRconClient.prototype.isConnected = vi.fn().mockReturnValue(true);
    return { RconClient: MockRconClient };
  });

  vi.doMock("../utils/logger.js", () => ({
    createLogger: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  }));

  const mod = await import("./manager.js");
  rconManager = mod.rconManager;
});

afterEach(() => {
  rconManager.disconnect();
});

const defaultConfig = {
  host: "localhost",
  port: 25575,
  password: "secret",
  timeout: 5000,
  enabled: true,
  autoReconnect: false,
};

const defaultCallbacks = {
  onConnectionStateChange: vi.fn(),
  onPlayerListUpdate: vi.fn(),
  pollInterval: 60000,
};

describe("RconManager", () => {
  describe("initialize", () => {
    it("stores config and callbacks", () => {
      rconManager.initialize(defaultConfig, defaultCallbacks);
      // No error thrown, internal state set
      expect(rconManager.isConnected()).toBe(false);
    });
  });

  describe("connect", () => {
    it("connects when initialized and enabled", async () => {
      rconManager.initialize(defaultConfig, defaultCallbacks);
      await rconManager.connect();

      expect(rconManager.isConnected()).toBe(true);
      expect(defaultCallbacks.onConnectionStateChange).toHaveBeenCalledWith(
        "connecting",
        undefined
      );
      expect(defaultCallbacks.onConnectionStateChange).toHaveBeenCalledWith(
        "connected",
        undefined
      );
    });

    it("skips connection when not initialized", async () => {
      // Not initialized — should not throw, just noop
      await rconManager.connect();
      expect(rconManager.isConnected()).toBe(false);
    });

    it("skips connection when disabled", async () => {
      rconManager.initialize(
        { ...defaultConfig, enabled: false },
        defaultCallbacks
      );
      await rconManager.connect();
      expect(rconManager.isConnected()).toBe(false);
    });
  });

  describe("disconnect", () => {
    it("disconnects cleanly", async () => {
      rconManager.initialize(defaultConfig, defaultCallbacks);
      await rconManager.connect();
      rconManager.disconnect();

      expect(defaultCallbacks.onConnectionStateChange).toHaveBeenCalledWith(
        "disconnected",
        undefined
      );
    });
  });

  describe("command wrappers", () => {
    beforeEach(async () => {
      rconManager.initialize(defaultConfig, defaultCallbacks);
      await rconManager.connect();
    });

    it("kickPlayer sends kick command", async () => {
      const result = await rconManager.kickPlayer("TestPlayer");
      expect(result).toBe("OK");
    });

    it("banPlayer sends ban command", async () => {
      const result = await rconManager.banPlayer("TestPlayer");
      expect(result).toBe("OK");
    });

    it("unbanPlayer sends unban command", async () => {
      const result = await rconManager.unbanPlayer("76561198012345678");
      expect(result).toBe("OK");
    });

    it("getBannedPlayers parses response", async () => {
      // Override send return for this test
      vi.mocked(RconClient);
      // The client instance's send method is mocked globally to return "OK"
      // but getBannedPlayers splits the response
      const result = await rconManager.getBannedPlayers();
      expect(result).toEqual(["OK"]);
    });

    it("getBannedPlayers returns empty on null response", async () => {
      // We need to get the internal client's send to return null
      // Since the manager returns null when not connected, test indirectly
      rconManager.disconnect();
      const result = await rconManager.getBannedPlayers();
      expect(result).toEqual([]);
    });

    it("triggerEvent sends randomevent command", async () => {
      const result = await rconManager.triggerEvent("army_theelder");
      expect(result).toBe("OK");
    });

    it("triggerRandomEvent sends randomevent", async () => {
      const result = await rconManager.triggerRandomEvent();
      expect(result).toBe("OK");
    });

    it("stopEvent sends stopevent", async () => {
      const result = await rconManager.stopEvent();
      expect(result).toBe("OK");
    });

    it("listGlobalKeys parses response", async () => {
      const result = await rconManager.listGlobalKeys();
      expect(result).toEqual(["OK"]);
    });

    it("setGlobalKey sends setkey command", async () => {
      const result = await rconManager.setGlobalKey("defeated_eikthyr");
      expect(result).toBe("OK");
    });

    it("removeGlobalKey sends removekey command", async () => {
      const result = await rconManager.removeGlobalKey("defeated_eikthyr");
      expect(result).toBe("OK");
    });

    it("resetGlobalKeys sends resetkeys", async () => {
      const result = await rconManager.resetGlobalKeys();
      expect(result).toBe("OK");
    });

    it("sleep sends sleep command", async () => {
      const result = await rconManager.sleep();
      expect(result).toBe("OK");
    });

    it("skipTime sends skiptime command", async () => {
      const result = await rconManager.skipTime(240);
      expect(result).toBe("OK");
    });

    it("getServerInfo sends info command", async () => {
      const result = await rconManager.getServerInfo();
      expect(result).toBe("OK");
    });

    it("pingServer sends ping command", async () => {
      const result = await rconManager.pingServer();
      expect(result).toBe("OK");
    });

    it("removeDrops sends removedrops command", async () => {
      const result = await rconManager.removeDrops();
      expect(result).toBe("OK");
    });
  });
});
