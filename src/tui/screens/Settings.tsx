/**
 * Settings screen - Full configuration editing
 */

import { Box, Text, useInput } from "ink";
import { type FC, useCallback, useMemo, useState } from "react";
import { NumberInput } from "../components/NumberInput.js";
import { SelectInput, type SelectOption } from "../components/SelectInput.js";
import { TextInput } from "../components/TextInput.js";
import { useConfig } from "../hooks/useConfig.js";
import { useWorlds } from "../hooks/useWorlds.js";
import type {
  CombatModifier,
  DeathPenalty,
  PortalMode,
  Preset,
  ResourceModifier,
} from "../store.js";
import { useStore } from "../store.js";
import { theme } from "../theme.js";

/** Setting item definition */
type SettingDef = {
  key: string;
  label: string;
  section: SettingSection;
  type: "text" | "number" | "toggle" | "select" | "password";
  getValue: () => string | number | boolean;
  setValue: (value: string | number | boolean) => Promise<void>;
  options?: SelectOption<string>[];
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  description?: string;
};

type SettingSection = "server" | "modifiers" | "watchdog" | "rcon" | "tui";

const SECTION_LABELS: Record<SettingSection, string> = {
  server: "Server",
  modifiers: "Difficulty Modifiers",
  watchdog: "Watchdog (Auto-Restart)",
  rcon: "RCON (Remote Console)",
  tui: "TUI Settings",
};

const SECTION_ORDER: SettingSection[] = [
  "server",
  "modifiers",
  "watchdog",
  "rcon",
  "tui",
];

// Preset options
const PRESET_OPTIONS: SelectOption<string>[] = [
  { value: "", label: "(None)", description: "Use custom modifiers" },
  { value: "normal", label: "Normal", description: "Standard difficulty" },
  { value: "casual", label: "Casual", description: "Relaxed gameplay" },
  { value: "easy", label: "Easy", description: "Lower difficulty" },
  { value: "hard", label: "Hard", description: "Increased challenge" },
  { value: "hardcore", label: "Hardcore", description: "Maximum difficulty" },
  { value: "immersive", label: "Immersive", description: "Realistic settings" },
  { value: "hammer", label: "Hammer", description: "Building focused" },
];

// Combat options
const COMBAT_OPTIONS: SelectOption<string>[] = [
  { value: "veryeasy", label: "Very Easy" },
  { value: "easy", label: "Easy" },
  { value: "default", label: "Default" },
  { value: "hard", label: "Hard" },
  { value: "veryhard", label: "Very Hard" },
];

// Death penalty options
const DEATH_OPTIONS: SelectOption<string>[] = [
  { value: "casual", label: "Casual", description: "No skill loss" },
  { value: "veryeasy", label: "Very Easy" },
  { value: "easy", label: "Easy" },
  { value: "default", label: "Default" },
  { value: "hard", label: "Hard" },
  { value: "hardcore", label: "Hardcore", description: "Lose everything" },
];

// Resource options
const RESOURCE_OPTIONS: SelectOption<string>[] = [
  { value: "muchless", label: "Much Less" },
  { value: "less", label: "Less" },
  { value: "default", label: "Default" },
  { value: "more", label: "More" },
  { value: "muchmore", label: "Much More" },
  { value: "most", label: "Most" },
];

// Portal options
const PORTAL_OPTIONS: SelectOption<string>[] = [
  {
    value: "default",
    label: "Default",
    description: "No metal through portals",
  },
  { value: "casual", label: "Casual", description: "All items allowed" },
  { value: "hard", label: "Hard", description: "No portals" },
  { value: "veryhard", label: "Very Hard", description: "Very limited" },
];

// Color scheme options
const COLOR_SCHEME_OPTIONS: SelectOption<string>[] = [
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
  { value: "auto", label: "Auto" },
];

/**
 * Settings screen with full editing capabilities
 */
