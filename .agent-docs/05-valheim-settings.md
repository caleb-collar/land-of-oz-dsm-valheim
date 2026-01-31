# 05 - Valheim Server Settings

## Overview

This document covers all Valheim dedicated server settings, their CLI arguments,
and how they're exposed in the DSM.

## Command Line Arguments

Valheim dedicated server accepts these arguments:

| Argument        | Type      | Description                      | Default          |
| --------------- | --------- | -------------------------------- | ---------------- |
| `-name`         | string    | Server name displayed in browser | Required         |
| `-port`         | number    | Server port                      | 2456             |
| `-world`        | string    | World name (file to load)        | Required         |
| `-password`     | string    | Server password (min 5 chars)    | Required         |
| `-savedir`      | path      | Custom save directory            | Default location |
| `-public`       | 0/1       | List on public server browser    | 0                |
| `-logFile`      | path      | Log file output path             | stdout           |
| `-saveinterval` | number    | Save interval in seconds         | 1800             |
| `-backups`      | number    | Number of backup saves           | 4                |
| `-backupshort`  | number    | Short backup interval (seconds)  | 7200             |
| `-backuplong`   | number    | Long backup interval (seconds)   | 43200            |
| `-crossplay`    | flag      | Enable crossplay support         | off              |
| `-preset`       | enum      | Difficulty preset                | none             |
| `-modifier`     | key value | Difficulty modifiers             | default          |
| `-setkey`       | string    | Set world key                    | none             |
| `-instanceid`   | number    | Instance ID for multiple servers | auto             |

## Difficulty Presets

Available `-preset` values:

| Preset      | Description                    |
| ----------- | ------------------------------ |
| `normal`    | Default Valheim experience     |
| `casual`    | Easier, fewer penalties        |
| `easy`      | Reduced damage, easier enemies |
| `hard`      | Increased difficulty           |
| `hardcore`  | Permadeath, harsh penalties    |
| `immersive` | No map, portals restricted     |
| `hammer`    | Build mode, no enemies         |

## Difficulty Modifiers

The `-modifier` argument accepts key-value pairs:

### Combat

```bash
-modifier combat veryeasy  # Enemies deal 50% damage, have 50% HP
-modifier combat easy      # Enemies deal 75% damage, have 75% HP
-modifier combat hard      # Enemies deal 150% damage, have 150% HP
-modifier combat veryhard  # Enemies deal 200% damage, have 200% HP
```

### Death Penalty

```bash
-modifier deathpenalty casual    # No skill loss
-modifier deathpenalty veryeasy  # 5% skill loss
-modifier deathpenalty easy      # 10% skill loss
-modifier deathpenalty hard      # 15% skill loss
-modifier deathpenalty hardcore  # 20% skill loss, delete world on all deaths
```

### Resources

```bash
-modifier resources muchless  # 25% drop rate
-modifier resources less      # 50% drop rate
-modifier resources more      # 150% drop rate
-modifier resources muchmore  # 200% drop rate
-modifier resources most      # 300% drop rate
```

### Raids

```bash
-modifier raids none    # No enemy raids
-modifier raids muchless
-modifier raids less
-modifier raids more
-modifier raids muchmore
```

### Portals

```bash
-modifier portals casual   # Everything through portals
-modifier portals hard     # Nothing through portals
-modifier portals veryhard # No portals at all
```

## Argument Builder

