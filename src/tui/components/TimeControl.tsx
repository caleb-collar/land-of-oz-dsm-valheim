/**
 * Time Control Modal
 * Skip time and sleep through night
 */

import { Box, Text, useInput } from "ink";
import { type FC, useState } from "react";
import { rconManager } from "../../rcon/mod.js";
import { useRconAvailable } from "../hooks/useRconAvailable.js";
import { useStore } from "../store.js";
import { theme } from "../theme.js";

type TimeControlProps = {
  onClose: () => void;
};

const TIME_OPTIONS = [
  { index: 0, label: "Sleep (Skip to morning)", seconds: 0 },
  { index: 1, label: "Skip 1 hour", seconds: 3600 },
  { index: 2, label: "Skip 3 hours", seconds: 10800 },
  { index: 3, label: "Skip 6 hours", seconds: 21600 },
  { index: 4, label: "Skip 12 hours", seconds: 43200 },
  { index: 5, label: "Skip 1 day", seconds: 86400 },
];

/**
 * Time Control Modal
 * Allows skipping time or sleeping through night
 */
export const TimeControl: FC<TimeControlProps> = ({ onClose }) => {
  const addLog = useStore((s) => s.actions.addLog);
  const { available, connected, hasCommands, reason } = useRconAvailable();
  const [selectedIndex, setSelectedIndex] = useState(0);

  const handleTimeSkip = async (seconds: number, label: string) => {
    if (seconds === 0) {
      // Sleep command
      const response = await rconManager.sleep();
      if (response) {
        addLog("info", `Sleeping through night: ${response}`);
      } else {
        addLog("error", "Failed to sleep");
      }
    } else {
      // Skip time command
      const response = await rconManager.skipTime(seconds);
      if (response) {
        addLog("info", `${label}: ${response}`);
      } else {
        addLog("error", `Failed to skip time: ${label}`);
      }
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
      setSelectedIndex(Math.min(TIME_OPTIONS.length - 1, selectedIndex + 1));
    }

    if (key.return) {
      const selected = TIME_OPTIONS[selectedIndex];
      handleTimeSkip(selected.seconds, selected.label);
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
            ⚠ Time Control
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
            ⚠ Time Control
          </Text>
        </Box>
        <Text color={theme.warning}>Admin Commands Not Available</Text>
        <Text dimColor>
          RCON connected but Server DevCommands plugin not installed
        </Text>
        <Text dimColor>
          Install Server DevCommands for time control (press 5)
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
      width={50}
    >
      <Box marginBottom={1}>
        <Text bold color={theme.primary}>
          Time Control
        </Text>
      </Box>

      <Box marginBottom={1}>
        <Text dimColor>Use ↑↓ to select, [Enter] to execute</Text>
      </Box>

      <Box flexDirection="column">
        {TIME_OPTIONS.map((option) => (
          <Box key={option.index} marginLeft={1}>
            <Text
              color={
                option.index === selectedIndex ? theme.primary : theme.secondary
              }
              bold={option.index === selectedIndex}
            >
              {option.index === selectedIndex ? "→ " : "  "}
              {option.label}
            </Text>
          </Box>
        ))}
      </Box>

      <Box marginTop={2}>
        <Text dimColor>⚠️ Warning: Time skip affects all players</Text>
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text dimColor>[Enter] Execute [Esc/Q] Close</Text>
      </Box>
    </Box>
  );
};
