/**
 * Configuration schemas using Zod for validation
 * Defines all configuration types for the Valheim DSM
 */

import { z } from "zod";

// Valheim difficulty presets
export const PresetSchema = z.enum([
  "normal",
  "casual",
  "easy",
  "hard",
  "hardcore",
  "immersive",
  "hammer",
]);

// Combat difficulty modifier
export const CombatModifierSchema = z.enum([
  "veryeasy",
  "easy",
  "default",
  "hard",
  "veryhard",
]);

// Death penalty modifier
export const DeathPenaltySchema = z.enum([
  "casual",
  "veryeasy",
  "easy",
  "default",
  "hard",
  "hardcore",
]);

// Resource rate modifier
export const ResourceModifierSchema = z.enum([
  "muchless",
  "less",
  "default",
  "more",
  "muchmore",
  "most",
]);

// Portal mode
export const PortalModeSchema = z.enum([
  "default",
  "casual",
  "hard",
  "veryhard",
]);

// Server modifiers configuration
export const ModifiersSchema = z.object({
  combat: CombatModifierSchema.default("default"),
  deathpenalty: DeathPenaltySchema.default("default"),
  resources: ResourceModifierSchema.default("default"),
  raids: z.boolean().default(true),
  portals: PortalModeSchema.default("default"),
});

// World configuration
export const WorldSchema = z.object({
  name: z.string().min(1).max(64),
  seed: z.string().optional(),
  saveDir: z.string().optional(),
});

// Server configuration
export const ServerConfigSchema = z.object({
  // Required settings
  name: z
    .string()
    .min(1, "Server name is required")
    .max(64, "Server name too long")
    .default("Land of OZ Valheim"),

  port: z
    .number()
    .int()
    .min(1024, "Port must be >= 1024")
    .max(65535, "Port must be <= 65535")
    .default(2456),

  // Password: empty means no password, otherwise min 5 chars
  password: z
    .string()
    .max(64, "Password too long")
    .refine(
      (val) => val === "" || val.length >= 5,
      "Password must be empty or at least 5 characters"
    )
    .default(""),

  world: z
    .string()
    .min(1, "World name is required")
    .max(64, "World name too long")
    .default("Dedicated"),

  // Optional settings
  public: z.boolean().default(false),
  crossplay: z.boolean().default(false),

  // Paths
  savedir: z.string().optional(),
  logFile: z.string().optional(),

  // Save settings
  saveinterval: z.number().int().min(60).max(7200).default(1800), // 30 minutes

  backups: z.number().int().min(1).max(100).default(4),

  backupshort: z.number().int().min(60).max(86400).default(7200), // 2 hours

  backuplong: z.number().int().min(3600).max(604800).default(43200), // 12 hours

  // Difficulty
  preset: PresetSchema.optional(),
  modifiers: ModifiersSchema.default(() => ModifiersSchema.parse({})),
});

// Watchdog configuration
export const WatchdogConfigSchema = z.object({
  enabled: z.boolean().default(true),
  maxRestarts: z.number().int().min(0).max(100).default(5),
  restartDelay: z.number().int().min(1000).max(300000).default(5000),
  cooldownPeriod: z.number().int().min(60000).max(3600000).default(300000),
  backoffMultiplier: z.number().min(1).max(10).default(2),
});

// TUI settings
export const TuiConfigSchema = z.object({
  colorScheme: z.enum(["dark", "light", "auto"]).default("dark"),
  animationsEnabled: z.boolean().default(true),
  logMaxLines: z.number().int().min(10).max(1000).default(100),
  refreshRate: z.number().int().min(100).max(5000).default(1000),
});

// RCON (Remote Console) configuration
export const RconConfigSchema = z.object({
  enabled: z.boolean().default(true),
  port: z
    .number()
    .int()
    .min(1024, "Port must be >= 1024")
    .max(65535, "Port must be <= 65535")
    .default(25575),
  password: z.string().default("valheim-rcon"),
  timeout: z.number().int().min(1000).max(60000).default(5000),
  autoReconnect: z.boolean().default(true),
});

// Complete app configuration
export const AppConfigSchema = z.object({
  version: z.number().int().default(1),
  server: ServerConfigSchema.default(() => ServerConfigSchema.parse({})),
  watchdog: WatchdogConfigSchema.default(() => WatchdogConfigSchema.parse({})),
  tui: TuiConfigSchema.default(() => TuiConfigSchema.parse({})),
  rcon: RconConfigSchema.default(() => RconConfigSchema.parse({})),
  worlds: z.array(WorldSchema).default([]),
  activeWorld: z.string().nullable().default(null),
  /** World names that have been configured but not yet generated (no files exist) */
  pendingWorlds: z.array(z.string()).default([]),
  steamcmdAutoInstall: z.boolean().default(true),
  autoUpdate: z.boolean().default(true),
  lastUpdated: z.string().datetime().optional(),
});

// Type exports
export type Preset = z.infer<typeof PresetSchema>;
export type CombatModifier = z.infer<typeof CombatModifierSchema>;
export type DeathPenalty = z.infer<typeof DeathPenaltySchema>;
export type ResourceModifier = z.infer<typeof ResourceModifierSchema>;
export type PortalMode = z.infer<typeof PortalModeSchema>;
export type Modifiers = z.infer<typeof ModifiersSchema>;
export type World = z.infer<typeof WorldSchema>;
export type ServerConfig = z.infer<typeof ServerConfigSchema>;
export type WatchdogConfig = z.infer<typeof WatchdogConfigSchema>;
export type TuiConfig = z.infer<typeof TuiConfigSchema>;
export type RconConfig = z.infer<typeof RconConfigSchema>;
export type AppConfig = z.infer<typeof AppConfigSchema>;
