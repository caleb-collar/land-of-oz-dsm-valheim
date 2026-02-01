/**
 * Navigation Menu component
 */

import { Box, Text } from "ink";
import type { FC } from "react";
import type { Screen } from "../store.js";
import { useStore } from "../store.js";
import { theme } from "../theme.js";
import { MenuItem } from "./MenuItem.js";

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

/** Props for Menu component */
type MenuProps = Record<string, never>;

/**
 * Navigation menu with keyboard shortcuts
 */
export const Menu: FC<MenuProps> = () => {
  const activeScreen = useStore((s) => s.ui.activeScreen);

  return (
    <Box
      flexDirection="column"
      width={20}
      flexGrow={1}
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