```typescript
// src/valheim/args.ts
import type { Modifiers, ServerConfig } from "../config/schema.ts";

export function buildServerArgs(config: ServerConfig): string[] {
  const args: string[] = [];

  // Required arguments
  args.push("-name", config.name);
  args.push("-port", String(config.port));
  args.push("-world", config.world);
  args.push("-password", config.password);

  // Boolean as 0/1
  args.push("-public", config.public ? "1" : "0");

  // Optional paths
  if (config.savedir) {
    args.push("-savedir", config.savedir);
  }

  if (config.logFile) {
    args.push("-logFile", config.logFile);
  }

  // Save settings
  if (config.saveinterval) {
    args.push("-saveinterval", String(config.saveinterval));
  }

  if (config.backups) {
    args.push("-backups", String(config.backups));
  }

  if (config.backupshort) {
    args.push("-backupshort", String(config.backupshort));
  }

  if (config.backuplong) {
    args.push("-backuplong", String(config.backuplong));
  }

  // Crossplay (flag only, no value)
  if (config.crossplay) {
    args.push("-crossplay");
  }

  // Preset
  if (config.preset) {
    args.push("-preset", config.preset);
  }

  // Modifiers
  if (config.modifiers) {
    const modifierArgs = buildModifierArgs(config.modifiers);
    args.push(...modifierArgs);
  }

  return args;
}

function buildModifierArgs(modifiers: Modifiers): string[] {
  const args: string[] = [];

  if (modifiers.combat && modifiers.combat !== "default") {
    args.push("-modifier", "combat", modifiers.combat);
  }

  if (modifiers.deathpenalty && modifiers.deathpenalty !== "default") {
    args.push("-modifier", "deathpenalty", modifiers.deathpenalty);
  }

  if (modifiers.resources && modifiers.resources !== "default") {
    args.push("-modifier", "resources", modifiers.resources);
  }

  if (modifiers.raids === false) {
    args.push("-modifier", "raids", "none");
  }

  if (modifiers.portals && modifiers.portals !== "default") {
    args.push("-modifier", "portals", modifiers.portals);
  }

  return args;
}
```

## World Files

### World File Structure

Valheim worlds consist of two files:

- `<worldname>.db` - World data (terrain, structures, etc.)
- `<worldname>.fwl` - World metadata (seed, world keys, etc.)

### Default Save Locations

| Platform | Path                                                                |
| -------- | ------------------------------------------------------------------- |
| Windows  | `%USERPROFILE%\AppData\LocalLow\IronGate\Valheim\worlds_local`      |
| Linux    | `~/.config/unity3d/IronGate/Valheim/worlds_local`                   |
| macOS    | `~/Library/Application Support/unity.IronGate.Valheim/worlds_local` |

### World Management

