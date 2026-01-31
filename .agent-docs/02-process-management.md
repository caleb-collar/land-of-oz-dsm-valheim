# 02 - Process Management

## Overview

This document covers managing the Valheim dedicated server process, including
spawning, monitoring, watchdog functionality, and graceful shutdown.

## Process Lifecycle

```
┌──────────────────────────────────────────────────────────────────┐
│                        Process States                             │
│                                                                  │
│   ┌─────────┐      start()      ┌──────────┐                    │
│   │ OFFLINE │──────────────────▶│ STARTING │                    │
│   └─────────┘                   └──────────┘                    │
│        ▲                              │                          │
│        │                              │ process ready            │
│        │                              ▼                          │
│        │ exit                    ┌──────────┐                    │
│        └─────────────────────────│  ONLINE  │◀──┐                │
│                                  └──────────┘   │                │
│        ▲                              │         │ watchdog       │
│        │                              │ stop()  │ restart        │
│        │                              ▼         │                │
│        │                        ┌───────────┐   │                │
│        └────────────────────────│ STOPPING  │───┘                │
│                                 └───────────┘                    │
│                                      │ crash                     │
│                                      ▼                           │
│                                 ┌───────────┐                    │
│                                 │ CRASHED   │                    │
│                                 └───────────┘                    │
└──────────────────────────────────────────────────────────────────┘
```

## Core Module: process.ts

```typescript
// src/server/process.ts
import path from "node:path";
import { spawn, ChildProcess } from "node:child_process";
import { getPlatform, getValheimPath } from "../utils/platform.ts";

export type ProcessState =
  | "offline"
  | "starting"
  | "online"
  | "stopping"
  | "crashed";

export type ProcessEvents = {
  onStateChange: (state: ProcessState) => void;
  onLog: (line: string) => void;
  onPlayerJoin: (name: string) => void;
  onPlayerLeave: (name: string) => void;
  onError: (error: Error) => void;
};

export type ServerConfig = {
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

export class ValheimProcess {
  private process: ChildProcess | null = null;
  private state: ProcessState = "offline";
  private events: ProcessEvents;
  private config: ServerConfig;

  constructor(config: ServerConfig, events: ProcessEvents) {
    this.config = config;
    this.events = events;
  }

  get pid(): number | null {
    return this.process?.pid ?? null;
  }

  get currentState(): ProcessState {
    return this.state;
  }

  private setState(newState: ProcessState) {
    this.state = newState;
    this.events.onStateChange(newState);
  }

  async start(): Promise<void> {
    if (this.state !== "offline" && this.state !== "crashed") {
      throw new Error(`Cannot start server in state: ${this.state}`);
    }

    this.setState("starting");

    const execPath = this.getExecutablePath();
    const args = this.buildArgs();

    try {
      this.process = spawn(execPath, args, {
        env: { ...process.env, ...this.getEnvironment() },
        stdio: ["ignore", "pipe", "pipe"],
      });

      this.streamOutput();

      // Wait for "Game server connected" log line
      // This indicates the server is ready
      // Timeout after 60 seconds

      this.setState("online");
    } catch (error) {
      this.setState("crashed");
      this.events.onError(error as Error);
      throw error;
    }
  }

  async stop(timeout = 30000): Promise<void> {
    if (this.state !== "online") {
      return;
    }

    this.setState("stopping");

    if (this.process) {
      // Send SIGTERM for graceful shutdown
      this.process.kill("SIGTERM");

      // Wait for exit or timeout
      await new Promise<void>((resolve) => {
        const timer = setTimeout(() => {
          // Timeout - force kill
          this.process?.kill("SIGKILL");
          resolve();
        }, timeout);

        this.process!.on("exit", () => {
          clearTimeout(timer);
          resolve();
        });
      });

      this.process = null;
    }

    this.setState("offline");
  }

  async kill(): Promise<void> {
    if (this.process) {
      this.process.kill("SIGKILL");
      this.process = null;
    }
    this.setState("offline");
  }

  private getExecutablePath(): string {
    const platform = getPlatform();
    const basePath = getValheimPath();

    switch (platform) {
      case "windows":
        return path.join(basePath, "valheim_server.exe");
      case "darwin":
      case "linux":
        return path.join(basePath, "valheim_server.x86_64");
    }
  }

  private buildArgs(): string[] {
    const args: string[] = [
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

  private getEnvironment(): Record<string, string> {
    const platform = getPlatform();
    const env: Record<string, string> = {};

    if (platform === "linux") {
      // Linux may need LD_LIBRARY_PATH for Steam runtime
      const steamRuntime = process.env.STEAM_RUNTIME;
      if (steamRuntime) {
        env["LD_LIBRARY_PATH"] = steamRuntime;
      }
    }

    return env;
  }

  private streamOutput(): void {
    if (!this.process) return;

    // Stream stdout
    this.process.stdout?.on("data", (data: Buffer) => {
      const lines = data.toString().split("\n");
      for (const line of lines) {
        if (line.trim()) {
          this.processLogLine(line);
        }
      }
    });

    // Stream stderr
    this.process.stderr?.on("data", (data: Buffer) => {
      const lines = data.toString().split("\n");
      for (const line of lines) {
        if (line.trim()) {
          this.processLogLine(line, true);
        }
      }
    });

    // Monitor exit
    this.process.on("exit", (code) => {
      if (code !== 0 && this.state === "online") {
        this.setState("crashed");
        this.events.onError(new Error(`Server exited with code ${code}`));
      }
    });
  }

  private processLogLine(line: string, isError = false): void {
    this.events.onLog(line);

    // Parse for player events
    const joinMatch = line.match(/Got character ZDOID from (\S+)/);
    if (joinMatch) {
      this.events.onPlayerJoin(joinMatch[1]);
    }

    const leaveMatch = line.match(/Closing socket (\S+)/);
    if (leaveMatch) {
      this.events.onPlayerLeave(leaveMatch[1]);
    }

    // Detect server ready
    if (line.includes("Game server connected")) {
      this.setState("online");
    }
  }
}
```

