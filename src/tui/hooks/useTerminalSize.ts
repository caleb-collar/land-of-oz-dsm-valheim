/**
 * Terminal size hook for Node.js
 *
 * Uses Node.js stdout.columns/rows with resize event listener.
 */

import { useEffect, useState } from "react";

/** Terminal dimensions */
export type TerminalSize = {
  columns: number;
  rows: number;
};

/**
 * Gets the current terminal size from process.stdout
 */
function getTerminalSize(): TerminalSize {
  return {
    columns: process.stdout.columns || 80,
    rows: process.stdout.rows || 24,
  };
}

/**
 * Hook that returns current terminal dimensions and updates on resize.
 * Uses Node.js stdout resize event for proper resize detection.
 */
export function useTerminalSize(): TerminalSize {
  const [size, setSize] = useState<TerminalSize>(getTerminalSize);

  useEffect(() => {
    const handleResize = () => {
      const newSize = getTerminalSize();
      setSize((prev) => {
        if (prev.columns !== newSize.columns || prev.rows !== newSize.rows) {
          return newSize;
        }
        return prev;
      });
    };

    // Listen for resize events on stdout
    process.stdout.on("resize", handleResize);

    return () => {
      process.stdout.off("resize", handleResize);
    };
  }, []);

  return size;
}
