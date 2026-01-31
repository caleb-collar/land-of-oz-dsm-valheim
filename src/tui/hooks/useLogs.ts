/**
 * useLogs hook - Log streaming and management
 */

import { useCallback, useEffect } from "react";
import { type LogLevel, useStore } from "../store.ts";

/**
 * Hook for managing log entries
 */
export function useLogs() {
  const entries = useStore((s) => s.logs.entries);
  const filter = useStore((s) => s.logs.filter);
  const actions = useStore((s) => s.actions);

  /**
   * Add a log entry
   */
  const log = useCallback(
    (level: LogLevel, message: string) => {
      actions.addLog(level, message);
    },
    [actions],
  );

  /**
   * Convenience methods for each log level
   */
  const info = useCallback((message: string) => log("info", message), [log]);

  const warn = useCallback((message: string) => log("warn", message), [log]);

  const error = useCallback((message: string) => log("error", message), [log]);

  const debug = useCallback((message: string) => log("debug", message), [log]);

  /**
   * Clear all logs
   */
  const clear = useCallback(() => {
    actions.clearLogs();
  }, [actions]);

  /**
   * Set log filter
   */
  const setFilter = useCallback(
    (level: LogLevel | null) => {
      actions.setLogFilter(level);
    },
    [actions],
  );

  /**
   * Get filtered entries
   */
  const filteredEntries = filter
    ? entries.filter((e) => e.level === filter)
    : entries;

  return {
    entries,
    filteredEntries,
    filter,
    log,
    info,
    warn,
    error,
    debug,
    clear,
    setFilter,
    count: entries.length,
    filteredCount: filteredEntries.length,
  };
}

/**
 * Hook for subscribing to a log stream
 * Used to pipe external log sources into the store
 */
export function useLogStream(
  stream: AsyncIterable<string> | null,
  parser?: (line: string) => { level: LogLevel; message: string },
) {
  const addLog = useStore((s) => s.actions.addLog);

  useEffect(() => {
    if (!stream) return;

    const defaultParser = (line: string) => {
      if (line.toLowerCase().includes("error")) {
        return { level: "error" as const, message: line };
      }
      if (line.toLowerCase().includes("warn")) {
        return { level: "warn" as const, message: line };
      }
      return { level: "info" as const, message: line };
    };

    const parse = parser ?? defaultParser;

    const run = async () => {
      try {
        for await (const line of stream) {
          const { level, message } = parse(line);
          addLog(level, message);
        }
      } catch {
        // Stream ended or errored
      }
    };

    run();
  }, [stream, parser, addLog]);
}
