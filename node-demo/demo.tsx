/**
 * Node.js fullscreen-ink demo to test responsive behavior
 * Run with: npm start (after npm install)
 *
 * This is the Node.js equivalent to compare resize behavior with Deno.
 */

import React, { useEffect, useState } from "react";
import { Box, Text, useStdout } from "ink";
import { withFullScreen } from "fullscreen-ink";

/**
 * Hook that subscribes to stdout resize events
 * This uses Node's native resize event which Deno doesn't forward
 */
function useTerminalSize(): { columns: number; rows: number } {
  const { stdout } = useStdout();

  const [size, setSize] = useState({
    columns: stdout.columns ?? 80,
    rows: stdout.rows ?? 24,
  });

  useEffect(() => {
    const handler = () => {
      setSize({
        columns: stdout.columns ?? 80,
        rows: stdout.rows ?? 24,
      });
    };

    stdout.on("resize", handler);
    return () => {
      stdout.off("resize", handler);
    };
  }, [stdout]);

  return size;
}

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
