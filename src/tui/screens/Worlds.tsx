/**
 * Worlds screen - World management
 */

import { Box, Text, useInput } from "ink";
import { type FC, useCallback, useEffect, useState } from "react";
import { ConfirmModal } from "../components/Modal.js";
import { Spinner } from "../components/Spinner.js";
import { TextInput } from "../components/TextInput.js";
import { useConfig } from "../hooks/useConfig.js";
import { useWorlds } from "../hooks/useWorlds.js";
import { useStore } from "../store.js";
import { theme } from "../theme.js";

type Mode = "list" | "import" | "export" | "backup";

/**
 * Formats bytes to human-readable size
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
}

/**
 * Formats timestamp to relative date
 */
function formatDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
}

/**
 * Worlds screen for managing Valheim worlds
 */
export const Worlds: FC = () => {
  const { config, updateServerConfig } = useConfig();
  const {
    worlds,
    loading: worldsLoading,
    error,
    selectedIndex,
    refresh,
    select,
    setActive,
    importWorld,
    exportWorld,
    deleteWorld,
    backupWorld,
    getSelectedWorld,
  } = useWorlds();

  // Get selected world name for display
  const selectedWorld = worlds[selectedIndex]?.name ?? null;

  const modalOpen = useStore((s) => s.ui.modalOpen);
  const openModal = useStore((s) => s.actions.openModal);
  const closeModal = useStore((s) => s.actions.closeModal);
  const addLog = useStore((s) => s.actions.addLog);
  const serverStatus = useStore((s) => s.server.status);

  const [mode, setMode] = useState<Mode>("list");
  const [inputPath, setInputPath] = useState("");
  const [loading, setLoading] = useState(false);
  const [operationStatus, setOperationStatus] = useState("");

  // Refresh worlds on mount
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Handle setting active world
  const handleSetActive = useCallback(async () => {
    const world = getSelectedWorld();
    if (!world) return;

    if (serverStatus !== "offline") {
      addLog("warn", "Stop the server before changing worlds");
      return;
    }

    try {
      await setActive(world.name);
      await updateServerConfig({ world: world.name });
      addLog("info", `Set active world to: ${world.name}`);
    } catch (err) {
      addLog("error", `Failed to set world: ${err}`);
    }
  }, [getSelectedWorld, serverStatus, setActive, updateServerConfig, addLog]);

  // Handle import
  const handleImport = useCallback(async () => {
    if (!inputPath.trim()) {
      addLog("error", "Please enter a path to import from");
      return;
    }

    setLoading(true);
    setOperationStatus("Importing world...");

    try {
      await importWorld(inputPath.trim());
      addLog("info", `Imported world from: ${inputPath}`);
      await refresh();
      setMode("list");
      setInputPath("");
    } catch (err) {
      addLog("error", `Import failed: ${err}`);
    } finally {
      setLoading(false);
      setOperationStatus("");
    }
  }, [inputPath, importWorld, refresh, addLog]);

  // Handle export
  const handleExport = useCallback(async () => {
    const world = getSelectedWorld();
    if (!world || !inputPath.trim()) {
      addLog("error", "Please enter a path to export to");
      return;
    }

    setLoading(true);
    setOperationStatus("Exporting world...");

    try {
      await exportWorld(world.name, inputPath.trim());
      addLog("info", `Exported ${world.name} to: ${inputPath}`);
      setMode("list");
      setInputPath("");
    } catch (err) {
      addLog("error", `Export failed: ${err}`);
    } finally {
      setLoading(false);
      setOperationStatus("");
    }
  }, [getSelectedWorld, inputPath, exportWorld, addLog]);

  // Handle backup
  const handleBackup = useCallback(async () => {
    const world = getSelectedWorld();
    if (!world || !inputPath.trim()) {
      addLog("error", "Please enter a path for the backup");
      return;
    }

    setLoading(true);
    setOperationStatus("Creating backup...");

    try {
      await backupWorld(world.name, inputPath.trim());
      addLog("info", `Backed up ${world.name} to: ${inputPath}`);
      setMode("list");
      setInputPath("");
    } catch (err) {
      addLog("error", `Backup failed: ${err}`);
    } finally {
      setLoading(false);
      setOperationStatus("");
    }
  }, [getSelectedWorld, inputPath, backupWorld, addLog]);

  // Handle delete confirmation
  const handleDeleteConfirm = useCallback(async () => {
    closeModal();
    const world = getSelectedWorld();
    if (!world) return;

    if (world.name === config.world) {
      addLog("error", "Cannot delete the active world");
      return;
    }

    setLoading(true);
    setOperationStatus("Deleting world...");

    try {
      await deleteWorld(world.name);
      addLog("info", `Deleted world: ${world.name}`);
      await refresh();
    } catch (err) {
      addLog("error", `Delete failed: ${err}`);
    } finally {
      setLoading(false);
      setOperationStatus("");
    }
  }, [
    closeModal,
    getSelectedWorld,
    config.world,
    deleteWorld,
    refresh,
    addLog,
  ]);

  // Handle input in list mode
  useInput(
    (input, key) => {
      if (modalOpen || loading) return;

      // Navigation
      if (key.upArrow || input === "k") {
        if (selectedIndex > 0) select(selectedIndex - 1);
        return;
      }
      if (key.downArrow || input === "j") {
        if (selectedIndex < worlds.length - 1) select(selectedIndex + 1);
        return;
      }

      // Enter to set active
      if (key.return) {
        handleSetActive();
        return;
      }

      // Import
      if (input === "i" || input === "I") {
        setMode("import");
        return;
      }

      // Export
      if (input === "e" || input === "E") {
        if (getSelectedWorld()) {
          setMode("export");
        }
        return;
      }

      // Backup
      if (input === "b" || input === "B") {
        if (getSelectedWorld()) {
          setMode("backup");
        }
        return;
      }

      // Delete
      if (input === "d" || input === "D") {
        const world = getSelectedWorld();
        if (world && world.name !== config.world) {
          openModal(
            <ConfirmModal
              message={`Delete world "${world.name}"? This cannot be undone!`}
              onConfirm={handleDeleteConfirm}
              onCancel={closeModal}
            />
          );
        }
        return;
      }

      // Refresh
      if (input === "r" || input === "R") {
        refresh();
        addLog("info", "Refreshing world list...");
        return;
      }
    },
    { isActive: mode === "list" }
  );

  // Handle cancel in input modes
  const handleInputCancel = useCallback(() => {
    setMode("list");
    setInputPath("");
  }, []);

  // Handle submit in input modes
  const handleInputSubmit = useCallback(() => {
    switch (mode) {
      case "import":
        handleImport();
        break;
      case "export":
        handleExport();
        break;
      case "backup":
        handleBackup();
        break;
    }
  }, [mode, handleImport, handleExport, handleBackup]);

  // Render loading state
  if (worldsLoading && worlds.length === 0) {
    return (
      <Box flexDirection="column" flexGrow={1} padding={1}>
        <Box marginBottom={1}>
          <Text bold color={theme.primary}>
            ─ Worlds ─
          </Text>
        </Box>
        <Spinner label="Loading worlds..." />
      </Box>
    );
  }

  // Render error state
  if (error && worlds.length === 0) {
    return (
      <Box flexDirection="column" flexGrow={1} padding={1}>
        <Box marginBottom={1}>
          <Text bold color={theme.primary}>
            ─ Worlds ─
          </Text>
        </Box>
        <Text color={theme.error}>Error: {error}</Text>
        <Box marginTop={1}>
          <Text dimColor>Press R to retry</Text>
        </Box>
      </Box>
    );
  }

  // Render input mode
  if (mode !== "list") {
    const modeTitle =
      mode === "import"
        ? "Import World"
        : mode === "export"
          ? "Export World"
          : "Backup World";
    const modeHint =
      mode === "import"
        ? "Enter path to world folder or .db file"
        : mode === "export"
          ? `Export "${selectedWorld}" to path`
          : `Backup "${selectedWorld}" to path`;

    return (
      <Box flexDirection="column" flexGrow={1} padding={1}>
        <Box marginBottom={1}>
          <Text bold color={theme.primary}>
            ─ {modeTitle} ─
          </Text>
        </Box>

        {loading ? (
          <Spinner label={operationStatus} />
        ) : (
          <>
            <Box marginBottom={1}>
              <Text>{modeHint}:</Text>
            </Box>
            <Box>
              <TextInput
                value={inputPath}
                onChange={setInputPath}
                onSubmit={handleInputSubmit}
                onCancel={handleInputCancel}
                placeholder="Enter path..."
                focus={true}
              />
            </Box>
            <Box marginTop={1}>
              <Text dimColor>Enter to confirm, Esc to cancel</Text>
            </Box>
          </>
        )}
      </Box>
    );
  }

  // Render list mode
  return (
    <Box flexDirection="column" flexGrow={1} padding={1} overflow="hidden">
      {/* Title */}
      <Box marginBottom={1}>
        <Text bold color={theme.primary}>
          ─ Worlds ─
        </Text>
        {worldsLoading && <Spinner />}
      </Box>

      {/* Help */}
      <Box marginBottom={1}>
        <Text dimColor>
          ↑/↓ Navigate | Enter Set Active | I Import | E Export | B Backup | D
          Delete | R Refresh
        </Text>
      </Box>

      {/* Worlds List */}
      <Box flexDirection="column" overflow="hidden">
        {worlds.length === 0 ? (
          <Text dimColor>No worlds found</Text>
        ) : (
          worlds.map((world) => {
            const isSelected = world.name === selectedWorld;
            const isActive = world.name === config.world;

            return (
              <Box
                key={world.name}
                flexDirection="column"
                borderStyle={isSelected ? "single" : undefined}
                borderColor={isSelected ? theme.primary : undefined}
                paddingX={isSelected ? 1 : 0}
                marginBottom={1}
              >
                <Box>
                  <Text color={isSelected ? theme.primary : undefined} bold>
                    {world.name}
                  </Text>
                  {isActive && <Text color={theme.success}> (Active)</Text>}
                </Box>
                <Box marginLeft={2}>
                  <Text dimColor>Size: {formatBytes(world.size)}</Text>
                </Box>
                <Box marginLeft={2}>
                  <Text dimColor>Modified: {formatDate(world.modified)}</Text>
                </Box>
              </Box>
            );
          })
        )}
      </Box>

      {/* Status bar */}
      {operationStatus && (
        <Box marginTop={1}>
          <Text dimColor>{operationStatus}</Text>
        </Box>
      )}

      {/* Server status hint */}
      {serverStatus !== "offline" && (
        <Box marginTop={1}>
          <Text color={theme.warning}>
            Stop the server to change or delete worlds
          </Text>
        </Box>
      )}
    </Box>
  );
};
