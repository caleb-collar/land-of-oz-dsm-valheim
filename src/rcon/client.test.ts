/**
 * Unit tests for RCON Client
 */

import { describe, expect, it } from "vitest";
import { RconError } from "./types.js";

describe("RconClient", () => {
  describe("constructor and isConnected", () => {
    it("creates client that is not connected", async () => {
      // Dynamically import to avoid module-level mock issues
      const { RconClient } = await import("./client.js");
      const client = new RconClient({
        host: "localhost",
        port: 25575,
        password: "test",
      });
      expect(client.isConnected()).toBe(false);
    });
  });

  describe("send", () => {
    it("throws when not connected", async () => {
      const { RconClient } = await import("./client.js");
      const client = new RconClient({
        host: "localhost",
        port: 25575,
        password: "test",
      });

      await expect(client.send("test")).rejects.toThrow("Not connected");
    });
  });

  describe("disconnect", () => {
    it("is safe to call when not connected", async () => {
      const { RconClient } = await import("./client.js");
      const client = new RconClient({
        host: "localhost",
        port: 25575,
        password: "test",
      });

      // Should not throw
      client.disconnect();
      expect(client.isConnected()).toBe(false);
    });
  });

  describe("RconError", () => {
    it("has correct code and message", () => {
      const err = new RconError("AUTH_FAILED", "Bad password");
      expect(err.code).toBe("AUTH_FAILED");
      expect(err.message).toBe("Bad password");
      expect(err.name).toBe("RconError");
      expect(err).toBeInstanceOf(Error);
    });

    it("supports all error codes", () => {
      const codes = [
        "DISCONNECTED",
        "AUTH_FAILED",
        "TIMEOUT",
        "CONNECTION_REFUSED",
        "PROTOCOL_ERROR",
        "UNKNOWN",
      ] as const;

      for (const code of codes) {
        const err = new RconError(code, `test ${code}`);
        expect(err.code).toBe(code);
      }
    });
  });
});
