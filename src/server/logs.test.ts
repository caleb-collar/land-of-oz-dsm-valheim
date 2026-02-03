/**
 * Unit tests for log parsing and streaming
 */

import { describe, expect, it, vi } from "vitest";
import {
  LogBuffer,
  parseEvent,
  parseLogLine,
  type ServerLogEntry,
} from "./logs.js";

describe("log parsing", () => {
  describe("parseLogLine", () => {
    it("parses basic log line", () => {
      const entry = parseLogLine("Server starting up");

      expect(entry.message).toBe("Server starting up");
      expect(entry.level).toBe("info");
      expect(entry.raw).toBe("Server starting up");
      expect(entry.timestamp).toBeInstanceOf(Date);
    });

    it("detects error level from content", () => {
      const entry1 = parseLogLine("Error: Failed to load world");
      expect(entry1.level).toBe("error");

      const entry2 = parseLogLine("Exception: NullReferenceException");
      expect(entry2.level).toBe("error");
    });

    it("detects warning level from content", () => {
      const entry1 = parseLogLine("Warning: High memory usage");
      expect(entry1.level).toBe("warn");

      const entry2 = parseLogLine("WARN: Connection unstable");
      expect(entry2.level).toBe("warn");
    });

    it("detects debug level from content", () => {
      const entry1 = parseLogLine("DEBUG: Processing packet");
      expect(entry1.level).toBe("debug");

      const entry2 = parseLogLine("[Debug] Cache hit");
      expect(entry2.level).toBe("debug");
    });

    it("extracts Valheim timestamp format", () => {
      const entry = parseLogLine("02/15/2024 12:34:56: Server ready");

      expect(entry.message).toBe("Server ready");
      expect(entry.raw).toBe("02/15/2024 12:34:56: Server ready");
    });

    it("handles empty lines", () => {
      const entry = parseLogLine("");

      expect(entry.message).toBe("");
      expect(entry.level).toBe("info");
    });

    it("trims whitespace from message", () => {
      const entry = parseLogLine("  Leading and trailing whitespace  ");

      expect(entry.message).toBe("Leading and trailing whitespace");
    });
  });

  describe("parseEvent", () => {
    it("detects player join", () => {
      const event = parseEvent("Got character ZDOID from Viking123");

      expect(event).toEqual({
        type: "player_join",
        name: "Viking123",
      });
    });

    it("detects world saved", () => {
      const event = parseEvent("World saved ( 412.501 ms )");

      expect(event).toEqual({ type: "world_saved" });
    });

    it("detects world generated", () => {
      const event = parseEvent("Done generating locations");

      expect(event).toEqual({ type: "world_generated" });
    });

    it("detects server ready", () => {
      const event = parseEvent("Game server connected");

      expect(event).toEqual({ type: "server_ready" });
    });

    it("detects server shutdown", () => {
      const event = parseEvent("OnApplicationQuit");

      expect(event).toEqual({ type: "server_shutdown" });
    });

    it("detects startup phase: initializing", () => {
      const event = parseEvent("DungeonDB Start");

      expect(event).toEqual({
        type: "startup_phase",
        phase: "initializing",
      });
    });

    it("detects startup phase: loading_world", () => {
      const event1 = parseEvent("Load world MyWorld");
      expect(event1).toEqual({
        type: "startup_phase",
        phase: "loading_world",
      });

      const event2 = parseEvent("Loading world data...");
      expect(event2).toEqual({
        type: "startup_phase",
        phase: "loading_world",
      });
    });

    it("detects startup phase: generating_world", () => {
      const event = parseEvent("Generating locations, please wait...");

      expect(event).toEqual({
        type: "startup_phase",
        phase: "generating_world",
      });
    });

    it("detects startup phase: creating_locations", () => {
      const event1 = parseEvent("Placing locations");
      expect(event1).toEqual({
        type: "startup_phase",
        phase: "creating_locations",
      });

      const event2 = parseEvent("Failed to place all locations");
      expect(event2).toEqual({
        type: "startup_phase",
        phase: "creating_locations",
      });
    });

    it("detects startup phase: starting_server", () => {
      const event1 = parseEvent("ZDOMan initialization");
      expect(event1).toEqual({
        type: "startup_phase",
        phase: "starting_server",
      });

      const event2 = parseEvent("Zonesystem Start");
      expect(event2).toEqual({
        type: "startup_phase",
        phase: "starting_server",
      });
    });

    it("detects startup phase: registering_lobby", () => {
      const event = parseEvent("Registering lobby...");

      expect(event).toEqual({
        type: "startup_phase",
        phase: "registering_lobby",
      });
    });

    it("detects errors", () => {
      const event1 = parseEvent("Error! Failed to connect to database");
      expect(event1).toEqual({
        type: "error",
        message: "Error! Failed to connect to database",
      });

      const event2 = parseEvent("FAILED to load texture");
      expect(event2).toEqual({
        type: "error",
        message: "FAILED to load texture",
      });

      const event3 = parseEvent("Exception: Out of memory");
      expect(event3).toEqual({
        type: "error",
        message: "Exception: Out of memory",
      });
    });

    it("returns null for non-event lines", () => {
      expect(parseEvent("Random log message")).toBeNull();
      expect(parseEvent("")).toBeNull();
      expect(parseEvent("Some other info")).toBeNull();
    });

    it("ignores player disconnect without name", () => {
      const event = parseEvent("Closing socket 192.168.1.1:52345");

      expect(event).toBeNull();
    });
  });
});

