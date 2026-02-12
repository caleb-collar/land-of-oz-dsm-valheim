/**
 * Valheim dedicated server process management
 * Handles starting, stopping, and monitoring the server process
 * Supports detached mode where the server runs independently of the TUI
 */

import { type ChildProcess, spawn } from "node:child_process";
import { createWriteStream, type WriteStream } from "node:fs";
import { getSteamPaths, getValheimExecutablePath } from "../steamcmd/mod.js";
import { getPlatform } from "../utils/platform.js";
import { type ParsedEvent, parseEvent } from "./logs.js";
import { LogTailer } from "./logTail.js";
import {
  ensureLogsDir,
  getServerLogFile,
  isProcessRunning,
  type PidFileData,
  writePidFile,
} from "./pidfile.js";

/** Server process states */
export type ProcessState =
  | "offline"
  | "starting"
  | "online"
  | "stopping"
  | "crashed";

/** Event handlers for server process events */
export type ProcessEvents = {
  onStateChange: (state: ProcessState) => void;
  onLog: (line: string) => void;
  onPlayerJoin: (name: string) => void;
  onPlayerLeave: (name: string) => void;
  onError: (error: Error) => void;
  onEvent?: (event: ParsedEvent) => void;
};

/** Server configuration for launching Valheim */
export type ServerLaunchConfig = {
  name: string;
  port: number;
  world: string;
  password: string;
  public: boolean;
  crossplay: boolean;
  savedir?: string;
  logFile?: string;
  saveinterval?: number;
  backups?: number;
  /**
   * Run server in detached mode (independent of TUI)
   * When detached, server output goes to a log file instead of the TUI
   */
  detached?: boolean;
};

/** Default event handlers that do nothing */
const defaultEvents: ProcessEvents = {
  onStateChange: () => {},
  onLog: () => {},
  onPlayerJoin: () => {},
  onPlayerLeave: () => {},
  onError: () => {},
};

/**
 * Wrapper for the Valheim dedicated server process
 * Manages lifecycle, output streaming, and event detection
 * Supports both attached (piped) and detached (log file) modes
 */
export class ValheimProcess {
  private process: ChildProcess | null = null;
  private state: ProcessState = "offline";
  private events: ProcessEvents;
  private config: ServerLaunchConfig;
  private startTime: Date | null = null;
  private logFileStream: WriteStream | null = null;
  private logTailer: LogTailer | null = null;
  private _logFilePath: string | null = null;
  private _isDetached: boolean = false;
  /** PID for detached processes (when we don't have a direct handle) */
  private _detachedPid: number | null = null;
  /** Interval for monitoring detached process status */
  private _monitorInterval: ReturnType<typeof setInterval> | null = null;

  /**
   * Creates a new Valheim process wrapper
   * @param config Server launch configuration
   * @param events Event handlers for process events
   */
  constructor(config: ServerLaunchConfig, events: Partial<ProcessEvents> = {}) {
    this.config = config;
    this.events = { ...defaultEvents, ...events };
  }

  /** Gets the process ID if running, null otherwise */
  get pid(): number | null {
    return this.process?.pid ?? this._detachedPid ?? null;
  }

  /** Gets the current process state */
  get currentState(): ProcessState {
    return this.state;
  }

  /** Gets the server start time, or null if not running */
  get uptime(): Date | null {
    return this.startTime;
  }

  /** Gets the log file path (for detached mode) */
  get logFilePath(): string | null {
    return this._logFilePath;
  }

  /** Whether the server is running in detached mode */
  get isDetached(): boolean {
    return this._isDetached;
  }

  /**
   * Updates the process state and notifies listeners
   * @param newState New process state
   */
  private setState(newState: ProcessState): void {
    this.state = newState;
    this.events.onStateChange(newState);
  }

  /**
   * Starts the Valheim server process
   * @throws Error if server cannot be started or is already running
   */
  async start(): Promise<void> {
    if (this.state !== "offline" && this.state !== "crashed") {
      throw new Error(`Cannot start server in state: ${this.state}`);
    }

    this.setState("starting");
    this.startTime = new Date();
    this._isDetached = this.config.detached ?? false;

    const execPath = getValheimExecutablePath();
    const args = this.buildArgs();
    const env = this.getEnvironment();

    try {
      if (this._isDetached) {
        await this.startDetached(execPath, args, env);
      } else {
        await this.startAttached(execPath, args, env);
      }
    } catch (error) {
      this.setState("crashed");
      this.startTime = null;
      this.events.onError(error as Error);
      throw error;
    }
  }

