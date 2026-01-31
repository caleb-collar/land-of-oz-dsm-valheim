/**
 * Settings screen - Server configuration
 */

import { type FC, useState } from "react";
import { Box, Text, useInput } from "ink";
import { useStore } from "../store.ts";
import { theme } from "../theme.ts";

/** Settings item for display */
type SettingItem = {
  key: string;
  label: string;
  value: string | number | boolean;
  editable: boolean;
};

/** Config state type from store */
type ConfigState = {
  serverName: string;
  port: number;
  password: string;
  world: string;
  public: boolean;
  crossplay: boolean;
  saveInterval: number;
  backups: number;
};

/**
 * Gets settings items from config
 */
function getSettingsItems(config: ConfigState): SettingItem[] {
  return [
    {
      key: "serverName",
      label: "Server Name",
      value: config.serverName,
      editable: true,
    },
    { key: "port", label: "Port", value: config.port, editable: true },
    {
      key: "password",
      label: "Password",
      value: config.password ? "********" : "(none)",
      editable: true,
    },
    { key: "world", label: "World", value: config.world, editable: true },
    { key: "public", label: "Public", value: config.public, editable: true },
    {
      key: "crossplay",
      label: "Crossplay",
      value: config.crossplay,
      editable: true,
    },
    {
      key: "saveInterval",
      label: "Save Interval",
      value: `${config.saveInterval}s`,
      editable: true,
    },
    { key: "backups", label: "Backups", value: config.backups, editable: true },
  ];
}

/**
 * Settings screen for server configuration
 */
export const Settings: FC = () => {
  const config = useStore((s) => s.config);
  const updateConfig = useStore((s) => s.actions.updateConfig);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const items = getSettingsItems(config);

  // Handle navigation and toggle for boolean settings
  useInput((input, key) => {
    if (key.upArrow || input === "k") {
      setSelectedIndex((prev: number) => Math.max(0, prev - 1));
    }
    if (key.downArrow || input === "j") {
      setSelectedIndex((prev: number) => Math.min(items.length - 1, prev + 1));
    }
    if (key.return || input === " ") {
      const item = items[selectedIndex];
      if (item.key === "public") {
        updateConfig({ public: !config.public });
      }
      if (item.key === "crossplay") {
        updateConfig({ crossplay: !config.crossplay });
      }
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      {/* Title */}
      <Box marginBottom={1}>
        <Text bold color={theme.primary}>
          ─ Settings ─
        </Text>
      </Box>

      {/* Help */}
      <Box marginBottom={1}>
        <Text dimColor>Use ↑/↓ to navigate, Enter to toggle booleans</Text>
      </Box>

      {/* Settings List */}
      <Box flexDirection="column">
        {items.map((item, index) => {
          const isSelected = index === selectedIndex;
          const displayValue =
            typeof item.value === "boolean"
              ? item.value
                ? "Yes"
                : "No"
              : String(item.value);

          return (
            <Box key={item.key}>
              <Text color={isSelected ? theme.primary : undefined}>
                {isSelected ? "▶ " : "  "}
              </Text>
              <Text
                bold={isSelected}
                color={isSelected ? theme.primary : undefined}
              >
                {item.label}:
              </Text>
              <Text></Text>
              <Text
                color={
                  typeof item.value === "boolean"
                    ? item.value
                      ? theme.success
                      : theme.error
                    : theme.secondary
                }
              >
                {displayValue}
              </Text>
            </Box>
          );
        })}
      </Box>

      {/* Footer hint */}
      <Box marginTop={2}>
        <Text dimColor>Note: Restart server for changes to take effect</Text>
      </Box>
    </Box>
  );
};
