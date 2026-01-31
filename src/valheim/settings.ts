/**
 * Valheim server settings definitions
 * Provides metadata and options for all configurable settings
 */

/** Setting type definition for UI rendering */
export type SettingDefinition = {
  type: "string" | "number" | "boolean";
  label: string;
  description: string;
  min?: number;
  max?: number;
  default?: unknown;
  unit?: string;
  required?: boolean;
  secret?: boolean;
};

/** All Valheim server settings with descriptions and constraints */
export const ValheimSettings: Record<string, SettingDefinition> = {
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
    description: "Server password (min 5 characters, or empty for no password)",
    min: 0,
    max: 64,
    required: false,
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
};

/** Option type for select inputs */
export type SelectOption = {
  value: string;
  label: string;
  description: string;
};

/** Preset difficulty options */
export const PresetOptions: readonly SelectOption[] = [
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

/** Combat modifier options */
export const CombatOptions: readonly SelectOption[] = [
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

/** Death penalty options */
export const DeathPenaltyOptions: readonly SelectOption[] = [
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

/** Resource drop rate options */
export const ResourceOptions: readonly SelectOption[] = [
  { value: "muchless", label: "Much Less", description: "25% drop rate" },
  { value: "less", label: "Less", description: "50% drop rate" },
  { value: "default", label: "Default", description: "Standard drops" },
  { value: "more", label: "More", description: "150% drop rate" },
  { value: "muchmore", label: "Much More", description: "200% drop rate" },
  { value: "most", label: "Most", description: "300% drop rate" },
] as const;

/** Raid frequency options */
export const RaidOptions: readonly SelectOption[] = [
  { value: "none", label: "None", description: "No enemy raids" },
  { value: "muchless", label: "Much Less", description: "Very rare raids" },
  { value: "less", label: "Less", description: "Fewer raids" },
  {
    value: "default",
    label: "Default",
    description: "Standard raid frequency",
  },
  { value: "more", label: "More", description: "More raids" },
  { value: "muchmore", label: "Much More", description: "Frequent raids" },
] as const;

/** Portal restriction options */
export const PortalOptions: readonly SelectOption[] = [
  { value: "default", label: "Default", description: "Standard restrictions" },
  {
    value: "casual",
    label: "Casual",
    description: "Everything through portals",
  },
  { value: "hard", label: "Hard", description: "Nothing through portals" },
  { value: "veryhard", label: "Very Hard", description: "No portals at all" },
] as const;

/**
 * Gets a human-readable label for a preset value
 */
export function getPresetLabel(value: string): string {
  return PresetOptions.find((opt) => opt.value === value)?.label ?? value;
}

/**
 * Gets a human-readable label for a combat modifier value
 */
export function getCombatLabel(value: string): string {
  return CombatOptions.find((opt) => opt.value === value)?.label ?? value;
}

/**
 * Gets a human-readable label for a death penalty value
 */
export function getDeathPenaltyLabel(value: string): string {
  return DeathPenaltyOptions.find((opt) => opt.value === value)?.label ?? value;
}

/**
 * Gets a human-readable label for a resource modifier value
 */
export function getResourceLabel(value: string): string {
  return ResourceOptions.find((opt) => opt.value === value)?.label ?? value;
}

/**
 * Gets a human-readable label for a portal modifier value
 */
export function getPortalLabel(value: string): string {
  return PortalOptions.find((opt) => opt.value === value)?.label ?? value;
}

/**
 * Formats a time interval setting for display
 * @param seconds Time in seconds
 * @returns Human-readable string (e.g., "30 minutes", "2 hours")
 */
export function formatInterval(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} seconds`;
  } else if (seconds < 3600) {
    const minutes = Math.round(seconds / 60);
    return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
  } else {
    const hours = Math.round(seconds / 3600);
    return `${hours} hour${hours !== 1 ? "s" : ""}`;
  }
}
