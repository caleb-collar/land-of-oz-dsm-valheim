/**
 * Unit tests for CLI config command
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../config/mod.js", () => ({
  resetConfig: vi.fn(),
  updateServerConfig: vi.fn(),
  updateWatchdogConfig: vi.fn(),
}));

vi.mock("../../config/schema.js", () => ({
  ServerConfigSchema: {
    partial: () => ({
      safeParse: vi.fn((data: Record<string, unknown>) => {
        // Simulate validation: reject if port is a string
        if ("port" in data && typeof data.port === "string") {
          return {
            success: false,
            error: {
              issues: [{ message: "Expected number, received string" }],
            },
          };
        }
        return { success: true, data };
      }),
    }),
  },
  WatchdogConfigSchema: {
    partial: () => ({
      safeParse: vi.fn((data: Record<string, unknown>) => {
        return { success: true, data };
      }),
    }),
  },
}));

vi.mock("../../utils/mod.js", () => ({
  getAppConfigDir: vi.fn(() => "/mock/config"),
}));

import {
  resetConfig,
  updateServerConfig,
  updateWatchdogConfig,
} from "../../config/mod.js";
import type { ConfigArgs } from "../args.js";
import { configCommand } from "./config.js";

const mockConfig = {
  server: {
    name: "Test Server",
    port: 2456,
    world: "TestWorld",
    password: "secret",
    public: true,
    crossplay: false,
    saveinterval: 1800,
    backups: 4,
  },
  watchdog: {
    enabled: true,
    maxRestarts: 5,
    restartDelay: 5000,
    cooldownPeriod: 300000,
  },
  tui: {
    colorScheme: "valheim" as const,
    animationsEnabled: true,
    logMaxLines: 500,
  },
  worlds: [],
  activeWorld: null,
  bepinex: { enabled: false, autoInstall: false },
  rcon: {
    enabled: false,
    port: 25575,
    password: "",
    host: "localhost",
    timeout: 5000,
    autoReconnect: true,
  },
};

let consoleLogSpy: ReturnType<typeof vi.spyOn>;
let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
let processExitSpy: ReturnType<typeof vi.spyOn>;

class ExitCalled extends Error {
  code: number;
  constructor(code: number) {
    super(`process.exit(${code})`);
    this.code = code;
  }
}

beforeEach(() => {
  consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  processExitSpy = vi.spyOn(process, "exit").mockImplementation(((
    code: number
  ) => {
    throw new ExitCalled(code);
  }) as never);
});

afterEach(() => {
  vi.resetAllMocks();
  consoleLogSpy.mockRestore();
  consoleErrorSpy.mockRestore();
  processExitSpy.mockRestore();
});

describe("configCommand", () => {
  describe("list subcommand", () => {
    it("displays all configuration", async () => {
      await configCommand(
        { command: "config", subcommand: "list" } as ConfigArgs,
        mockConfig as never
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("Configuration:")
      );
    });

    it("shows server settings", async () => {
      await configCommand(
        { command: "config", subcommand: "list" } as ConfigArgs,
        mockConfig as never
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("server.name: Test Server")
      );
    });

    it("defaults to list when subcommand unknown", async () => {
      await configCommand(
        { command: "config", subcommand: undefined } as unknown as ConfigArgs,
        mockConfig as never
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("Configuration:")
      );
    });
  });

  describe("get subcommand", () => {
    it("gets a specific value", async () => {
      await configCommand(
        {
          command: "config",
          subcommand: "get",
          key: "server.name",
        } as ConfigArgs,
        mockConfig as never
      );
      expect(consoleLogSpy).toHaveBeenCalledWith("Test Server");
    });

    it("gets object value as JSON", async () => {
      await configCommand(
        { command: "config", subcommand: "get", key: "server" } as ConfigArgs,
        mockConfig as never
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('"name": "Test Server"')
      );
    });

    it("errors when no key specified", async () => {
      await expect(
        configCommand(
          { command: "config", subcommand: "get" } as ConfigArgs,
          mockConfig as never
        )
      ).rejects.toThrow(ExitCalled);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("No key specified")
      );
    });

    it("errors for unknown key", async () => {
      await expect(
        configCommand(
          {
            command: "config",
            subcommand: "get",
            key: "nonexistent.key",
          } as ConfigArgs,
          mockConfig as never
        )
      ).rejects.toThrow(ExitCalled);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("Unknown configuration key")
      );
    });
  });

  describe("set subcommand", () => {
    it("sets a server config value", async () => {
      await configCommand(
        {
          command: "config",
          subcommand: "set",
          key: "server.name",
          value: "New Name",
        } as ConfigArgs,
        mockConfig as never
      );
      expect(updateServerConfig).toHaveBeenCalledWith({ name: "New Name" });
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("Set server.name")
      );
    });

    it("sets a watchdog config value", async () => {
      await configCommand(
        {
          command: "config",
          subcommand: "set",
          key: "watchdog.enabled",
          value: "true",
        } as ConfigArgs,
        mockConfig as never
      );
      expect(updateWatchdogConfig).toHaveBeenCalled();
    });

    it("errors when no key specified", async () => {
      await expect(
        configCommand(
          { command: "config", subcommand: "set" } as ConfigArgs,
          mockConfig as never
        )
      ).rejects.toThrow(ExitCalled);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("No key specified")
      );
    });

    it("errors when no value specified", async () => {
      await expect(
        configCommand(
          {
            command: "config",
            subcommand: "set",
            key: "server.name",
          } as ConfigArgs,
          mockConfig as never
        )
      ).rejects.toThrow(ExitCalled);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("No value specified")
      );
    });

    it("errors for invalid key format (no dot)", async () => {
      await expect(
        configCommand(
          {
            command: "config",
            subcommand: "set",
            key: "name",
            value: "test",
          } as ConfigArgs,
          mockConfig as never
        )
      ).rejects.toThrow(ExitCalled);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("section.key")
      );
    });

    it("errors for unknown section", async () => {
      await expect(
        configCommand(
          {
            command: "config",
            subcommand: "set",
            key: "unknown.field",
            value: "test",
          } as ConfigArgs,
          mockConfig as never
        )
      ).rejects.toThrow(ExitCalled);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("Unknown section")
      );
    });

    it("errors for tui section (not yet supported)", async () => {
      await expect(
        configCommand(
          {
            command: "config",
            subcommand: "set",
            key: "tui.colorScheme",
            value: "dark",
          } as ConfigArgs,
          mockConfig as never
        )
      ).rejects.toThrow(ExitCalled);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("cannot be changed via CLI")
      );
    });

    it("parses boolean true value", async () => {
      await configCommand(
        {
          command: "config",
          subcommand: "set",
          key: "server.public",
          value: "true",
        } as ConfigArgs,
        mockConfig as never
      );
      expect(updateServerConfig).toHaveBeenCalledWith({ public: true });
    });

    it("parses boolean false value", async () => {
      await configCommand(
        {
          command: "config",
          subcommand: "set",
          key: "server.public",
          value: "false",
        } as ConfigArgs,
        mockConfig as never
      );
      expect(updateServerConfig).toHaveBeenCalledWith({ public: false });
    });

    it("parses numeric value", async () => {
      await configCommand(
        {
          command: "config",
          subcommand: "set",
          key: "server.port",
          value: "2457",
        } as ConfigArgs,
        mockConfig as never
      );
      expect(updateServerConfig).toHaveBeenCalledWith({ port: 2457 });
    });
  });

  describe("reset subcommand", () => {
    it("resets configuration", async () => {
      await configCommand(
        { command: "config", subcommand: "reset" } as ConfigArgs,
        mockConfig as never
      );
      expect(resetConfig).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("reset successfully")
      );
    });

    it("handles reset error", async () => {
      vi.mocked(resetConfig).mockRejectedValue(new Error("write error"));
      await expect(
        configCommand(
          { command: "config", subcommand: "reset" } as ConfigArgs,
          mockConfig as never
        )
      ).rejects.toThrow(ExitCalled);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("write error")
      );
    });
  });
});