  /**
   * Starts the server in attached mode (piped stdout/stderr)
   */
  private async startAttached(
    execPath: string,
    args: string[],
    env: Record<string, string>
  ): Promise<void> {
    this.process = spawn(execPath, args, {
      stdio: ["ignore", "pipe", "pipe"],
      env,
    });

    this.streamOutput();

    // Handle spawn errors
    this.process.on("error", (error) => {
      this.setState("crashed");
      this.startTime = null;
      this.events.onError(error);
    });

    // Yield to allow the process to start
    await Promise.resolve();
  }

  /**
   * Starts the server in detached mode (log file output, independent process)
   */
  private async startDetached(
    execPath: string,
    args: string[],
    env: Record<string, string>
  ): Promise<void> {
    // Ensure logs directory exists
    await ensureLogsDir();
    this._logFilePath = getServerLogFile(this.startTime!);

    // Create write stream for log file
    this.logFileStream = createWriteStream(this._logFilePath, { flags: "a" });

    // Write startup header to log
    const header = `\n${"=".repeat(60)}\nServer starting at ${this.startTime!.toISOString()}\nWorld: ${this.config.world} | Port: ${this.config.port}\n${"=".repeat(60)}\n`;
    this.logFileStream.write(header);

    // Spawn as detached process
    const platform = getPlatform();
    this.process = spawn(execPath, args, {
      stdio: ["ignore", "pipe", "pipe"],
      env,
      detached: true,
    });

    // Pipe stdout/stderr to log file
    if (this.process.stdout) {
      this.process.stdout.pipe(this.logFileStream, { end: false });
    }
    if (this.process.stderr) {
      this.process.stderr.pipe(this.logFileStream, { end: false });
    }

    // Also stream to our event handlers via the log tailer
    this.logTailer = new LogTailer(
      this._logFilePath,
      (line, _entry) => {
        this.events.onLog(line);
      },
      {
        onEvent: (event) => this.handleEvent(event),
        fromEnd: false, // Read from where we started
      }
    );

    // Start tailing (won't see immediate output until it's flushed to file)
    await this.logTailer.start(false);

    // Handle spawn errors
    this.process.on("error", (error) => {
      this.setState("crashed");
      this.startTime = null;
      this.events.onError(error);
    });

    // Save PID immediately
    const pid = this.process.pid;
    if (pid) {
      await writePidFile({
        pid,
        startedAt: this.startTime!.toISOString(),
        world: this.config.world,
        port: this.config.port,
        logFile: this._logFilePath,
        detached: true,
        serverName: this.config.name,
      });
    }

    // Unref the process so Node.js can exit without waiting for it
    this.process.unref();

    // On Windows, we also need to unref the stdio streams
    if (platform === "windows") {
      if (
        this.process.stdout &&
        typeof (this.process.stdout as unknown as { unref?: () => void })
          .unref === "function"
      ) {
        (this.process.stdout as unknown as { unref: () => void }).unref();
      }
      if (
        this.process.stderr &&
        typeof (this.process.stderr as unknown as { unref?: () => void })
          .unref === "function"
      ) {
        (this.process.stderr as unknown as { unref: () => void }).unref();
      }
    }

    // Monitor for process exit (though in detached mode this may not fire)
    this.process.on("exit", (code, signal) => {
      const exitCode = code ?? (signal ? 1 : 0);
      if (
        exitCode !== 0 &&
        (this.state === "online" || this.state === "starting")
      ) {
        this.startTime = null;
        this.setState("crashed");
        this.events.onError(new Error(`Server exited with code ${exitCode}`));
      }
    });

    // Yield to allow the process to start
    await Promise.resolve();
  }

  /**
   * Handles a parsed event from log output
   */
  private handleEvent(event: ParsedEvent): void {
    this.events.onEvent?.(event);

    switch (event.type) {
      case "player_join":
        this.events.onPlayerJoin(event.name);
        break;
      case "player_leave":
        this.events.onPlayerLeave(event.name);
        break;
      case "server_ready":
        if (this.state === "starting") {
          this.setState("online");
        }
        break;
      case "error":
        this.events.onError(new Error(event.message));
        break;
    }
  }

