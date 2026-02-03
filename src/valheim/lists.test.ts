/**
 * Unit tests for Valheim player lists management
 */

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  addToList,
  clearList,
  getListCount,
  isInList,
  type ListType,
  readList,
  removeFromList,
} from "./lists.js";

describe("valheim lists", () => {
  let testDir: string;

  beforeEach(async () => {
    // Create a temporary directory for testing
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), "valheim-lists-test-"));
  });

  afterEach(async () => {
    // Clean up test directory
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe("readList", () => {
    it("returns empty array for new list", async () => {
      const entries = await readList("admin", testDir);

      expect(entries).toEqual([]);
    });

    it("reads Steam IDs from list file", async () => {
      const listPath = path.join(testDir, "adminlist.txt");
      await fs.writeFile(
        listPath,
        "76561198012345678\n76561198087654321\n",
        "utf-8"
      );

      const entries = await readList("admin", testDir);

      expect(entries).toEqual(["76561198012345678", "76561198087654321"]);
    });

    it("filters out empty lines", async () => {
      const listPath = path.join(testDir, "bannedlist.txt");
      await fs.writeFile(
        listPath,
        "76561198012345678\n\n\n76561198087654321\n",
        "utf-8"
      );

      const entries = await readList("banned", testDir);

      expect(entries.length).toBe(2);
      expect(entries).toEqual(["76561198012345678", "76561198087654321"]);
    });

    it("filters out comments", async () => {
      const listPath = path.join(testDir, "permittedlist.txt");
      await fs.writeFile(
        listPath,
        "// This is a comment\n76561198012345678\n// Another comment\n76561198087654321\n",
        "utf-8"
      );

      const entries = await readList("permitted", testDir);

      expect(entries).toEqual(["76561198012345678", "76561198087654321"]);
    });

    it("trims whitespace from entries", async () => {
      const listPath = path.join(testDir, "adminlist.txt");
      await fs.writeFile(
        listPath,
        "  76561198012345678  \n  76561198087654321  \n",
        "utf-8"
      );

      const entries = await readList("admin", testDir);

      expect(entries).toEqual(["76561198012345678", "76561198087654321"]);
    });

    it("works with all list types", async () => {
      const types: ListType[] = ["admin", "banned", "permitted"];

      for (const type of types) {
        const entries = await readList(type, testDir);
        expect(Array.isArray(entries)).toBe(true);
      }
    });
  });

  describe("addToList", () => {
    it("adds Steam ID to empty list", async () => {
      await addToList("admin", "76561198012345678", testDir);

      const entries = await readList("admin", testDir);
      expect(entries).toContain("76561198012345678");
    });

    it("adds Steam ID to existing list", async () => {
      await addToList("admin", "76561198012345678", testDir);
      await addToList("admin", "76561198087654321", testDir);

      const entries = await readList("admin", testDir);
      expect(entries).toEqual(["76561198012345678", "76561198087654321"]);
    });

    it("does not add duplicate Steam ID", async () => {
      await addToList("banned", "76561198012345678", testDir);
      await addToList("banned", "76561198012345678", testDir);

      const entries = await readList("banned", testDir);
      expect(entries.length).toBe(1);
    });

    it("works with all list types", async () => {
      const types: ListType[] = ["admin", "banned", "permitted"];

      for (const type of types) {
        await addToList(type, "76561198012345678", testDir);
        const entries = await readList(type, testDir);
        expect(entries).toContain("76561198012345678");
      }
    });
  });

  describe("removeFromList", () => {
    it("removes Steam ID from list", async () => {
      await addToList("admin", "76561198012345678", testDir);
      await addToList("admin", "76561198087654321", testDir);

      await removeFromList("admin", "76561198012345678", testDir);

      const entries = await readList("admin", testDir);
      expect(entries).toEqual(["76561198087654321"]);
    });

    it("handles removing non-existent ID gracefully", async () => {
      await addToList("admin", "76561198012345678", testDir);

      await removeFromList("admin", "76561198087654321", testDir);

      const entries = await readList("admin", testDir);
      expect(entries).toEqual(["76561198012345678"]);
    });

    it("works on empty list", async () => {
      await removeFromList("admin", "76561198012345678", testDir);

      const entries = await readList("admin", testDir);
      expect(entries).toEqual([]);
    });
  });

  describe("clearList", () => {
    it("removes all entries from list", async () => {
      await addToList("admin", "76561198012345678", testDir);
      await addToList("admin", "76561198087654321", testDir);

      await clearList("admin", testDir);

      const entries = await readList("admin", testDir);
      expect(entries).toEqual([]);
    });

    it("adds header comment", async () => {
      await clearList("admin", testDir);

      const listPath = path.join(testDir, "adminlist.txt");
      const content = await fs.readFile(listPath, "utf-8");

      expect(content).toContain("Auto-generated");
    });

    it("works on empty list", async () => {
      await clearList("admin", testDir);

      const entries = await readList("admin", testDir);
      expect(entries).toEqual([]);
    });
  });

  describe("isInList", () => {
    it("returns true for existing Steam ID", async () => {
      await addToList("admin", "76561198012345678", testDir);

      const result = await isInList("admin", "76561198012345678", testDir);

      expect(result).toBe(true);
    });

    it("returns false for non-existent Steam ID", async () => {
      await addToList("admin", "76561198012345678", testDir);

      const result = await isInList("admin", "76561198087654321", testDir);

      expect(result).toBe(false);
    });

    it("returns false for empty list", async () => {
      const result = await isInList("admin", "76561198012345678", testDir);

      expect(result).toBe(false);
    });
  });

  describe("getListCount", () => {
    it("returns 0 for empty list", async () => {
      const count = await getListCount("admin", testDir);

      expect(count).toBe(0);
    });

    it("returns correct count for populated list", async () => {
      await addToList("admin", "76561198012345678", testDir);
      await addToList("admin", "76561198087654321", testDir);
      await addToList("admin", "76561198011111111", testDir);

      const count = await getListCount("admin", testDir);

      expect(count).toBe(3);
    });

    it("updates count after modifications", async () => {
      await addToList("admin", "76561198012345678", testDir);
      await addToList("admin", "76561198087654321", testDir);

      let count = await getListCount("admin", testDir);
      expect(count).toBe(2);

      await removeFromList("admin", "76561198012345678", testDir);

      count = await getListCount("admin", testDir);
      expect(count).toBe(1);
    });
  });

  describe("list types", () => {
    it("admin list uses adminlist.txt", async () => {
      await addToList("admin", "76561198012345678", testDir);

      const listPath = path.join(testDir, "adminlist.txt");
      const exists = await fs
        .access(listPath)
        .then(() => true)
        .catch(() => false);

      expect(exists).toBe(true);
    });

    it("banned list uses bannedlist.txt", async () => {
      await addToList("banned", "76561198012345678", testDir);

      const listPath = path.join(testDir, "bannedlist.txt");
      const exists = await fs
        .access(listPath)
        .then(() => true)
        .catch(() => false);

      expect(exists).toBe(true);
    });

    it("permitted list uses permittedlist.txt", async () => {
      await addToList("permitted", "76561198012345678", testDir);

      const listPath = path.join(testDir, "permittedlist.txt");
      const exists = await fs
        .access(listPath)
        .then(() => true)
        .catch(() => false);

      expect(exists).toBe(true);
    });
  });
});