export const Settings: FC = () => {
  const {
    config,
    modifiers,
    watchdog,
    tuiConfig,
    rcon,
    updateServerConfig,
    updateModifiers,
    updateWatchdogConfig,
    updateTuiSettings,
    updateRconConfig,
  } = useConfig();

  const { worlds } = useWorlds();
  const editingField = useStore((s) => s.ui.editingField);
  const setEditingField = useStore((s) => s.actions.setEditingField);
  const addLog = useStore((s) => s.actions.addLog);

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [localValue, setLocalValue] = useState<string | number | boolean>("");
  const [scrollOffset, setScrollOffset] = useState(0);

  // Track which sections are expanded (only Server expanded by default)
  const [expandedSections, setExpandedSections] = useState<Set<SettingSection>>(
    () => new Set(["server"])
  );

  // Maximum visible rows (excluding header/footer)
  const MAX_VISIBLE_ROWS = 15;

  // Build world options from discovered worlds
  const worldOptions: SelectOption<string>[] = useMemo(
    () => [
      {
        value: "",
        label: "Create New...",
        description: "Enter world name to create",
      },
      ...worlds.map((w) => ({
        value: w.name,
        label: w.name,
        description: `${(w.size / 1024 / 1024).toFixed(1)} MB`,
      })),
    ],
    [worlds]
  );

  // Define all settings
  const settings: SettingDef[] = [
    // Server settings
    {
      key: "serverName",
      label: "Server Name",
      section: "server",
      type: "text",
      getValue: () => config.serverName,
      setValue: async (v) => updateServerConfig({ serverName: v as string }),
      description: "1-64 characters",
    },
    {
      key: "port",
      label: "Port",
      section: "server",
      type: "number",
      getValue: () => config.port,
      setValue: async (v) => updateServerConfig({ port: v as number }),
      min: 1024,
      max: 65535,
      description: "1024-65535",
    },
    {
      key: "password",
      label: "Password",
      section: "server",
      type: "password",
      getValue: () => config.password,
      setValue: async (v) => updateServerConfig({ password: v as string }),
      description: "Empty or 5+ chars",
    },
    {
      key: "world",
      label: "World",
      section: "server",
      type: "select",
      getValue: () => config.world,
      setValue: async (v) => updateServerConfig({ world: v as string }),
      options: worldOptions,
    },
    {
      key: "public",
      label: "Public Server",
      section: "server",
      type: "toggle",
      getValue: () => config.public,
      setValue: async (v) => updateServerConfig({ public: v as boolean }),
    },
    {
      key: "crossplay",
      label: "Crossplay",
      section: "server",
      type: "toggle",
      getValue: () => config.crossplay,
      setValue: async (v) => updateServerConfig({ crossplay: v as boolean }),
    },
    {
      key: "saveInterval",
      label: "Save Interval",
      section: "server",
      type: "number",
      getValue: () => config.saveInterval,
      setValue: async (v) => updateServerConfig({ saveInterval: v as number }),
      min: 60,
      max: 7200,
      step: 60,
      suffix: "s",
      description: "60-7200 seconds",
    },
    {
      key: "backups",
      label: "Backups",
      section: "server",
      type: "number",
      getValue: () => config.backups,
      setValue: async (v) => updateServerConfig({ backups: v as number }),
      min: 1,
      max: 100,
    },

    // Modifiers settings
    {
      key: "preset",
      label: "Difficulty Preset",
      section: "modifiers",
      type: "select",
      getValue: () => modifiers.preset ?? "",
      setValue: async (v) => updateModifiers({ preset: (v as Preset) || null }),
      options: PRESET_OPTIONS,
    },
    {
      key: "combat",
      label: "Combat",
      section: "modifiers",
      type: "select",
      getValue: () => modifiers.combat,
      setValue: async (v) => updateModifiers({ combat: v as CombatModifier }),
      options: COMBAT_OPTIONS,
    },
    {
      key: "deathpenalty",
      label: "Death Penalty",
      section: "modifiers",
      type: "select",
      getValue: () => modifiers.deathpenalty,
      setValue: async (v) =>
        updateModifiers({ deathpenalty: v as DeathPenalty }),
      options: DEATH_OPTIONS,
    },
    {
      key: "resources",
      label: "Resources",
      section: "modifiers",
      type: "select",
      getValue: () => modifiers.resources,
      setValue: async (v) =>
        updateModifiers({ resources: v as ResourceModifier }),
      options: RESOURCE_OPTIONS,
    },
    {
      key: "raids",
      label: "Raids Enabled",
      section: "modifiers",
      type: "toggle",
      getValue: () => modifiers.raids,
      setValue: async (v) => updateModifiers({ raids: v as boolean }),
    },
    {
      key: "portals",
      label: "Portal Mode",
      section: "modifiers",
      type: "select",
      getValue: () => modifiers.portals,
      setValue: async (v) => updateModifiers({ portals: v as PortalMode }),
      options: PORTAL_OPTIONS,
    },

    // Watchdog settings
    {
      key: "watchdogEnabled",
      label: "Enabled",
      section: "watchdog",
      type: "toggle",
      getValue: () => watchdog.enabled,
      setValue: async (v) => updateWatchdogConfig({ enabled: v as boolean }),
    },
    {
      key: "maxRestarts",
      label: "Max Restarts",
      section: "watchdog",
      type: "number",
      getValue: () => watchdog.maxRestarts,
      setValue: async (v) => updateWatchdogConfig({ maxRestarts: v as number }),
      min: 0,
      max: 100,
    },
    {
      key: "restartDelay",
      label: "Restart Delay",
      section: "watchdog",
      type: "number",
      getValue: () => watchdog.restartDelay,
      setValue: async (v) =>
        updateWatchdogConfig({ restartDelay: v as number }),
      min: 1000,
      max: 300000,
      step: 1000,
      suffix: "ms",
    },
    {
      key: "cooldownPeriod",
      label: "Cooldown Period",
      section: "watchdog",
      type: "number",
      getValue: () => watchdog.cooldownPeriod,
      setValue: async (v) =>
        updateWatchdogConfig({ cooldownPeriod: v as number }),
      min: 60000,
      max: 3600000,
      step: 60000,
      suffix: "ms",
    },
    {
      key: "backoffMultiplier",
      label: "Backoff Multiplier",
      section: "watchdog",
      type: "number",
      getValue: () => watchdog.backoffMultiplier,
      setValue: async (v) =>
        updateWatchdogConfig({ backoffMultiplier: v as number }),
      min: 1,
      max: 10,
      suffix: "x",
    },

    // RCON settings
    {
      key: "rconEnabled",
      label: "Enabled",
      section: "rcon",
      type: "toggle",
      getValue: () => rcon.enabled,
      setValue: async (v) => updateRconConfig({ enabled: v as boolean }),
    },
    {
      key: "rconHost",
      label: "Host",
      section: "rcon",
      type: "text",
      getValue: () => rcon.host,
      setValue: async (v) => updateRconConfig({ host: v as string }),
    },
    {
      key: "rconPort",
      label: "Port",
      section: "rcon",
      type: "number",
      getValue: () => rcon.port,
      setValue: async (v) => updateRconConfig({ port: v as number }),
      min: 1024,
      max: 65535,
    },
    {
      key: "rconPassword",
      label: "Password",
      section: "rcon",
      type: "password",
      getValue: () => rcon.password,
      setValue: async (v) => updateRconConfig({ password: v as string }),
    },
    {
      key: "rconTimeout",
      label: "Timeout",
      section: "rcon",
      type: "number",
      getValue: () => rcon.timeout,
      setValue: async (v) => updateRconConfig({ timeout: v as number }),
      min: 1000,
      max: 60000,
      step: 1000,
      suffix: "ms",
    },
    {
      key: "rconAutoReconnect",
      label: "Auto-Reconnect",
      section: "rcon",
      type: "toggle",
      getValue: () => rcon.autoReconnect,
      setValue: async (v) => updateRconConfig({ autoReconnect: v as boolean }),
    },

    // TUI settings
    {
      key: "colorScheme",
      label: "Color Scheme",
      section: "tui",
      type: "select",
      getValue: () => tuiConfig.colorScheme,
      setValue: async (v) =>
        updateTuiSettings({
          colorScheme: v as "dark" | "light" | "auto",
        }),
      options: COLOR_SCHEME_OPTIONS,
    },
    {
      key: "animationsEnabled",
      label: "Animations",
      section: "tui",
      type: "toggle",
      getValue: () => tuiConfig.animationsEnabled,
      setValue: async (v) =>
        updateTuiSettings({ animationsEnabled: v as boolean }),
    },
    {
      key: "logMaxLines",
      label: "Max Log Lines",
      section: "tui",
      type: "number",
      getValue: () => tuiConfig.logMaxLines,
      setValue: async (v) => updateTuiSettings({ logMaxLines: v as number }),
      min: 10,
      max: 1000,
      step: 10,
    },
    {
      key: "refreshRate",
      label: "Refresh Rate",
      section: "tui",
      type: "number",
      getValue: () => tuiConfig.refreshRate,
      setValue: async (v) => updateTuiSettings({ refreshRate: v as number }),
      min: 100,
      max: 5000,
      step: 100,
      suffix: "ms",
    },
  ];

  // Type for navigable items (section headers + settings)
  type NavItem =
    | { type: "section"; section: SettingSection; label: string }
    | { type: "setting"; setting: SettingDef };

  // Build flat list of navigable items based on expanded state
  // Note: settings array is stable in structure, only expandedSections changes navigation
  // biome-ignore lint/correctness/useExhaustiveDependencies: settings structure is stable
  const navItems = useMemo((): NavItem[] => {
    const items: NavItem[] = [];
    for (const section of SECTION_ORDER) {
      // Add section header
      items.push({
        type: "section",
        section,
        label: SECTION_LABELS[section],
      });
      // Add settings if section is expanded
      if (expandedSections.has(section)) {
        for (const setting of settings.filter((s) => s.section === section)) {
          items.push({ type: "setting", setting });
        }
      }
    }
    return items;
  }, [expandedSections]);

  // Get current item
  const currentItem = navItems[selectedIndex];
  const currentSetting =
    currentItem?.type === "setting" ? currentItem.setting : null;
  const isEditing = editingField !== null;

  // Toggle section expansion
  const toggleSection = useCallback((section: SettingSection) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  }, []);

  // Update scroll offset when selection changes
  const updateScrollOffset = useCallback(
    (newIndex: number) => {
      // Keep at least 2 items visible above and below selection
      const padding = 2;
      if (newIndex < scrollOffset + padding) {
        setScrollOffset(Math.max(0, newIndex - padding));
      } else if (newIndex >= scrollOffset + MAX_VISIBLE_ROWS - padding) {
        setScrollOffset(Math.max(0, newIndex - MAX_VISIBLE_ROWS + padding + 1));
      }
    },
    [scrollOffset]
  );

  // Start editing the current field
  const startEditing = useCallback(() => {
    if (!currentSetting) return;
    setEditingField(currentSetting.key);
    setLocalValue(currentSetting.getValue());
  }, [currentSetting, setEditingField]);

  // Save the current edit
  const saveEdit = useCallback(async () => {
    if (!currentSetting || !isEditing) return;

    try {
      await currentSetting.setValue(localValue);
      addLog("info", `Updated ${currentSetting.label}`);
    } catch (error) {
      addLog("error", `Failed to update ${currentSetting.label}: ${error}`);
    }

    setEditingField(null);
  }, [currentSetting, isEditing, localValue, addLog, setEditingField]);

  // Cancel the current edit
  const cancelEdit = useCallback(() => {
    setEditingField(null);
  }, [setEditingField]);

  // Handle input when not editing
  useInput(
    (input, key) => {
      if (isEditing) return;

      // Navigation
      if (key.upArrow || input === "k") {
        const newIndex = Math.max(0, selectedIndex - 1);
        setSelectedIndex(newIndex);
        updateScrollOffset(newIndex);
        return;
      }
      if (key.downArrow || input === "j") {
        const newIndex = Math.min(navItems.length - 1, selectedIndex + 1);
        setSelectedIndex(newIndex);
        updateScrollOffset(newIndex);
        return;
      }

      // Enter/Space to toggle section or edit setting
      if (key.return || input === " ") {
        if (currentItem?.type === "section") {
          toggleSection(currentItem.section);
          return;
        }
        if (currentSetting?.type === "toggle") {
          const newValue = !currentSetting.getValue();
          currentSetting.setValue(newValue);
          addLog("info", `Toggled ${currentSetting.label}`);
        } else if (currentSetting) {
          startEditing();
        }
        return;
      }

      // Tab to collapse all / expand all
      if (key.tab) {
        const allExpanded = SECTION_ORDER.every((s) => expandedSections.has(s));
        if (allExpanded) {
          setExpandedSections(new Set());
        } else {
          setExpandedSections(new Set(SECTION_ORDER));
        }
        // Reset to first item
        setSelectedIndex(0);
        setScrollOffset(0);
        return;
      }
    },
    { isActive: !isEditing }
  );

  // Calculate visible items range
  const visibleItems = navItems.slice(
    scrollOffset,
    scrollOffset + MAX_VISIBLE_ROWS
  );
  const hasMoreAbove = scrollOffset > 0;
  const hasMoreBelow = scrollOffset + MAX_VISIBLE_ROWS < navItems.length;

  // Render a navigation item (section header or setting)
  const renderNavItem = (item: NavItem, globalIndex: number) => {
    const isSelected = globalIndex === selectedIndex;

    if (item.type === "section") {
      const isExpanded = expandedSections.has(item.section);
      const itemCount = settings.filter(
        (s) => s.section === item.section
      ).length;

      return (
        <Box key={`section-${item.section}`} flexShrink={0} minHeight={1}>
          <Text color={isSelected ? theme.primary : undefined}>
            {isSelected ? "▶ " : "  "}
          </Text>
          <Text bold color={isSelected ? theme.primary : theme.secondary}>
            {isExpanded ? "▼" : "▶"} {item.label}
          </Text>
          <Text dimColor> ({itemCount})</Text>
        </Box>
      );
    }

    // It's a setting
    const setting = item.setting;
    const isThisEditing = editingField === setting.key;
    const value = setting.getValue();

    // If editing this setting, render the appropriate input
    if (isThisEditing) {
      switch (setting.type) {
        case "text":
        case "password":
          return (
            <Box key={setting.key} flexShrink={0} minHeight={1}>
              <Text color={theme.primary}> ▶ {setting.label}: </Text>
              <TextInput
                value={localValue as string}
                onChange={setLocalValue}
                onSubmit={saveEdit}
                onCancel={cancelEdit}
                mask={setting.type === "password"}
                focus={true}
              />
            </Box>
          );
        case "number":
          return (
            <Box key={setting.key} flexShrink={0} minHeight={1}>
              <Text color={theme.primary}> ▶ {setting.label}: </Text>
              <NumberInput
                value={localValue as number}
                onChange={(v) => setLocalValue(v)}
                onSubmit={saveEdit}
                onCancel={cancelEdit}
                min={setting.min}
                max={setting.max}
                step={setting.step}
                suffix={setting.suffix}
                focus={true}
              />
            </Box>
          );
        case "select":
          return (
            <Box key={setting.key} flexDirection="column" flexShrink={0}>
              <Box flexShrink={0}>
                <Text color={theme.primary}> ▶ {setting.label}: </Text>
              </Box>
              <Box marginLeft={4}>
                <SelectInput
                  options={setting.options ?? []}
                  value={localValue as string}
                  onChange={(v) => setLocalValue(v)}
                  onSubmit={async (v) => {
                    setLocalValue(v);
                    await setting.setValue(v);
                    setEditingField(null);
                    addLog("info", `Updated ${setting.label}`);
                  }}
                  onCancel={cancelEdit}
                  focus={true}
                  expanded={true}
                />
              </Box>
            </Box>
          );
        default:
          return null;
      }
    }

    // Render non-editing view
    const displayValue =
      setting.type === "toggle"
        ? value
          ? "Yes"
          : "No"
        : setting.type === "password"
          ? value
            ? "********"
            : "(none)"
          : setting.type === "select"
            ? (setting.options?.find((o) => o.value === value)?.label ?? value)
            : `${value}${setting.suffix ?? ""}`;

    return (
      <Box key={setting.key} flexShrink={0} minHeight={1}>
        <Text color={isSelected ? theme.primary : undefined}>
          {isSelected ? "  ▶ " : "    "}
        </Text>
        <Text bold={isSelected} color={isSelected ? theme.primary : undefined}>
          {setting.label}:
        </Text>
        <Text> </Text>
        <Text
          color={
            setting.type === "toggle"
              ? value
                ? theme.success
                : theme.error
              : theme.secondary
          }
        >
          {displayValue}
        </Text>
      </Box>
    );
  };

  return (
    <Box flexDirection="column" flexGrow={1} padding={1} overflow="hidden">
      {/* Title */}
      <Box marginBottom={1} flexShrink={0} minHeight={1}>
        <Text bold color={theme.primary}>
          ─ Settings ─
        </Text>
      </Box>

      {/* Help */}
      <Box marginBottom={1} flexShrink={0} minHeight={1}>
        <Text dimColor>
          {isEditing
            ? "Enter to save, Esc to cancel"
            : "↑/↓ navigate • Enter expand/edit • Tab collapse all"}
        </Text>
      </Box>

      {/* Scroll indicator - above */}
      {hasMoreAbove && (
        <Box flexShrink={0} minHeight={1}>
          <Text dimColor> ↑ {scrollOffset} more above</Text>
        </Box>
      )}

      {/* Visible Items */}
      <Box flexDirection="column" flexGrow={1} overflow="hidden">
        {visibleItems.map((item, visibleIdx) => {
          const globalIndex = scrollOffset + visibleIdx;
          return renderNavItem(item, globalIndex);
        })}
      </Box>

      {/* Scroll indicator - below */}
      {hasMoreBelow && (
        <Box flexShrink={0} minHeight={1}>
          <Text dimColor>
            {"  "}↓ {navItems.length - scrollOffset - MAX_VISIBLE_ROWS} more
            below
          </Text>
        </Box>
      )}

      {/* RCON Status */}
      {rcon.enabled && (
        <Box marginTop={1} flexShrink={0} minHeight={1}>
          <Text dimColor>RCON Status: </Text>
          <Text color={rcon.connected ? theme.success : theme.error}>
            {rcon.connected ? "Connected" : "Disconnected"}
          </Text>
        </Box>
      )}

      {/* Footer hint */}
      <Box marginTop={1} flexShrink={0} minHeight={1}>
        <Text dimColor>Note: Restart server for changes to take effect</Text>
      </Box>
    </Box>
  );
};