## Watchdog: watchdog.ts

```typescript
// src/server/watchdog.ts
import {
  ProcessEvents,
  ProcessState,
  ServerConfig,
  ValheimProcess,
} from "./process.ts";

export type WatchdogConfig = {
  enabled: boolean;
  maxRestarts: number;
  restartDelay: number; // ms before restart
  cooldownPeriod: number; // ms before resetting restart count
  backoffMultiplier: number; // delay multiplier per consecutive restart
};

export const defaultWatchdogConfig: WatchdogConfig = {
  enabled: true,
  maxRestarts: 5,
  restartDelay: 5000,
  cooldownPeriod: 300000, // 5 minutes
  backoffMultiplier: 2,
};

export class Watchdog {
  private process: ValheimProcess;
  private config: WatchdogConfig;
  private serverConfig: ServerConfig;
  private restartCount = 0;
  private lastCrashTime = 0;
  private restartTimer: number | null = null;
  private onLog: (message: string) => void;

  constructor(
    serverConfig: ServerConfig,
    watchdogConfig: WatchdogConfig = defaultWatchdogConfig,
    onLog: (message: string) => void = console.log,
  ) {
    this.serverConfig = serverConfig;
    this.config = watchdogConfig;
    this.onLog = onLog;

    const events: ProcessEvents = {
      onStateChange: this.handleStateChange.bind(this),
      onLog: (line) => this.onLog(line),
      onPlayerJoin: (name) => this.onLog(`Player joined: ${name}`),
      onPlayerLeave: (name) => this.onLog(`Player left: ${name}`),
      onError: (error) => this.onLog(`Error: ${error.message}`),
    };

    this.process = new ValheimProcess(serverConfig, events);
  }

  get serverProcess(): ValheimProcess {
    return this.process;
  }

  async start(): Promise<void> {
    await this.process.start();
  }

  async stop(): Promise<void> {
    // Cancel any pending restart
    if (this.restartTimer !== null) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }

    await this.process.stop();
  }

  private handleStateChange(state: ProcessState): void {
    if (state === "crashed" && this.config.enabled) {
      this.handleCrash();
    }
  }

  private handleCrash(): void {
    const now = Date.now();

    // Reset counter if cooldown has passed
    if (now - this.lastCrashTime > this.config.cooldownPeriod) {
      this.restartCount = 0;
    }

    this.lastCrashTime = now;
    this.restartCount++;

    if (this.restartCount > this.config.maxRestarts) {
      this.onLog(
        `Max restarts (${this.config.maxRestarts}) exceeded. Watchdog disabled.`,
      );
      return;
    }

    // Calculate delay with exponential backoff
    const delay =
      this.config.restartDelay *
      Math.pow(this.config.backoffMultiplier, this.restartCount - 1);

    this.onLog(
      `Server crashed. Restarting in ${delay / 1000}s ` +
        `(attempt ${this.restartCount}/${this.config.maxRestarts})`,
    );

    this.restartTimer = setTimeout(async () => {
      this.restartTimer = null;
      try {
        await this.process.start();
      } catch (error) {
        this.onLog(`Restart failed: ${(error as Error).message}`);
      }
    }, delay);
  }
}
```

