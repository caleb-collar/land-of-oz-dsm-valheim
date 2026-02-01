/**
 * Toggle component - Simple on/off toggle switch
 */

import { Box, Text, useInput } from "ink";
import type { FC } from "react";
import { theme } from "../theme.js";

export type ToggleProps = {
  /** Current toggle state */
  value: boolean;
  /** Callback when value changes */
  onChange: (value: boolean) => void;
  /** Callback when Enter/Space is pressed */
  onSubmit?: (value: boolean) => void;
  /** Callback when Escape is pressed */
  onCancel?: () => void;
  /** Whether the toggle is focused/active */
  focus?: boolean;
  /** Label to display before toggle */
  label?: string;
  /** Labels for on/off states */
  labels?: {
    on?: string;
    off?: string;
  };
  /** Style of the toggle indicator */
  style?: "switch" | "checkbox" | "yesno";
};

/**
 * Simple on/off toggle with keyboard support
 * Space or Enter to toggle
 */
export const Toggle: FC<ToggleProps> = ({
  value,
  onChange,
  onSubmit,
  onCancel,
  focus = true,
  label,
  labels = { on: "On", off: "Off" },
  style = "switch",
}) => {
  useInput(
    (input, key) => {
      if (!focus) return;

      // Toggle on Space or Enter
      if (input === " " || key.return) {
        const newValue = !value;
        onChange(newValue);
        onSubmit?.(newValue);
        return;
      }

      // Escape to cancel
      if (key.escape) {
        onCancel?.();
        return;
      }

      // Y/N shortcuts
      if (input.toLowerCase() === "y") {
        if (!value) {
          onChange(true);
          onSubmit?.(true);
        }
        return;
      }
      if (input.toLowerCase() === "n") {
        if (value) {
          onChange(false);
          onSubmit?.(false);
        }
        return;
      }
    },
    { isActive: focus }
  );

  // Render the toggle indicator based on style
  const renderIndicator = () => {
    switch (style) {
      case "checkbox":
        return (
          <Text color={value ? theme.success : theme.muted}>
            {value ? "[✓]" : "[ ]"}
          </Text>
        );

      case "yesno":
        return (
          <Box>
            <Text
              color={value ? theme.success : theme.muted}
              bold={value}
              inverse={value && focus}
            >
              Yes
            </Text>
            <Text> / </Text>
            <Text
              color={!value ? theme.error : theme.muted}
              bold={!value}
              inverse={!value && focus}
            >
              No
            </Text>
          </Box>
        );
      default:
        return (
          <Box>
            <Text color={value ? theme.success : theme.muted}>
              {value ? "●━" : "━○"}
            </Text>
            <Text color={value ? theme.success : theme.muted} bold={focus}>
              {" "}
              {value ? labels.on : labels.off}
            </Text>
          </Box>
        );
    }
  };

  return (
    <Box>
      {label && (
        <Box marginRight={1}>
          <Text>{label}:</Text>
        </Box>
      )}
      <Box>
        {focus && <Text color={theme.primary}>{"◀ "}</Text>}
        {renderIndicator()}
        {focus && <Text color={theme.primary}>{" ▶"}</Text>}
      </Box>
      {focus && (
        <Box marginLeft={1}>
          <Text dimColor>[Space/Enter to toggle]</Text>
        </Box>
      )}
    </Box>
  );
};