  /**
   * Attaches to an already-running detached server
   * @param pidData PID file data for the running server
   */
  async attach(pidData: PidFileData): Promise<void> {
    if (this.state !== "offline" && this.state !== "crashed") {
      throw new Error(`Cannot attach in state: ${this.state}`);
    }

    if (!isProcessRunning(pidData.pid)) {
      throw new Error(`Server process ${pidData.pid} is not running`);
    }

    this._isDetached = true;
    this._detachedPid = pidData.pid;
    this._logFilePath = pidData.logFile ?? null;
    this.startTime = new Date(pidData.startedAt);

    // Start tailing the log file if available
    if (this._logFilePath) {
      this.logTailer = new LogTailer(
        this._logFilePath,
        (line, _entry) => {
          this.events.onLog(line);
        },
        {
          onEvent: (event) => this.handleEvent(event),
          pollMs: 500,
        }
      );

      // Load recent log history
      const history = await this.logTailer.readLastLines(50);
      for (const entry of history) {
        this.events.onLog(entry.raw);
      }

      // Start tailing from end
      await this.logTailer.start(true);
    }

    // Start monitoring process status
    this.startProcessMonitor();

    // Assume online if process is running (we may miss the startup phase)
    this.setState("online");
  }

  /**
   * Monitors a detached process for exit
   */
  private startProcessMonitor(): void {
    const checkInterval = setInterval(() => {
      const pid = this._detachedPid;
      if (pid && !isProcessRunning(pid)) {
        clearInterval(checkInterval);
        this._detachedPid = null;
        this.startTime = null;
        this.setState("crashed");
        this.events.onError(new Error("Server process exited unexpectedly"));
      }
    }, 2000);

    this._monitorInterval = checkInterval;
  }

