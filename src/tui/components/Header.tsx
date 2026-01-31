/**
 * Header component with animated ASCII logo and status
 */

import { type FC, useEffect, useState } from "react";
import { Box, Text } from "ink";
import { useStore } from "../store.ts";
import { getStatusColor, theme } from "../theme.ts";

// ASCII logo frames
const logoFrames = [
  " ╦  ╔═╗╔╗╔╔╦╗  ╔═╗╔═╗  ╔═╗╔═╗ \n ║  ╠═╣║║║ ║║  ║ ║╠╣   ║ ║╔═╝ \n ╩═╝╚ ╚╝╚╝═╩╝  ╚═╝╚    ╚═╝╚═╝ ",
];

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
  const status = useStore((s) => s.server.status);
  const uptime = useStore((s) => s.server.uptime);
  const players = useStore((s) => s.server.players);
  const [frameIndex, setFrameIndex] = useState(0);

  // Animate through frames
  useEffect(() => {
    if (logoFrames.length <= 1) return;

    const interval = setInterval(() => {
      setFrameIndex((prev: number) => (prev + 1) % logoFrames.length);
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const statusColor = getStatusColor(status);
  const currentFrame = logoFrames[frameIndex];

  return (
    <Box
      flexDirection="column"
      paddingX={1}
      borderStyle="single"
      borderColor={theme.muted}
    >
      {/* Logo */}
      <Box justifyContent="center">
        <Text color={theme.primary}>{currentFrame}</Text>
      </Box>

      {/* Status bar */}
      <Box justifyContent="space-between" paddingTop={1}>
        <Box>
          <Text>Server:</Text>
          <Text color={statusColor}>● {capitalize(status).toUpperCase()}</Text>
          {status === "online" && (
            <Text dimColor>| Uptime: {formatUptime(uptime)}</Text>
          )}
          {players.length > 0 && (
            <Text dimColor> | Players: {players.length}</Text>
          )}
        </Box>
        <Text dimColor>Valheim DSM v0.1.0</Text>
      </Box>
    </Box>
  );
};
