/**
 * Player Management Modal
 * Allows kicking/banning players and managing ban list
 */

import { Box, Text, useInput } from "ink";
import { type FC, useState } from "react";
import { rconManager } from "../../rcon/mod.js";
import { useRconAvailable } from "../hooks/useRconAvailable.js";
import { useStore } from "../store.js";
import { theme } from "../theme.js";

type PlayerManagerProps = {
  onClose: () => void;
};

type View = "players" | "banned";

/**
 * Player Management Modal
 * Shows online players with kick/ban options and banned players list
 */
export const PlayerManager: FC<PlayerManagerProps> = ({ onClose }) => {
  const players = useStore((s) => s.server.players);
  const addLog = useStore((s) => s.actions.addLog);
  const { available, connected, hasCommands, reason } = useRconAvailable();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [view, setView] = useState<View>("players");
  const [bannedPlayers, setBannedPlayers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Load banned players when switching to banned view
  const loadBannedPlayers = async () => {
    setLoading(true);
    const banned = await rconManager.getBannedPlayers();
    setBannedPlayers(banned);
    setLoading(false);
  };

  const handleKick = async (playerName: string) => {
    const response = await rconManager.kickPlayer(playerName);
    if (response) {
      addLog("info", `Kicked ${playerName}: ${response}`);
    } else {
      addLog("error", `Failed to kick ${playerName}`);
    }
  };

  const handleBan = async (playerName: string) => {
    const response = await rconManager.banPlayer(playerName);
    if (response) {
      addLog("warn", `Banned ${playerName}: ${response}`);
    } else {
      addLog("error", `Failed to ban ${playerName}`);
    }
  };

  const handleUnban = async (playerIdentifier: string) => {
    const response = await rconManager.unbanPlayer(playerIdentifier);
    if (response) {
      addLog("info", `Unbanned ${playerIdentifier}: ${response}`);
      // Reload banned list
      await loadBannedPlayers();
    } else {
      addLog("error", `Failed to unban ${playerIdentifier}`);
    }
  };

  useInput((input, key) => {
    if (key.escape || input === "q" || input === "Q") {
      onClose();
      return;
    }

    if (input === "t" || input === "T") {
      // Toggle between views
      if (view === "players") {
        setView("banned");
        loadBannedPlayers();
      } else {
        setView("players");
      }
      setSelectedIndex(0);
      return;
    }

    const currentList = view === "players" ? players : bannedPlayers;
    const maxIndex = Math.max(0, currentList.length - 1);

    if (key.upArrow) {
      setSelectedIndex(Math.max(0, selectedIndex - 1));
    } else if (key.downArrow) {
      setSelectedIndex(Math.min(maxIndex, selectedIndex + 1));
    }

    // Actions for selected player
    if (view === "players" && players.length > 0) {
      const selectedPlayer = players[selectedIndex];
      if (input === "k" || input === "K") {
        handleKick(selectedPlayer);
      } else if (input === "b" || input === "B") {
        handleBan(selectedPlayer);
      }
    } else if (view === "banned" && bannedPlayers.length > 0) {
      const selectedBanned = bannedPlayers[selectedIndex];
      if (input === "u" || input === "U") {
        handleUnban(selectedBanned);
      }
    }
  });

  if (!available || !connected) {
    return (
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor={theme.error}
        padding={1}
        width={60}
      >
        <Box marginBottom={1}>
          <Text bold color={theme.error}>
            ⚠ Player Management
          </Text>
        </Box>
        <Text color={theme.warning}>RCON Not Available</Text>
        <Text dimColor>{reason}</Text>
        <Text dimColor>
          Install required plugins via Plugins menu (press 5)
        </Text>
        <Box marginTop={1}>
          <Text dimColor>[Esc/Q] Close</Text>
        </Box>
      </Box>
    );
  }

  if (!hasCommands) {
    return (
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor={theme.warning}
        padding={1}
        width={60}
      >
        <Box marginBottom={1}>
          <Text bold color={theme.warning}>
            ⚠ Player Management
          </Text>
        </Box>
        <Text color={theme.warning}>Admin Commands Not Available</Text>
        <Text dimColor>
          RCON connected but Server DevCommands plugin not installed
        </Text>
        <Text dimColor>
          Install Server DevCommands for admin features (press 5)
        </Text>
        <Box marginTop={1}>
          <Text dimColor>[Esc/Q] Close</Text>
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
          Player Management
        </Text>
        <Text dimColor> - </Text>
        <Text color={view === "players" ? theme.success : theme.muted}>
          [T] {view === "players" ? "Online Players" : "Banned Players"}
        </Text>
      </Box>

      {view === "players" ? (
        <Box flexDirection="column">
          {players.length === 0 ? (
            <Text dimColor>No players currently online</Text>
          ) : (
            <>
              <Box marginBottom={1}>
                <Text dimColor>Use ↑↓ to select, [K] Kick, [B] Ban</Text>
              </Box>
              {players.map((player, index) => (
                <Box key={player} marginLeft={1}>
                  <Text
                    color={
                      index === selectedIndex ? theme.primary : theme.secondary
                    }
                    bold={index === selectedIndex}
                  >
                    {index === selectedIndex ? "→ " : "  "}
                    {player}
                  </Text>
                </Box>
              ))}
            </>
          )}
        </Box>
      ) : (
        <Box flexDirection="column">
          {loading ? (
            <Text dimColor>Loading banned players...</Text>
          ) : bannedPlayers.length === 0 ? (
            <Text dimColor>No banned players</Text>
          ) : (
            <>
              <Box marginBottom={1}>
                <Text dimColor>Use ↑↓ to select, [U] Unban</Text>
              </Box>
              {bannedPlayers.map((banned, index) => (
                <Box key={banned} marginLeft={1}>
                  <Text
                    color={
                      index === selectedIndex ? theme.warning : theme.secondary
                    }
                    bold={index === selectedIndex}
                  >
                    {index === selectedIndex ? "→ " : "  "}
                    {banned}
                  </Text>
                </Box>
              ))}
            </>
          )}
        </Box>
      )}

      <Box marginTop={1} flexDirection="column">
        <Text dimColor>[Esc/Q] Close [T] Toggle View</Text>
      </Box>
    </Box>
  );
};
