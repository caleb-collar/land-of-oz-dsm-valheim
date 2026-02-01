/**
 * Header component with animated ASCII logo and status
 * Features scramble/decode animation on entry
 * Responsive design: adapts to terminal width
 */

import { Box, Text } from "ink";
import React, { type FC, useEffect, useMemo, useRef, useState } from "react";
import packageJson from "../../../package.json" with { type: "json" };
import { useTerminalSize } from "../hooks/useTerminalSize.js";
import { useStore } from "../store.js";
import { getStatusColor, theme, valheimPalette } from "../theme.js";
import { FlamesAscii } from "./FlamesAscii.js";

const VERSION = packageJson.version;

// Final ASCII art text
const FINAL_VALHEIM = `██╗   ██╗ █████╗ ██╗     ██╗  ██╗███████╗██╗███╗   ███╗
██║   ██║██╔══██╗██║     ██║  ██║██╔════╝██║████╗ ████║
██║   ██║███████║██║     ███████║█████╗  ██║██╔████╔██║
╚██╗ ██╔╝██╔══██║██║     ██╔══██║██╔══╝  ██║██║╚██╔╝██║
 ╚████╔╝ ██║  ██║███████╗██║  ██║███████╗██║██║ ╚═╝ ██║
  ╚═══╝  ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚══════╝╚═╝╚═╝     ╚═╝`;

const FINAL_OZ_DSM = ` ██████╗ ███████╗    ██████╗ ███████╗███╗   ███╗
██╔═══██╗╚══███╔╝    ██╔══██╗██╔════╝████╗ ████║
██║   ██║  ███╔╝     ██║  ██║███████╗██╔████╔██║
██║   ██║ ███╔╝      ██║  ██║╚════██║██║╚██╔╝██║
╚██████╔╝███████╗    ██████╔╝███████║██║ ╚═╝ ██║
 ╚═════╝ ╚══════╝    ╚═════╝ ╚══════╝╚═╝     ╚═╝`;

// OZ DSM vertical offset (how many lines down from VALHEIM's start)
const OZ_DSM_OFFSET_Y = 1;

// Character source for color mapping
type CharSource = "valheim" | "ozdsm" | "space";

// Canvas cell with optional underlying layer (for overlapping regions)
type CanvasCell = {
  char: string;
  source: CharSource;
  underlyingChar?: string;
  underlyingSource?: CharSource;
};

/**
 * Compose VALHEIM and OZ DSM into a single canvas
 * VALHEIM is at top (Y=0), OZ DSM is offset down
 * VALHEIM takes priority where both have characters
 * Tracks underlying OZ DSM for animation purposes
 */
function composeLogo(
  valheim: string,
  ozDsm: string,
  ozDsmOffsetY: number
): CanvasCell[][] {
  const valheimLines = valheim.split("\n");
  const ozDsmLines = ozDsm.split("\n");

  // Calculate canvas size
  const valheimWidth = Math.max(...valheimLines.map((l) => l.length));
  const ozDsmWidth = Math.max(...ozDsmLines.map((l) => l.length));
  const totalWidth = Math.max(valheimWidth, ozDsmWidth);
  const totalHeight = Math.max(
    valheimLines.length,
    ozDsmLines.length + ozDsmOffsetY
  );

  // Initialize canvas with spaces
  const canvas: CanvasCell[][] = [];
  for (let y = 0; y < totalHeight; y++) {
    canvas.push(
      Array.from({ length: totalWidth }, () => ({
        char: " ",
        source: "space" as CharSource,
      }))
    );
  }

  // Draw OZ DSM first (background) - offset down and centered
  const ozDsmOffsetX = Math.floor((totalWidth - ozDsmWidth) / 2);
  for (let y = 0; y < ozDsmLines.length; y++) {
    const line = ozDsmLines[y];
    for (let x = 0; x < line.length; x++) {
      const char = line[x];
      const targetY = y + ozDsmOffsetY;
      const targetX = x + ozDsmOffsetX;
      if (char !== " " && targetY < totalHeight && targetX < totalWidth) {
        canvas[targetY][targetX] = { char, source: "ozdsm" };
      }
    }
  }

  // Draw VALHEIM on top (foreground) - at Y=0, centered
  // Store underlying OZ DSM where they overlap
  const valheimOffsetX = Math.floor((totalWidth - valheimWidth) / 2);
  for (let y = 0; y < valheimLines.length; y++) {
    const line = valheimLines[y];
    for (let x = 0; x < line.length; x++) {
      const char = line[x];
      const targetX = x + valheimOffsetX;
      if (char !== " " && y < totalHeight && targetX < totalWidth) {
        const existingCell = canvas[y][targetX];
        // Store underlying OZ DSM if present
        if (existingCell.source === "ozdsm") {
          canvas[y][targetX] = {
            char,
            source: "valheim",
            underlyingChar: existingCell.char,
            underlyingSource: "ozdsm",
          };
        } else {
          canvas[y][targetX] = { char, source: "valheim" };
        }
      }
    }
  }

  return canvas;
}

