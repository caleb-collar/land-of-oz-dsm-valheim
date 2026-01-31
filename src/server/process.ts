/**
 * Valheim dedicated server process management
 * Handles starting, stopping, and monitoring the server process
 */

import { getPlatform } from "../utils/platform.ts";
import { getSteamPaths, getValheimExecutablePath } from "../steamcmd/mod.ts";
import { type ParsedEvent, parseEvent } from "./logs.ts";

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
 */
export class ValheimProcess {
  private process: Deno.ChildProcess | null = null;
  private state: ProcessState = "offline";
  private events: ProcessEvents;
  private config: ServerLaunchConfig;
  private startTime: Date | null = null;

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
    return this.process?.pid ?? null;
  }

  /** Gets the current process state */
  get currentState(): ProcessState {
    return this.state;
  }

  /** Gets the server start time, or null if not running */
  get uptime(): Date | null {
    return this.startTime;
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

    const execPath = getValheimExecutablePath();
    const args = this.buildArgs();
    const env = this.getEnvironment();

    try {
      const command = new Deno.Command(execPath, {
        args,
        stdout: "piped",
        stderr: "piped",
        env,
      });

      this.process = command.spawn();
      this.streamOutput();

      // Note: The server is considered "online" when we see "Game server connected"
      // This is handled in processLogLine(), so we don't set online here
      // Yield to allow the process to start
      await Promise.resolve();
    } catch (error) {
      this.setState("crashed");
      this.startTime = null;
      this.events.onError(error as Error);
      throw error;
    }
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

    if (this.process) {
      // Send SIGTERM for graceful shutdown
      // On Windows, this sends CTRL_BREAK_EVENT
      try {
        this.process.kill("SIGTERM");
      } catch {
        // Process may have already exited
      }

      // Wait for exit or timeout
      const exitPromise = this.process.status;
      const timeoutPromise = new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), timeout)
      );

      const result = await Promise.race([exitPromise, timeoutPromise]);

      if (result === null) {
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
    const env: Record<string, string> = { ...Deno.env.toObject() };

    if (platform === "linux") {
      // Linux needs LD_LIBRARY_PATH for Steam runtime libraries
      const { valheimDir } = getSteamPaths();
      const ldPath = Deno.env.get("LD_LIBRARY_PATH");
      env["LD_LIBRARY_PATH"] = ldPath
        ? `${valheimDir}/linux64:${ldPath}`
        : `${valheimDir}/linux64`;
    }

    // Set SteamAppId for Valheim
    env["SteamAppId"] = "892970"; // Valheim game ID (not dedicated server ID)

    return env;
  }

  /**
   * Streams stdout and stderr from the server process
   * Parses output for events and notifies listeners
   */
  private streamOutput(): void {
    if (!this.process) return;

    const decoder = new TextDecoder();

    // Stream stdout
    (async () => {
      try {
        const reader = this.process!.stdout.getReader();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (line.trim()) {
              this.processLogLine(line);
            }
          }
        }
      } catch {
        // Reader was released, process ended
      }
    })();

    // Stream stderr
    (async () => {
      try {
        const reader = this.process!.stderr.getReader();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (line.trim()) {
              this.processLogLine(line, true);
            }
          }
        }
      } catch {
        // Reader was released, process ended
      }
    })();

    // Monitor for process exit
    this.process.status.then((status) => {
      if (!status.success && this.state === "online") {
        this.startTime = null;
        this.setState("crashed");
        this.events.onError(
          new Error(`Server exited with code ${status.code}`),
        );
      } else if (this.state === "starting") {
        // Server exited during startup
        this.startTime = null;
        this.setState("crashed");
        this.events.onError(
          new Error(`Server failed to start (exit code ${status.code})`),
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
