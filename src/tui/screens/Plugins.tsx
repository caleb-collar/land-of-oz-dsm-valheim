/**
 * Plugins screen - BepInEx and plugin management
 */

import { Box, Text, useInput } from "ink";
import { type FC, useState } from "react";
import { SUPPORTED_PLUGINS } from "../../bepinex/mod.js";
import { ConfirmModal } from "../components/Modal.js";
import { PluginItem } from "../components/PluginItem.js";
import { Spinner } from "../components/Spinner.js";
import { usePlugins } from "../hooks/usePlugins.js";
import { useStore } from "../store.js";
import { theme } from "../theme.js";

/** Props for Plugins screen */
type PluginsProps = Record<string, never>;

/**
 * Plugins screen for managing BepInEx framework and server plugins
 */
export const Plugins: FC<PluginsProps> = () => {
  const modalOpen = useStore((s) => s.ui.modalOpen);
  const openModal = useStore((s) => s.actions.openModal);
  const closeModal = useStore((s) => s.actions.closeModal);
  const valheimInstalled = useStore((s) => s.valheim.installed);

  const {
    bepInExInstalled,
    bepInExInstalling,
    bepInExVersion,
    bepInExPath,
    installProgress,
    installPercent,
    plugins,
    installBepInEx,
    uninstallBepInEx,
    installPlugin,
    uninstallPlugin,
    togglePlugin,
    refreshPlugins,
  } = usePlugins();

  const [selectedIndex, setSelectedIndex] = useState(0);
  const pluginCount = SUPPORTED_PLUGINS.length;

  // Handle keyboard input
  useInput((input, key) => {
    if (modalOpen) return;

    // Navigation
    if (key.upArrow) {
      setSelectedIndex((prev) => Math.max(0, prev - 1));
    }
    if (key.downArrow) {
      setSelectedIndex((prev) => Math.min(pluginCount - 1, prev + 1));
    }

    // B = Install/Reinstall BepInEx
    if (input === "b" || input === "B") {
      if (!valheimInstalled) return;
      const action = bepInExInstalled ? "Reinstall" : "Install";
      openModal(
        <ConfirmModal
          message={`${action} BepInEx framework? This is required for all plugins.`}
          onConfirm={() => {
            closeModal();
            installBepInEx();
          }}
          onCancel={closeModal}
        />
      );
    }

    // I = Install selected plugin
    if (input === "i" || input === "I") {
      if (!bepInExInstalled) return;
      const pluginDef = SUPPORTED_PLUGINS[selectedIndex];
      if (!pluginDef) return;
      const plugin = plugins.find((p) => p.id === pluginDef.id);
      if (plugin?.installed) return;

      openModal(
        <ConfirmModal
          message={`Install ${pluginDef.name}? Server restart required for changes to take effect.`}
          onConfirm={() => {
            closeModal();
            installPlugin(pluginDef.id);
          }}
          onCancel={closeModal}
        />
      );
    }

    // U = Uninstall selected plugin
    if (input === "u" || input === "U") {
      if (!bepInExInstalled) return;
      const pluginDef = SUPPORTED_PLUGINS[selectedIndex];
      if (!pluginDef) return;
      const plugin = plugins.find((p) => p.id === pluginDef.id);
      if (!plugin?.installed) return;

      openModal(
        <ConfirmModal
          message={`Uninstall ${pluginDef.name}? Server restart required.`}
          onConfirm={() => {
            closeModal();
            uninstallPlugin(pluginDef.id);
          }}
          onCancel={closeModal}
        />
      );
    }

    // E = Enable/Disable selected plugin
    if (input === "e" || input === "E") {
      if (!bepInExInstalled) return;
      const pluginDef = SUPPORTED_PLUGINS[selectedIndex];
      if (!pluginDef) return;
      const plugin = plugins.find((p) => p.id === pluginDef.id);
      if (!plugin?.installed) return;

      togglePlugin(pluginDef.id);
    }

    // R = Refresh
    if (input === "r" || input === "R") {
      refreshPlugins();
    }

    // X = Uninstall BepInEx
    if (input === "x" || input === "X") {
      if (!bepInExInstalled) return;
      openModal(
        <ConfirmModal
          message="Uninstall BepInEx and all plugins? This cannot be undone."
          onConfirm={() => {
            closeModal();
            uninstallBepInEx();
          }}
          onCancel={closeModal}
        />
      );
    }
  });

  // Valheim not installed
  if (!valheimInstalled) {
    return (
      <Box flexDirection="column" flexGrow={1} padding={1}>
        <Box marginBottom={1}>
          <Text bold color={theme.primary}>
            ─ Plugins ─
          </Text>
        </Box>
        <Box flexDirection="column" padding={1}>
          <Text color={theme.warning}>
            Valheim Dedicated Server must be installed first.
          </Text>
          <Text dimColor>Go to Dashboard (press 1) to install.</Text>
        </Box>
      </Box>
    );
  }

  // BepInEx installing
  if (bepInExInstalling) {
    return (
      <Box flexDirection="column" flexGrow={1} padding={1}>
        <Box marginBottom={1}>
          <Text bold color={theme.primary}>
            ─ Plugins ─
          </Text>
        </Box>
        <Box
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          flexGrow={1}
        >
          <Spinner label="Installing BepInEx..." />
          {installProgress && (
            <Box marginTop={1}>
              <Text dimColor>
                {installProgress}
                {installPercent > 0 && ` (${installPercent}%)`}
              </Text>
            </Box>
          )}
        </Box>
      </Box>
    );
  }

  const installedCount = plugins.filter((p) => p.installed).length;

  return (
    <Box flexDirection="column" flexGrow={1} padding={1} overflow="hidden">
      {/* Title */}
      <Box marginBottom={1}>
        <Text bold color={theme.primary}>
          ─ Plugins ─
        </Text>
      </Box>

      {/* BepInEx Framework Status */}
      <Box flexDirection="column" marginBottom={1}>
        <Text bold>BepInEx Framework</Text>
        <Box marginLeft={2} flexDirection="column">
          <Box flexShrink={0}>
            <Text>Status: </Text>
            {bepInExInstalled === null ? (
              <Text dimColor>Checking...</Text>
            ) : bepInExInstalled ? (
              <Text color={theme.success}>
                ● Installed{bepInExVersion ? ` (v${bepInExVersion})` : ""}
              </Text>
            ) : (
              <Text color={theme.warning}>○ Not Installed</Text>
            )}
          </Box>
          {bepInExInstalled && bepInExPath && (
            <Box flexShrink={0}>
              <Text>Location: </Text>
              <Text dimColor>{bepInExPath}</Text>
            </Box>
          )}
        </Box>
      </Box>

      {/* Separator */}
      <Box flexShrink={0}>
        <Text dimColor>─────────────────────────────────</Text>
      </Box>

      {/* Installed Plugins */}
      <Box flexDirection="column" marginTop={1} marginBottom={1}>
        <Text bold>
          Installed Plugins ({installedCount}/{pluginCount})
        </Text>
        <Box marginLeft={2} marginTop={1} flexDirection="column">
          <Text dimColor italic>
            Server Admin Plugins (no client install required)
          </Text>
          <Box marginTop={1} flexDirection="column">
            {SUPPORTED_PLUGINS.map((pluginDef, index) => {
              const pluginState = plugins.find((p) => p.id === pluginDef.id);
              return (
                <PluginItem
                  key={pluginDef.id}
                  name={pluginDef.name}
                  description={pluginDef.description}
                  installed={pluginState?.installed ?? false}
                  enabled={pluginState?.enabled ?? false}
                  version={pluginDef.version}
                  selected={index === selectedIndex}
                  installing={pluginState?.installing ?? false}
                  author={pluginDef.author}
                />
              );
            })}
          </Box>
        </Box>
      </Box>

      {/* Separator */}
      <Box flexShrink={0}>
        <Text dimColor>─────────────────────────────────</Text>
      </Box>

      {/* Actions */}
      <Box flexDirection="column" marginTop={1}>
        <Text bold>Actions</Text>
        <Box marginLeft={2} marginTop={1} flexDirection="column">
          <Box flexShrink={0}>
            <Text color={theme.info}>[B] </Text>
            <Text>{bepInExInstalled ? "Reinstall" : "Install"} BepInEx</Text>
          </Box>
          {bepInExInstalled && (
            <>
              <Box flexShrink={0}>
                <Text color={theme.success}>[I] </Text>
                <Text>Install Selected</Text>
              </Box>
              <Box flexShrink={0}>
                <Text color={theme.error}>[U] </Text>
                <Text>Uninstall Selected</Text>
              </Box>
              <Box flexShrink={0}>
                <Text color={theme.warning}>[E] </Text>
                <Text>Enable/Disable Selected</Text>
              </Box>
              <Box flexShrink={0}>
                <Text color={theme.info}>[R] </Text>
                <Text>Refresh</Text>
              </Box>
              <Box flexShrink={0}>
                <Text color={theme.error}>[X] </Text>
                <Text>Uninstall BepInEx</Text>
              </Box>
            </>
          )}
        </Box>
      </Box>

      {/* Note */}
      <Box marginTop={1} flexShrink={0}>
        <Text dimColor italic>
          Note: Server restart required for plugin changes
        </Text>
      </Box>
    </Box>
  );
};
