/**
 * Global Keys Manager Modal
 * Manage boss defeats and world progression keys
 */

import { Box, Text, useInput } from "ink";
import { type FC, useEffect, useState } from "react";
import { rconManager, ValheimGlobalKeys } from "../../rcon/mod.js";
import { useStore } from "../store.js";
import { theme } from "../theme.js";

type GlobalKeysManagerProps = {
  onClose: () => void;
};

const BOSS_KEYS: Array<{ key: string; name: string }> = [
  { key: ValheimGlobalKeys.DEFEATED_EIKTHYR, name: "Eikthyr" },
  { key: ValheimGlobalKeys.DEFEATED_GDKING, name: "The Elder" },
  { key: ValheimGlobalKeys.DEFEATED_BONEMASS, name: "Bonemass" },
  { key: ValheimGlobalKeys.DEFEATED_DRAGON, name: "Moder" },
  { key: ValheimGlobalKeys.DEFEATED_GOBLINKING, name: "Yagluth" },
  { key: ValheimGlobalKeys.DEFEATED_QUEEN, name: "The Queen" },
];

/**
 * Global Keys Manager Modal
 * Manage boss progression and global keys
 */
export const GlobalKeysManager: FC<GlobalKeysManagerProps> = ({ onClose }) => {
  const rconConnected = useStore((s) => s.rcon.connected);
  const addLog = useStore((s) => s.actions.addLog);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeKeys, setActiveKeys] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadKeys = async () => {
      setLoading(true);
      const keys = await rconManager.listGlobalKeys();
      setActiveKeys(keys);
      setLoading(false);
    };
    if (rconConnected) {
      loadKeys();
    }
  }, [rconConnected]);

  const isBossDefeated = (bossKey: string): boolean => {
    return activeKeys.some((key) =>
      key.toLowerCase().includes(bossKey.toLowerCase())
    );
  };

  const handleToggleKey = async (keyName: string, isActive: boolean) => {
    if (isActive) {
      // Remove key
      const response = await rconManager.removeGlobalKey(keyName);
      if (response) {
        addLog("info", `Removed key: ${keyName}`);
        // Reload keys
        const keys = await rconManager.listGlobalKeys();
        setActiveKeys(keys);
      } else {
        addLog("error", `Failed to remove key: ${keyName}`);
      }
    } else {
      // Set key
      const response = await rconManager.setGlobalKey(keyName);
      if (response) {
        addLog("info", `Set key: ${keyName}`);
        // Reload keys
        const keys = await rconManager.listGlobalKeys();
        setActiveKeys(keys);
      } else {
        addLog("error", `Failed to set key: ${keyName}`);
      }
    }
  };

  const handleResetAll = async () => {
    const response = await rconManager.resetGlobalKeys();
    if (response) {
      addLog("warn", "Reset all global keys");
      setActiveKeys([]);
    } else {
      addLog("error", "Failed to reset keys");
    }
  };

  useInput((input, key) => {
    if (key.escape || input === "q" || input === "Q") {
      onClose();
      return;
    }

    if (key.upArrow) {
      setSelectedIndex(Math.max(0, selectedIndex - 1));
    } else if (key.downArrow) {
      setSelectedIndex(Math.min(BOSS_KEYS.length - 1, selectedIndex + 1));
    }

    if (input === " " || key.return) {
      const selected = BOSS_KEYS[selectedIndex];
      const isActive = isBossDefeated(selected.key);
      handleToggleKey(selected.key, isActive);
    } else if (input === "r" || input === "R") {
      handleResetAll();
    }
  });

  if (!rconConnected) {
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
            ⚠ Global Keys Manager
          </Text>
        </Box>
        <Text dimColor>RCON not connected</Text>
        <Text dimColor>Key management requires RCON connection</Text>
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
      width={60}
    >
      <Box marginBottom={1}>
        <Text bold color={theme.primary}>
          Boss Progression
        </Text>
      </Box>

      {loading ? (
        <Text dimColor>Loading keys...</Text>
      ) : (
        <>
          <Box marginBottom={1}>
            <Text dimColor>Use ↑↓ to select, [Space/Enter] to toggle</Text>
          </Box>

          <Box flexDirection="column">
            {BOSS_KEYS.map((boss, index) => {
              const defeated = isBossDefeated(boss.key);
              return (
                <Box key={boss.key} marginLeft={1}>
                  <Text
                    color={
                      index === selectedIndex ? theme.primary : theme.secondary
                    }
                    bold={index === selectedIndex}
                  >
                    {index === selectedIndex ? "→ " : "  "}
                    {defeated ? "☑" : "☐"} {boss.name}
                  </Text>
                </Box>
              );
            })}
          </Box>

          <Box marginTop={2} flexDirection="column">
            <Text color={theme.warning}>
              ⚠️ Warning: Affects world progression
            </Text>
          </Box>
        </>
      )}

      <Box marginTop={1} flexDirection="column">
        <Text dimColor>[Space/Enter] Toggle [R] Reset All</Text>
        <Text dimColor>[Esc/Q] Close</Text>
      </Box>
    </Box>
  );
};