## Log Parsing: logs.ts

```typescript
// src/server/logs.ts

export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogEntry = {
  timestamp: Date;
  level: LogLevel;
  message: string;
  raw: string;
};

export type ParsedEvent =
  | { type: "player_join"; name: string }
  | { type: "player_leave"; name: string }
  | { type: "world_saved" }
  | { type: "server_ready" }
  | { type: "server_shutdown" }
  | { type: "error"; message: string };

export function parseLogLine(line: string): LogEntry {
  const timestamp = new Date();
  let level: LogLevel = "info";
  let message = line.trim();

  // Valheim log format varies, but common patterns:
  // "02/15/2024 12:34:56: Message"
  // "(Filename: ... Line: 123)"
  // "ZNet: ... "

  if (line.includes("Error") || line.includes("Exception")) {
    level = "error";
  } else if (line.includes("Warning") || line.includes("WARN")) {
    level = "warn";
  } else if (line.includes("DEBUG") || line.includes("[Debug]")) {
    level = "debug";
  }

  // Try to extract timestamp from line
  const timestampMatch = line.match(
    /^(\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}): (.+)$/,
  );
  if (timestampMatch) {
    message = timestampMatch[2];
    // Could parse timestamp, but system time is usually accurate enough
  }

  return { timestamp, level, message, raw: line };
}

export function parseEvent(line: string): ParsedEvent | null {
  // Player join
  if (line.includes("Got character ZDOID from")) {
    const match = line.match(/Got character ZDOID from (\S+)/);
    if (match) {
      return { type: "player_join", name: match[1] };
    }
  }

  // Player leave
  if (line.includes("Destroying abandoned non persistent zdo")) {
    // This is a less reliable indicator, better to track socket closes
    return null;
  }

  if (line.includes("Closing socket")) {
    const match = line.match(/Closing socket (\d+\.\d+\.\d+\.\d+)/);
    if (match) {
      // We don't have the player name here, need to track by IP
      return null;
    }
  }

  // World saved
  if (line.includes("World saved")) {
    return { type: "world_saved" };
  }

  // Server ready
  if (line.includes("Game server connected")) {
    return { type: "server_ready" };
  }

  // Shutdown
  if (line.includes("OnApplicationQuit")) {
    return { type: "server_shutdown" };
  }

  return null;
}

export class LogBuffer {
  private entries: LogEntry[] = [];
  private maxSize: number;
  private subscribers: Set<(entry: LogEntry) => void> = new Set();

  constructor(maxSize = 1000) {
    this.maxSize = maxSize;
  }

  add(line: string): void {
    const entry = parseLogLine(line);
    this.entries.push(entry);

    // Trim if over max
    if (this.entries.length > this.maxSize) {
      this.entries = this.entries.slice(-this.maxSize);
    }

    // Notify subscribers
    for (const subscriber of this.subscribers) {
      subscriber(entry);
    }
  }

  getAll(): LogEntry[] {
    return [...this.entries];
  }

  getFiltered(level: LogLevel): LogEntry[] {
    return this.entries.filter((e) => e.level === level);
  }

  subscribe(callback: (entry: LogEntry) => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  clear(): void {
    this.entries = [];
  }
}
```

## Admin Commands: commands.ts

