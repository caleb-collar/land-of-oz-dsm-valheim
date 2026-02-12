/**
 * Admin Management Modal
 * Manage server admins and root users
 */

import { Box, Text, useInput } from "ink";
import { type FC, useState } from "react";
import { isValidSteam64Id } from "../../valheim/admins.js";
import { useAdminManager } from "../hooks/useAdminManager.js";
import { useRconAvailable } from "../hooks/useRconAvailable.js";
import { useStore } from "../store.js";
import { theme } from "../theme.js";
import { Spinner } from "./Spinner.js";

type AdminManagerProps = {
  onClose: () => void;
};

type View = "admins" | "add";

/**
 * Gets a role color for display
 */
function getRoleColor(role: string): string {
  switch (role) {
    case "root":
      return theme.error;
    case "admin":
      return theme.primary;
    default:
      return theme.muted;
  }
}

/**
 * Gets a role badge for display
 */
function getRoleBadge(role: string): string {
  switch (role) {
    case "root":
      return "★ Root";
    case "admin":
      return "● Admin";
    default:
      return "○ Player";
  }
}

/**
 * Admin Management Modal
 * Shows admins and root users with promote/demote controls
 */
export const AdminManager: FC<AdminManagerProps> = ({ onClose }) => {
  const {
    admins,
    rootUsers,
    loading,
    error,
    addAdmin,
    removeAdmin,
    promoteUser,
    demoteUser,
    refresh,
  } = useAdminManager();

  const { hasCommands } = useRconAvailable();
  const players = useStore((s) => s.server.players);

  const [view, setView] = useState<View>("admins");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [steamIdInput, setSteamIdInput] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);

  const allUsers = admins;
  const maxIndex = Math.max(0, allUsers.length - 1);

  useInput((input, key) => {
    if (key.escape || input === "q" || input === "Q") {
      if (view === "add") {
        setView("admins");
        setSteamIdInput("");
        setInputError(null);
        return;
      }
      onClose();
      return;
    }

    if (view === "add") {
      // Handle Steam ID input
      if (key.return) {
        if (steamIdInput.trim().length > 0) {
          if (isValidSteam64Id(steamIdInput.trim())) {
            addAdmin(steamIdInput.trim());
            setSteamIdInput("");
            setInputError(null);
            setView("admins");
          } else {
            setInputError(
              "Invalid Steam64 ID (must be 17 digits starting with 7656119)"
            );
          }
        }
        return;
      }
      if (key.backspace || key.delete) {
        setSteamIdInput((prev) => prev.slice(0, -1));
        setInputError(null);
        return;
      }
      // Only accept digits
      if (/^\d$/.test(input)) {
        setSteamIdInput((prev) => prev + input);
        setInputError(null);
      }
      return;
    }

    // Admins view navigation
    if (key.upArrow) {
      setSelectedIndex(Math.max(0, selectedIndex - 1));
    } else if (key.downArrow) {
      setSelectedIndex(Math.min(maxIndex, selectedIndex + 1));
    }

    // Add admin
    if (input === "a" || input === "A") {
      setView("add");
      setSteamIdInput("");
      setInputError(null);
    }

    // Refresh
    if (input === "r" || input === "R") {
      refresh();
    }

    // Actions on selected admin
    if (allUsers.length > 0) {
      const selectedUser = allUsers[selectedIndex];

      // Promote
      if (input === "p" || input === "P") {
        if (selectedUser.role !== "root") {
          promoteUser(selectedUser.steamId);
        }
      }

      // Demote
      if (input === "d" || input === "D") {
        if (selectedUser.role !== "player") {
          demoteUser(selectedUser.steamId);
        }
      }

      // Remove
      if (input === "x" || input === "X") {
        removeAdmin(selectedUser.steamId);
        setSelectedIndex(Math.max(0, selectedIndex - 1));
      }
    }
  });

  // Add view
  if (view === "add") {
    return (
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor={theme.primary}
        padding={1}
        width={60}
      >
        <Box marginBottom={1}>
          <Text bold color={theme.primary}>
            Add Admin
          </Text>
        </Box>

        <Box marginBottom={1}>
          <Text>Enter Steam64 ID (17 digits):</Text>
        </Box>

        <Box marginBottom={1}>
          <Text color={theme.primary}>&gt; </Text>
          <Text>{steamIdInput}</Text>
          <Text color={theme.primary}>█</Text>
        </Box>

        {inputError && (
          <Box marginBottom={1}>
            <Text color={theme.error}>⚠ {inputError}</Text>
          </Box>
        )}

        <Box marginTop={1} flexDirection="column">
          <Text dimColor>[Enter] Confirm [Esc] Cancel</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={theme.primary}
      padding={1}
      width={70}
    >
      <Box marginBottom={1}>
        <Text bold color={theme.primary}>
          Admin Management
        </Text>
      </Box>

      {loading ? (
        <Spinner label="Loading admins..." />
      ) : error ? (
        <Text color={theme.error}>Error: {error}</Text>
      ) : (
        <Box flexDirection="column">
          {/* Admin list */}
          <Box marginBottom={1}>
            <Text bold>Server Admins ({allUsers.length})</Text>
          </Box>

          {allUsers.length === 0 ? (
            <Box marginLeft={2} marginBottom={1}>
              <Text dimColor>No admins configured</Text>
            </Box>
          ) : (
            <Box flexDirection="column" marginBottom={1}>
              <Box marginBottom={1} marginLeft={1}>
                <Text dimColor>Use ↑↓ to select</Text>
              </Box>
              {allUsers.map((user, index) => (
                <Box key={user.steamId} marginLeft={1}>
                  <Text
                    color={
                      index === selectedIndex ? theme.primary : theme.secondary
                    }
                    bold={index === selectedIndex}
                  >
                    {index === selectedIndex ? "▶ " : "  "}
                  </Text>
                  <Text>{user.steamId} </Text>
                  <Text color={getRoleColor(user.role)}>
                    {getRoleBadge(user.role)}
                  </Text>
                  {user.name && <Text dimColor> ({user.name})</Text>}
                </Box>
              ))}
            </Box>
          )}

          {/* Root users summary */}
          {hasCommands && (
            <Box marginBottom={1}>
              <Text dimColor>
                Root users (bypass restrictions): {rootUsers.length}
              </Text>
            </Box>
          )}

          {!hasCommands && (
            <Box marginBottom={1}>
              <Text color={theme.warning}>
                ⚠ Root user management requires Server DevCommands plugin
              </Text>
            </Box>
          )}

          {/* Online players - quick reference */}
          {players.length > 0 && (
            <Box flexDirection="column" marginBottom={1}>
              <Text bold>Online Players ({players.length})</Text>
              {players.map((player) => (
                <Box key={player} marginLeft={2}>
                  <Text dimColor>• {player}</Text>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      )}

      <Box marginTop={1} flexDirection="column">
        <Text dimColor>[A] Add Admin [P] Promote [D] Demote</Text>
        <Text dimColor>[X] Remove [R] Refresh [Esc/Q] Close</Text>
      </Box>

      <Box marginTop={1}>
        <Text dimColor>
          Note: Changes take effect immediately (no restart required)
        </Text>
      </Box>
    </Box>
  );
};
