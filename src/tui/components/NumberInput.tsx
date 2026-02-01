/**
 * NumberInput component - Numeric input with increment/decrement
 */

import { Box, Text, useInput } from "ink";
import { type FC, useEffect, useState } from "react";
import { theme } from "../theme.js";

export type NumberInputProps = {
  /** Current value */
  value: number;
  /** Callback when value changes */
  onChange: (value: number) => void;
  /** Callback when Enter is pressed */
  onSubmit?: (value: number) => void;
  /** Callback when Escape is pressed */
  onCancel?: () => void;
  /** Minimum allowed value */
  min?: number;
  /** Maximum allowed value */
  max?: number;
  /** Step size for increment/decrement */
  step?: number;
  /** Suffix to display after number (e.g., "s", "ms") */
  suffix?: string;
  /** Whether the input is focused/active */
  focus?: boolean;
  /** Label to display before input */
  label?: string;
  /** Width of input field */
  width?: number;
};

/**
 * Numeric input with increment/decrement support
 * Navigation: ↑/↓ or +/- to change value, direct number entry
 */
export const NumberInput: FC<NumberInputProps> = ({
  value,
  onChange,
  onSubmit,
  onCancel,
  min = Number.MIN_SAFE_INTEGER,
  max = Number.MAX_SAFE_INTEGER,
  step = 1,
  suffix,
  focus = true,
  label,
  width = 10,
}) => {
  const [editMode, setEditMode] = useState(false);
  const [editBuffer, setEditBuffer] = useState("");
  const [cursorVisible, setCursorVisible] = useState(true);

  // Reset edit buffer when entering edit mode
  useEffect(() => {
    if (editMode) {
      setEditBuffer(String(value));
    }
  }, [editMode, value]);

  // Cursor blink in edit mode
  useEffect(() => {
    if (!focus || !editMode) {
      setCursorVisible(false);
      return;
    }

    const interval = setInterval(() => {
      setCursorVisible((prev) => !prev);
    }, 530);

    setCursorVisible(true);
    return () => clearInterval(interval);
  }, [focus, editMode]);

  /**
   * Clamps value to min/max range
   */
  const clamp = (val: number): number => {
    return Math.min(max, Math.max(min, val));
  };

  /**
   * Commits the edit buffer value
   */
  const commitEdit = () => {
    const parsed = Number.parseInt(editBuffer, 10);
    if (!Number.isNaN(parsed)) {
      onChange(clamp(parsed));
    }
    setEditMode(false);
  };

  useInput(
    (input, key) => {
      if (!focus) return;

      // Escape - cancel edit or cancel input
      if (key.escape) {
        if (editMode) {
          setEditMode(false);
        } else {
          onCancel?.();
        }
        return;
      }

      // In edit mode - direct number entry
      if (editMode) {
        // Enter commits the edit
        if (key.return) {
          commitEdit();
          onSubmit?.(value);
          return;
        }

        // Backspace
        if (key.backspace || key.delete) {
          setEditBuffer((prev) => prev.slice(0, -1));
          return;
        }

        // Number input
        if (/^[0-9]$/.test(input)) {
          setEditBuffer((prev) => prev + input);
          return;
        }

        // Negative sign (only at start)
        if (input === "-" && editBuffer.length === 0 && min < 0) {
          setEditBuffer("-");
          return;
        }

        return;
      }

      // Not in edit mode

      // Enter to submit or enter edit mode
      if (key.return) {
        if (onSubmit) {
          onSubmit(value);
        } else {
          setEditMode(true);
        }
        return;
      }

      // Increment value
      if (key.upArrow || input === "+") {
        onChange(clamp(value + step));
        return;
      }

      // Decrement value
      if (key.downArrow || input === "-") {
        onChange(clamp(value - step));
        return;
      }

      // Direct number entry starts edit mode
      if (/^[0-9]$/.test(input)) {
        setEditMode(true);
        setEditBuffer(input);
        return;
      }

      // Hold Shift + Up/Down for larger steps (10x)
      if (key.shift && key.upArrow) {
        onChange(clamp(value + step * 10));
        return;
      }

      if (key.shift && key.downArrow) {
        onChange(clamp(value - step * 10));
        return;
      }
    },
    { isActive: focus }
  );

  // Display value
  const displayValue = editMode ? editBuffer : String(value);
  const paddingLength = Math.max(
    0,
    width - displayValue.length - (suffix?.length ?? 0)
  );
  const padding = " ".repeat(paddingLength);

  // Check if at bounds
  const atMin = value <= min;
  const atMax = value >= max;

  return (
    <Box>
      {label && (
        <Box marginRight={1}>
          <Text>{label}:</Text>
        </Box>
      )}
      <Box>
        {/* Decrement indicator */}
        {focus && !editMode && (
          <Text color={atMin ? theme.muted : theme.primary}>
            {atMin ? " " : "◀"}
          </Text>
        )}

        {/* Value display */}
        <Box
          borderStyle={editMode ? "single" : undefined}
          borderColor={editMode ? theme.primary : undefined}
          marginX={focus && !editMode ? 1 : 0}
        >
          <Text color={focus ? theme.primary : undefined} bold={focus}>
            {displayValue}
            {editMode && cursorVisible && <Text inverse> </Text>}
            {suffix && <Text dimColor>{suffix}</Text>}
            {padding}
          </Text>
        </Box>

        {/* Increment indicator */}
        {focus && !editMode && (
          <Text color={atMax ? theme.muted : theme.primary}>
            {atMax ? " " : "▶"}
          </Text>
        )}
      </Box>

      {/* Edit mode hint */}
      {focus && !editMode && (
        <Box marginLeft={1}>
          <Text dimColor>[↑/↓ or type]</Text>
        </Box>
      )}
      {editMode && (
        <Box marginLeft={1}>
          <Text dimColor>[Enter to save, Esc to cancel]</Text>
        </Box>
      )}
    </Box>
  );
};