```typescript
// src/server/commands.ts

// Valheim doesn't have a built-in stdin command interface for dedicated servers.
// Admin commands are typically run via the in-game console when connected as admin.
// However, some automation can be done via file watching or mods.

export type AdminCommand = {
  name: string;
  description: string;
  requiresAdmin: boolean;
};

export const VALHEIM_COMMANDS: AdminCommand[] = [
  {
    name: "help",
    description: "Show available commands",
    requiresAdmin: false,
  },
  { name: "kick [name/ip]", description: "Kick a player", requiresAdmin: true },
  { name: "ban [name/ip]", description: "Ban a player", requiresAdmin: true },
  { name: "unban [ip]", description: "Unban a player", requiresAdmin: true },
  { name: "banned", description: "List banned players", requiresAdmin: true },
  { name: "save", description: "Force world save", requiresAdmin: true },
  { name: "info", description: "Show server info", requiresAdmin: false },
];

// For command execution, we can:
// 1. Manage admin/banned/permitted lists via file editing
// 2. Use RCON if enabled (requires setup on server)
// 3. Provide guidance for in-game console

export async function addToPermittedList(
  steamId: string,
  savedir: string,
): Promise<void> {
  const permittedPath = `${savedir}/permittedlist.txt`;
  const content = await Deno.readTextFile(permittedPath).catch(() => "");

  if (!content.includes(steamId)) {
    await Deno.writeTextFile(permittedPath, content + steamId + "\n");
  }
}

export async function addToAdminList(
  steamId: string,
  savedir: string,
): Promise<void> {
  const adminPath = `${savedir}/adminlist.txt`;
  const content = await Deno.readTextFile(adminPath).catch(() => "");

  if (!content.includes(steamId)) {
    await Deno.writeTextFile(adminPath, content + steamId + "\n");
  }
}

export async function addToBanList(
  steamId: string,
  savedir: string,
): Promise<void> {
  const banPath = `${savedir}/bannedlist.txt`;
  const content = await Deno.readTextFile(banPath).catch(() => "");

  if (!content.includes(steamId)) {
    await Deno.writeTextFile(banPath, content + steamId + "\n");
  }
}

export async function removeFromBanList(
  steamId: string,
  savedir: string,
): Promise<void> {
  const banPath = `${savedir}/bannedlist.txt`;
  const content = await Deno.readTextFile(banPath).catch(() => "");
  const lines = content.split("\n").filter((line) => line.trim() !== steamId);
  await Deno.writeTextFile(banPath, lines.join("\n"));
}

export async function getListContents(
  listType: "admin" | "banned" | "permitted",
  savedir: string,
): Promise<string[]> {
  const paths = {
    admin: `${savedir}/adminlist.txt`,
    banned: `${savedir}/bannedlist.txt`,
    permitted: `${savedir}/permittedlist.txt`,
  };

  const content = await Deno.readTextFile(paths[listType]).catch(() => "");
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("//"));
}
```

## Error Handling

```typescript
// Common errors and handling

export class ServerError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly recoverable: boolean = true,
  ) {
    super(message);
    this.name = "ServerError";
  }
}

export const Errors = {
  EXECUTABLE_NOT_FOUND: new ServerError(
    "Valheim server executable not found. Run 'oz-valheim install' first.",
    "EXEC_NOT_FOUND",
    false,
  ),
  ALREADY_RUNNING: new ServerError(
    "Server is already running.",
    "ALREADY_RUNNING",
    true,
  ),
  PORT_IN_USE: new ServerError(
    "Port is already in use by another process.",
    "PORT_IN_USE",
    true,
  ),
  STEAMCMD_NOT_FOUND: new ServerError(
    "SteamCMD not found. Enable auto-install or install manually.",
    "STEAMCMD_NOT_FOUND",
    false,
  ),
  WORLD_NOT_FOUND: new ServerError(
    "Specified world file not found.",
    "WORLD_NOT_FOUND",
    true,
  ),
};
```

## Graceful Shutdown

```typescript
// main.ts - Signal handling
import { Watchdog } from "./src/server/watchdog.ts";

function setupShutdownHandlers(watchdog: Watchdog): void {
  const shutdown = async () => {
    console.log("\nShutting down...");
    await watchdog.stop();
    process.exit(0);
  };

  // Handle SIGINT (Ctrl+C)
  process.on("SIGINT", shutdown);

  // Handle SIGTERM (kill command)
  process.on("SIGTERM", shutdown);
}
```
