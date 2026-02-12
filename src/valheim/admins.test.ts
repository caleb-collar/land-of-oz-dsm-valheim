/**
 * Tests for admin role management
 */

import { afterEach, describe, expect, it, vi } from "vitest";

// Mock dependencies before importing the module under test
vi.mock("./lists.js", () => ({
  readList: vi.fn(),
  addToList: vi.fn(),
  removeFromList: vi.fn(),
  isInList: vi.fn(),
}));

vi.mock("../utils/platform.js", () => ({
  getValheimSaveDir: vi.fn(() => "/mock/save"),
  getValheimServerDir: vi.fn(() => "/mock/server"),
}));

vi.mock("node:fs/promises", () => ({
  default: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    mkdir: vi.fn(),
  },
}));

import fs from "node:fs/promises";
import {
  addAdmin,
  addRootUser,
  demoteUser,
  getAdminListPath,
  getAdmins,
  getBanListPath,
  getDevCommandsConfigPath,
  getPermittedListPath,
  getUserRole,
  isAdmin,
  isRootUser,
  isValidSteam64Id,
  promoteUser,
  ROLE_CAPABILITIES,
  removeAdmin,
  removeRootUser,
  setUserRole,
  validateSteamId,
} from "./admins.js";
import { addToList, isInList, readList, removeFromList } from "./lists.js";

const VALID_STEAM_ID = "76561198012345678";
const VALID_STEAM_ID_2 = "76561198087654321";