```typescript
// src/valheim/worlds.ts
import path from "node:path";
import fs from "node:fs/promises";
import { getPlatform } from "../utils/platform.ts";

export type WorldInfo = {
  name: string;
  dbPath: string;
  fwlPath: string;
  size: number;
  modified: Date;
};

export function getDefaultWorldsDir(): string {
  const platform = getPlatform();
  const home = process.env.HOME ?? process.env.USERPROFILE ?? "";

  switch (platform) {
    case "windows":
      return path.join(
        home,
        "AppData",
        "LocalLow",
        "IronGate",
        "Valheim",
        "worlds_local",
      );
    case "darwin":
      return path.join(
        home,
        "Library",
        "Application Support",
        "unity.IronGate.Valheim",
        "worlds_local",
      );
    default:
      return path.join(
        home,
        ".config",
        "unity3d",
        "IronGate",
        "Valheim",
        "worlds_local",
      );
  }
}

export async function listWorlds(worldsDir?: string): Promise<WorldInfo[]> {
  const dir = worldsDir ?? getDefaultWorldsDir();
  const worlds: WorldInfo[] = [];

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith(".db")) {
        const name = entry.name.replace(".db", "");
        const dbPath = path.join(dir, entry.name);
        const fwlPath = path.join(dir, `${name}.fwl`);

        // Check if .fwl exists
        try {
          await fs.access(fwlPath);
        } catch {
          continue;
        }

        const dbStat = await fs.stat(dbPath);

        worlds.push({
          name,
          dbPath,
          fwlPath,
          size: dbStat.size,
          modified: dbStat.mtime,
        });
      }
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }

  return worlds.sort((a, b) => b.modified.getTime() - a.modified.getTime());
}

export async function importWorld(
  dbPath: string,
  fwlPath: string,
  targetDir?: string,
): Promise<WorldInfo> {
  const dir = targetDir ?? getDefaultWorldsDir();
  await fs.mkdir(dir, { recursive: true });

  const name = path.basename(dbPath).replace(".db", "");
  const targetDb = path.join(dir, `${name}.db`);
  const targetFwl = path.join(dir, `${name}.fwl`);

  await fs.copyFile(dbPath, targetDb);
  await fs.copyFile(fwlPath, targetFwl);

  const stat = await fs.stat(targetDb);

  return {
    name,
    dbPath: targetDb,
    fwlPath: targetFwl,
    size: stat.size,
    modified: stat.mtime,
  };
}

export async function exportWorld(
  worldName: string,
  targetDir: string,
  sourceDir?: string,
): Promise<void> {
  const dir = sourceDir ?? getDefaultWorldsDir();
  await fs.mkdir(targetDir, { recursive: true });

  const dbPath = path.join(dir, `${worldName}.db`);
  const fwlPath = path.join(dir, `${worldName}.fwl`);

  await fs.copyFile(dbPath, path.join(targetDir, `${worldName}.db`));
  await fs.copyFile(fwlPath, path.join(targetDir, `${worldName}.fwl`));
}

export async function deleteWorld(
  worldName: string,
  worldsDir?: string,
): Promise<void> {
  const dir = worldsDir ?? getDefaultWorldsDir();

  const dbPath = path.join(dir, `${worldName}.db`);
  const fwlPath = path.join(dir, `${worldName}.fwl`);

  await fs.unlink(dbPath);
  await fs.unlink(fwlPath);

  // Also remove any backup files
  try {
    const entries = await fs.readdir(dir);
    for (const entry of entries) {
      if (
        entry.startsWith(`${worldName}.db.`) ||
        entry.startsWith(`${worldName}.fwl.`)
      ) {
        await fs.unlink(path.join(dir, entry));
      }
    }
  } catch {
    // Ignore errors when cleaning backups
  }
}

export async function getWorldInfo(
  worldName: string,
  worldsDir?: string,
): Promise<WorldInfo | null> {
  const worlds = await listWorlds(worldsDir);
  return worlds.find((w) => w.name === worldName) ?? null;
}
```

## Settings Types

