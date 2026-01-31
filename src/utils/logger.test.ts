/**
 * Unit tests for logger utilities
 */

import { assertEquals, assertExists, assertMatch } from "@std/assert";
import {
  configureLogger,
  createLogger,
  debug,
  error,
  info,
  type LogLevel,
  parseValheimLog,
  warn,
} from "./logger.ts";

Deno.test("info returns a valid LogEntry", () => {
  const entry = info("Test message");

  assertEquals(entry.level, "info");
  assertEquals(entry.message, "Test message");
  assertExists(entry.timestamp);
  assertEquals(entry.timestamp instanceof Date, true);
});

Deno.test("debug returns a valid LogEntry", () => {
  const entry = debug("Debug message");

  assertEquals(entry.level, "debug");
  assertEquals(entry.message, "Debug message");
  assertExists(entry.timestamp);
});

Deno.test("warn returns a valid LogEntry", () => {
  const entry = warn("Warning message");

  assertEquals(entry.level, "warn");
  assertEquals(entry.message, "Warning message");
  assertExists(entry.timestamp);
});

Deno.test("error returns a valid LogEntry", () => {
  const entry = error("Error message");

  assertEquals(entry.level, "error");
  assertEquals(entry.message, "Error message");
  assertExists(entry.timestamp);
});

Deno.test("log entry can include data", () => {
  const data = { key: "value", count: 42 };
  const entry = info("Message with data", data);

  assertEquals(entry.level, "info");
  assertEquals(entry.message, "Message with data");
  assertExists(entry.data);
  assertEquals(entry.data?.key, "value");
  assertEquals(entry.data?.count, 42);
});

Deno.test("createLogger creates logger with source", () => {
  const logger = createLogger("TestSource");

  const entry = logger.info("Sourced message");
  assertEquals(entry.source, "TestSource");
  assertEquals(entry.message, "Sourced message");
});

Deno.test("createLogger supports all log levels", () => {
  const logger = createLogger("MyModule");

  const levels: LogLevel[] = ["debug", "info", "warn", "error"];
  for (const level of levels) {
    const entry = logger[level](`${level} message`);
    assertEquals(entry.level, level);
    assertEquals(entry.source, "MyModule");
  }
});

Deno.test("configureLogger updates global config", () => {
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
  assertEquals(entry.level, "info");
  assertExists(entry.timestamp);

  // Reset to defaults for other tests
  configureLogger({
    minLevel: "info",
    enableColors: true,
    source: undefined,
  });
});

Deno.test("parseValheimLog parses basic info message", () => {
  const entry = parseValheimLog("Server started successfully");

  assertEquals(entry.level, "info");
  assertEquals(entry.message, "Server started successfully");
  assertEquals(entry.source, "valheim");
  assertExists(entry.timestamp);
});

Deno.test("parseValheimLog detects error level", () => {
  const entry = parseValheimLog("Error: Connection failed");

  assertEquals(entry.level, "error");
  assertMatch(entry.message, /Error/);
});

Deno.test("parseValheimLog detects exception as error", () => {
  const entry = parseValheimLog("NullReferenceException: Object not found");

  assertEquals(entry.level, "error");
  assertMatch(entry.message, /Exception/);
});

Deno.test("parseValheimLog detects warning level", () => {
  const entry = parseValheimLog("Warning: Low memory");

  assertEquals(entry.level, "warn");
  assertMatch(entry.message, /Warning/);
});

Deno.test("parseValheimLog extracts player connect event", () => {
  const line = "Got character ZDOID from Viking01 : 12345:67890";
  const entry = parseValheimLog(line);

  assertEquals(entry.level, "info");
  assertExists(entry.data);
  assertEquals(entry.data?.event, "player_connect");
  assertEquals(entry.data?.player, "Viking01");
  assertEquals(entry.data?.zdoid, "12345:67890");
});

Deno.test("parseValheimLog extracts player disconnect event", () => {
  const line = "Closing socket 12345";
  const entry = parseValheimLog(line);

  assertExists(entry.data);
  assertEquals(entry.data?.event, "player_disconnect");
  assertEquals(entry.data?.socket, "12345");
});

Deno.test("parseValheimLog extracts world save event", () => {
  const line = "World saved (12.5ms)";
  const entry = parseValheimLog(line);

  assertExists(entry.data);
  assertEquals(entry.data?.event, "world_save");
});

Deno.test("parseValheimLog handles empty lines", () => {
  const entry = parseValheimLog("   ");

  assertEquals(entry.level, "info");
  assertEquals(entry.message, "");
});

Deno.test("parseValheimLog handles complex multiline content", () => {
  const line = "[12:34:56] Server: Player Viking01 has joined the game";
  const entry = parseValheimLog(line);

  assertEquals(entry.level, "info");
  assertEquals(entry.source, "valheim");
  assertExists(entry.timestamp);
});
