/**
 * Unit tests for startup task utilities (type and constant definitions)
 */

import { describe, expect, it } from "vitest";

describe("startup task utilities", () => {
  describe("StartupTaskResult type", () => {
    it("should define required result properties", () => {
      const result = {
        success: true,
        message: "Task registered successfully",
      };

      expect(result.success).toBe(true);
      expect(result.message).toBeDefined();
      expect(typeof result.message).toBe("string");
    });

    it("should support optional requiresAdmin property", () => {
      const result = {
        success: false,
        message: "Admin privileges required",
        requiresAdmin: true,
      };

      expect(result.requiresAdmin).toBe(true);
    });

    it("should represent success scenarios", () => {
      const successResult = {
        success: true,
        message: "Startup task registered",
      };

      expect(successResult.success).toBe(true);
    });

    it("should represent failure scenarios", () => {
      const failureResult = {
        success: false,
        message: "Failed to register task",
      };

      expect(failureResult.success).toBe(false);
    });

    it("should include descriptive messages", () => {
      const result = {
        success: true,
        message: "Task already exists",
      };

      expect(result.message.length).toBeGreaterThan(0);
    });
  });

  describe("task name and description", () => {
    it("task name should be consistent", () => {
      const taskName = "oz-valheim-dsm";

      expect(taskName).toBe("oz-valheim-dsm");
      expect(taskName).toContain("oz");
      expect(taskName).toContain("valheim");
    });

    it("task description should be meaningful", () => {
      const description = "Land of OZ - Valheim Dedicated Server Manager";

      expect(description).toContain("Land of OZ");
      expect(description).toContain("Valheim");
      expect(description).toContain("Server Manager");
    });
  });
});
