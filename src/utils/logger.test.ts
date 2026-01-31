/**
 * Unit tests for logger utilities
 */

import { describe, expect, it } from "vitest";
import {
  type LogLevel,
  configureLogger,
  createLogger,
  debug,
  error,
  info,
  parseValheimLog,
  warn,
} from "./logger.js";

describe("logger utilities", () => {
  it("info returns a valid LogEntry", () => {
    const entry = info("Test message");

    expect(entry.level).toBe("info");
    expect(entry.message).toBe("Test message");
    expect(entry.timestamp).toBeDefined();
    expect(entry.timestamp instanceof Date).toBe(true);
  });

  it("debug returns a valid LogEntry", () => {
    const entry = debug("Debug message");

    expect(entry.level).toBe("debug");
    expect(entry.message).toBe("Debug message");
    expect(entry.timestamp).toBeDefined();
  });

  it("warn returns a valid LogEntry", () => {
    const entry = warn("Warning message");

    expect(entry.level).toBe("warn");
    expect(entry.message).toBe("Warning message");
    expect(entry.timestamp).toBeDefined();
  });

  it("error returns a valid LogEntry", () => {
    const entry = error("Error message");

    expect(entry.level).toBe("error");
    expect(entry.message).toBe("Error message");
    expect(entry.timestamp).toBeDefined();
  });

  it("log entry can include data", () => {
    const data = { key: "value", count: 42 };
    const entry = info("Message with data", data);

    expect(entry.level).toBe("info");
    expect(entry.message).toBe("Message with data");
    expect(entry.data).toBeDefined();
    expect(entry.data?.key).toBe("value");
    expect(entry.data?.count).toBe(42);
  });

  it("createLogger creates logger with source", () => {
    const logger = createLogger("TestSource");

    const entry = logger.info("Sourced message");
    expect(entry.source).toBe("TestSource");
    expect(entry.message).toBe("Sourced message");
  });

  it("createLogger supports all log levels", () => {
    const logger = createLogger("MyModule");

    const levels: LogLevel[] = ["debug", "info", "warn", "error"];
    for (const level of levels) {
      const entry = logger[level](`${level} message`);
      expect(entry.level).toBe(level);
      expect(entry.source).toBe("MyModule");
    }
  });

  it("configureLogger updates global config", () => {
    // Save original config behavior by creating entry before config
    info("Before config");

    // Configure logger
    configureLogger({
      minLevel: "warn",
      enableColors: false,
      source: "GlobalSource",
    });

    // Entries should still be created regardless of minLevel
    const entry = info("After config");
    expect(entry.level).toBe("info");
    expect(entry.timestamp).toBeDefined();

    // Reset to defaults for other tests
    configureLogger({
      minLevel: "info",
      enableColors: true,
      source: undefined,
    });
  });
});

describe("parseValheimLog", () => {
  it("parses basic info message", () => {
    const entry = parseValheimLog("Server started successfully");

    expect(entry.level).toBe("info");
    expect(entry.message).toBe("Server started successfully");
    expect(entry.source).toBe("valheim");
    expect(entry.timestamp).toBeDefined();
  });

  it("detects error level", () => {
    const entry = parseValheimLog("Error: Connection failed");

    expect(entry.level).toBe("error");
    expect(entry.message).toMatch(/Error/);
  });

  it("detects exception as error", () => {
    const entry = parseValheimLog("NullReferenceException: Object not found");

    expect(entry.level).toBe("error");
    expect(entry.message).toMatch(/Exception/);
  });

  it("detects warning level", () => {
    const entry = parseValheimLog("Warning: Low memory");

    expect(entry.level).toBe("warn");
    expect(entry.message).toMatch(/Warning/);
  });

  it("extracts player connect event", () => {
    const line = "Got character ZDOID from Viking01 : 12345:67890";
    const entry = parseValheimLog(line);

    expect(entry.level).toBe("info");
    expect(entry.data).toBeDefined();
    expect(entry.data?.event).toBe("player_connect");
    expect(entry.data?.player).toBe("Viking01");
    expect(entry.data?.zdoid).toBe("12345:67890");
  });

  it("extracts player disconnect event", () => {
    const line = "Closing socket 12345";
    const entry = parseValheimLog(line);

    expect(entry.data).toBeDefined();
    expect(entry.data?.event).toBe("player_disconnect");
    expect(entry.data?.socket).toBe("12345");
  });

  it("extracts world save event", () => {
    const line = "World saved (12.5ms)";
    const entry = parseValheimLog(line);

    expect(entry.data).toBeDefined();
    expect(entry.data?.event).toBe("world_save");
  });

  it("handles empty lines", () => {
    const entry = parseValheimLog("   ");

    expect(entry.level).toBe("info");
    expect(entry.message).toBe("");
  });

  it("handles complex multiline content", () => {
    const line = "[12:34:56] Server: Player Viking01 has joined the game";
    const entry = parseValheimLog(line);

    expect(entry.level).toBe("info");
    expect(entry.source).toBe("valheim");
    expect(entry.timestamp).toBeDefined();
  });
});
