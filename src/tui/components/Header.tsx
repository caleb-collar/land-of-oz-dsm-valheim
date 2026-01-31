/**
 * Header component with animated ASCII logo and status
 * Features scramble/decode animation on entry
 * Responsive design: adapts to terminal width
 */

import { Box, Text } from "ink";
import { type FC, useEffect, useMemo, useRef, useState } from "react";
import { useTerminalSize } from "../hooks/useTerminalSize.js";
import { useStore } from "../store.js";
import { getStatusColor, theme, valheimPalette } from "../theme.js";

// Final ASCII art text
const FINAL_VALHEIM = `██╗   ██╗ █████╗ ██╗     ██╗  ██╗███████╗██╗███╗   ███╗
██║   ██║██╔══██╗██║     ██║  ██║██╔════╝██║████╗ ████║
██║   ██║███████║██║     ███████║█████╗  ██║██╔████╔██║
╚██╗ ██╔╝██╔══██║██║     ██╔══██║██╔══╝  ██║██║╚██╔╝██║
 ╚████╔╝ ██║  ██║███████╗██║  ██║███████╗██║██║ ╚═╝ ██║
  ╚═══╝  ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚══════╝╚═╝╚═╝     ╚═╝`;

const FINAL_DSM = `██████╗ ███████╗███╗   ███╗
██╔══██╗██╔════╝████╗ ████║
██║  ██║███████╗██╔████╔██║
██║  ██║╚════██║██║╚██╔╝██║
██████╔╝███████║██║ ╚═╝ ██║
╚═════╝ ╚══════╝╚═╝     ╚═╝`;

// Characters used for scramble effect (box drawing + symbols)
const SCRAMBLE_CHARS = "░▒▓█▀▄▌▐│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌";

// Small ASCII art for medium terminals (width 40-60)
const smallLogo = {
  valheim: `╦  ╦╔═╗╦  ╦ ╦╔═╗╦╔╦╗
╚╗╔╝╠═╣║  ╠═╣║╣ ║║║║
 ╚╝ ╩ ╩╩═╝╩ ╩╚═╝╩╩ ╩`,
  dsm: `╔╦╗╔═╗╔╦╗
 ║║╚═╗║║║
═╩╝╚═╝╩ ╩`,
};

// Animation config
const ANIMATION_STEPS = 20; // Number of decode steps
const STEP_DURATION = 50; // ms per step

// Size thresholds
const LARGE_WIDTH = 60; // Full animated ASCII art
const MEDIUM_WIDTH = 40; // Small ASCII art
// Below MEDIUM_WIDTH: Plain text

/**
 * Get a random scramble character
 */
function getRandomChar(): string {
  return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
}

/**
 * Scramble a string, preserving spaces and newlines
 * @param text - The original text
 * @param revealRatio - 0 = fully scrambled, 1 = fully revealed
 */
function scrambleText(text: string, revealRatio: number): string {
  const chars = text.split("");
  const totalNonSpace = chars.filter((c) => c !== " " && c !== "\n").length;
  const charsToReveal = Math.floor(totalNonSpace * revealRatio);

  // Calculate which character positions to reveal (left to right bias)
  let revealed = 0;
  let nonSpaceIndex = 0;

  return chars
    .map((char) => {
      // Preserve spaces and newlines
      if (char === " " || char === "\n") {
        return char;
      }

      // Determine if this character should be revealed
      // Left-to-right reveal with some randomness
      const threshold = charsToReveal / totalNonSpace;
      const position = nonSpaceIndex / totalNonSpace;
      const shouldReveal =
        position < threshold * 1.2 &&
        (revealed < charsToReveal || Math.random() < revealRatio * 0.5);

      nonSpaceIndex++;

      if (shouldReveal || revealRatio >= 1) {
        revealed++;
        return char;
      }

      // Return scrambled character
      return getRandomChar();
    })
    .join("");
}

/**
 * Capitalizes first letter of a string
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Formats uptime in seconds to human-readable string
 */
function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins < 60) return `${mins}m ${secs}s`;
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return `${hours}h ${remainingMins}m`;
}

