/**
 * Log file tailing for detached server mode
 * Reads and monitors server log files for real-time updates
 */

import { type FileHandle, open } from "node:fs/promises";
import {
  type ParsedEvent,
  parseEvent,
  parseLogLine,
  type ServerLogEntry,
} from "./logs.js";

/** Callback for new log lines */
export type LogLineCallback = (line: string, entry: ServerLogEntry) => void;

/** Callback for parsed events */
export type LogEventCallback = (event: ParsedEvent) => void;

/**
 * Log file tailer that reads new lines from a log file
 * Similar to `tail -f` functionality
 */
export class LogTailer {
  private filePath: string;
  private handle: FileHandle | null = null;
  private position = 0;
  private running = false;
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private buffer = "";
  private onLine: LogLineCallback;
  private onEvent: LogEventCallback | undefined;
  private pollMs: number;

  /**
   * Creates a new log tailer
   * @param filePath Path to the log file to tail
   * @param onLine Callback for each new log line
   * @param options Optional settings
   */
  constructor(
    filePath: string,
    onLine: LogLineCallback,
    options?: {
      onEvent?: LogEventCallback;
      pollMs?: number;
      /** Start from end of file (true) or beginning (false) */
      fromEnd?: boolean;
    }
  ) {
    this.filePath = filePath;
    this.onLine = onLine;
    this.onEvent = options?.onEvent;
    this.pollMs = options?.pollMs ?? 500;
  }

  /**
   * Starts tailing the log file
   * @param fromEnd If true, start from end of file (skip existing content)
   */
  async start(fromEnd = true): Promise<void> {
    if (this.running) return;

    try {
      this.handle = await open(this.filePath, "r");

      if (fromEnd) {
        // Get file size and start from end
        const stats = await this.handle.stat();
        this.position = stats.size;
      } else {
        this.position = 0;
      }

      this.running = true;
      this.pollInterval = setInterval(() => this.poll(), this.pollMs);

      // Do initial poll immediately
      await this.poll();
    } catch (_error) {
      // File may not exist yet, retry on next poll
      this.running = true;
      this.pollInterval = setInterval(() => this.poll(), this.pollMs);
    }
  }

  /**
   * Stops tailing the log file
   */
  async stop(): Promise<void> {
    this.running = false;

    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    if (this.handle) {
      await this.handle.close();
      this.handle = null;
    }
  }

  /**
   * Polls the log file for new content
   */
  private async poll(): Promise<void> {
    if (!this.running) return;

    try {
      // Try to open file if not already open
      if (!this.handle) {
        try {
          this.handle = await open(this.filePath, "r");
          const stats = await this.handle.stat();
          // Start from current position (which may be 0 or end of file)
          if (this.position > stats.size) {
            // File was truncated/rotated, start from beginning
            this.position = 0;
          }
        } catch {
          // File doesn't exist yet, try again next poll
          return;
        }
      }

      // Read new content
      const stats = await this.handle.stat();
      if (stats.size <= this.position) {
        // Check for file rotation (file became smaller)
        if (stats.size < this.position) {
          this.position = 0;
        }
        return;
      }

      const bytesToRead = stats.size - this.position;
      const buffer = Buffer.alloc(bytesToRead);
      const { bytesRead } = await this.handle.read(
        buffer,
        0,
        bytesToRead,
        this.position
      );

      if (bytesRead > 0) {
        this.position += bytesRead;
        this.processChunk(buffer.toString("utf-8", 0, bytesRead));
      }
    } catch (_error) {
      // Handle file errors (deleted, rotated, etc.)
      if (this.handle) {
        try {
          await this.handle.close();
        } catch {
          // Ignore close errors
        }
        this.handle = null;
      }
    }
  }

  /**
   * Processes a chunk of log data, splitting into lines
   */
  private processChunk(chunk: string): void {
    this.buffer += chunk;
    const lines = this.buffer.split("\n");

    // Keep the last incomplete line in the buffer
    this.buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      const entry = parseLogLine(trimmed);
      this.onLine(trimmed, entry);

      // Check for events
      const event = parseEvent(trimmed);
      if (event && this.onEvent) {
        this.onEvent(event);
      }
    }
  }

  /**
   * Reads the last N lines from the log file (for initial display)
   * @param lineCount Number of lines to read
   * @returns Array of log entries
   */
  async readLastLines(lineCount = 100): Promise<ServerLogEntry[]> {
    const entries: ServerLogEntry[] = [];

    try {
      const handle = await open(this.filePath, "r");
      const stats = await handle.stat();
      const fileSize = stats.size;

      // Read in chunks from the end
      const chunkSize = Math.min(16384, fileSize); // 16KB chunks
      let position = Math.max(0, fileSize - chunkSize);
      let content = "";
      let lines: string[] = [];

      while (lines.length < lineCount && position >= 0) {
        const buffer = Buffer.alloc(Math.min(chunkSize, fileSize - position));
        await handle.read(buffer, 0, buffer.length, position);
        content = buffer.toString("utf-8") + content;
        lines = content.split("\n").filter((l) => l.trim());

        if (position === 0) break;
        position = Math.max(0, position - chunkSize);
      }

      await handle.close();

      // Take last N lines and parse them
      const lastLines = lines.slice(-lineCount);
      for (const line of lastLines) {
        entries.push(parseLogLine(line.trim()));
      }
    } catch {
      // File may not exist, return empty
    }

    return entries;
  }

  /** Whether the tailer is currently running */
  get isRunning(): boolean {
    return this.running;
  }
}
