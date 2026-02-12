/**
 * Row component
 * Consistent label-value row with proper flex layout
 */

import { Box, Text } from "ink";
import type { FC } from "react";

/** Props for Row component */
type RowProps = {
  /** Label text */
  label: string;
  /** Value to display */
  value: string;
  /** Value text color */
  color?: string;
  /** Whether value should be dimmed */
  dimColor?: boolean;
};

/**
 * A consistent row layout with label and value.
 * Uses flexShrink={0} and minHeight={1} to prevent layout collapse.
 */
export const Row: FC<RowProps> = ({ label, value, color, dimColor }) => (
  <Box flexShrink={0} minHeight={1}>
    <Text>{label}: </Text>
    <Text color={color} dimColor={dimColor}>
      {value}
    </Text>
  </Box>
);
