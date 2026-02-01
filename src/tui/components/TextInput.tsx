/**
 * TextInput component - Single-line text input with cursor support
 */

import { Box, Text, useInput } from "ink";
import { type FC, useEffect, useState } from "react";
import { theme } from "../theme.js";

export type TextInputProps = {
  /** Current input value */
  value: string;
  /** Callback when value changes */
  onChange: (value: string) => void;
  /** Callback when Enter is pressed */
  onSubmit?: (value: string) => void;
  /** Callback when Escape is pressed */
  onCancel?: () => void;
  /** Placeholder text when empty */
  placeholder?: string;
  /** Mask input with asterisks (for passwords) */
  mask?: boolean;
  /** Maximum character length */
  maxLength?: number;
  /** Width of input field */
  width?: number;
  /** Whether the input is focused/active */
  focus?: boolean;
  /** Label to display before input */
  label?: string;
};

/**
 * Single-line text input component with cursor support
 */
export const TextInput: FC<TextInputProps> = ({
  value,
  onChange,
  onSubmit,
  onCancel,
  placeholder = "",
  mask = false,
  maxLength,
  width = 30,
  focus = true,
  label,
}) => {
  const [cursorPosition, setCursorPosition] = useState(value.length);
  const [cursorVisible, setCursorVisible] = useState(true);

  // Keep cursor at end when value changes externally
  useEffect(() => {
    setCursorPosition(value.length);
  }, [value.length]);

  // Cursor blink effect
  useEffect(() => {
    if (!focus) {
      setCursorVisible(false);
      return;
    }

    const interval = setInterval(() => {
      setCursorVisible((prev) => !prev);
    }, 530);

    setCursorVisible(true);
    return () => clearInterval(interval);
  }, [focus]);

  useInput(
    (input, key) => {
      if (!focus) return;

      // Submit on Enter
      if (key.return) {
        onSubmit?.(value);
        return;
      }

      // Cancel on Escape
      if (key.escape) {
        onCancel?.();
        return;
      }

      // Backspace
      if (key.backspace || key.delete) {
        if (cursorPosition > 0) {
          const newValue =
            value.slice(0, cursorPosition - 1) + value.slice(cursorPosition);
          onChange(newValue);
          setCursorPosition(cursorPosition - 1);
        }
        return;
      }

      // Left arrow
      if (key.leftArrow) {
        setCursorPosition(Math.max(0, cursorPosition - 1));
        return;
      }

      // Right arrow
      if (key.rightArrow) {
        setCursorPosition(Math.min(value.length, cursorPosition + 1));
        return;
      }

      // Home key (Ctrl+A in some terminals)
      if (key.ctrl && input === "a") {
        setCursorPosition(0);
        return;
      }

      // End key (Ctrl+E in some terminals)
      if (key.ctrl && input === "e") {
        setCursorPosition(value.length);
        return;
      }

      // Clear to end (Ctrl+K)
      if (key.ctrl && input === "k") {
        onChange(value.slice(0, cursorPosition));
        return;
      }

      // Regular character input
      if (input && !key.ctrl && !key.meta) {
        // Check max length
        if (maxLength && value.length >= maxLength) return;

        const newValue =
          value.slice(0, cursorPosition) + input + value.slice(cursorPosition);
        onChange(newValue);
        setCursorPosition(cursorPosition + input.length);
      }
    },
    { isActive: focus }
  );

  // Display value (masked or plain)
  const displayValue = mask ? "•".repeat(value.length) : value;

  // Build display string with cursor
  const beforeCursor = displayValue.slice(0, cursorPosition);
  const cursorChar =
    cursorPosition < displayValue.length ? displayValue[cursorPosition] : " ";
  const afterCursor = displayValue.slice(cursorPosition + 1);

  // Padding to fill width
  const contentLength = displayValue.length + 1; // +1 for cursor space
  const paddingLength = Math.max(0, width - contentLength);
  const padding = " ".repeat(paddingLength);

  // Show placeholder if empty and no focus
  const showPlaceholder = value.length === 0 && placeholder;

  return (
    <Box>
      {label && (
        <Box marginRight={1}>
          <Text>{label}:</Text>
        </Box>
      )}
      <Box
        borderStyle={focus ? "single" : undefined}
        borderColor={focus ? theme.primary : undefined}
        paddingX={focus ? 0 : 0}
      >
        {showPlaceholder && !focus ? (
          <Text dimColor>{placeholder}</Text>
        ) : (
          <Text>
            <Text>{beforeCursor}</Text>
            <Text
              inverse={focus && cursorVisible}
              color={focus ? theme.primary : undefined}
            >
              {cursorChar}
            </Text>
            <Text>{afterCursor}</Text>
            <Text>{padding}</Text>
          </Text>
        )}
      </Box>
    </Box>
  );
};
