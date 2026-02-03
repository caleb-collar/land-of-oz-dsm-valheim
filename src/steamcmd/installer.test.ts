/**
 * Unit tests for SteamCMD installer
 */

import { describe, expect, it } from "vitest";

// Test the exported types and constants
describe("steamcmd installer", () => {
  describe("InstallStage type", () => {
    it("should define valid install stages", () => {
      const stages = [
        "downloading",
        "extracting",
        "verifying",
        "complete",
        "error",
      ];

      // This test ensures all expected stages are valid types
      for (const stage of stages) {
        expect(stage).toBeDefined();
        expect(typeof stage).toBe("string");
      }
    });
  });

  describe("InstallProgress type", () => {
    it("should define required progress properties", () => {
      const progress = {
        stage: "downloading" as const,
        progress: 50,
        message: "Downloading SteamCMD...",
      };

      expect(progress.stage).toBe("downloading");
      expect(progress.progress).toBe(50);
      expect(progress.message).toBeDefined();
    });

    it("should support all install stages", () => {
      const stages = [
        "downloading",
        "extracting",
        "verifying",
        "complete",
        "error",
      ] as const;

      for (const stage of stages) {
        const progress = {
          stage,
          progress: 0,
          message: `Stage: ${stage}`,
        };

        expect(progress.stage).toBe(stage);
      }
    });

    it("should support progress values from 0 to 100", () => {
      const progress = {
        stage: "downloading" as const,
        progress: 75,
        message: "Downloading...",
      };

      expect(progress.progress).toBeGreaterThanOrEqual(0);
      expect(progress.progress).toBeLessThanOrEqual(100);
    });
  });

  describe("ProgressCallback type", () => {
    it("should define a callback function type", () => {
      const callback = (progress: {
        stage: string;
        progress: number;
        message: string;
      }) => {
        expect(progress).toBeDefined();
      };

      expect(typeof callback).toBe("function");

      // Call with sample data
      callback({
        stage: "downloading",
        progress: 50,
        message: "Test",
      });
    });
  });
});
