/**
 * Simple fullscreen-ink demo to test responsive behavior
 * Run with: npx tsx src/tui/demo.tsx
 *
 * Uses Node.js stdout resize events for proper resize handling.
 */

import { withFullScreen } from "fullscreen-ink";
import { Box, Text } from "ink";
import { useTerminalSize } from "./hooks/useTerminalSize.js";

function Demo() {
  const { columns, rows } = useTerminalSize();

  return (
    <Box
      flexDirection="column"
      height={rows}
      width={columns}
      borderStyle="single"
      borderColor="red"
    >
      <Box flexGrow={1} justifyContent="center" alignItems="center">
        <Text bold>
          Terminal Size: {columns} x {rows}
        </Text>
      </Box>
      <Box justifyContent="center">
        <Text dimColor>Resize terminal to test. Press Ctrl+C to exit.</Text>
      </Box>
    </Box>
  );
}

// Launch fullscreen
withFullScreen(<Demo />).start();
