/**
 * Navigation Menu component
 */

import { type FC } from "react";
import { Box, Text } from "ink";
import { useStore } from "../store.ts";
import { MenuItem } from "./MenuItem.tsx";
import { theme } from "../theme.ts";
import type { Screen } from "../store.ts";

/** Menu item configuration */
type MenuItemConfig = {
  key: string;
  label: string;
  screen: Screen | null;
};

const menuItems: MenuItemConfig[] = [
  { key: "1", label: "Dashboard", screen: "dashboard" },
  { key: "2", label: "Settings", screen: "settings" },
  { key: "3", label: "Worlds", screen: "worlds" },
  { key: "4", label: "Console", screen: "console" },
  { key: "Q", label: "Quit", screen: null },
];

/**
 * Navigation menu with keyboard shortcuts
 */
export const Menu: FC = () => {
  const activeScreen = useStore((s) => s.ui.activeScreen);

  return (
    <Box
      flexDirection="column"
      width={20}
      borderStyle="single"
      borderColor={theme.muted}
      paddingX={1}
    >
      <Text bold dimColor>
        ─ Navigation ─
      </Text>
      <Box flexDirection="column" marginTop={1}>
        {menuItems.map((item) => (
          <MenuItem
            key={item.key}
            hotkey={item.key}
            label={item.label}
            active={activeScreen === item.screen}
            isQuit={item.screen === null}
          />
        ))}
      </Box>
    </Box>
  );
};
