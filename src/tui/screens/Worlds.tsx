/**
 * Worlds screen - World management
 */

import { Box, Text, useInput } from "ink";
import { type FC, useState } from "react";
import { useStore } from "../store.js";
import { theme } from "../theme.js";

/** Mock world data until actual world discovery is implemented */
type WorldInfo = {
  name: string;
  active: boolean;
  size: string;
  lastPlayed: string;
};

/**
 * Worlds screen for managing Valheim worlds
 */
export const Worlds: FC = () => {
  const config = useStore((s) => s.config);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Mock worlds - will be replaced with actual world discovery
  const worlds: WorldInfo[] = [
    {
      name: config.world,
      active: true,
      size: "Unknown",
      lastPlayed: "Now",
    },
  ];

  // Handle navigation
  useInput((input, key) => {
    if (key.upArrow || input === "k") {
      setSelectedIndex((prev: number) => Math.max(0, prev - 1));
    }
    if (key.downArrow || input === "j") {
      setSelectedIndex((prev: number) => Math.min(worlds.length - 1, prev + 1));
    }
  });

  return (
    <Box flexDirection="column" flexGrow={1} padding={1} overflow="hidden">
      {/* Title */}
      <Box marginBottom={1}>
        <Text bold color={theme.primary}>
          ─ Worlds ─
        </Text>
      </Box>

      {/* Help */}
      <Box marginBottom={1}>
        <Text dimColor>Use ↑/↓ to navigate</Text>
      </Box>

      {/* Worlds List */}
      <Box flexDirection="column">
        {worlds.length === 0 ? (
          <Text dimColor>No worlds found</Text>
        ) : (
          worlds.map((world, index) => {
            const isSelected = index === selectedIndex;

            return (
              <Box
                key={world.name}
                flexDirection="column"
                borderStyle={isSelected ? "single" : undefined}
                borderColor={isSelected ? theme.primary : undefined}
                paddingX={isSelected ? 1 : 0}
                marginBottom={1}
              >
                <Box>
                  <Text color={isSelected ? theme.primary : undefined} bold>
                    {world.name}
                  </Text>
                  {world.active && <Text color={theme.success}>(Active)</Text>}
                </Box>
                <Box marginLeft={2}>
                  <Text dimColor>Size: {world.size}</Text>
                </Box>
                <Box marginLeft={2}>
                  <Text dimColor>Last Played: {world.lastPlayed}</Text>
                </Box>
              </Box>
            );
          })
        )}
      </Box>

      {/* Actions hint */}
      <Box marginTop={1}>
        <Text dimColor>
          World management will be available in a future update
        </Text>
      </Box>
    </Box>
  );
};