// Characters used for scramble effect (box drawing + symbols)
const SCRAMBLE_CHARS = "░▒▓█▀▄▌▐│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌";

// Small ASCII art for medium terminals (width 40-60)
const smallLogo = {
  valheim: `╦  ╦╔═╗╦  ╦ ╦╔═╗╦╔╦╗
╚╗╔╝╠═╣║  ╠═╣║╣ ║║║║
 ╚╝ ╩ ╩╩═╝╩ ╩╚═╝╩╩ ╩`,
  ozDsm: `╔═╗╔═╗  ╔╦╗╔═╗╔╦╗
║ ║╔═╝   ║║╚═╗║║║
╚═╝╚═╝  ═╩╝╚═╝╩ ╩`,
};

// Animation config
const ANIMATION_STEPS = 20; // Number of decode steps per text
const STEP_DURATION = 50; // ms per step
const VALHEIM_DELAY_STEPS = 30; // Steps to wait before VALHEIM starts (OZ DSM completes at 20, then 10 step pause)
const TOTAL_ANIMATION_STEPS = ANIMATION_STEPS + VALHEIM_DELAY_STEPS;

// Flame dimensions for header
const FLAME_WIDTH = 20; // Width of flame slice
const FLAME_HEIGHT = 7; // Match the 7-line composite logo height

// Size thresholds
const LOGO_WIDTH = 55; // Width of VALHEIM ASCII art
const LARGE_WIDTH_WITH_FLAMES = LOGO_WIDTH + FLAME_WIDTH * 2 + 4; // ~99 cols for flames
const LARGE_WIDTH = 60; // Full animated ASCII art (no flames)
const MEDIUM_WIDTH = 40; // Small ASCII art
// Below MEDIUM_WIDTH: Plain text

// Height thresholds (for responsive vertical layout)
const LARGE_HEIGHT = 16; // Full composite logo with flames
const MEDIUM_HEIGHT = 9; // Composite logo without flames
// Below MEDIUM_HEIGHT: Small stacked logo

/**
 * Get a random scramble character
 */
