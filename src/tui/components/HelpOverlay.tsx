/**
 * HelpOverlay component - shows keyboard shortcuts
 * Displayed when user presses `?`
 */

import { Box, Text, useInput } from "ink";
import type { FC } from "react";
import { useStore } from "../store.js";
import { theme, valheimPalette } from "../theme.js";

type ShortcutGroup = {
  title: string;
  shortcuts: Array<{ key: string; description: string }>;
};

const SHORTCUTS: ShortcutGroup[] = [
  {
    title: "Navigation",
    shortcuts: [
      { key: "1", description: "Dashboard" },
      { key: "2", description: "Settings" },
      { key: "3", description: "Worlds" },
      { key: "4", description: "Console" },
      { key: "?", description: "Toggle this help" },
    ],
  },
  {
    title: "Dashboard",
    shortcuts: [
      { key: "S", description: "Start server" },
      { key: "X", description: "Stop server" },
    ],
  },
  {
    title: "Settings",
    shortcuts: [
      { key: "↑/↓", description: "Navigate options" },
      { key: "Enter", description: "Edit selected" },
      { key: "Esc", description: "Cancel editing" },
    ],
  },
  {
    title: "Console",
    shortcuts: [
      { key: "↑/↓", description: "Scroll logs" },
      { key: "I/W/E/D", description: "Filter by level" },
      { key: "C", description: "Clear logs" },
      { key: "A", description: "Show all logs" },
    ],
  },
  {
    title: "General",
    shortcuts: [
      { key: "Q", description: "Quit application" },
      { key: "Ctrl+C", description: "Force quit" },
      { key: "Esc", description: "Close modal/cancel" },
    ],
  },
];

/**
 * Help overlay showing all keyboard shortcuts
 */
export const HelpOverlay: FC = () => {
  const closeModal = useStore((s) => s.actions.closeModal);

  // Handle ESC or ? to close
  useInput((input, key) => {
    if (key.escape || input === "?") {
      closeModal();
    }
  });

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor={valheimPalette.mandarin}
      paddingX={2}
      paddingY={1}
      width={50}
    >
      {/* Header */}
      <Box justifyContent="center" marginBottom={1}>
        <Text bold color={valheimPalette.mandarin}>
          ⌨ Keyboard Shortcuts
        </Text>
      </Box>

      {/* Shortcuts grouped by section */}
      {SHORTCUTS.map((group, groupIndex) => (
        <Box
          key={group.title}
          flexDirection="column"
          marginBottom={groupIndex < SHORTCUTS.length - 1 ? 1 : 0}
        >
          <Text bold color={valheimPalette.strawGold}>
            {group.title}
          </Text>
          {group.shortcuts.map((shortcut) => (
            <Box key={shortcut.key} paddingLeft={1}>
              <Box width={12}>
                <Text color={theme.primary}>{shortcut.key}</Text>
              </Box>
              <Text dimColor>{shortcut.description}</Text>
            </Box>
          ))}
        </Box>
      ))}

      {/* Footer */}
      <Box marginTop={1} justifyContent="center">
        <Text dimColor>Press ? or ESC to close</Text>
      </Box>
    </Box>
  );
};
