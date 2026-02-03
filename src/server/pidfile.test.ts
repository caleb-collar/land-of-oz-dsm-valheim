/**
 * Unit tests for PID file management
 */

import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  cleanupOldLogs,
  ensureLogsDir,
  getPidFilePath,
  getRunningServer,
  getServerLogFile,
  getServerLogsDir,
  isProcessRunning,
  killProcess,
  type PidFileData,
  readPidFile,
  removePidFile,
  writePidFile,
} from "./pidfile.js";

describe("pidfile utilities", () => {
  const testPidData: PidFileData = {
    pid: 12345,
    startedAt: new Date().toISOString(),
    world: "TestWorld",
    port: 2456,
    serverName: "Test Server",
    detached: false,
  };

  // Clean up any test PID files after tests
  afterEach(async () => {
    await removePidFile().catch(() => {
      /* ignore */
    });
  });

  describe("path helpers", () => {
    it("getPidFilePath returns valid path", () => {
      const pidPath = getPidFilePath();
      expect(pidPath).toBeDefined();
      expect(pidPath).toContain("oz-valheim");
      expect(pidPath).toContain("server.pid");
    });

    it("getServerLogsDir returns valid path", () => {
      const logsDir = getServerLogsDir();
      expect(logsDir).toBeDefined();
      expect(logsDir).toContain("logs");
    });

    it("getServerLogFile returns timestamped log file path", () => {
      const logFile = getServerLogFile();
      expect(logFile).toBeDefined();
      expect(logFile).toContain("valheim-server-");
      expect(logFile).toContain(".log");
    });

    it("getServerLogFile accepts custom timestamp", () => {
      const testDate = new Date("2024-01-15T10:30:00Z");
      const logFile = getServerLogFile(testDate);
      expect(logFile).toContain("valheim-server-2024-01-15.log");
    });
  });

  describe("PID file operations", () => {
    it("writePidFile and readPidFile roundtrip works", async () => {
      await writePidFile(testPidData);
      const read = await readPidFile();

      expect(read).toBeDefined();
      expect(read?.pid).toBe(testPidData.pid);
      expect(read?.world).toBe(testPidData.world);
      expect(read?.port).toBe(testPidData.port);
      expect(read?.serverName).toBe(testPidData.serverName);
    });

    it("readPidFile returns null when file doesn't exist", async () => {
      await removePidFile();
      const read = await readPidFile();
      expect(read).toBeNull();
    });

    it("readPidFile handles corrupted JSON gracefully", async () => {
      // Write invalid JSON
      const pidPath = getPidFilePath();
      const dir = path.dirname(pidPath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(pidPath, "invalid json {", "utf-8");

      const read = await readPidFile();
      expect(read).toBeNull();
    });

    it("removePidFile removes the file", async () => {
      await writePidFile(testPidData);
      await removePidFile();

      const read = await readPidFile();
      expect(read).toBeNull();
    });

    it("removePidFile handles missing file gracefully", async () => {
      await removePidFile();
      // Should not throw
      await expect(removePidFile()).resolves.not.toThrow();
    });
  });

  describe("process management", () => {
    it("isProcessRunning returns true for current process", () => {
      const result = isProcessRunning(process.pid);
      expect(result).toBe(true);
    });

    it("isProcessRunning returns false for non-existent PID", () => {
      // Use a very high PID that's unlikely to exist
      const result = isProcessRunning(999999);
      expect(result).toBe(false);
    });

    it("killProcess returns false for non-existent PID", () => {
      const result = killProcess(999999);
      expect(result).toBe(false);
    });

    it("killProcess accepts force parameter", () => {
      // Just test that it doesn't crash with different params
      // We can't actually kill real processes in tests
      const result = killProcess(999999, true);
      expect(result).toBe(false);
    });
  });

  describe("getRunningServer", () => {
    it("returns null when no PID file exists", async () => {
      await removePidFile();
      const server = await getRunningServer();
      expect(server).toBeNull();
    });

    it("returns null and cleans up when process is not running", async () => {
      // Write PID file for non-existent process
      const deadPid = { ...testPidData, pid: 999999 };
      await writePidFile(deadPid);

      const server = await getRunningServer();
      expect(server).toBeNull();

      // PID file should be cleaned up
      const pidFile = await readPidFile();
      expect(pidFile).toBeNull();
    });

    it("returns PID data when process is running", async () => {
      // Use current process PID for testing
      const livePid = { ...testPidData, pid: process.pid };
      await writePidFile(livePid);

      const server = await getRunningServer();
      expect(server).toBeDefined();
      expect(server?.pid).toBe(process.pid);
      expect(server?.world).toBe(testPidData.world);
    });
  });

  describe("log directory management", () => {
    it("ensureLogsDir creates directory", async () => {
      await ensureLogsDir();
      const logsDir = getServerLogsDir();

      // Check that directory exists
      const stat = await fs.stat(logsDir).catch(() => null);
      expect(stat).toBeDefined();
      expect(stat?.isDirectory()).toBe(true);
    });

    it("ensureLogsDir is idempotent", async () => {
      await ensureLogsDir();
      // Should not throw when called again
      await expect(ensureLogsDir()).resolves.not.toThrow();
    });
  });

  describe("cleanupOldLogs", () => {
    beforeEach(async () => {
      await ensureLogsDir();
    });

    it("handles empty log directory", async () => {
      // Should not throw with no files
      await expect(cleanupOldLogs()).resolves.not.toThrow();
    });

    it("keeps recent log files", async () => {
      const logsDir = getServerLogsDir();

      // Create 3 test log files
      for (let i = 0; i < 3; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];
        const logFile = path.join(logsDir, `valheim-server-${dateStr}.log`);
        await fs.writeFile(logFile, `test log ${i}`, "utf-8");
      }

      // Should keep all 3 since keepCount default is 7
      await cleanupOldLogs();

      const files = await fs.readdir(logsDir);
      const logFiles = files.filter((f) => f.startsWith("valheim-server-"));
      expect(logFiles.length).toBe(3);
    });

    it("removes old log files beyond keepCount", async () => {
      const logsDir = getServerLogsDir();

      // Create 5 test log files
      for (let i = 0; i < 5; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];
        const logFile = path.join(logsDir, `valheim-server-${dateStr}.log`);
        await fs.writeFile(logFile, `test log ${i}`, "utf-8");
      }

      // Keep only 2 most recent
      await cleanupOldLogs(2);

      const files = await fs.readdir(logsDir);
      const logFiles = files.filter((f) => f.startsWith("valheim-server-"));
      expect(logFiles.length).toBe(2);
    });

    it("handles non-existent directory gracefully", async () => {
      // Remove the logs directory
      const logsDir = getServerLogsDir();
      await fs.rm(logsDir, { recursive: true, force: true });

      // Should not throw
      await expect(cleanupOldLogs()).resolves.not.toThrow();
    });
  });
});
