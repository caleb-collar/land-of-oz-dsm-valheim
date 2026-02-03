/**
 * RCON Manager Singleton
 * Manages RCON connection lifecycle, auto-reconnection, and player list polling
 */

import { RconClient } from "./client.js";
import type { RconConfig } from "./types.js";

/** RCON connection state */
export type RconManagerState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

/** Callback for connection state changes */
export type ConnectionStateCallback = (state: RconManagerState) => void;

/** Callback for player list updates */
export type PlayerListCallback = (players: string[]) => void;

/** RCON manager options */
type RconManagerOptions = {
  onConnectionStateChange?: ConnectionStateCallback;
  onPlayerListUpdate?: PlayerListCallback;
  pollInterval?: number; // How often to poll for player list (ms)
};

/**
 * Global RCON manager singleton
 * Handles connection lifecycle and player list polling
 */
class RconManager {
  private client: RconClient | null = null;
  private config: RconConfig | null = null;
  private state: RconManagerState = "disconnected";
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 5000; // 5 seconds
  private pollInterval = 10000; // 10 seconds
  private onConnectionStateChange: ConnectionStateCallback | null = null;
  private onPlayerListUpdate: PlayerListCallback | null = null;
  private lastKnownPlayers: string[] = [];
  private enabled = false;

  /**
   * Initialize the RCON manager
   * @param config RCON configuration
   * @param options Optional callbacks and settings
   */
  initialize(
    config: RconConfig & { enabled: boolean },
    options: RconManagerOptions = {}
  ): void {
    this.config = config;
    this.enabled = config.enabled;
    this.onConnectionStateChange = options.onConnectionStateChange ?? null;
    this.onPlayerListUpdate = options.onPlayerListUpdate ?? null;
    if (options.pollInterval) {
      this.pollInterval = options.pollInterval;
    }

    // Auto-connect if enabled
    if (this.enabled) {
      this.connect();
    }
  }

  /**
   * Connect to RCON server
   */
  async connect(): Promise<boolean> {
    if (!this.config || !this.enabled) {
      return false;
    }

    if (this.state === "connected" || this.state === "connecting") {
      return true;
    }

    this.setState("connecting");
    this.reconnectAttempts = 0;

    try {
      this.client = new RconClient({
        host: "localhost",
        port: this.config.port,
        password: this.config.password,
        timeout: this.config.timeout,
      });

      await this.client.connect();
      this.setState("connected");
      this.reconnectAttempts = 0;

      // Start polling for player list
      this.startPlayerListPolling();

      return true;
    } catch (_error) {
      this.setState("error");
      this.client = null;

      // Schedule reconnect if auto-reconnect is enabled
      if (this.config.autoReconnect && this.enabled) {
        this.scheduleReconnect();
      }

      return false;
    }
  }

  /**
   * Disconnect from RCON server
   */
  disconnect(): void {
    this.enabled = false;
    this.clearTimers();

    if (this.client) {
      this.client.disconnect();
      this.client = null;
    }

    this.setState("disconnected");
    this.lastKnownPlayers = [];
  }

  /**
   * Send a command to the RCON server
   * @param command Command to send
   * @returns Response from server, or null if not connected
   */
  async send(command: string): Promise<string | null> {
    if (!this.client || this.state !== "connected") {
      return null;
    }

    try {
      const response = await this.client.send(command);
      return response;
    } catch (_error) {
      // Connection lost, attempt reconnect
      this.setState("error");
      if (this.config?.autoReconnect && this.enabled) {
        this.scheduleReconnect();
      }
      return null;
    }
  }

  /**
   * Get the current player list from the server
   * @returns Array of player names, or empty array if unavailable
   */
  async getPlayerList(): Promise<string[]> {
    const response = await this.send("status");
    if (!response) {
      return [];
    }

    // Parse player list from status response
    // Valheim status format varies, try to extract player names
    const players = this.parsePlayerList(response);
    return players;
  }

  /**
   * Parse player names from status command response
   * @param statusText Raw status response from server
   * @returns Array of player names
   */
  private parsePlayerList(statusText: string): string[] {
    const players: string[] = [];
    const lines = statusText.split("\n");

    // Look for lines that indicate connected players
    // Format may vary: "X player(s)" or list of names
    for (const line of lines) {
      // Try to match player names - this is heuristic
      // Valheim's status command returns player count and names
      if (line.includes("players:")) {
        // Extract names after "players:"
        const match = line.match(/players:\s*(.+)/);
        if (match?.[1]) {
          const names = match[1]
            .split(",")
            .map((n) => n.trim())
            .filter((n) => n.length > 0);
          players.push(...names);
        }
      }
    }

    return players;
  }

  /**
   * Start polling for player list updates
   */
  private startPlayerListPolling(): void {
    this.stopPlayerListPolling();

    this.pollTimer = setInterval(async () => {
      if (this.state !== "connected") {
        return;
      }

      const players = await this.getPlayerList();

      // Check if player list changed
      if (this.hasPlayerListChanged(players)) {
        this.lastKnownPlayers = players;
        if (this.onPlayerListUpdate) {
          this.onPlayerListUpdate(players);
        }
      }
    }, this.pollInterval);
  }