describe("LogBuffer", () => {
  it("creates buffer with default size", () => {
    const buffer = new LogBuffer();

    expect(buffer).toBeDefined();
    expect(buffer.size).toBe(0);
  });

  it("creates buffer with custom size", () => {
    const buffer = new LogBuffer(500);

    expect(buffer).toBeDefined();
    expect(buffer.size).toBe(0);
  });

  describe("add", () => {
    it("adds log entry and parses it", () => {
      const buffer = new LogBuffer();

      const entry = buffer.add("Test message");

      expect(entry.message).toBe("Test message");
      expect(buffer.size).toBe(1);
    });

    it("increments size correctly", () => {
      const buffer = new LogBuffer();

      buffer.add("Message 1");
      buffer.add("Message 2");
      buffer.add("Message 3");

      expect(buffer.size).toBe(3);
    });

    it("trims old entries when maxSize exceeded", () => {
      const buffer = new LogBuffer(3);

      buffer.add("Message 1");
      buffer.add("Message 2");
      buffer.add("Message 3");
      buffer.add("Message 4"); // Should remove Message 1

      expect(buffer.size).toBe(3);

      const entries = buffer.getAll();
      expect(entries[0].message).toBe("Message 2");
      expect(entries[2].message).toBe("Message 4");
    });

    it("notifies subscribers", () => {
      const buffer = new LogBuffer();
      const received: ServerLogEntry[] = [];

      buffer.subscribe((entry) => {
        received.push(entry);
      });

      buffer.add("Message 1");
      buffer.add("Message 2");

      expect(received.length).toBe(2);
      expect(received[0].message).toBe("Message 1");
      expect(received[1].message).toBe("Message 2");
    });
  });

  describe("getAll", () => {
    it("returns copy of all entries", () => {
      const buffer = new LogBuffer();

      buffer.add("Message 1");
      buffer.add("Message 2");

      const entries = buffer.getAll();

      expect(entries.length).toBe(2);
      expect(entries[0].message).toBe("Message 1");

      // Modifying returned array should not affect buffer
      entries.push(parseLogLine("Extra"));
      expect(buffer.size).toBe(2);
    });

    it("returns empty array when no entries", () => {
      const buffer = new LogBuffer();

      const entries = buffer.getAll();

      expect(entries).toEqual([]);
    });
  });

  describe("getFiltered", () => {
    it("filters entries by level", () => {
      const buffer = new LogBuffer();

      buffer.add("Info message");
      buffer.add("Error: Something failed");
      buffer.add("Warning: Low memory");
      buffer.add("Another info");

      const errors = buffer.getFiltered("error");
      const warnings = buffer.getFiltered("warn");
      const infos = buffer.getFiltered("info");

      expect(errors.length).toBe(1);
      expect(warnings.length).toBe(1);
      expect(infos.length).toBe(2);
    });

    it("returns empty array for level with no matches", () => {
      const buffer = new LogBuffer();

      buffer.add("Info message");

      const debugs = buffer.getFiltered("debug");

      expect(debugs).toEqual([]);
    });
  });

  describe("getRecent", () => {
    it("returns most recent entries", () => {
      const buffer = new LogBuffer();

      buffer.add("Message 1");
      buffer.add("Message 2");
      buffer.add("Message 3");
      buffer.add("Message 4");

      const recent = buffer.getRecent(2);

      expect(recent.length).toBe(2);
      expect(recent[0].message).toBe("Message 3");
      expect(recent[1].message).toBe("Message 4");
    });

    it("returns all entries if count exceeds size", () => {
      const buffer = new LogBuffer();

      buffer.add("Message 1");
      buffer.add("Message 2");

      const recent = buffer.getRecent(10);

      expect(recent.length).toBe(2);
    });
  });

  describe("subscribe", () => {
    it("returns unsubscribe function", () => {
      const buffer = new LogBuffer();
      const callback = vi.fn();

      const unsubscribe = buffer.subscribe(callback);

      expect(typeof unsubscribe).toBe("function");
    });

    it("subscriber receives new entries", () => {
      const buffer = new LogBuffer();
      const received: ServerLogEntry[] = [];

      buffer.subscribe((entry) => {
        received.push(entry);
      });

      buffer.add("Test");

      expect(received.length).toBe(1);
      expect(received[0].message).toBe("Test");
    });

    it("unsubscribe stops receiving entries", () => {
      const buffer = new LogBuffer();
      const received: ServerLogEntry[] = [];

      const unsubscribe = buffer.subscribe((entry) => {
        received.push(entry);
      });

      buffer.add("Message 1");
      unsubscribe();
      buffer.add("Message 2");

      expect(received.length).toBe(1);
      expect(received[0].message).toBe("Message 1");
    });

    it("handles multiple subscribers", () => {
      const buffer = new LogBuffer();
      const received1: ServerLogEntry[] = [];
      const received2: ServerLogEntry[] = [];

      buffer.subscribe((entry) => received1.push(entry));
      buffer.subscribe((entry) => received2.push(entry));

      buffer.add("Broadcast");

      expect(received1.length).toBe(1);
      expect(received2.length).toBe(1);
    });

    it("handles subscriber errors gracefully", () => {
      const buffer = new LogBuffer();
      const goodCallback = vi.fn();

      // Add a subscriber that throws
      buffer.subscribe(() => {
        throw new Error("Subscriber error");
      });

      // Add a good subscriber
      buffer.subscribe(goodCallback);

      // Should not throw and should still call good subscriber
      buffer.add("Test");

      expect(goodCallback).toHaveBeenCalled();
    });
  });

  describe("clear", () => {
    it("removes all entries", () => {
      const buffer = new LogBuffer();

      buffer.add("Message 1");
      buffer.add("Message 2");
      buffer.clear();

      expect(buffer.size).toBe(0);
      expect(buffer.getAll()).toEqual([]);
    });

    it("works on empty buffer", () => {
      const buffer = new LogBuffer();

      buffer.clear();

      expect(buffer.size).toBe(0);
    });
  });

  describe("size", () => {
    it("returns current entry count", () => {
      const buffer = new LogBuffer();

      expect(buffer.size).toBe(0);

      buffer.add("1");
      expect(buffer.size).toBe(1);

      buffer.add("2");
      expect(buffer.size).toBe(2);

      buffer.clear();
      expect(buffer.size).toBe(0);
    });
  });
});
