/**
 * Spinner and loading state components
 * Used for async operations throughout the TUI
 */

import { Box, Text } from "ink";
import { type FC, useEffect, useState } from "react";
import { theme, valheimPalette } from "../theme.js";

/** Spinner animation frames */
const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const SPINNER_INTERVAL = 80;

type SpinnerProps = {
  /** Text to display next to spinner */
  label?: string;
  /** Color of the spinner */
  color?: string;
};

/**
 * Animated spinner for loading states
 */
export const Spinner: FC<SpinnerProps> = (props) => {
  const { label, color = valheimPalette.mandarin } = props;
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setFrame((f) => (f + 1) % SPINNER_FRAMES.length);
    }, SPINNER_INTERVAL);

    return () => clearInterval(timer);
  }, []);

  return (
    <Box>
      <Text color={color}>{SPINNER_FRAMES[frame]}</Text>
      {label && <Text> {label}</Text>}
    </Box>
  );
};

type LoadingBoxProps = {
  /** Loading message */
  message: string;
  /** Optional details */
  details?: string;
};

/**
 * Loading box with spinner and message
 */
export const LoadingBox: FC<LoadingBoxProps> = (props) => {
  const { message, details } = props;

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor={theme.muted}
      paddingX={2}
      paddingY={1}
    >
      <Box>
        <Spinner label={message} />
      </Box>
      {details && (
        <Box marginTop={1}>
          <Text dimColor>{details}</Text>
        </Box>
      )}
    </Box>
  );
};

type ProgressBarProps = {
  /** Progress value between 0 and 1 */
  progress: number;
  /** Width of the bar */
  width?: number;
  /** Label to show */
  label?: string;
  /** Show percentage */
  showPercent?: boolean;
};

/**
 * Progress bar for operations with known progress
 */
export const ProgressBar: FC<ProgressBarProps> = (props) => {
  const { progress, width = 30, label, showPercent = true } = props;
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const filled = Math.round(clampedProgress * width);
  const empty = width - filled;
  const percent = Math.round(clampedProgress * 100);

  return (
    <Box flexDirection="column">
      {label && <Text>{label}</Text>}
      <Box>
        <Text color={valheimPalette.mandarin}>
          {"█".repeat(filled)}
          {"░".repeat(empty)}
        </Text>
        {showPercent && <Text dimColor> {percent}%</Text>}
      </Box>
    </Box>
  );
};

type StatusIndicatorProps = {
  /** Status type */
  status: "loading" | "success" | "error" | "warning" | "info";
  /** Message to display */
  message: string;
};

/**
 * Status indicator with icon and message
 */
export const StatusIndicator: FC<StatusIndicatorProps> = (props) => {
  const { status, message } = props;

  const getIcon = () => {
    switch (status) {
      case "loading":
        return <Spinner />;
      case "success":
        return <Text color={theme.success}>✓</Text>;
      case "error":
        return <Text color={theme.error}>✗</Text>;
      case "warning":
        return <Text color={theme.warning}>⚠</Text>;
      case "info":
        return <Text color={theme.primary}>ℹ</Text>;
    }
  };

  const getColor = () => {
    switch (status) {
      case "success":
        return theme.success;
      case "error":
        return theme.error;
      case "warning":
        return theme.warning;
      default:
        return undefined;
    }
  };

  return (
    <Box>
      {getIcon()}
      <Text color={getColor()}> {message}</Text>
    </Box>
  );
};