  /**
   * Stop polling for player list
   */
  private stopPlayerListPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  /**
   * Check if player list has changed
   */
  private hasPlayerListChanged(newPlayers: string[]): boolean {
    if (newPlayers.length !== this.lastKnownPlayers.length) {
      return true;
    }

    const sorted1 = [...newPlayers].sort();
    const sorted2 = [...this.lastKnownPlayers].sort();

    return !sorted1.every((name, i) => name === sorted2[i]);
  }

  /**
   * Schedule a reconnect attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      // Max attempts reached, stop trying
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * this.reconnectAttempts;

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      await this.connect();
    }, delay);
  }

  /**
   * Update the connection state and notify listeners
   */
  private setState(newState: RconManagerState): void {
    if (this.state === newState) {
      return;
    }

    this.state = newState;

    if (this.onConnectionStateChange) {
      this.onConnectionStateChange(newState);
    }
  }

  /**
   * Clear all timers
   */
  private clearTimers(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.stopPlayerListPolling();
  }

  /**
   * Get the current connection state
   */
  getState(): RconManagerState {
    return this.state;
  }

  /**
   * Check if RCON is connected
   */
  isConnected(): boolean {
    return this.state === "connected";
  }

  /**
   * Get the last known player list
   */
  getLastKnownPlayers(): string[] {
    return [...this.lastKnownPlayers];
  }

  /**
   * Kick a player from the server
   * @param playerName Player name to kick
   * @returns Response message
   */
  async kickPlayer(playerName: string): Promise<string | null> {
    return this.send(`kick ${playerName}`);
  }

  /**
   * Ban a player from the server
   * @param playerName Player name to ban
   * @returns Response message
   */
  async banPlayer(playerName: string): Promise<string | null> {
    return this.send(`ban ${playerName}`);
  }

  /**
   * Unban a player
   * @param playerName Player name to unban
   * @returns Response message
   */
  async unbanPlayer(playerName: string): Promise<string | null> {
    return this.send(`unban ${playerName}`);
  }

  /**
   * Get list of banned players
   * @returns Array of banned player names/IDs
   */
  async getBannedPlayers(): Promise<string[]> {
    const response = await this.send("banned");
    if (!response) return [];
    // Parse banned list from response
    return response.split("\n").filter((line) => line.trim().length > 0);
  }

  /**
   * Get server information
   * @returns Server info response
   */
  async getServerInfo(): Promise<string | null> {
    return this.send("info");
  }

  /**
   * Ping the server
   * @returns Ping response
   */
  async pingServer(): Promise<string | null> {
    return this.send("ping");
  }

  /**
   * Trigger a random event
   * @param eventName Event name (e.g., "army_eikthyr")
   * @returns Response message
   */
  async triggerEvent(eventName: string): Promise<string | null> {
    return this.send(`event ${eventName}`);
  }

  /**
   * Trigger a random event
   * @returns Response message
   */
  async triggerRandomEvent(): Promise<string | null> {
    return this.send("randomevent");
  }

  /**
   * Stop the current event
   * @returns Response message
   */
  async stopEvent(): Promise<string | null> {
    return this.send("stopevent");
  }

  /**
   * Skip time by specified seconds
   * @param seconds Number of seconds to skip
   * @returns Response message
   */
  async skipTime(seconds: number): Promise<string | null> {
    return this.send(`skiptime ${seconds}`);
  }

  /**
   * Sleep through the night
   * @returns Response message
   */
  async sleep(): Promise<string | null> {
    return this.send("sleep");
  }

  /**
   * Remove all dropped items from the world
   * @returns Response message
   */
  async removeDrops(): Promise<string | null> {
    return this.send("removedrops");
  }

  /**
   * Set a global key
   * @param key Global key name
   * @returns Response message
   */
  async setGlobalKey(key: string): Promise<string | null> {
    return this.send(`setkey ${key}`);
  }

  /**
   * Remove a global key
   * @param key Global key name
   * @returns Response message
   */
  async removeGlobalKey(key: string): Promise<string | null> {
    return this.send(`removekey ${key}`);
  }

  /**
   * Reset all global keys
   * @returns Response message
   */
  async resetGlobalKeys(): Promise<string | null> {
    return this.send("resetkeys");
  }

  /**
   * List all global keys
   * @returns Array of global key names
   */
  async listGlobalKeys(): Promise<string[]> {
    const response = await this.send("listkeys");
    if (!response) return [];
    // Parse keys from response
    return response.split("\n").filter((line) => line.trim().length > 0);
  }

  /**
   * Set LOD bias (0-5, lower = better performance)
   * @param value LOD bias value
   * @returns Response message
   */
  async setLodBias(value: number): Promise<string | null> {
    return this.send(`lodbias ${value}`);
  }

  /**
   * Set LOD distance (100-6000)
   * @param value LOD distance value
   * @returns Response message
   */
  async setLodDistance(value: number): Promise<string | null> {
    return this.send(`loddist ${value}`);
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.disconnect();
  }
}

// Singleton instance
const rconManager = new RconManager();

export { rconManager };
