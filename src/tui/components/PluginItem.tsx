/**
 * PluginItem component
 * Renders a single plugin row in the Plugins screen
 */

import { Box, Text } from "ink";
import type { FC } from "react";
import { theme } from "../theme.js";
import { Spinner } from "./Spinner.js";

/** Props for PluginItem */
type PluginItemProps = {
  /** Plugin name */
  name: string;
  /** Plugin description */
  description: string;
  /** Whether the plugin is installed */
  installed: boolean;
  /** Whether the plugin is enabled */
  enabled: boolean;
  /** Plugin version (from definition) */
  version: string;
  /** Whether this item is currently selected */
  selected: boolean;
  /** Whether installation is in progress */
  installing: boolean;
  /** Plugin author */
  author: string;
};

/**
 * Single plugin row with status indicators
 */
export const PluginItem: FC<PluginItemProps> = ({
  name,
  description,
  installed,
  enabled,
  version,
  selected,
  installing,
  author,
}) => {
  const indicator = selected ? "▶" : " ";
  const statusIcon = installing ? "" : installed ? (enabled ? "●" : "○") : "○";
  const statusColor = installed
    ? enabled
      ? theme.success
      : theme.warning
    : theme.muted;
  const statusText = installing
    ? ""
    : installed
      ? enabled
        ? "Enabled"
        : "Disabled"
      : "Not installed";

  return (
    <Box flexDirection="column" marginBottom={0}>
      <Box flexShrink={0}>
        <Text color={selected ? theme.primary : theme.muted}>{indicator} </Text>
        {installing ? (
          <Spinner />
        ) : (
          <Text color={statusColor}>{statusIcon} </Text>
        )}
        <Text bold color={selected ? theme.primary : undefined}>
          {name}
        </Text>
        <Text dimColor> by {author}</Text>
      </Box>
      <Box marginLeft={4} flexShrink={0}>
        <Text dimColor>{description}</Text>
      </Box>
      <Box marginLeft={4} flexShrink={0}>
        <Text color={statusColor}>{statusText}</Text>
        {installed && <Text dimColor> v{version}</Text>}
      </Box>
    </Box>
  );
};
