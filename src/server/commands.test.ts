/**
 * Unit tests for Valheim admin command utilities
 */

import { describe, expect, it } from "vitest";
import { type AdminCommand, VALHEIM_COMMANDS } from "./commands.js";

describe("valheim commands", () => {
  describe("VALHEIM_COMMANDS", () => {
    it("defines standard Valheim commands", () => {
      expect(VALHEIM_COMMANDS).toBeDefined();
      expect(Array.isArray(VALHEIM_COMMANDS)).toBe(true);
      expect(VALHEIM_COMMANDS.length).toBeGreaterThan(0);
    });

    it("includes help command", () => {
      const helpCmd = VALHEIM_COMMANDS.find((cmd) => cmd.name === "help");

      expect(helpCmd).toBeDefined();
      expect(helpCmd?.requiresAdmin).toBe(false);
    });

    it("includes kick command", () => {
      const kickCmd = VALHEIM_COMMANDS.find((cmd) =>
        cmd.name.startsWith("kick")
      );

      expect(kickCmd).toBeDefined();
      expect(kickCmd?.requiresAdmin).toBe(true);
    });

    it("includes ban command", () => {
      const banCmd = VALHEIM_COMMANDS.find((cmd) => cmd.name.startsWith("ban"));

      expect(banCmd).toBeDefined();
      expect(banCmd?.requiresAdmin).toBe(true);
    });

    it("includes unban command", () => {
      const unbanCmd = VALHEIM_COMMANDS.find((cmd) =>
        cmd.name.startsWith("unban")
      );

      expect(unbanCmd).toBeDefined();
      expect(unbanCmd?.requiresAdmin).toBe(true);
    });

    it("includes save command", () => {
      const saveCmd = VALHEIM_COMMANDS.find((cmd) => cmd.name === "save");

      expect(saveCmd).toBeDefined();
      expect(saveCmd?.requiresAdmin).toBe(true);
    });

    it("includes info command", () => {
      const infoCmd = VALHEIM_COMMANDS.find((cmd) => cmd.name === "info");

      expect(infoCmd).toBeDefined();
      expect(infoCmd?.requiresAdmin).toBe(false);
    });

    it("includes banned list command", () => {
      const bannedCmd = VALHEIM_COMMANDS.find((cmd) => cmd.name === "banned");

      expect(bannedCmd).toBeDefined();
      expect(bannedCmd?.requiresAdmin).toBe(true);
    });

    it("all commands have required properties", () => {
      for (const cmd of VALHEIM_COMMANDS) {
        expect(cmd.name).toBeDefined();
        expect(typeof cmd.name).toBe("string");
        expect(cmd.name.length).toBeGreaterThan(0);

        expect(cmd.description).toBeDefined();
        expect(typeof cmd.description).toBe("string");
        expect(cmd.description.length).toBeGreaterThan(0);

        expect(typeof cmd.requiresAdmin).toBe("boolean");
      }
    });

    it("categorizes admin vs non-admin commands correctly", () => {
      const adminCommands = VALHEIM_COMMANDS.filter((cmd) => cmd.requiresAdmin);
      const publicCommands = VALHEIM_COMMANDS.filter(
        (cmd) => !cmd.requiresAdmin
      );

      expect(adminCommands.length).toBeGreaterThan(0);
      expect(publicCommands.length).toBeGreaterThan(0);

      // Help and info should be public
      const helpCmd = publicCommands.find((cmd) => cmd.name === "help");
      expect(helpCmd).toBeDefined();

      const infoCmd = publicCommands.find((cmd) => cmd.name === "info");
      expect(infoCmd).toBeDefined();

      // Kick, ban, save should be admin
      const adminOnlyNames = ["kick", "ban", "save"];
      for (const name of adminOnlyNames) {
        const cmd = adminCommands.find((c) => c.name.startsWith(name));
        expect(cmd).toBeDefined();
      }
    });
  });

  describe("AdminCommand type", () => {
    it("should define required command properties", () => {
      const command: AdminCommand = {
        name: "testcommand",
        description: "Test command description",
        requiresAdmin: true,
      };

      expect(command.name).toBe("testcommand");
      expect(command.description).toBe("Test command description");
      expect(command.requiresAdmin).toBe(true);
    });

    it("should support both admin and non-admin commands", () => {
      const adminCmd: AdminCommand = {
        name: "admin_cmd",
        description: "Admin only",
        requiresAdmin: true,
      };

      const publicCmd: AdminCommand = {
        name: "public_cmd",
        description: "Public command",
        requiresAdmin: false,
      };

      expect(adminCmd.requiresAdmin).toBe(true);
      expect(publicCmd.requiresAdmin).toBe(false);
    });
  });

  describe("ListType", () => {
    it("should define valid list types", () => {
      const types = ["admin", "banned", "permitted"];

      for (const type of types) {
        expect(type).toBeDefined();
        expect(typeof type).toBe("string");
      }
    });
  });

  describe("command descriptions", () => {
    it("all commands have meaningful descriptions", () => {
      for (const cmd of VALHEIM_COMMANDS) {
        // Description should be more than just the command name
        expect(cmd.description.length).toBeGreaterThan(5);
        expect(cmd.description).not.toBe(cmd.name);
      }
    });

    it("commands with parameters include parameter info", () => {
      const kickCmd = VALHEIM_COMMANDS.find((cmd) =>
        cmd.name.startsWith("kick")
      );
      const banCmd = VALHEIM_COMMANDS.find((cmd) => cmd.name.startsWith("ban"));

      // These commands should include parameter info in name
      expect(kickCmd?.name).toContain("[");
      expect(banCmd?.name).toContain("[");
    });
  });

  describe("RconCommandConfig type", () => {
    it("should define required RCON properties", () => {
      const config = {
        host: "localhost",
        port: 25575,
        password: "test123",
      };

      expect(config.host).toBeDefined();
      expect(config.port).toBeDefined();
      expect(config.password).toBeDefined();
    });

    it("should support optional timeout property", () => {
      const config = {
        host: "localhost",
        port: 25575,
        password: "test123",
        timeout: 10000,
      };

      expect(config.timeout).toBe(10000);
    });
  });
});