```typescript
// src/valheim/settings.ts
import { z } from "zod";

// All Valheim server settings with descriptions and constraints
export const ValheimSettings = {
  name: {
    type: "string",
    label: "Server Name",
    description: "Name shown in the server browser",
    min: 1,
    max: 64,
    required: true,
  },
  port: {
    type: "number",
    label: "Port",
    description: "UDP port for the server (also uses port+1)",
    min: 1024,
    max: 65535,
    default: 2456,
  },
  world: {
    type: "string",
    label: "World Name",
    description: "Name of the world to load",
    min: 1,
    max: 64,
    required: true,
  },
  password: {
    type: "string",
    label: "Password",
    description: "Server password (required, min 5 characters)",
    min: 5,
    max: 64,
    required: true,
    secret: true,
  },
  public: {
    type: "boolean",
    label: "Public Server",
    description: "List server in the public browser",
    default: false,
  },
  crossplay: {
    type: "boolean",
    label: "Crossplay",
    description: "Enable cross-platform play (Steam + Xbox/PC Game Pass)",
    default: false,
  },
  saveinterval: {
    type: "number",
    label: "Save Interval",
    description: "World save interval in seconds",
    min: 60,
    max: 7200,
    default: 1800,
    unit: "seconds",
  },
  backups: {
    type: "number",
    label: "Backup Count",
    description: "Number of backup saves to keep",
    min: 1,
    max: 100,
    default: 4,
  },
  backupshort: {
    type: "number",
    label: "Short Backup Interval",
    description: "Interval for short backups in seconds",
    min: 60,
    max: 86400,
    default: 7200,
    unit: "seconds",
  },
  backuplong: {
    type: "number",
    label: "Long Backup Interval",
    description: "Interval for long backups in seconds",
    min: 3600,
    max: 604800,
    default: 43200,
    unit: "seconds",
  },
} as const;

export const PresetOptions = [
  {
    value: "normal",
    label: "Normal",
    description: "Default Valheim experience",
  },
  { value: "casual", label: "Casual", description: "Easier, fewer penalties" },
  {
    value: "easy",
    label: "Easy",
    description: "Reduced damage, easier enemies",
  },
  { value: "hard", label: "Hard", description: "Increased difficulty" },
  {
    value: "hardcore",
    label: "Hardcore",
    description: "Permadeath, harsh penalties",
  },
  {
    value: "immersive",
    label: "Immersive",
    description: "No map, portals restricted",
  },
  { value: "hammer", label: "Hammer", description: "Build mode, no enemies" },
] as const;

export const CombatOptions = [
  {
    value: "veryeasy",
    label: "Very Easy",
    description: "50% enemy damage & HP",
  },
  { value: "easy", label: "Easy", description: "75% enemy damage & HP" },
  { value: "default", label: "Default", description: "Standard combat" },
  { value: "hard", label: "Hard", description: "150% enemy damage & HP" },
  {
    value: "veryhard",
    label: "Very Hard",
    description: "200% enemy damage & HP",
  },
] as const;

export const DeathPenaltyOptions = [
  { value: "casual", label: "Casual", description: "No skill loss" },
  { value: "veryeasy", label: "Very Easy", description: "5% skill loss" },
  { value: "easy", label: "Easy", description: "10% skill loss" },
  { value: "default", label: "Default", description: "Standard penalties" },
  { value: "hard", label: "Hard", description: "15% skill loss" },
  {
    value: "hardcore",
    label: "Hardcore",
    description: "20% skill loss, permadeath",
  },
] as const;

export const ResourceOptions = [
  { value: "muchless", label: "Much Less", description: "25% drop rate" },
  { value: "less", label: "Less", description: "50% drop rate" },
  { value: "default", label: "Default", description: "Standard drops" },
  { value: "more", label: "More", description: "150% drop rate" },
  { value: "muchmore", label: "Much More", description: "200% drop rate" },
  { value: "most", label: "Most", description: "300% drop rate" },
] as const;

export const PortalOptions = [
  { value: "default", label: "Default", description: "Standard restrictions" },
  {
    value: "casual",
    label: "Casual",
    description: "Everything through portals",
  },
  { value: "hard", label: "Hard", description: "Nothing through portals" },
  { value: "veryhard", label: "Very Hard", description: "No portals at all" },
] as const;
```

## Settings Screen Component

