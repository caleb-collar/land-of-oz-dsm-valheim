/**
 * Admin management hook for the TUI.
 * Provides admin and root user management operations.
 */

import { useCallback, useEffect } from "react";
import {
  type AdminRole,
  addAdmin,
  addRootUser,
  demoteUser,
  getAdmins,
  getRootUsers,
  promoteUser,
  removeAdmin,
  removeRootUser,
  setUserRole,
} from "../../valheim/admins.js";
import { useStore } from "../store.js";

/**
 * Hook for managing server admins and root users.
 *
 * Features:
 * - List/add/remove admins from adminlist.txt
 * - List/add/remove root users from Server DevCommands config
 * - Promote/demote users through role hierarchy
 * - Auto-refresh on mount
 */
export function useAdminManager() {
  const admins = useStore((s) => s.admins.admins);
  const rootUsers = useStore((s) => s.admins.rootUsers);
  const loading = useStore((s) => s.admins.loading);
  const error = useStore((s) => s.admins.error);
  const setAdmins = useStore((s) => s.actions.setAdmins);
  const setRootUsers = useStore((s) => s.actions.setRootUsers);
  const setAdminsLoading = useStore((s) => s.actions.setAdminsLoading);
  const setAdminsError = useStore((s) => s.actions.setAdminsError);
  const addLog = useStore((s) => s.actions.addLog);

  /** Refresh admin and root user lists from disk */
  const refresh = useCallback(async () => {
    setAdminsLoading(true);
    setAdminsError(null);

    try {
      const [adminList, rootList] = await Promise.all([
        getAdmins(),
        getRootUsers(),
      ]);

      // Merge root status into admin list
      const mergedAdmins = adminList.map((admin) => ({
        ...admin,
        role: (rootList.includes(admin.steamId)
          ? "root"
          : "admin") as AdminRole,
      }));

      // Add root users that aren't in the admin list
      for (const rootId of rootList) {
        if (!mergedAdmins.some((a) => a.steamId === rootId)) {
          mergedAdmins.push({
            steamId: rootId,
            role: "root" as AdminRole,
          });
        }
      }

      setAdmins(mergedAdmins);
      setRootUsers(rootList);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load admin list";
      setAdminsError(message);
      addLog("error", `Admin list error: ${message}`);
    } finally {
      setAdminsLoading(false);
    }
  }, [setAdmins, setRootUsers, setAdminsLoading, setAdminsError, addLog]);

  // Auto-refresh on mount
  useEffect(() => {
    refresh();
  }, [refresh]);

  /** Add a new admin by Steam ID */
  const handleAddAdmin = useCallback(
    async (steamId: string) => {
      try {
        await addAdmin(steamId);
        addLog("info", `Added admin: ${steamId}`);
        await refresh();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to add admin";
        addLog("error", message);
      }
    },
    [addLog, refresh]
  );

  /** Remove an admin by Steam ID */
  const handleRemoveAdmin = useCallback(
    async (steamId: string) => {
      try {
        await removeAdmin(steamId);
        await removeRootUser(steamId);
        addLog("info", `Removed admin: ${steamId}`);
        await refresh();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to remove admin";
        addLog("error", message);
      }
    },
    [addLog, refresh]
  );

  /** Add a root user by Steam ID */
  const handleAddRootUser = useCallback(
    async (steamId: string) => {
      try {
        await addAdmin(steamId); // Root users should also be admins
        await addRootUser(steamId);
        addLog("info", `Added root user: ${steamId}`);
        await refresh();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to add root user";
        addLog("error", message);
      }
    },
    [addLog, refresh]
  );

  /** Promote a user to the next role level */
  const handlePromote = useCallback(
    async (steamId: string) => {
      try {
        const newRole = await promoteUser(steamId);
        addLog("info", `Promoted ${steamId} to ${newRole}`);
        await refresh();
        return newRole;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to promote user";
        addLog("error", message);
        return undefined;
      }
    },
    [addLog, refresh]
  );

  /** Demote a user to the previous role level */
  const handleDemote = useCallback(
    async (steamId: string) => {
      try {
        const newRole = await demoteUser(steamId);
        addLog("info", `Demoted ${steamId} to ${newRole}`);
        await refresh();
        return newRole;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to demote user";
        addLog("error", message);
        return undefined;
      }
    },
    [addLog, refresh]
  );

  /** Set a user's role directly */
  const handleSetRole = useCallback(
    async (steamId: string, role: AdminRole) => {
      try {
        await setUserRole(steamId, role);
        addLog("info", `Set ${steamId} role to ${role}`);
        await refresh();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to set user role";
        addLog("error", message);
      }
    },
    [addLog, refresh]
  );

  return {
    admins,
    rootUsers,
    loading,
    error,
    addAdmin: handleAddAdmin,
    removeAdmin: handleRemoveAdmin,
    addRootUser: handleAddRootUser,
    promoteUser: handlePromote,
    demoteUser: handleDemote,
    setUserRole: handleSetRole,
    refresh,
  };
}
