# 04 - Configuration Management

## Overview

Configuration is stored using Deno KV for persistent key-value storage, with Zod
schemas for validation. This enables type-safe configuration with automatic
persistence.

## Storage Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Configuration Flow                          │
│                                                                 │
│   ┌──────────────┐     ┌──────────────┐     ┌────────────────┐  │
│   │ TUI/CLI      │────▶│ Config Store │────▶│ Deno KV        │  │
│   │ (user input) │     │ (validation) │     │ (persistence)  │  │
│   └──────────────┘     └──────────────┘     └────────────────┘  │
│                              │                                  │
│                              ▼                                  │
│                        ┌──────────────┐                         │
│                        │ Zod Schema   │                         │
│                        │ (validation) │                         │
│                        └──────────────┘                         │
└─────────────────────────────────────────────────────────────────┘
```

## Configuration Schema

```typescript
// src/config/schema.ts
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

// Server modifiers
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

  password: z
    .string()
    .min(5, "Password must be at least 5 characters")
    .max(64, "Password too long")
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
  modifiers: ModifiersSchema.default({}),
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

// Complete app configuration
export const AppConfigSchema = z.object({
  version: z.number().int().default(1),
  server: ServerConfigSchema.default({}),
  watchdog: WatchdogConfigSchema.default({}),
  tui: TuiConfigSchema.default({}),
  worlds: z.array(WorldSchema).default([]),
  activeWorld: z.string().nullable().default(null),
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
export type AppConfig = z.infer<typeof AppConfigSchema>;
```

## Default Values

```typescript
// src/config/defaults.ts
import type { AppConfig } from "./schema.ts";

export const defaultConfig: AppConfig = {
  version: 1,
  server: {
    name: "Land of OZ Valheim",
    port: 2456,
    password: "",
    world: "Dedicated",
    public: false,
    crossplay: false,
    saveinterval: 1800,
    backups: 4,
    backupshort: 7200,
    backuplong: 43200,
    modifiers: {
      combat: "default",
      deathpenalty: "default",
      resources: "default",
      raids: true,
      portals: "default",
    },
  },
  watchdog: {
    enabled: true,
    maxRestarts: 5,
    restartDelay: 5000,
    cooldownPeriod: 300000,
    backoffMultiplier: 2,
  },
  tui: {
    colorScheme: "dark",
    animationsEnabled: true,
    logMaxLines: 100,
    refreshRate: 1000,
  },
  worlds: [],
  activeWorld: null,
  steamcmdAutoInstall: true,
  autoUpdate: true,
};
```

## Deno KV Store

```typescript
// src/config/store.ts
import { join } from "@std/path";
import { ensureDir } from "@std/fs";
import { type AppConfig, AppConfigSchema } from "./schema.ts";
import { defaultConfig } from "./defaults.ts";
import { getConfigDir } from "../utils/platform.ts";

const CONFIG_KEY = ["oz-valheim", "config"];

let kv: Deno.Kv | null = null;

async function getKv(): Promise<Deno.Kv> {
  if (kv) return kv;

  const configDir = join(getConfigDir(), "oz-valheim");
  await ensureDir(configDir);

  const dbPath = join(configDir, "config.db");
  kv = await Deno.openKv(dbPath);
  return kv;
}

export async function loadConfig(): Promise<AppConfig> {
  const db = await getKv();
  const result = await db.get<AppConfig>(CONFIG_KEY);

  if (!result.value) {
    // Initialize with defaults
    await saveConfig(defaultConfig);
    return defaultConfig;
  }

  // Validate and merge with defaults for any missing fields
  try {
    const validated = AppConfigSchema.parse(result.value);
    return validated;
  } catch (error) {
    console.warn("Config validation failed, using defaults:", error);
    return defaultConfig;
  }
}

export async function saveConfig(config: AppConfig): Promise<void> {
  // Validate before saving
  const validated = AppConfigSchema.parse(config);

  const db = await getKv();
  await db.set(CONFIG_KEY, validated);
}

export async function updateConfig(
  partial: Partial<AppConfig>,
): Promise<AppConfig> {
  const current = await loadConfig();
  const updated = { ...current, ...partial };
  await saveConfig(updated);
  return updated;
}

export async function updateServerConfig(
  partial: Partial<AppConfig["server"]>,
): Promise<AppConfig> {
  const current = await loadConfig();
  const updated = {
    ...current,
    server: { ...current.server, ...partial },
  };
  await saveConfig(updated);
  return updated;
}

export async function resetConfig(): Promise<AppConfig> {
  await saveConfig(defaultConfig);
  return defaultConfig;
}

export async function closeConfig(): Promise<void> {
  if (kv) {
    kv.close();
    kv = null;
  }
}

// World management helpers
export async function addWorld(world: AppConfig["worlds"][0]): Promise<void> {
  const config = await loadConfig();
  const exists = config.worlds.some((w) => w.name === world.name);

  if (!exists) {
    config.worlds.push(world);
    await saveConfig(config);
  }
}

export async function removeWorld(name: string): Promise<void> {
  const config = await loadConfig();
  config.worlds = config.worlds.filter((w) => w.name !== name);

  if (config.activeWorld === name) {
    config.activeWorld = null;
  }

  await saveConfig(config);
}

export async function setActiveWorld(name: string | null): Promise<void> {
  const config = await loadConfig();

  if (name !== null) {
    const exists = config.worlds.some((w) => w.name === name);
    if (!exists) {
      throw new Error(`World "${name}" not found`);
    }
  }

  config.activeWorld = name;
  await saveConfig(config);
}
```

## Module Exports

```typescript
// src/config/mod.ts
export {
  type AppConfig,
  AppConfigSchema,
  type Modifiers,
  type Preset,
  PresetSchema,
  type ServerConfig,
  ServerConfigSchema,
  type TuiConfig,
  TuiConfigSchema,
  type WatchdogConfig,
  WatchdogConfigSchema,
  type World,
  WorldSchema,
} from "./schema.ts";

export { defaultConfig } from "./defaults.ts";

export {
  addWorld,
  closeConfig,
  loadConfig,
  removeWorld,
  resetConfig,
  saveConfig,
  setActiveWorld,
  updateConfig,
  updateServerConfig,
} from "./store.ts";
```

## TUI Integration

```typescript
// src/tui/hooks/useConfig.ts
import { useCallback, useEffect, useState } from "react";
import { type AppConfig, loadConfig, updateConfig } from "../../config/mod.ts";
import { useStore } from "../store.ts";

export function useConfig() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const storeConfig = useStore((s) => s.config);
  const setStoreConfig = useStore((s) => s.actions.updateConfig);

  // Load config on mount
  useEffect(() => {
    loadConfig()
      .then((config) => {
        setStoreConfig(config.server);
        setLoading(false);
      })
      .catch((err) => {
        setError(err);
        setLoading(false);
      });
  }, []);

  // Save config changes
  const save = useCallback(async (updates: Partial<AppConfig["server"]>) => {
    try {
      const current = await loadConfig();
      const newConfig = {
        ...current,
        server: { ...current.server, ...updates },
      };
      await updateConfig(newConfig);
      setStoreConfig(updates);
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, []);

  return {
    config: storeConfig,
    loading,
    error,
    save,
  };
}
```

## Settings Panel Component

```typescript
// Example Settings UI component
import React, { FC, useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { useConfig } from "../hooks/useConfig.ts";

type SettingField = {
  key: string;
  label: string;
  type: "text" | "number" | "boolean";
  description?: string;
};

const SERVER_FIELDS: SettingField[] = [
  { key: "name", label: "Server Name", type: "text" },
  { key: "port", label: "Port", type: "number" },
  { key: "password", label: "Password", type: "text" },
  { key: "world", label: "World Name", type: "text" },
  { key: "public", label: "Public Server", type: "boolean" },
  { key: "crossplay", label: "Crossplay", type: "boolean" },
];

export const SettingsPanel: FC = () => {
  const { config, save, loading } = useConfig();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState("");

  useInput((input, key) => {
    if (loading) return;

    if (!editing) {
      if (key.upArrow || input === "k") {
        setSelectedIndex((i) => Math.max(0, i - 1));
      }
      if (key.downArrow || input === "j") {
        setSelectedIndex((i) => Math.min(SERVER_FIELDS.length - 1, i + 1));
      }
      if (key.return || input === " ") {
        const field = SERVER_FIELDS[selectedIndex];
        if (field.type === "boolean") {
          // Toggle boolean
          const currentValue = config[field.key as keyof typeof config];
          save({ [field.key]: !currentValue });
        } else {
          // Enter edit mode
          setEditValue(String(config[field.key as keyof typeof config] ?? ""));
          setEditing(true);
        }
      }
    }
  });

  const handleEditSubmit = async (value: string) => {
    const field = SERVER_FIELDS[selectedIndex];
    const parsed = field.type === "number" ? Number(value) : value;
    await save({ [field.key]: parsed });
    setEditing(false);
  };

  if (loading) {
    return <Text dimColor>Loading configuration...</Text>;
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>Server Settings</Text>
      <Box marginTop={1} flexDirection="column">
        {SERVER_FIELDS.map((field, index) => (
          <Box key={field.key}>
            <Text
              color={selectedIndex === index ? "cyan" : "white"}
              bold={selectedIndex === index}
            >
              {selectedIndex === index ? "▶ " : "  "}
              {field.label}:
            </Text>
            <Box marginLeft={1}>
              {editing && selectedIndex === index
                ? (
                  <TextInput
                    value={editValue}
                    onChange={setEditValue}
                    onSubmit={handleEditSubmit}
                  />
                )
                : (
                  <Text dimColor>
                    {field.type === "boolean"
                      ? config[field.key as keyof typeof config] ? "Yes" : "No"
                      : String(config[field.key as keyof typeof config] ?? "")}
                  </Text>
                )}
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
};
```

## Config Migration

```typescript
// src/config/migration.ts
import { type AppConfig } from "./schema.ts";

type MigrationFn = (config: Record<string, unknown>) => Record<string, unknown>;

const migrations: Record<number, MigrationFn> = {
  // Version 1 -> 2 example
  2: (config) => {
    // Example: rename a field
    return {
      ...config,
      // newField: config.oldField,
      version: 2,
    };
  },
};

export function migrateConfig(config: Record<string, unknown>): AppConfig {
  let current = config;
  const currentVersion = (config.version as number) || 1;
  const targetVersion = Math.max(
    ...Object.keys(migrations).map(Number),
    currentVersion,
  );

  for (let v = currentVersion + 1; v <= targetVersion; v++) {
    const migration = migrations[v];
    if (migration) {
      current = migration(current);
    }
  }

  return current as AppConfig;
}
```

## CLI Config Command

```typescript
// src/cli/commands/config.ts
import { loadConfig, resetConfig, saveConfig } from "../../config/mod.ts";

export async function configCommand(args: {
  get?: string;
  set?: string;
  value?: string;
  list?: boolean;
  reset?: boolean;
}): Promise<void> {
  if (args.reset) {
    await resetConfig();
    console.log("Configuration reset to defaults.");
    return;
  }

  const config = await loadConfig();

  if (args.list) {
    console.log(JSON.stringify(config, null, 2));
    return;
  }

  if (args.get) {
    const value = getNestedValue(config, args.get);
    console.log(value !== undefined ? JSON.stringify(value) : "Not found");
    return;
  }

  if (args.set && args.value !== undefined) {
    const updated = setNestedValue(config, args.set, parseValue(args.value));
    await saveConfig(updated);
    console.log(`Set ${args.set} = ${args.value}`);
    return;
  }

  console.log(
    "Usage: oz-valheim config [--list] [--get <key>] [--set <key> --value <value>] [--reset]",
  );
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path
    .split(".")
    .reduce((o, k) => (o as Record<string, unknown>)?.[k], obj);
}

function setNestedValue(
  obj: Record<string, unknown>,
  path: string,
  value: unknown,
): Record<string, unknown> {
  const clone = JSON.parse(JSON.stringify(obj));
  const parts = path.split(".");
  const last = parts.pop()!;
  const target = parts.reduce(
    (o, k) => (o as Record<string, unknown>)[k] as Record<string, unknown>,
    clone,
  );
  target[last] = value;
  return clone;
}

function parseValue(value: string): unknown {
  if (value === "true") return true;
  if (value === "false") return false;
  if (/^\d+$/.test(value)) return parseInt(value, 10);
  if (/^\d+\.\d+$/.test(value)) return parseFloat(value);
  return value;
}
```
