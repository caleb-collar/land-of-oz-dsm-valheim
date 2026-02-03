/**
 * Unit tests for RCON types and constants
 */

import { describe, expect, it } from "vitest";
import { PacketType, RconError, ValheimCommands } from "./types.js";

describe("RCON types", () => {
  describe("PacketType", () => {
    it("defines all packet types", () => {
      expect(PacketType.SERVERDATA_AUTH).toBe(3);
      expect(PacketType.SERVERDATA_AUTH_RESPONSE).toBe(2);
      expect(PacketType.SERVERDATA_EXECCOMMAND).toBe(2);
      expect(PacketType.SERVERDATA_RESPONSE_VALUE).toBe(0);
    });

    it("auth and auth response have different values", () => {
      expect(PacketType.SERVERDATA_AUTH).not.toBe(
        PacketType.SERVERDATA_AUTH_RESPONSE
      );
    });

    it("execcommand and auth response are same type", () => {
      expect(PacketType.SERVERDATA_EXECCOMMAND).toBe(
        PacketType.SERVERDATA_AUTH_RESPONSE
      );
    });

    it("all packet types are numbers", () => {
      for (const type of Object.values(PacketType)) {
        expect(typeof type).toBe("number");
      }
    });
  });

  describe("RconError", () => {
    it("creates error with code and message", () => {
      const error = new RconError("CONNECTION_FAILED", "Failed to connect");

      expect(error.code).toBe("CONNECTION_FAILED");
      expect(error.message).toBe("Failed to connect");
      expect(error.name).toBe("RconError");
    });

    it("is instance of Error", () => {
      const error = new RconError("AUTH_FAILED", "Authentication failed");

      expect(error instanceof Error).toBe(true);
      expect(error instanceof RconError).toBe(true);
    });

    it("supports all error codes", () => {
      const codes = [
        "CONNECTION_FAILED",
        "AUTH_FAILED",
        "TIMEOUT",
        "DISCONNECTED",
        "PROTOCOL_ERROR",
      ] as const;

      for (const code of codes) {
        const error = new RconError(code, "Test error");
        expect(error.code).toBe(code);
      }
    });

    it("preserves stack trace", () => {
      const error = new RconError("TIMEOUT", "Request timed out");

      expect(error.stack).toBeDefined();
    });
  });

  describe("ValheimCommands", () => {
    it("defines constant commands", () => {
      expect(ValheimCommands.SAVE).toBe("save");
      expect(ValheimCommands.INFO).toBe("info");
      expect(ValheimCommands.PING).toBe("ping");
      expect(ValheimCommands.BANNED).toBe("banned");
      expect(ValheimCommands.PERMITTED).toBe("permitted");
    });

    it("has kick command builder", () => {
      const command = ValheimCommands.kick("Player123");

      expect(command).toBe("kick Player123");
    });

    it("has ban command builder", () => {
      const command = ValheimCommands.ban("BadPlayer");

      expect(command).toBe("ban BadPlayer");
    });

    it("has unban command builder", () => {
      const command = ValheimCommands.unban("123.456.789.0");

      expect(command).toBe("unban 123.456.789.0");
    });

    it("command builders handle empty strings", () => {
      const kickCmd = ValheimCommands.kick("");
      const banCmd = ValheimCommands.ban("");
      const unbanCmd = ValheimCommands.unban("");

      expect(kickCmd).toBe("kick ");
      expect(banCmd).toBe("ban ");
      expect(unbanCmd).toBe("unban ");
    });

    it("command builders handle special characters", () => {
      const command = ValheimCommands.kick("Player[123]");

      expect(command).toContain("Player[123]");
    });

    it("all constant commands are lowercase", () => {
      const constants = [
        ValheimCommands.SAVE,
        ValheimCommands.INFO,
        ValheimCommands.PING,
        ValheimCommands.BANNED,
        ValheimCommands.PERMITTED,
      ];

      for (const cmd of constants) {
        expect(cmd).toBe(cmd.toLowerCase());
      }
    });
  });

  describe("RconConfig type", () => {
    it("defines required config properties", () => {
      const config = {
        host: "localhost",
        port: 25575,
        password: "secret",
      };

      expect(config.host).toBeDefined();
      expect(config.port).toBeDefined();
      expect(config.password).toBeDefined();
    });

    it("supports optional properties", () => {
      const config = {
        host: "localhost",
        port: 25575,
        password: "secret",
        timeout: 10000,
        autoReconnect: true,
      };

      expect(config.timeout).toBe(10000);
      expect(config.autoReconnect).toBe(true);
    });
  });

  describe("RconState type", () => {
    it("defines all connection states", () => {
      const states = [
        "disconnected",
        "connecting",
        "authenticating",
        "connected",
        "error",
      ];

      for (const state of states) {
        expect(state).toBeDefined();
        expect(typeof state).toBe("string");
      }
    });
  });

  describe("RconPacket type", () => {
    it("defines packet structure", () => {
      const packet = {
        id: 1,
        type: 2,
        body: "save",
      };

      expect(packet.id).toBe(1);
      expect(packet.type).toBe(2);
      expect(packet.body).toBe("save");
    });

    it("supports empty body", () => {
      const packet = {
        id: 1,
        type: 3,
        body: "",
      };

      expect(packet.body).toBe("");
    });
  });
});
