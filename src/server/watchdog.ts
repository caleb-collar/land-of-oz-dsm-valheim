/**
 * Watchdog for Valheim server crash detection and auto-restart
 * Provides automatic recovery with exponential backoff
 */

import {
  type ProcessEvents,
  type ProcessState,
  type ServerLaunchConfig,
  ValheimProcess,
} from "./process.ts";
import { type ParsedEvent } from "./logs.ts";

/** Server watchdog configuration */
export type ServerWatchdogConfig = {
  /** Whether watchdog is enabled */
  enabled: boolean;
  /** Maximum number of restarts before giving up */
  maxRestarts: number;
  /** Base delay before restart (ms) */
  restartDelay: number;
  /** Time period before resetting restart count (ms) */
  cooldownPeriod: number;
  /** Multiplier for exponential backoff */
  backoffMultiplier: number;
};

/** Default watchdog configuration */
export const defaultWatchdogConfig: ServerWatchdogConfig = {
  enabled: true,
  maxRestarts: 5,
  restartDelay: 5000, // 5 seconds
  cooldownPeriod: 300000, // 5 minutes
  backoffMultiplier: 2,
};

/** Extended events for watchdog */
export type WatchdogEvents = {
  onStateChange: (state: ProcessState) => void;
  onLog: (line: string) => void;
  onPlayerJoin: (name: string) => void;
  onPlayerLeave: (name: string) => void;
  onError: (error: Error) => void;
  onEvent?: (event: ParsedEvent) => void;
  onWatchdogRestart: (attempt: number, maxAttempts: number) => void;
  onWatchdogMaxRestarts: () => void;
};

/** Default watchdog event handlers */
const defaultWatchdogEvents: WatchdogEvents = {
  onStateChange: () => {},
  onLog: () => {},
  onPlayerJoin: () => {},
  onPlayerLeave: () => {},
  onError: () => {},
  onWatchdogRestart: () => {},
  onWatchdogMaxRestarts: () => {},
};

/**
 * Watchdog wrapper for ValheimProcess
 * Provides automatic crash recovery with exponential backoff
 */
export class Watchdog {
  private process: ValheimProcess;
  private config: ServerWatchdogConfig;
  private serverConfig: ServerLaunchConfig;
  private events: WatchdogEvents;

  private restartCount = 0;
  private lastCrashTime = 0;
  private restartTimer: number | null = null;
  private isManualStop = false;

  /**
   * Creates a new watchdog wrapper
   * @param serverConfig Server launch configuration
   * @param watchdogConfig Watchdog configuration
   * @param events Event handlers
   */
  constructor(
    serverConfig: ServerLaunchConfig,
    watchdogConfig: Partial<ServerWatchdogConfig> = {},
    events: Partial<WatchdogEvents> = {},
  ) {
    this.serverConfig = serverConfig;
    this.config = { ...defaultWatchdogConfig, ...watchdogConfig };
    this.events = { ...defaultWatchdogEvents, ...events };

    // Create internal event handlers that wrap user events
    const processEvents: ProcessEvents = {
      onStateChange: (state) => {
        this.events.onStateChange(state);
        this.handleStateChange(state);
      },
      onLog: (line) => this.events.onLog(line),
      onPlayerJoin: (name) => this.events.onPlayerJoin(name),
      onPlayerLeave: (name) => this.events.onPlayerLeave(name),
      onError: (error) => this.events.onError(error),
      onEvent: (event) => this.events.onEvent?.(event),
    };

    this.process = new ValheimProcess(serverConfig, processEvents);
  }

  /** Gets the underlying Valheim process */
  get serverProcess(): ValheimProcess {
    return this.process;
  }

  /** Gets the current process state */
  get currentState(): ProcessState {
    return this.process.currentState;
  }

  /** Gets the current restart count */
  get currentRestartCount(): number {
    return this.restartCount;
  }

  /** Checks if watchdog is enabled */
  get isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Starts the Valheim server
   * @throws Error if server cannot be started
   */
  async start(): Promise<void> {
    this.isManualStop = false;
    await this.process.start();
  }

  /**
   * Gracefully stops the server
   * Cancels any pending restart attempts
   * @param timeout Maximum time to wait for graceful shutdown (ms)
   */
  async stop(timeout?: number): Promise<void> {
    this.isManualStop = true;

    // Cancel any pending restart
    if (this.restartTimer !== null) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }

    await this.process.stop(timeout);
  }

  /**
   * Immediately kills the server
   * Cancels any pending restart attempts
   */
  async kill(): Promise<void> {
    this.isManualStop = true;

    if (this.restartTimer !== null) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }

    await this.process.kill();
  }

  /**
   * Updates watchdog configuration
   * @param config Partial configuration to update
   */
  updateConfig(config: Partial<ServerWatchdogConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Resets the restart counter
   */
  resetRestartCount(): void {
    this.restartCount = 0;
    this.lastCrashTime = 0;
  }

  /**
   * Handles process state changes
   * Triggers restart on crash if watchdog is enabled
   */
  private handleStateChange(state: ProcessState): void {
    if (state === "crashed" && this.config.enabled && !this.isManualStop) {
      this.handleCrash();
    } else if (state === "online") {
      // Server is stable, check if we should reset counter
      const timeSinceCrash = Date.now() - this.lastCrashTime;
      if (timeSinceCrash > this.config.cooldownPeriod) {
        this.restartCount = 0;
      }
    }
  }

  /**
   * Handles a server crash
   * Schedules restart with exponential backoff
   */
  private handleCrash(): void {
    const now = Date.now();

    // Reset counter if cooldown has passed since last crash
    if (now - this.lastCrashTime > this.config.cooldownPeriod) {
      this.restartCount = 0;
    }

    this.lastCrashTime = now;
    this.restartCount++;

    // Check if we've exceeded max restarts
    if (this.restartCount > this.config.maxRestarts) {
      this.events.onWatchdogMaxRestarts();
      return;
    }

    // Calculate delay with exponential backoff
    const delay = this.config.restartDelay *
      Math.pow(this.config.backoffMultiplier, this.restartCount - 1);

    this.events.onWatchdogRestart(this.restartCount, this.config.maxRestarts);

    // Schedule restart
    this.restartTimer = setTimeout(async () => {
      this.restartTimer = null;
      try {
        // Create new process instance with same config
        const processEvents: ProcessEvents = {
          onStateChange: (state) => {
            this.events.onStateChange(state);
            this.handleStateChange(state);
          },
          onLog: (line) => this.events.onLog(line),
          onPlayerJoin: (name) => this.events.onPlayerJoin(name),
          onPlayerLeave: (name) => this.events.onPlayerLeave(name),
          onError: (error) => this.events.onError(error),
          onEvent: (event) => this.events.onEvent?.(event),
        };

        this.process = new ValheimProcess(this.serverConfig, processEvents);
        await this.process.start();
      } catch (error) {
        this.events.onError(
          new Error(`Restart failed: ${(error as Error).message}`),
        );
      }
    }, delay);
  }
}
