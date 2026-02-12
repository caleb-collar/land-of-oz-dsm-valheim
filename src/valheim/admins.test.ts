/**
 * Tests for admin role management
 */

import { describe, expect, it } from "vitest";
import {
  isValidSteam64Id,
  ROLE_CAPABILITIES,
  validateSteamId,
} from "./admins.js";

describe("Admin Role Management", () => {
  describe("isValidSteam64Id", () => {
    it("should accept valid Steam64 IDs", () => {
      expect(isValidSteam64Id("76561198012345678")).toBe(true);
      expect(isValidSteam64Id("76561198087654321")).toBe(true);
      expect(isValidSteam64Id("76561190000000000")).toBe(true);
    });

    it("should reject invalid Steam64 IDs", () => {
      expect(isValidSteam64Id("")).toBe(false);
      expect(isValidSteam64Id("12345")).toBe(false);
      expect(isValidSteam64Id("1234567890123456")).toBe(false); // 16 digits
      expect(isValidSteam64Id("123456789012345678")).toBe(false); // 18 digits
      expect(isValidSteam64Id("86561198012345678")).toBe(false); // wrong prefix
      expect(isValidSteam64Id("7656119801234abcd")).toBe(false); // letters
    });
  });

  describe("validateSteamId", () => {
    it("should return valid for correct Steam64 IDs", () => {
      const result = validateSteamId("76561198012345678");
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should return error for empty input", () => {
      const result = validateSteamId("");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Steam ID required");
    });

    it("should return error for non-numeric input", () => {
      const result = validateSteamId("abc123def456ghi");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Steam ID must be numeric");
    });

    it("should return error for wrong length", () => {
      const result = validateSteamId("7656119801234");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Steam64 ID must be 17 digits");
    });

    it("should return error for wrong prefix", () => {
      const result = validateSteamId("86561198012345678");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Invalid Steam64 ID prefix");
    });
  });

  describe("ROLE_CAPABILITIES", () => {
    it("should have no capabilities for player role", () => {
      expect(ROLE_CAPABILITIES.player).toEqual([]);
    });

    it("should have admin commands for admin role", () => {
      expect(ROLE_CAPABILITIES.admin).toContain("kick");
      expect(ROLE_CAPABILITIES.admin).toContain("ban");
      expect(ROLE_CAPABILITIES.admin).toContain("playerlist");
      expect(ROLE_CAPABILITIES.admin).toContain("broadcast");
      expect(ROLE_CAPABILITIES.admin).toContain("event");
      expect(ROLE_CAPABILITIES.admin).toContain("stopevent");
    });

    it("should have wildcard for root role", () => {
      expect(ROLE_CAPABILITIES.root).toEqual(["*"]);
    });
  });
});
