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
  section: "server" | "rcon";
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

/** RCON state type from store */
type RconState = {
  enabled: boolean;
  connected: boolean;
  port: number;
  password: string;
  host: string;
};

/**
 * Gets settings items from config
 */
function getSettingsItems(config: ConfigState, rcon: RconState): SettingItem[] {
  return [
    // Server settings
    {
      key: "serverName",
      label: "Server Name",
      value: config.serverName,
      editable: true,
      section: "server",
    },
    {
      key: "port",
      label: "Port",
      value: config.port,
      editable: true,
      section: "server",
    },
    {
      key: "password",
      label: "Password",
      value: config.password ? "********" : "(none)",
      editable: true,
      section: "server",
    },
    {
      key: "world",
      label: "World",
      value: config.world,
      editable: true,
      section: "server",
    },
    {
      key: "public",
      label: "Public",
      value: config.public,
      editable: true,
      section: "server",
    },
    {
      key: "crossplay",
      label: "Crossplay",
      value: config.crossplay,
      editable: true,
      section: "server",
    },
    {
      key: "saveInterval",
      label: "Save Interval",
      value: `${config.saveInterval}s`,
      editable: true,
      section: "server",
    },
    {
      key: "backups",
      label: "Backups",
      value: config.backups,
      editable: true,
      section: "server",
    },
    // RCON settings
    {
      key: "rcon.enabled",
      label: "RCON Enabled",
      value: rcon.enabled,
      editable: true,
      section: "rcon",
    },
    {
      key: "rcon.host",
      label: "RCON Host",
      value: rcon.host,
      editable: true,
      section: "rcon",
    },
    {
      key: "rcon.port",
      label: "RCON Port",
      value: rcon.port,
      editable: true,
      section: "rcon",
    },
    {
      key: "rcon.password",
      label: "RCON Password",
      value: rcon.password ? "********" : "(none)",
      editable: true,
      section: "rcon",
    },
  ];
}

/**
 * Settings screen for server configuration
 */
export const Settings: FC = () => {
  const config = useStore((s) => s.config);
  const rcon = useStore((s) => s.rcon);
  const updateConfig = useStore((s) => s.actions.updateConfig);
  const updateRcon = useStore((s) => s.actions.updateRcon);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const items = getSettingsItems(config, rcon);
  const serverItems = items.filter((i) => i.section === "server");
  const rconItems = items.filter((i) => i.section === "rcon");

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
      if (item.key === "rcon.enabled") {
        updateRcon({ enabled: !rcon.enabled });
      }
    }
  });

  // Helper to render a settings section
  const renderSection = (
    title: string,
    sectionItems: SettingItem[],
    startIndex: number,
  ) => (
    <Box flexDirection="column" marginBottom={1}>
      <Box marginBottom={0}>
        <Text bold dimColor>
          {title}
        </Text>
      </Box>
      {sectionItems.map((item, idx) => {
        const globalIndex = startIndex + idx;
        const isSelected = globalIndex === selectedIndex;
        const displayValue = typeof item.value === "boolean"
          ? item.value ? "Yes" : "No"
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
              color={typeof item.value === "boolean"
                ? item.value ? theme.success : theme.error
                : theme.secondary}
            >
              {displayValue}
            </Text>
          </Box>
        );
      })}
    </Box>
  );

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

      {/* Server Settings */}
      {renderSection("Server", serverItems, 0)}

      {/* RCON Settings */}
      {renderSection("RCON (Remote Console)", rconItems, serverItems.length)}

      {/* RCON Status */}
      {rcon.enabled && (
        <Box marginTop={1}>
          <Text dimColor>RCON Status:</Text>
          <Text color={rcon.connected ? theme.success : theme.error}>
            {rcon.connected ? "Connected" : "Disconnected"}
          </Text>
        </Box>
      )}

      {/* Footer hint */}
      <Box marginTop={1}>
        <Text dimColor>Note: Restart server for changes to take effect</Text>
      </Box>
    </Box>
  );
};
