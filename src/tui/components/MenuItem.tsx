/**
 * MenuItem component for navigation menu
 */

import { Box, Text } from "ink";
import type { FC } from "react";
import { theme } from "../theme.js";

type MenuItemProps = {
  /** Keyboard shortcut key */
  hotkey: string;
  /** Display label */
  label: string;
  /** Whether this item is currently active */
  active?: boolean;
  /** Whether this item is a quit action */
  isQuit?: boolean;
};

/**
 * Single menu item with hotkey and label
 */
export const MenuItem: FC<MenuItemProps> = (props: MenuItemProps) => {
  const { hotkey, label, active = false, isQuit = false } = props;
  const color = active ? theme.primary : isQuit ? theme.error : theme.secondary;
  const isBold = active;

  return (
    <Box>
      <Text color={color} bold={isBold}>
        [{hotkey}] {label}
      </Text>
      {active && <Text color={theme.primary}>◀</Text>}
    </Box>
  );
};
