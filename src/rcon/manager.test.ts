/**
 * RCON Manager Tests
 *
 * Tests the global RCON manager singleton for connection lifecycle,
 * state management, player polling, and command methods.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { rconManager } from "./manager.js";
import type { RconConfig } from "./types.js";

// Mock the RconClient class
const mockConnect = vi.fn();
const mockDisconnect = vi.fn();
const mockSend = vi.fn();

vi.mock("./client.js", () => {
  return {
    RconClient: vi.fn().mockImplementation(() => ({
      connect: mockConnect,
      disconnect: mockDisconnect,
      send: mockSend,
    })),
  };
});

describe("RconManager", () => {
  const mockConfig: RconConfig & { enabled: boolean } = {
    enabled: true,
    host: "localhost",
    port: 2456,
    password: "test123",
    timeout: 5000,
    autoReconnect: true,
  };

  beforeEach(() => {
    // Reset mocks but keep implementations
    mockConnect.mockClear();
    mockDisconnect.mockClear();
    mockSend.mockClear();

    // Restore default implementations
    mockConnect.mockResolvedValue(undefined);
    mockDisconnect.mockReturnValue(undefined);
    mockSend.mockResolvedValue("OK");

    // Clean up without disabling - just force state reset
    if (rconManager.isConnected()) {
      rconManager.disconnect();
    }
  });

  afterEach(() => {
    rconManager.disconnect();
    vi.clearAllTimers();
  });

  describe("initialization", () => {
    it("should initialize with config", () => {
      rconManager.initialize({ ...mockConfig, enabled: false });
      expect(rconManager.getState()).toBe("disconnected");
    });

    it("should auto-connect when enabled", async () => {
      rconManager.initialize(mockConfig);

      // Wait for async connect
      await vi.waitFor(() => {
        expect(mockConnect).toHaveBeenCalled();
      });
    });

    it("should not auto-connect when disabled", () => {
      rconManager.initialize({ ...mockConfig, enabled: false });
      expect(rconManager.getState()).toBe("disconnected");
    });

    it("should call connection state callback on connect", async () => {
      const stateCallback = vi.fn();
      rconManager.initialize(mockConfig, {
        onConnectionStateChange: stateCallback,
      });

      await vi.waitFor(() => {
        expect(stateCallback).toHaveBeenCalledWith("connecting");
      });
    });
  });

  describe("connection management", () => {
    it("should connect successfully", async () => {
      rconManager.initialize(mockConfig); // enabled: true allows connection

      // Disconnect from auto-connect
      if (rconManager.isConnected()) {
        rconManager.disconnect();
      }

      // Re-initialize to reset enabled state
      rconManager.initialize(mockConfig);
      // Now manually wait for connection
      await vi.waitFor(() => {
        expect(rconManager.isConnected()).toBe(true);
      });

      expect(rconManager.getState()).toBe("connected");
    });

    it("should handle connection failure", async () => {
      mockConnect.mockRejectedValueOnce(new Error("Connection failed"));

      rconManager.initialize(mockConfig); // Will auto-connect and fail

      await vi.waitFor(() => {
        expect(rconManager.getState()).toBe("error");
      });
    });

    it("should disconnect properly", async () => {
      rconManager.initialize(mockConfig);
      await vi.waitFor(() => {
        expect(rconManager.isConnected()).toBe(true);
      });

      rconManager.disconnect();

      expect(mockDisconnect).toHaveBeenCalled();
      expect(rconManager.getState()).toBe("disconnected");
      expect(rconManager.getLastKnownPlayers()).toEqual([]);
    });

    it("should not connect when already connected", async () => {
      rconManager.initialize(mockConfig);
      await vi.waitFor(() => {
        expect(rconManager.isConnected()).toBe(true);
      });

      mockConnect.mockClear();
      const result = await rconManager.connect();

      expect(result).toBe(true);
      expect(mockConnect).not.toHaveBeenCalled();
    });

    it("should not connect when config is missing", async () => {
      const result = await rconManager.connect();
      expect(result).toBe(false);
    });

    it("should not connect when disabled", async () => {
      rconManager.initialize({ ...mockConfig, enabled: false });
      const result = await rconManager.connect();
      expect(result).toBe(false);
    });
  });

  describe("state management", () => {
    it("should return current state", () => {
      expect(rconManager.getState()).toBe("disconnected");
    });

    it("should check if connected", async () => {
      expect(rconManager.isConnected()).toBe(false);

      rconManager.initialize(mockConfig);
      await vi.waitFor(() => {
        expect(rconManager.isConnected()).toBe(true);
      });
    });
  });

  describe("command execution", () => {
    it("should send commands when connected", async () => {
      mockSend.mockResolvedValueOnce("OK");

      rconManager.initialize(mockConfig);
      await vi.waitFor(() => {
        expect(rconManager.isConnected()).toBe(true);
      });

      const response = await rconManager.send("test command");

      expect(mockSend).toHaveBeenCalledWith("test command");
      expect(response).toBe("OK");
    });

    it("should return null when not connected", async () => {
      const response = await rconManager.send("test");
      expect(response).toBeNull();
    });

    it("should handle send errors", async () => {
      mockSend.mockRejectedValueOnce(new Error("Send failed"));

      rconManager.initialize(mockConfig);
      await vi.waitFor(() => {
        expect(rconManager.isConnected()).toBe(true);
      });

      const response = await rconManager.send("test");

      expect(response).toBeNull();
      expect(rconManager.getState()).toBe("error");
    });
  });

  describe("player management commands", () => {
    beforeEach(async () => {
      rconManager.initialize(mockConfig);
      await vi.waitFor(() => {
        expect(rconManager.isConnected()).toBe(true);
      });
    });

    it("should kick a player", async () => {
      await rconManager.kickPlayer("BadPlayer");
      expect(mockSend).toHaveBeenCalledWith("kick BadPlayer");
    });

    it("should ban a player", async () => {
      await rconManager.banPlayer("BadPlayer");
      expect(mockSend).toHaveBeenCalledWith("ban BadPlayer");
    });

    it("should unban a player", async () => {
      await rconManager.unbanPlayer("GoodPlayer");
      expect(mockSend).toHaveBeenCalledWith("unban GoodPlayer");
    });

    it("should get banned players list", async () => {
      mockSend.mockResolvedValueOnce("Player1\nPlayer2\nPlayer3");

      const banned = await rconManager.getBannedPlayers();

      expect(mockSend).toHaveBeenCalledWith("banned");
      expect(banned).toEqual(["Player1", "Player2", "Player3"]);
    });

    it("should return empty array when banned list fails", async () => {
      mockSend.mockResolvedValueOnce(null);

      const banned = await rconManager.getBannedPlayers();
      expect(banned).toEqual([]);
    });
  });

  describe("server info commands", () => {
    beforeEach(async () => {
      rconManager.initialize(mockConfig);
      await vi.waitFor(() => {
        expect(rconManager.isConnected()).toBe(true);
      });
    });

    it("should get server info", async () => {
      await rconManager.getServerInfo();
      expect(mockSend).toHaveBeenCalledWith("info");
    });

    it("should ping server", async () => {
      await rconManager.pingServer();
      expect(mockSend).toHaveBeenCalledWith("ping");
    });
  });

  describe("event management commands", () => {
    beforeEach(async () => {
      rconManager.initialize(mockConfig);
      await vi.waitFor(() => {
        expect(rconManager.isConnected()).toBe(true);
      });
    });

    it("should trigger a specific event", async () => {
      await rconManager.triggerEvent("army_eikthyr");
      expect(mockSend).toHaveBeenCalledWith("event army_eikthyr");
    });

    it("should trigger a random event", async () => {
      await rconManager.triggerRandomEvent();
      expect(mockSend).toHaveBeenCalledWith("randomevent");
    });

    it("should stop current event", async () => {
      await rconManager.stopEvent();
      expect(mockSend).toHaveBeenCalledWith("stopevent");
    });
  });

  describe("time control commands", () => {
    beforeEach(async () => {
      rconManager.initialize(mockConfig);
      await vi.waitFor(() => {
        expect(rconManager.isConnected()).toBe(true);
      });
    });

    it("should skip time", async () => {
      await rconManager.skipTime(3600);
      expect(mockSend).toHaveBeenCalledWith("skiptime 3600");
    });

    it("should sleep through night", async () => {
      await rconManager.sleep();
      expect(mockSend).toHaveBeenCalledWith("sleep");
    });
  });

  describe("world management commands", () => {
    beforeEach(async () => {
      rconManager.initialize(mockConfig);
      await vi.waitFor(() => {
        expect(rconManager.isConnected()).toBe(true);
      });
    });

    it("should remove drops", async () => {
      await rconManager.removeDrops();
      expect(mockSend).toHaveBeenCalledWith("removedrops");
    });
  });

  describe("global key commands", () => {
    beforeEach(async () => {
      rconManager.initialize(mockConfig);
      await vi.waitFor(() => {
        expect(rconManager.isConnected()).toBe(true);
      });
    });

    it("should set a global key", async () => {
      await rconManager.setGlobalKey("defeated_eikthyr");
      expect(mockSend).toHaveBeenCalledWith("setkey defeated_eikthyr");
    });

    it("should remove a global key", async () => {
      await rconManager.removeGlobalKey("defeated_eikthyr");
      expect(mockSend).toHaveBeenCalledWith("removekey defeated_eikthyr");
    });

    it("should reset all global keys", async () => {
      await rconManager.resetGlobalKeys();
      expect(mockSend).toHaveBeenCalledWith("resetkeys");
    });

    it("should list global keys", async () => {
      mockSend.mockResolvedValueOnce("defeated_eikthyr\ndefeated_elder");

      const keys = await rconManager.listGlobalKeys();

      expect(mockSend).toHaveBeenCalledWith("listkeys");
      expect(keys).toEqual(["defeated_eikthyr", "defeated_elder"]);
    });

    it("should return empty array when list keys fails", async () => {
      mockSend.mockResolvedValueOnce(null);

      const keys = await rconManager.listGlobalKeys();
      expect(keys).toEqual([]);
    });
  });

  describe("performance commands", () => {
    beforeEach(async () => {
      rconManager.initialize(mockConfig);
      await vi.waitFor(() => {
        expect(rconManager.isConnected()).toBe(true);
      });
    });

    it("should set LOD bias", async () => {
      await rconManager.setLodBias(3);
      expect(mockSend).toHaveBeenCalledWith("lodbias 3");
    });

    it("should set LOD distance", async () => {
      await rconManager.setLodDistance(1000);
      expect(mockSend).toHaveBeenCalledWith("loddist 1000");
    });
  });

  describe("player list polling", () => {
    it("should get player list", async () => {
      mockSend.mockResolvedValueOnce("2 players: Alice, Bob");

      rconManager.initialize(mockConfig);
      await vi.waitFor(() => {
        expect(rconManager.isConnected()).toBe(true);
      });

      const players = await rconManager.getPlayerList();

      expect(mockSend).toHaveBeenCalledWith("status");
      expect(players).toEqual(["Alice", "Bob"]);
    });

    it("should return empty array when player list fails", async () => {
      const players = await rconManager.getPlayerList();
      expect(players).toEqual([]);
    });

    it("should call player list callback on changes", async () => {
      vi.useFakeTimers();
      mockSend.mockResolvedValue("1 players: Charlie");

      const playerCallback = vi.fn();
      rconManager.initialize(mockConfig, {
        onPlayerListUpdate: playerCallback,
        pollInterval: 100,
      });

      await vi.waitFor(() => {
        expect(rconManager.isConnected()).toBe(true);
      });

      // Fast-forward time to trigger poll
      await vi.advanceTimersByTimeAsync(150);

      expect(playerCallback).toHaveBeenCalled();

      vi.useRealTimers();
    });

    it("should get last known players", async () => {
      vi.useFakeTimers();
      mockSend.mockResolvedValue("1 players: Dave");

      rconManager.initialize(mockConfig, { pollInterval: 100 });

      await vi.waitFor(() => {
        expect(rconManager.isConnected()).toBe(true);
      });

      await vi.advanceTimersByTimeAsync(150);

      const players = rconManager.getLastKnownPlayers();
      expect(players).toEqual(["Dave"]);

      vi.useRealTimers();
    });
  });

  describe("reconnection logic", () => {
    it("should attempt reconnect on error when auto-reconnect enabled", async () => {
      vi.useFakeTimers();
      let connectAttempts = 0;
      mockConnect.mockImplementation(async () => {
        connectAttempts++;
        if (connectAttempts === 1) {
          throw new Error("Connection failed");
        }
        return Promise.resolve();
      });

      rconManager.initialize(mockConfig);

      await vi.waitFor(() => {
        expect(rconManager.getState()).toBe("error");
      });

      // Fast-forward time to trigger reconnect
      await vi.advanceTimersByTimeAsync(6000);

      await vi.waitFor(() => {
        expect(connectAttempts).toBeGreaterThan(1);
      });

      vi.useRealTimers();
    });

    it("should not reconnect when auto-reconnect disabled", async () => {
      vi.useFakeTimers();
      mockConnect.mockRejectedValue(new Error("Connection failed"));

      rconManager.initialize({ ...mockConfig, autoReconnect: false });

      await vi.waitFor(() => {
        expect(rconManager.getState()).toBe("error");
      });

      mockConnect.mockClear();

      // Fast-forward time
      await vi.advanceTimersByTimeAsync(10000);

      expect(mockConnect).not.toHaveBeenCalled();

      vi.useRealTimers();
    });
  });

  describe("cleanup", () => {
    it("should cleanup resources", async () => {
      rconManager.initialize(mockConfig);
      await vi.waitFor(() => {
        expect(rconManager.isConnected()).toBe(true);
      });

      rconManager.cleanup();

      expect(mockDisconnect).toHaveBeenCalled();
      expect(rconManager.getState()).toBe("disconnected");
    });
  });
});