```typescript
// src/tui/screens/Settings.tsx
import React, { FC, useState } from "react";
import { Box, Text, useInput } from "ink";
import SelectInput from "ink-select-input";
import { useConfig } from "../hooks/useConfig.ts";
import {
  CombatOptions,
  DeathPenaltyOptions,
  PortalOptions,
  PresetOptions,
  ResourceOptions,
  ValheimSettings,
} from "../../valheim/settings.ts";

type SettingsCategory = "server" | "difficulty" | "saves";

const categories: { key: SettingsCategory; label: string }[] = [
  { key: "server", label: "Server" },
  { key: "difficulty", label: "Difficulty" },
  { key: "saves", label: "Saves & Backups" },
];

export const Settings: FC = () => {
  const { config, save } = useConfig();
  const [category, setCategory] = useState<SettingsCategory>("server");
  const [selectedSetting, setSelectedSetting] = useState(0);
  const [editing, setEditing] = useState(false);

  useInput((input, key) => {
    if (key.tab) {
      // Cycle categories
      const idx = categories.findIndex((c) => c.key === category);
      const next = categories[(idx + 1) % categories.length];
      setCategory(next.key);
      setSelectedSetting(0);
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      {/* Category tabs */}
      <Box marginBottom={1}>
        {categories.map((cat) => (
          <Box key={cat.key} marginRight={2}>
            <Text
              color={category === cat.key ? "cyan" : "gray"}
              bold={category === cat.key}
              underline={category === cat.key}
            >
              {cat.label}
            </Text>
          </Box>
        ))}
      </Box>

      {/* Category content */}
      {category === "server" && <ServerSettings />}
      {category === "difficulty" && <DifficultySettings />}
      {category === "saves" && <SaveSettings />}

      <Box marginTop={1}>
        <Text dimColor>Tab: Switch category | ↑↓: Navigate | Enter: Edit</Text>
      </Box>
    </Box>
  );
};

const ServerSettings: FC = () => {
  // Server name, port, password, world, public, crossplay
  return (
    <Box flexDirection="column">
      <Text bold>Server Configuration</Text>
      {/* Render settings fields */}
    </Box>
  );
};

const DifficultySettings: FC = () => {
  // Preset, combat, death penalty, resources, raids, portals
  return (
    <Box flexDirection="column">
      <Text bold>Difficulty Settings</Text>
      {/* Render preset and modifier selects */}
    </Box>
  );
};

const SaveSettings: FC = () => {
  // Save interval, backups, backup intervals
  return (
    <Box flexDirection="column">
      <Text bold>Save & Backup Settings</Text>
      {/* Render save settings */}
    </Box>
  );
};
```

## Admin Lists

Valheim uses text files for admin/ban/permitted lists:

```typescript
// src/valheim/lists.ts
import path from "node:path";
import fs from "node:fs/promises";

export type ListType = "admin" | "banned" | "permitted";

const LIST_FILES: Record<ListType, string> = {
  admin: "adminlist.txt",
  banned: "bannedlist.txt",
  permitted: "permittedlist.txt",
};

async function getListPath(type: ListType, savedir: string): Promise<string> {
  const filePath = path.join(savedir, LIST_FILES[type]);
  // Ensure file exists
  try {
    await fs.access(filePath);
  } catch {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, "// Auto-generated by OZ-Valheim DSM\n");
  }
  return filePath;
}

export async function readList(
  type: ListType,
  savedir: string,
): Promise<string[]> {
  const filePath = await getListPath(type, savedir);
  const content = await fs.readFile(filePath, "utf-8");

  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("//"));
}

export async function addToList(
  type: ListType,
  steamId: string,
  savedir: string,
): Promise<void> {
  const entries = await readList(type, savedir);

  if (!entries.includes(steamId)) {
    const filePath = await getListPath(type, savedir);
    await fs.writeFile(filePath, [...entries, steamId].join("\n") + "\n");
  }
}

export async function removeFromList(
  type: ListType,
  steamId: string,
  savedir: string,
): Promise<void> {
  const entries = await readList(type, savedir);
  const filtered = entries.filter((e) => e !== steamId);

  const filePath = await getListPath(type, savedir);
  await fs.writeFile(filePath, filtered.join("\n") + "\n");
}

export async function clearList(
  type: ListType,
  savedir: string,
): Promise<void> {
  const filePath = await getListPath(type, savedir);
  await fs.writeFile(filePath, "// Auto-generated by OZ-Valheim DSM\n");
}
```

## Module Exports

```typescript
// src/valheim/mod.ts
export { buildServerArgs } from "./args.ts";
export {
  deleteWorld,
  exportWorld,
  getDefaultWorldsDir,
  getWorldInfo,
  importWorld,
  listWorlds,
  type WorldInfo,
} from "./worlds.ts";
export {
  CombatOptions,
  DeathPenaltyOptions,
  PortalOptions,
  PresetOptions,
  ResourceOptions,
  ValheimSettings,
} from "./settings.ts";
export {
  addToList,
  clearList,
  type ListType,
  readList,
  removeFromList,
} from "./lists.ts";
```