afterEach(() => {
  vi.resetAllMocks();
});

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
      expect(isValidSteam64Id("1234567890123456")).toBe(false);
      expect(isValidSteam64Id("123456789012345678")).toBe(false);
      expect(isValidSteam64Id("86561198012345678")).toBe(false);
      expect(isValidSteam64Id("7656119801234abcd")).toBe(false);
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

  describe("path getters", () => {
    it("getAdminListPath uses default save dir", () => {
      const result = getAdminListPath();
      expect(result).toContain("adminlist.txt");
    });

    it("getAdminListPath uses custom dir", () => {
      const result = getAdminListPath("/custom/save");
      expect(result).toContain("adminlist.txt");
    });

    it("getBanListPath returns bannedlist.txt path", () => {
      const result = getBanListPath();
      expect(result).toContain("bannedlist.txt");
    });

    it("getBanListPath uses custom dir", () => {
      const result = getBanListPath("/custom/dir");
      expect(result).toContain("bannedlist.txt");
    });

    it("getPermittedListPath returns permittedlist.txt path", () => {
      const result = getPermittedListPath();
      expect(result).toContain("permittedlist.txt");
    });

    it("getPermittedListPath uses custom dir", () => {
      const result = getPermittedListPath("/custom/dir");
      expect(result).toContain("permittedlist.txt");
    });

    it("getDevCommandsConfigPath returns config path", () => {
      const result = getDevCommandsConfigPath();
      expect(result).toContain("BepInEx");
      expect(result).toContain("config");
      expect(result).toContain("server_devcommands.cfg");
    });

    it("getDevCommandsConfigPath uses custom dir", () => {
      const result = getDevCommandsConfigPath("/custom/valheim");
      expect(result).toContain("server_devcommands.cfg");
    });
  });

  describe("getAdmins", () => {
    it("returns mapped admin users from list", async () => {
      vi.mocked(readList).mockResolvedValue([VALID_STEAM_ID, VALID_STEAM_ID_2]);

      const admins = await getAdmins("/save");
      expect(readList).toHaveBeenCalledWith("admin", "/save");
      expect(admins).toHaveLength(2);
      expect(admins[0]).toEqual({ steamId: VALID_STEAM_ID, role: "admin" });
      expect(admins[1]).toEqual({ steamId: VALID_STEAM_ID_2, role: "admin" });
    });

    it("returns empty array on error", async () => {
      vi.mocked(readList).mockRejectedValue(new Error("file not found"));
      const admins = await getAdmins("/save");
      expect(admins).toEqual([]);
    });

    it("uses default save dir when none provided", async () => {
      vi.mocked(readList).mockResolvedValue([]);
      await getAdmins();
      expect(readList).toHaveBeenCalledWith("admin", "/mock/save");
    });
  });

  describe("addAdmin", () => {
    it("adds a valid Steam ID to admin list", async () => {
      await addAdmin(VALID_STEAM_ID, "/save");
      expect(addToList).toHaveBeenCalledWith("admin", VALID_STEAM_ID, "/save");
    });

    it("throws for invalid Steam ID", async () => {
      await expect(addAdmin("invalid", "/save")).rejects.toThrow();
    });

    it("throws for empty Steam ID", async () => {
      await expect(addAdmin("", "/save")).rejects.toThrow("Steam ID required");
    });

    it("uses default save dir when none provided", async () => {
      await addAdmin(VALID_STEAM_ID);
      expect(addToList).toHaveBeenCalledWith(
        "admin",
        VALID_STEAM_ID,
        "/mock/save"
      );
    });
  });

  describe("removeAdmin", () => {
    it("removes a Steam ID from admin list", async () => {
      await removeAdmin(VALID_STEAM_ID, "/save");
      expect(removeFromList).toHaveBeenCalledWith(
        "admin",
        VALID_STEAM_ID,
        "/save"
      );
    });

    it("uses default save dir when none provided", async () => {
      await removeAdmin(VALID_STEAM_ID);
      expect(removeFromList).toHaveBeenCalledWith(
        "admin",
        VALID_STEAM_ID,
        "/mock/save"
      );
    });
  });

  describe("isAdmin", () => {
    it("returns true when user is admin", async () => {
      vi.mocked(isInList).mockResolvedValue(true);
      const result = await isAdmin(VALID_STEAM_ID, "/save");
      expect(isInList).toHaveBeenCalledWith("admin", VALID_STEAM_ID, "/save");
      expect(result).toBe(true);
    });

    it("returns false when user is not admin", async () => {
      vi.mocked(isInList).mockResolvedValue(false);
      const result = await isAdmin(VALID_STEAM_ID, "/save");
      expect(result).toBe(false);
    });
  });

  describe("root user management", () => {
    const configContent = `## Server DevCommands Config\n\nroot_users = ${VALID_STEAM_ID},${VALID_STEAM_ID_2}`;

    describe("getRootUsers", () => {
      it("parses root_users from config", async () => {
        vi.mocked(fs.readFile).mockResolvedValue(configContent);
        const users = await import("./admins.js").then((m) =>
          m.getRootUsers("/valheim")
        );
        expect(users).toEqual([VALID_STEAM_ID, VALID_STEAM_ID_2]);
      });

      it("returns empty array when config missing", async () => {
        vi.mocked(fs.readFile).mockRejectedValue(new Error("ENOENT"));
        const users = await import("./admins.js").then((m) =>
          m.getRootUsers("/valheim")
        );
        expect(users).toEqual([]);
      });

      it("returns empty when root_users value is empty", async () => {
        vi.mocked(fs.readFile).mockResolvedValue("root_users = ");
        const users = await import("./admins.js").then((m) =>
          m.getRootUsers("/valheim")
        );
        expect(users).toEqual([]);
      });
    });

    describe("addRootUser", () => {
      it("adds a new ID to root users", async () => {
        vi.mocked(fs.readFile).mockResolvedValue(
          `root_users = ${VALID_STEAM_ID}`
        );
        vi.mocked(fs.writeFile).mockResolvedValue(undefined);
        await addRootUser(VALID_STEAM_ID_2, "/valheim");
        expect(fs.writeFile).toHaveBeenCalled();
        const written = vi.mocked(fs.writeFile).mock.calls[0][1] as string;
        expect(written).toContain(VALID_STEAM_ID);
        expect(written).toContain(VALID_STEAM_ID_2);
      });

      it("skips duplicate IDs", async () => {
        vi.mocked(fs.readFile).mockResolvedValue(
          `root_users = ${VALID_STEAM_ID}`
        );
        await addRootUser(VALID_STEAM_ID, "/valheim");
        expect(fs.writeFile).not.toHaveBeenCalled();
      });

      it("throws for invalid Steam ID", async () => {
        await expect(addRootUser("invalid", "/valheim")).rejects.toThrow();
      });

      it("creates config when file missing", async () => {
        vi.mocked(fs.readFile).mockRejectedValue(new Error("ENOENT"));
        vi.mocked(fs.mkdir).mockResolvedValue(undefined);
        vi.mocked(fs.writeFile).mockResolvedValue(undefined);
        await addRootUser(VALID_STEAM_ID, "/valheim");
        expect(fs.mkdir).toHaveBeenCalled();
        expect(fs.writeFile).toHaveBeenCalled();
      });
    });

    describe("removeRootUser", () => {
      it("removes an ID from root users", async () => {
        vi.mocked(fs.readFile).mockResolvedValue(
          `root_users = ${VALID_STEAM_ID},${VALID_STEAM_ID_2}`
        );
        vi.mocked(fs.writeFile).mockResolvedValue(undefined);
        await removeRootUser(VALID_STEAM_ID, "/valheim");
        expect(fs.writeFile).toHaveBeenCalled();
        const written = vi.mocked(fs.writeFile).mock.calls[0][1] as string;
        expect(written).toContain(VALID_STEAM_ID_2);
      });
    });

    describe("isRootUser", () => {
      it("returns true when user is root", async () => {
        vi.mocked(fs.readFile).mockResolvedValue(
          `root_users = ${VALID_STEAM_ID}`
        );
        const result = await isRootUser(VALID_STEAM_ID, "/valheim");
        expect(result).toBe(true);
      });

      it("returns false when user is not root", async () => {
        vi.mocked(fs.readFile).mockResolvedValue(
          `root_users = ${VALID_STEAM_ID}`
        );
        const result = await isRootUser(VALID_STEAM_ID_2, "/valheim");
        expect(result).toBe(false);
      });
    });
  });

  describe("getUserRole", () => {
    it("returns root when user is root", async () => {
      vi.mocked(fs.readFile).mockResolvedValue(
        `root_users = ${VALID_STEAM_ID}`
      );
      const role = await getUserRole(VALID_STEAM_ID, "/save", "/valheim");
      expect(role).toBe("root");
    });

    it("returns admin when user is admin but not root", async () => {
      vi.mocked(fs.readFile).mockResolvedValue("root_users = ");
      vi.mocked(isInList).mockResolvedValue(true);
      const role = await getUserRole(VALID_STEAM_ID, "/save", "/valheim");
      expect(role).toBe("admin");
    });

    it("returns player when user is neither", async () => {
      vi.mocked(fs.readFile).mockResolvedValue("root_users = ");
      vi.mocked(isInList).mockResolvedValue(false);
      const role = await getUserRole(VALID_STEAM_ID, "/save", "/valheim");
      expect(role).toBe("player");
    });
  });

  describe("setUserRole", () => {
    it("sets user to player — removes from both lists", async () => {
      vi.mocked(fs.readFile).mockResolvedValue(
        `root_users = ${VALID_STEAM_ID}`
      );
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);
      await setUserRole(VALID_STEAM_ID, "player", "/save", "/valheim");
      expect(removeFromList).toHaveBeenCalledWith(
        "admin",
        VALID_STEAM_ID,
        "/save"
      );
    });

    it("sets user to admin — adds admin, removes root", async () => {
      vi.mocked(fs.readFile).mockResolvedValue(
        `root_users = ${VALID_STEAM_ID}`
      );
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);
      await setUserRole(VALID_STEAM_ID, "admin", "/save", "/valheim");
      expect(addToList).toHaveBeenCalledWith("admin", VALID_STEAM_ID, "/save");
    });

    it("sets user to root — adds to both lists", async () => {
      vi.mocked(fs.readFile).mockResolvedValue("root_users = ");
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);
      await setUserRole(VALID_STEAM_ID, "root", "/save", "/valheim");
      expect(addToList).toHaveBeenCalledWith("admin", VALID_STEAM_ID, "/save");
      expect(fs.writeFile).toHaveBeenCalled();
    });

    it("throws for invalid Steam ID", async () => {
      await expect(setUserRole("bad", "admin", "/save")).rejects.toThrow();
    });
  });

  describe("promoteUser", () => {
    it("promotes player to admin", async () => {
      vi.mocked(fs.readFile).mockResolvedValue("root_users = ");
      vi.mocked(isInList).mockResolvedValue(false);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);
      const newRole = await promoteUser(VALID_STEAM_ID, "/save", "/valheim");
      expect(newRole).toBe("admin");
    });

    it("promotes admin to root", async () => {
      vi.mocked(fs.readFile).mockResolvedValue("root_users = ");
      vi.mocked(isInList).mockResolvedValue(true);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);
      const newRole = await promoteUser(VALID_STEAM_ID, "/save", "/valheim");
      expect(newRole).toBe("root");
    });

    it("returns root if already root", async () => {
      vi.mocked(fs.readFile).mockResolvedValue(
        `root_users = ${VALID_STEAM_ID}`
      );
      const newRole = await promoteUser(VALID_STEAM_ID, "/save", "/valheim");
      expect(newRole).toBe("root");
    });
  });

  describe("demoteUser", () => {
    it("demotes root to admin", async () => {
      vi.mocked(fs.readFile).mockResolvedValue(
        `root_users = ${VALID_STEAM_ID}`
      );
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);
      const newRole = await demoteUser(VALID_STEAM_ID, "/save", "/valheim");
      expect(newRole).toBe("admin");
    });

    it("demotes admin to player", async () => {
      vi.mocked(fs.readFile).mockResolvedValue("root_users = ");
      vi.mocked(isInList).mockResolvedValue(true);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);
      const newRole = await demoteUser(VALID_STEAM_ID, "/save", "/valheim");
      expect(newRole).toBe("player");
    });

    it("returns player if already player", async () => {
      vi.mocked(fs.readFile).mockResolvedValue("root_users = ");
      vi.mocked(isInList).mockResolvedValue(false);
      const newRole = await demoteUser(VALID_STEAM_ID, "/save", "/valheim");
      expect(newRole).toBe("player");
    });
  });
});