  /**
   * Gracefully stops the server with optional timeout
   * @param timeout Maximum time to wait for graceful shutdown (ms)
   */
  async stop(timeout = 30000): Promise<void> {
    if (this.state !== "online" && this.state !== "starting") {
      return;
    }

    this.setState("stopping");

    // Clean up log tailer and monitor
    await this.cleanup();

    // Handle detached process via PID
    if (this._isDetached && this._detachedPid) {
      const platform = getPlatform();
      try {
        process.kill(this._detachedPid, "SIGTERM");
      } catch {
        // Process may have already exited
      }

      // Wait for process to exit
      const startTime = Date.now();
      while (
        isProcessRunning(this._detachedPid) &&
        Date.now() - startTime < timeout
      ) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      // Force kill if still running
      if (isProcessRunning(this._detachedPid)) {
        try {
          process.kill(
            this._detachedPid,
            platform === "windows" ? "SIGTERM" : "SIGKILL"
          );
        } catch {
          // Ignore
        }
      }

      this._detachedPid = null;
      this.startTime = null;
      this.setState("offline");
      return;
    }

    // Handle attached process
    if (this.process) {
      // Send SIGTERM for graceful shutdown
      // On Windows, this terminates the process
      try {
        this.process.kill("SIGTERM");
      } catch {
        // Process may have already exited
      }

      // Wait for exit or timeout
      const exitPromise = new Promise<number | null>((resolve) => {
        this.process!.once("exit", (code) => resolve(code));
      });
      const timeoutPromise = new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), timeout)
      );

      const result = await Promise.race([exitPromise, timeoutPromise]);

      if (result === null && this.process.exitCode === null) {
        // Timeout - force kill
        try {
          this.process.kill("SIGKILL");
        } catch {
          // Process may have already exited
        }
      }

      this.process = null;
    }

    this.startTime = null;
    this.setState("offline");
  }

  /**
   * Immediately kills the server process
   */
  async kill(): Promise<void> {
    // Clean up log tailer and monitor
    await this.cleanup();

    // Handle detached process via PID
    if (this._isDetached && this._detachedPid) {
      const platform = getPlatform();
      try {
        process.kill(
          this._detachedPid,
          platform === "windows" ? "SIGTERM" : "SIGKILL"
        );
      } catch {
        // Process may have already exited
      }
      this._detachedPid = null;
    }

    // Handle attached process
    if (this.process) {
      try {
        this.process.kill("SIGKILL");
      } catch {
        // Process may have already exited
      }
      this.process = null;
    }

    this.startTime = null;
    this.setState("offline");
    await Promise.resolve();
  }

  /**
   * Detaches from a running server without stopping it
   * Only valid for servers started in detached mode
   */
  async detach(): Promise<void> {
    if (!this._isDetached) {
      throw new Error("Cannot detach from non-detached server");
    }

    await this.cleanup();

    // Don't change state or stop the server - just disconnect
    this.process = null;
    this._detachedPid = null;
  }

  /**
   * Cleans up resources (log tailer, monitor interval, log file stream)
   */
  private async cleanup(): Promise<void> {
    // Stop monitor interval
    if (this._monitorInterval) {
      clearInterval(this._monitorInterval);
      this._monitorInterval = null;
    }

    // Stop log tailer
    if (this.logTailer) {
      await this.logTailer.stop();
      this.logTailer = null;
    }

    // Close log file stream
    if (this.logFileStream) {
      this.logFileStream.end();
      this.logFileStream = null;
    }
  }

  /**
   * Builds command line arguments for Valheim server
   * @returns Array of command line arguments
   */
  private buildArgs(): string[] {
    const args: string[] = [
      "-nographics",
      "-batchmode",
      "-name",
      this.config.name,
      "-port",
      String(this.config.port),
      "-world",
      this.config.world,
      "-password",
      this.config.password,
      "-public",
      this.config.public ? "1" : "0",
    ];

    if (this.config.crossplay) {
      args.push("-crossplay");
    }

    if (this.config.savedir) {
      args.push("-savedir", this.config.savedir);
    }

    if (this.config.logFile) {
      args.push("-logFile", this.config.logFile);
    }

    if (this.config.saveinterval) {
      args.push("-saveinterval", String(this.config.saveinterval));
    }

    if (this.config.backups) {
      args.push("-backups", String(this.config.backups));
    }

    return args;
  }

  /**
   * Gets environment variables for the server process
   * @returns Environment variable map
   */
  private getEnvironment(): Record<string, string> {
    const platform = getPlatform();
    const env: Record<string, string> = {};

    // Copy existing env vars, filtering out undefined values
    for (const [key, value] of Object.entries(process.env)) {
      if (value !== undefined) {
        env[key] = value;
      }
    }

    if (platform === "linux") {
      // Linux needs LD_LIBRARY_PATH for Steam runtime libraries
      const { valheimDir } = getSteamPaths();
      const ldPath = process.env.LD_LIBRARY_PATH;
      env.LD_LIBRARY_PATH = ldPath
        ? `${valheimDir}/linux64:${ldPath}`
        : `${valheimDir}/linux64`;
    }

    // Set SteamAppId for Valheim
    env.SteamAppId = "892970"; // Valheim game ID (not dedicated server ID)

    return env;
  }

  /**
   * Streams stdout and stderr from the server process
   * Parses output for events and notifies listeners
   */
  private streamOutput(): void {
    if (!this.process) return;

    // Stream stdout
    if (this.process.stdout) {
      let buffer = "";
      this.process.stdout.on("data", (chunk: Buffer) => {
        buffer += chunk.toString();
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.trim()) {
            this.processLogLine(line);
          }
        }
      });
    }

    // Stream stderr
    if (this.process.stderr) {
      let buffer = "";
      this.process.stderr.on("data", (chunk: Buffer) => {
        buffer += chunk.toString();
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.trim()) {
            this.processLogLine(line, true);
          }
        }
      });
    }

    // Monitor for process exit
    this.process.on("exit", (code, signal) => {
      const exitCode = code ?? (signal ? 1 : 0);
      if (exitCode !== 0 && this.state === "online") {
        this.startTime = null;
        this.setState("crashed");
        this.events.onError(new Error(`Server exited with code ${exitCode}`));
      } else if (this.state === "starting") {
        // Server exited during startup
        this.startTime = null;
        this.setState("crashed");
        this.events.onError(
          new Error(`Server failed to start (exit code ${exitCode})`)
        );
      }
    });
  }

  /**
   * Processes a single log line from the server
   * Detects events and triggers appropriate handlers
   * @param line Log line to process
   * @param _isError Whether the line came from stderr
   */
  private processLogLine(line: string, _isError = false): void {
    // Always send to log handler
    this.events.onLog(line);

    // Parse for events
    const event = parseEvent(line);
    if (event) {
      this.events.onEvent?.(event);

      switch (event.type) {
        case "player_join":
          this.events.onPlayerJoin(event.name);
          break;
        case "player_leave":
          this.events.onPlayerLeave(event.name);
          break;
        case "server_ready":
          if (this.state === "starting") {
            this.setState("online");
          }
          break;
        case "error":
          this.events.onError(new Error(event.message));
          break;
      }
    }
  }
}