/**
 * Header component displaying the animated logo and server status
 */
export const Header: FC = () => {
  const { columns } = useTerminalSize();
  const status = useStore((s) => s.server.status);
  const uptime = useStore((s) => s.server.uptime);
  const players = useStore((s) => s.server.players);
  const [step, setStep] = useState(0);
  const [animationComplete, setAnimationComplete] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickRef = useRef(0);

  // Calculate reveal ratio based on current step
  const revealRatio = useMemo(() => {
    if (animationComplete) return 1;
    // Ease-out curve for more natural reveal
    const progress = step / ANIMATION_STEPS;
    return progress * progress * (3 - 2 * progress); // smoothstep
  }, [step, animationComplete]);

  // Generate scrambled text for current frame
  const currentValheim = useMemo(() => {
    if (animationComplete || columns < LARGE_WIDTH) return FINAL_VALHEIM;
    // Add tick to force re-render for scramble randomness
    tickRef.current;
    return scrambleText(FINAL_VALHEIM, revealRatio);
  }, [revealRatio, animationComplete, columns]);

  const currentDsm = useMemo(() => {
    if (animationComplete || columns < LARGE_WIDTH) return FINAL_DSM;
    tickRef.current;
    return scrambleText(FINAL_DSM, revealRatio);
  }, [revealRatio, animationComplete, columns]);

  // Animate the decode effect
  useEffect(() => {
    if (animationComplete || columns < LARGE_WIDTH) return;

    if (step >= ANIMATION_STEPS) {
      setAnimationComplete(true);
      return;
    }

    timeoutRef.current = setTimeout(() => {
      tickRef.current++;
      setStep((prev) => prev + 1);
    }, STEP_DURATION);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [step, animationComplete, columns]);

  const statusColor = getStatusColor(status);

  // Render based on terminal width
  const renderLogo = () => {
    if (columns >= LARGE_WIDTH) {
      // Full animated ASCII art with scramble effect
      return (
        <Box flexDirection="column" alignItems="center">
          <Text color={valheimPalette.mandarin}>{currentValheim}</Text>
          <Box marginTop={1}>
            <Text color={valheimPalette.strawGold}>{currentDsm}</Text>
          </Box>
        </Box>
      );
    }

    if (columns >= MEDIUM_WIDTH) {
      // Small ASCII art (no animation)
      return (
        <Box flexDirection="column" alignItems="center">
          <Text color={valheimPalette.mandarin}>{smallLogo.valheim}</Text>
          <Text color={valheimPalette.strawGold}>{smallLogo.dsm}</Text>
        </Box>
      );
    }

    // Plain text for very small terminals
    return (
      <Box flexDirection="column" alignItems="center">
        <Text bold color={valheimPalette.mandarin}>
          VALHEIM
        </Text>
        <Text color={valheimPalette.strawGold}>DSM</Text>
      </Box>
    );
  };

  // Compact status bar for small terminals
  const renderStatusBar = () => {
    if (columns < MEDIUM_WIDTH) {
      // Very compact status
      return (
        <Box justifyContent="space-between">
          <Text color={statusColor}>● {capitalize(status).toUpperCase()}</Text>
          <Text dimColor>v0.1.0</Text>
        </Box>
      );
    }

    // Full status bar
    return (
      <Box justifyContent="space-between" paddingTop={1}>
        <Box>
          <Text>Server: </Text>
          <Text color={statusColor}>● {capitalize(status).toUpperCase()}</Text>
          {status === "online" && (
            <Text dimColor> | Uptime: {formatUptime(uptime)}</Text>
          )}
          {players.length > 0 && (
            <Text dimColor> | Players: {players.length}</Text>
          )}
        </Box>
        <Text dimColor>Valheim DSM v0.1.0</Text>
      </Box>
    );
  };

  return (
    <Box
      flexDirection="column"
      paddingX={1}
      borderStyle="single"
      borderColor={theme.muted}
    >
      {renderLogo()}
      {renderStatusBar()}
    </Box>
  );
};
