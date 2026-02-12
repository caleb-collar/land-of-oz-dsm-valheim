/**
 * Event Manager Modal
 * Trigger and stop Valheim random events
 */

import { Box, Text, useInput } from "ink";
import { type FC, useState } from "react";
import { rconManager, ValheimEvents } from "../../rcon/mod.js";
import { useRconAvailable } from "../hooks/useRconAvailable.js";
import { useStore } from "../store.js";
import { theme } from "../theme.js";

type EventManagerProps = {
  onClose: () => void;
};

const EVENT_LIST: Array<{ key: string; name: string; description: string }> = [
  {
    key: ValheimEvents.ARMY_EIKTHYR,
    name: "Eikthyr Army",
    description: "Eikthyr rallies the creatures",
  },
  {
    key: ValheimEvents.ARMY_THEELDER,
    name: "The Elder's Hunt",
    description: "The Elder is hunting you",
  },
  {
    key: ValheimEvents.ARMY_BONEMASS,
    name: "Bonemass Army",
    description: "A foul smell from the swamp",
  },
  {
    key: ValheimEvents.ARMY_MODER,
    name: "Moder's Hunt",
    description: "You are being hunted",
  },
  {
    key: ValheimEvents.ARMY_GOBLIN,
    name: "Goblin Horde",
    description: "The horde is attacking",
  },
  {
    key: ValheimEvents.FORESTTROLLS,
    name: "Forest Trolls",
    description: "The forest is moving",
  },
  {
    key: ValheimEvents.SKELETONS,
    name: "Skeletons",
    description: "Skeleton surprise",
  },
  {
    key: ValheimEvents.BLOBS,
    name: "Blobs",
    description: "Blob attack",
  },
  {
    key: ValheimEvents.WOLVES,
    name: "Wolves",
    description: "You are being hunted",
  },
  {
    key: ValheimEvents.BATS,
    name: "Bats",
    description: "Bat swarm",
  },
  {
    key: ValheimEvents.SERPENTS,
    name: "Serpents",
    description: "Sea serpents",
  },
];

/**
 * Event Manager Modal
 * Allows triggering and stopping random events
 */
export const EventManager: FC<EventManagerProps> = ({ onClose }) => {
  const addLog = useStore((s) => s.actions.addLog);
  const { available, connected, hasCommands, reason } = useRconAvailable();
  const [selectedIndex, setSelectedIndex] = useState(0);

  const handleTriggerEvent = async (eventKey: string, eventName: string) => {
    const response = await rconManager.triggerEvent(eventKey);
    if (response) {
      addLog("info", `Triggered event: ${eventName}`);
    } else {
      addLog("error", `Failed to trigger event: ${eventName}`);
    }
  };

  const handleRandomEvent = async () => {
    const response = await rconManager.triggerRandomEvent();
    if (response) {
      addLog("info", `Triggered random event: ${response}`);
    } else {
      addLog("error", "Failed to trigger random event");
    }
  };

  const handleStopEvent = async () => {
    const response = await rconManager.stopEvent();
    if (response) {
      addLog("info", `Stopped event: ${response}`);
    } else {
      addLog("error", "Failed to stop event");
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
      setSelectedIndex(Math.min(EVENT_LIST.length - 1, selectedIndex + 1));
    }

    if (key.return) {
      const selectedEvent = EVENT_LIST[selectedIndex];
      handleTriggerEvent(selectedEvent.key, selectedEvent.name);
    } else if (input === "r" || input === "R") {
      handleRandomEvent();
    } else if (input === "x" || input === "X") {
      handleStopEvent();
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
            ⚠ Event Manager
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
            ⚠ Event Manager
          </Text>
        </Box>
        <Text color={theme.warning}>Admin Commands Not Available</Text>
        <Text dimColor>
          RCON connected but Server DevCommands plugin not installed
        </Text>
        <Text dimColor>
          Install Server DevCommands for event management (press 5)
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
      height={25}
    >
      <Box marginBottom={1}>
        <Text bold color={theme.primary}>
          Event Manager
        </Text>
      </Box>

      <Box marginBottom={1}>
        <Text dimColor>
          Use ↑↓ to select, [Enter] Trigger, [R] Random, [X] Stop
        </Text>
      </Box>

      <Box flexDirection="column" flexGrow={1}>
        {EVENT_LIST.map((event, index) => (
          <Box key={event.key} marginLeft={1}>
            <Text
              color={index === selectedIndex ? theme.primary : theme.secondary}
              bold={index === selectedIndex}
            >
              {index === selectedIndex ? "→ " : "  "}
              {event.name}
            </Text>
            <Text dimColor> - {event.description}</Text>
          </Box>
        ))}
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text dimColor>[Enter] Trigger Selected</Text>
        <Text dimColor>[R] Random Event [X] Stop Event</Text>
        <Text dimColor>[Esc/Q] Close</Text>
      </Box>
    </Box>
  );
};
