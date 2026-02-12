/**
 * Unit tests for Watchdog
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the ValheimProcess to avoid spawning real processes
vi.mock("./process.js", () => {
  class MockValheimProcess {
    currentState = "offline" as string;
    private events: Record<string, (...args: unknown[]) => void>;

    constructor(
      _config: unknown,
      events: Record<string, (...args: unknown[]) => void>
    ) {
      this.events = events;
    }

    async start() {
      this.currentState = "starting";
      this.events.onStateChange?.("starting");
      this.currentState = "online";
      this.events.onStateChange?.("online");
    }

    async stop() {
      this.currentState = "offline";
      this.events.onStateChange?.("offline");
    }

    async kill() {
      this.currentState = "offline";
      this.events.onStateChange?.("offline");
    }

    // Helper for testing: simulate crash
    simulateCrash() {
      this.currentState = "crashed";
      this.events.onStateChange?.("crashed");
    }
  }

  return {
    ValheimProcess: MockValheimProcess,
  };
});

import { defaultWatchdogConfig, Watchdog } from "./watchdog.js";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.resetAllMocks();
});

describe("Watchdog", () => {
  const serverConfig = {
    executable: "/path/to/server",
    port: 2456,
    world: "TestWorld",
    name: "Test Server",
    password: "test",
    savedir: "/saves",
    public: true,
    crossplay: false,
    saveinterval: 1800,
    backups: 4,
  };

  describe("defaultWatchdogConfig", () => {
    it("has expected defaults", () => {
      expect(defaultWatchdogConfig.enabled).toBe(true);
      expect(defaultWatchdogConfig.maxRestarts).toBe(5);
      expect(defaultWatchdogConfig.restartDelay).toBe(5000);
      expect(defaultWatchdogConfig.cooldownPeriod).toBe(300000);
      expect(defaultWatchdogConfig.backoffMultiplier).toBe(2);
    });
  });

  describe("constructor", () => {
    it("creates watchdog with default config", () => {
      const wd = new Watchdog(serverConfig);
      expect(wd.isEnabled).toBe(true);
      expect(wd.currentRestartCount).toBe(0);
    });

    it("accepts custom config overrides", () => {
      const wd = new Watchdog(serverConfig, { maxRestarts: 3, enabled: false });
      expect(wd.isEnabled).toBe(false);
    });
  });

  describe("start/stop", () => {
    it("starts the server process", async () => {
      const onStateChange = vi.fn();
      const wd = new Watchdog(serverConfig, {}, { onStateChange });
      await wd.start();
      expect(wd.currentState).toBe("online");
      expect(onStateChange).toHaveBeenCalledWith("online");
    });

    it("stops the server process", async () => {
      const wd = new Watchdog(serverConfig);
      await wd.start();
      await wd.stop();
      expect(wd.currentState).toBe("offline");
    });

    it("kill stops the server immediately", async () => {
      const wd = new Watchdog(serverConfig);
      await wd.start();
      await wd.kill();
      expect(wd.currentState).toBe("offline");
    });
  });

  describe("updateConfig", () => {
    it("updates partial watchdog config", () => {
      const wd = new Watchdog(serverConfig);
      expect(wd.isEnabled).toBe(true);
      wd.updateConfig({ enabled: false });
      expect(wd.isEnabled).toBe(false);
    });
  });

  describe("resetRestartCount", () => {
    it("resets the restart counter", () => {
      const wd = new Watchdog(serverConfig);
      wd.resetRestartCount();
      expect(wd.currentRestartCount).toBe(0);
    });
  });

  describe("serverProcess getter", () => {
    it("returns the underlying process", () => {
      const wd = new Watchdog(serverConfig);
      expect(wd.serverProcess).toBeDefined();
    });
  });
});
