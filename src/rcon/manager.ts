/**
 * RCON Manager
 * Singleton manager for persistent RCON connections with auto-reconnect,
 * player polling, and high-level Valheim command wrappers
 */

import { createLogger } from "../utils/logger.js";
import { RconClient } from "./client.js";
import type {
  ConnectionState,
  RconManagerCallbacks,
  RconManagerConfig,
} from "./types.js";

const log = createLogger("rcon-manager");

/**
 * Manages a persistent RCON connection with auto-reconnect and polling
 */
class RconManager {
  private client: RconClient | null = null;
  private config: RconManagerConfig | null = null;
  private callbacks: RconManagerCallbacks | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private state: ConnectionState = "disconnected";

  /**
   * Initialize the manager with config and callbacks
   * Can be called multiple times to reconfigure
   */
  initialize(config: RconManagerConfig, callbacks: RconManagerCallbacks): void {
    // If already connected with the same config, skip
    if (
      this.config &&
      this.config.host === config.host &&
      this.config.port === config.port &&
      this.config.password === config.password &&
      this.isConnected()
    ) {
      this.callbacks = callbacks;
      return;
    }

    // Disconnect existing connection
    this.disconnect();

    this.config = config;
    this.callbacks = callbacks;
  }

  /**
   * Connect to the RCON server
   */
  async connect(): Promise<void> {
    if (!this.config) {
      log.warn("Cannot connect: not initialized");
      return;
    }

    if (!this.config.enabled) {
      log.info("RCON is disabled");
      return;
    }

    if (this.isConnected()) {
      return;
    }

    this.setState("connecting");

    try {
      this.client = new RconClient({
        host: this.config.host,
        port: this.config.port,
        password: this.config.password,
        timeout: this.config.timeout,
      });

      await this.client.connect();
      this.setState("connected");
      log.info("RCON connected");

      // Start polling for player list
      this.startPolling();
    } catch (error) {
      log.error("RCON connection failed", { error: String(error) });
      this.setState("error");
      this.client = null;

      // Schedule reconnect if enabled
      if (this.config.autoReconnect) {
        this.scheduleReconnect();
      }
    }
  }

  /**
   * Disconnect from the RCON server
   */
  disconnect(): void {
    this.stopPolling();
    this.clearReconnect();

    if (this.client) {
      try {
        this.client.disconnect();
      } catch {
        // Ignore disconnect errors
      }
      this.client = null;
    }

    this.setState("disconnected");
  }

  /**
   * Check if currently connected
   */
  isConnected(): boolean {
    return this.client?.isConnected() ?? false;
  }

  // ─── Player Management ───────────────────────────────────────────

  /** Kick a player by name */
  async kickPlayer(playerName: string): Promise<string | null> {
    return this.sendCommand(`kick ${playerName}`);
  }

  /** Ban a player by name */
  async banPlayer(playerName: string): Promise<string | null> {
    return this.sendCommand(`ban ${playerName}`);
  }

  /** Unban a player */
  async unbanPlayer(playerIdentifier: string): Promise<string | null> {
    return this.sendCommand(`unban ${playerIdentifier}`);
  }

  /** Get list of banned players */
  async getBannedPlayers(): Promise<string[]> {
    const response = await this.sendCommand("banned");
    if (!response) return [];
    return response
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  }

  // ─── Event Management ────────────────────────────────────────────

  /** Trigger a specific event */
  async triggerEvent(eventKey: string): Promise<string | null> {
    return this.sendCommand(`randomevent ${eventKey}`);
  }

  /** Trigger a random event */
  async triggerRandomEvent(): Promise<string | null> {
    return this.sendCommand("randomevent");
  }

  /** Stop the current event */
  async stopEvent(): Promise<string | null> {
    return this.sendCommand("stopevent");
  }

  // ─── Global Keys ─────────────────────────────────────────────────

  /** List all active global keys */
  async listGlobalKeys(): Promise<string[]> {
    const response = await this.sendCommand("listkeys");
    if (!response) return [];
    return response
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  }

  /** Set a global key */
  async setGlobalKey(keyName: string): Promise<string | null> {
    return this.sendCommand(`setkey ${keyName}`);
  }

  /** Remove a global key */
  async removeGlobalKey(keyName: string): Promise<string | null> {
    return this.sendCommand(`removekey ${keyName}`);
  }

  /** Reset all global keys */
  async resetGlobalKeys(): Promise<string | null> {
    return this.sendCommand("resetkeys");
  }

  // ─── Time Control ────────────────────────────────────────────────

  /** Sleep (skip to morning) */
  async sleep(): Promise<string | null> {
    return this.sendCommand("sleep");
  }

  /** Skip time by seconds */
  async skipTime(seconds: number): Promise<string | null> {
    return this.sendCommand(`skiptime ${seconds}`);
  }

  // ─── Server Info ─────────────────────────────────────────────────

  /** Get server information */
  async getServerInfo(): Promise<string | null> {
    return this.sendCommand("info");
  }

  /** Ping the server */
  async pingServer(): Promise<string | null> {
    return this.sendCommand("ping");
  }

  // ─── Misc ────────────────────────────────────────────────────────

  /** Remove all drops from the world */
  async removeDrops(): Promise<string | null> {
    return this.sendCommand("removedrops");
  }

  // ─── Internal ────────────────────────────────────────────────────

  /** Send a command, returning the response or null on error */
  private async sendCommand(command: string): Promise<string | null> {
    if (!this.client?.isConnected()) {
      log.warn(`Cannot send command "${command}": not connected`);
      return null;
    }

    try {
      return await this.client.send(command);
    } catch (error) {
      log.error(`Command failed: ${command}`, { error: String(error) });

      // Connection may have been lost
      if (!this.client.isConnected()) {
        this.setState("disconnected");
        this.client = null;

        if (this.config?.autoReconnect) {
          this.scheduleReconnect();
        }
      }

      return null;
    }
  }

  /** Update connection state and notify callback */
  private setState(state: ConnectionState): void {
    if (this.state === state) return;
    this.state = state;
    this.callbacks?.onConnectionStateChange(state);
  }

  /** Start polling for player list updates */
  private startPolling(): void {
    this.stopPolling();

    const interval = this.callbacks?.pollInterval ?? 10000;
    this.pollTimer = setInterval(async () => {
      if (!this.isConnected()) return;

      try {
        const response = await this.client!.send("players");
        const players = this.parsePlayers(response);
        this.callbacks?.onPlayerListUpdate(players);
      } catch {
        // Polling failure — connection may be lost
        if (!this.client?.isConnected()) {
          this.stopPolling();
          this.setState("disconnected");
          this.client = null;
          if (this.config?.autoReconnect) {
            this.scheduleReconnect();
          }
        }
      }
    }, interval);
  }

  /** Stop player list polling */
  private stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  /** Schedule a reconnect attempt */
  private scheduleReconnect(): void {
    this.clearReconnect();
    this.reconnectTimer = setTimeout(() => {
      log.info("Attempting RCON reconnect...");
      this.connect().catch(() => {
        // Reconnect failed, will be rescheduled in connect()
      });
    }, 5000);
  }

  /** Clear scheduled reconnect */
  private clearReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /** Parse player names from server response */
  private parsePlayers(response: string): string[] {
    if (!response || response.trim().length === 0) return [];

    return response
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && line !== "Players:");
  }
}

/** Singleton RCON manager instance */
export const rconManager = new RconManager();