function getRandomChar(): string {
  return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
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
 * Render a line with colored segments based on character source
 * Groups consecutive characters with the same source for efficiency
 */
function renderColoredLine(
  line: { char: string; source: CharSource }[]
): React.ReactNode {
  const segments: { text: string; source: CharSource }[] = [];
  let currentSegment = {
    text: "",
    source: line[0]?.source ?? ("space" as CharSource),
  };

  for (const cell of line) {
    if (cell.source === currentSegment.source) {
      currentSegment.text += cell.char;
    } else {
      if (currentSegment.text) segments.push(currentSegment);
      currentSegment = { text: cell.char, source: cell.source };
    }
  }
  if (currentSegment.text) segments.push(currentSegment);

  return segments.map((seg, idx) => {
    const color =
      seg.source === "valheim"
        ? valheimPalette.mandarin
        : seg.source === "ozdsm"
          ? valheimPalette.strawGold
          : undefined;
    return (
      <Text key={`seg-${idx}`} color={color}>
        {seg.text}
      </Text>
    );
  });
}

/**
 * Flatten a CanvasCell to a simple {char, source} for rendering
 * When VALHEIM is hidden and there's an underlying OZ DSM, show that instead
 */
function flattenCellForRender(
  cell: CanvasCell,
  valheimHidden: boolean,
  valheimRevealRatio: number,
  ozDsmRevealRatio: number,
  animationComplete: boolean
): { char: string; source: CharSource } {
  if (animationComplete) {
    return { char: cell.char, source: cell.source };
  }

  if (cell.source === "space") {
    return { char: " ", source: "space" };
  }

  if (cell.source === "valheim") {
    // VALHEIM is hidden - show underlying OZ DSM if present
    if (valheimHidden) {
      if (cell.underlyingSource === "ozdsm" && cell.underlyingChar) {
        // Show OZ DSM underneath with its own animation
        if (Math.random() < ozDsmRevealRatio) {
          return { char: cell.underlyingChar, source: "ozdsm" };
        }
        return { char: getRandomChar(), source: "ozdsm" };
      }
      return { char: " ", source: "space" };
    }
    // VALHEIM is animating
    if (Math.random() < valheimRevealRatio) {
      return { char: cell.char, source: "valheim" };
    }
    return { char: getRandomChar(), source: "valheim" };
  }

  // OZ DSM cell
  if (Math.random() < ozDsmRevealRatio) {
    return { char: cell.char, source: "ozdsm" };
  }
  return { char: getRandomChar(), source: "ozdsm" };
}

/**
 * Header component displaying the animated logo and server status
 */
export const Header: FC = () => {
  const { columns, rows } = useTerminalSize();
  const status = useStore((s) => s.server.status);
  const uptime = useStore((s) => s.server.uptime);
  const players = useStore((s) => s.server.players);
  const [step, setStep] = useState(0);
  const [animationComplete, setAnimationComplete] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickRef = useRef(0);

  // Determine if we have enough space for flames
  const showFlames = rows >= LARGE_HEIGHT && columns >= LARGE_WIDTH_WITH_FLAMES;

  // Calculate reveal ratios for each text (OZ DSM first, then VALHEIM)
  const { ozDsmRevealRatio, valheimRevealRatio } = useMemo(() => {
    if (animationComplete)
      return { ozDsmRevealRatio: 1, valheimRevealRatio: 1 };

    // OZ DSM starts immediately
    const ozDsmProgress = Math.min(1, step / ANIMATION_STEPS);
    const ozDsmRatio = ozDsmProgress * ozDsmProgress * (3 - 2 * ozDsmProgress);

    // VALHEIM starts after delay
    const valheimStep = Math.max(0, step - VALHEIM_DELAY_STEPS);
    const valheimProgress = Math.min(1, valheimStep / ANIMATION_STEPS);
    const valheimRatio =
      valheimProgress * valheimProgress * (3 - 2 * valheimProgress);

    return { ozDsmRevealRatio: ozDsmRatio, valheimRevealRatio: valheimRatio };
  }, [step, animationComplete]);

  // Animate the decode effect
  useEffect(() => {
    if (animationComplete || columns < LARGE_WIDTH) return;

    if (step >= TOTAL_ANIMATION_STEPS) {
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

  // Render based on terminal width and height
  const renderLogo = () => {
    // Large width: show composite ASCII art logo
    if (columns >= LARGE_WIDTH && rows >= MEDIUM_HEIGHT) {
      // Compose logo with VALHEIM on top, OZ DSM behind and below
      const baseCanvas = composeLogo(
        FINAL_VALHEIM,
        FINAL_OZ_DSM,
        OZ_DSM_OFFSET_Y
      );

      // Apply scramble effect during animation (OZ DSM first, then VALHEIM)
      const valheimHidden = step < VALHEIM_DELAY_STEPS;
      const displayCanvas = baseCanvas.map((line) =>
        line.map((cell) =>
          flattenCellForRender(
            cell,
            valheimHidden,
            valheimRevealRatio,
            ozDsmRevealRatio,
            animationComplete
          )
        )
      );

      // With flames (when height allows)
      if (showFlames) {
        return (
          <Box flexDirection="row" alignItems="center" justifyContent="center">
            {/* Left flame - centered in its space */}
            <Box flexGrow={1} justifyContent="center" alignItems="center">
              <FlamesAscii
                maxWidth={FLAME_WIDTH}
                maxRows={FLAME_HEIGHT}
                mirror={false}
              />
            </Box>

            {/* Logo text - composited with VALHEIM on top */}
            <Box flexDirection="column" alignItems="center">
              {displayCanvas.map((line, lineIdx) => (
                <Text key={`logo-line-${lineIdx}`}>
                  {renderColoredLine(line)}
                </Text>
              ))}
            </Box>

            {/* Right flame - centered in its space, mirrored */}
            <Box flexGrow={1} justifyContent="center" alignItems="center">
              <FlamesAscii
                maxWidth={FLAME_WIDTH}
                maxRows={FLAME_HEIGHT}
                mirror={true}
              />
            </Box>
          </Box>
        );
      }

      // Without flames (medium height)
      return (
        <Box flexDirection="column" alignItems="center">
          {displayCanvas.map((line, lineIdx) => (
            <Text key={`logo-line-${lineIdx}`}>{renderColoredLine(line)}</Text>
          ))}
        </Box>
      );
    }

    if (columns >= MEDIUM_WIDTH) {
      // Small ASCII art (no animation, no flames)
      return (
        <Box flexDirection="column" alignItems="center">
          <Text color={valheimPalette.mandarin}>{smallLogo.valheim}</Text>
          <Text color={valheimPalette.strawGold}>{smallLogo.ozDsm}</Text>
        </Box>
      );
    }

    // Plain text for very small terminals
    return (
      <Box flexDirection="column" alignItems="center">
        <Text bold color={valheimPalette.mandarin}>
          VALHEIM
        </Text>
        <Text color={valheimPalette.strawGold}>OZ DSM</Text>
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
          <Text dimColor>v{VERSION}</Text>
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
        <Text dimColor>Valheim OZ DSM v{VERSION}</Text>
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
