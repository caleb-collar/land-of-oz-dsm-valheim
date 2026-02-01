/**
 * PathInput component - File/directory path input with validation
 */

import fs from "node:fs/promises";
import path from "node:path";
import { Box, Text, useInput } from "ink";
import { type FC, useEffect, useState } from "react";
import { theme } from "../theme.js";

export type PathInputProps = {
  /** Current path value */
  value: string;
  /** Callback when value changes */
  onChange: (value: string) => void;
  /** Callback when Enter is pressed */
  onSubmit?: (value: string) => void;
  /** Callback when Escape is pressed */
  onCancel?: () => void;
  /** Mode: 'file' or 'directory' */
  mode?: "file" | "directory";
  /** Whether the path must exist */
  mustExist?: boolean;
  /** File extension filter (e.g., ".db") */
  filter?: string;
  /** Whether the input is focused/active */
  focus?: boolean;
  /** Label to display before input */
  label?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Width of input field */
  width?: number;
};

type ValidationState = "valid" | "invalid" | "checking" | "none";

/**
 * File/directory path input with validation
 */
export const PathInput: FC<PathInputProps> = ({
  value,
  onChange,
  onSubmit,
  onCancel,
  mode = "file",
  mustExist = false,
  filter,
  focus = true,
  label,
  placeholder = "Enter path...",
  width = 50,
}) => {
  const [cursorPosition, setCursorPosition] = useState(value.length);
  const [cursorVisible, setCursorVisible] = useState(true);
  const [validation, setValidation] = useState<ValidationState>("none");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  // Path validation
  useEffect(() => {
    if (!value || !mustExist) {
      setValidation("none");
      setErrorMessage(null);
      return;
    }

    let cancelled = false;

    const validate = async () => {
      setValidation("checking");
      setErrorMessage(null);

      try {
        const stat = await fs.stat(value);

        if (cancelled) return;

        if (mode === "file" && !stat.isFile()) {
          setValidation("invalid");
          setErrorMessage("Not a file");
          return;
        }

        if (mode === "directory" && !stat.isDirectory()) {
          setValidation("invalid");
          setErrorMessage("Not a directory");
          return;
        }

        if (filter && mode === "file" && !value.endsWith(filter)) {
          setValidation("invalid");
          setErrorMessage(`Must be a ${filter} file`);
          return;
        }

        setValidation("valid");
        setErrorMessage(null);
      } catch {
        if (cancelled) return;
        setValidation("invalid");
        setErrorMessage("Path not found");
      }
    };

    // Debounce validation
    const timeout = setTimeout(validate, 300);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [value, mode, mustExist, filter]);

  useInput(
    (input, key) => {
      if (!focus) return;

      // Submit on Enter
      if (key.return) {
        if (mustExist && validation !== "valid") {
          // Don't submit if validation required and failed
          return;
        }
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

      // Home
      if (key.ctrl && input === "a") {
        setCursorPosition(0);
        return;
      }

      // End
      if (key.ctrl && input === "e") {
        setCursorPosition(value.length);
        return;
      }

      // Regular character input
      if (input && !key.ctrl && !key.meta) {
        const newValue =
          value.slice(0, cursorPosition) + input + value.slice(cursorPosition);
        onChange(newValue);
        setCursorPosition(cursorPosition + input.length);
      }
    },
    { isActive: focus }
  );

  // Display value
  const displayValue = value || "";

  // Build display string with cursor
  const beforeCursor = displayValue.slice(0, cursorPosition);
  const cursorChar =
    cursorPosition < displayValue.length ? displayValue[cursorPosition] : " ";
  const afterCursor = displayValue.slice(cursorPosition + 1);

  // Padding to fill width
  const contentLength = displayValue.length + 1;
  const paddingLength = Math.max(0, width - contentLength);
  const padding = " ".repeat(paddingLength);

  // Show placeholder if empty
  const showPlaceholder = value.length === 0 && placeholder;

  // Validation icon
  const getValidationIcon = () => {
    switch (validation) {
      case "valid":
        return <Text color={theme.success}>✓</Text>;
      case "invalid":
        return <Text color={theme.error}>✗</Text>;
      case "checking":
        return <Text color={theme.primary}>…</Text>;
      default:
        return null;
    }
  };

  // File type icon
  const getTypeIcon = () => {
    if (!value) return null;
    if (mode === "directory") {
      return <Text color={theme.primary}>📁</Text>;
    }
    const ext = path.extname(value);
    if (ext === ".db" || ext === ".fwl") {
      return <Text color={theme.secondary}>🗄️</Text>;
    }
    return <Text color={theme.muted}>📄</Text>;
  };

  return (
    <Box flexDirection="column">
      <Box>
        {label && (
          <Box marginRight={1}>
            <Text>{label}:</Text>
          </Box>
        )}

        {/* Type icon */}
        {getTypeIcon()}

        {/* Input field */}
        <Box
          borderStyle={focus ? "single" : undefined}
          borderColor={
            focus
              ? validation === "invalid"
                ? theme.error
                : theme.primary
              : undefined
          }
          marginLeft={1}
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

        {/* Validation icon */}
        <Box marginLeft={1}>{getValidationIcon()}</Box>
      </Box>

      {/* Error message */}
      {errorMessage && (
        <Box marginTop={0} marginLeft={label ? label.length + 3 : 2}>
          <Text color={theme.error}>⚠ {errorMessage}</Text>
        </Box>
      )}

      {/* Help text */}
      {focus && (
        <Box marginTop={0} marginLeft={label ? label.length + 3 : 2}>
          <Text dimColor>
            {mode === "directory" ? "Directory" : "File"} path
            {filter && ` (${filter})`}
            {mustExist && " - must exist"}
          </Text>
        </Box>
      )}
    </Box>
  );
};
