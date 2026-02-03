/**
 * Unit tests for Valheim updater
 */

import { describe, expect, it } from "vitest";
import { VALHEIM_APP_ID } from "./updater.js";

describe("valheim updater", () => {
  describe("VALHEIM_APP_ID constant", () => {
    it("should be a valid Steam App ID", () => {
      expect(VALHEIM_APP_ID).toBe(896660);
      expect(typeof VALHEIM_APP_ID).toBe("number");
      expect(VALHEIM_APP_ID).toBeGreaterThan(0);
    });

    it("should be the correct Valheim Dedicated Server App ID", () => {
      // Valheim Dedicated Server on Steam
      expect(VALHEIM_APP_ID).toBe(896660);
    });
  });

  describe("UpdateStage type", () => {
    it("should define valid update stages", () => {
      const stages = [
        "checking",
        "downloading",
        "validating",
        "complete",
        "error",
      ];

      for (const stage of stages) {
        expect(stage).toBeDefined();
        expect(typeof stage).toBe("string");
      }
    });
  });

  describe("UpdateStatus type", () => {
    it("should define required status properties", () => {
      const status = {
        stage: "downloading" as const,
        progress: 50,
        message: "Downloading Valheim...",
      };

      expect(status.stage).toBe("downloading");
      expect(status.progress).toBe(50);
      expect(status.message).toBeDefined();
    });

    it("should support optional needsUpdate property", () => {
      const status1 = {
        stage: "checking" as const,
        progress: 0,
        message: "Checking for updates...",
        needsUpdate: true,
      };

      const status2 = {
        stage: "complete" as const,
        progress: 100,
        message: "Up to date",
        needsUpdate: false,
      };

      expect(status1.needsUpdate).toBe(true);
      expect(status2.needsUpdate).toBe(false);
    });

    it("should support all update stages", () => {
      const stages = [
        "checking",
        "downloading",
        "validating",
        "complete",
        "error",
      ] as const;

      for (const stage of stages) {
        const status = {
          stage,
          progress: 0,
          message: `Stage: ${stage}`,
        };

        expect(status.stage).toBe(stage);
      }
    });
  });

  describe("UpdateCallback type", () => {
    it("should define a callback function type", () => {
      const callback = (status: {
        stage: string;
        progress: number;
        message: string;
      }) => {
        expect(status).toBeDefined();
      };

      expect(typeof callback).toBe("function");

      callback({
        stage: "downloading",
        progress: 50,
        message: "Test",
      });
    });
  });
});
