/**
 * Worlds screen - World management
 */

import { Box, Text, useInput } from "ink";
import { type FC, useCallback, useEffect, useState } from "react";
import { getSourceLabel } from "../../valheim/worlds.js";
import { DeleteWorldModal } from "../components/Modal.js";
import { Spinner } from "../components/Spinner.js";
import { TextInput } from "../components/TextInput.js";
import { useConfig } from "../hooks/useConfig.js";
import { useWorlds } from "../hooks/useWorlds.js";
import { useStore } from "../store.js";
import { theme } from "../theme.js";

type Mode = "list" | "create" | "import" | "export" | "backup";

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
 * Formats backup timestamp (YYYYMMDDHHMMSS) to readable format
 */
function formatBackupTimestamp(timestamp: string): string {
  if (timestamp.length !== 14) return timestamp;
  const year = timestamp.slice(0, 4);
  const month = timestamp.slice(4, 6);
  const day = timestamp.slice(6, 8);
  const hour = timestamp.slice(8, 10);
  const min = timestamp.slice(10, 12);
  return `${year}-${month}-${day} ${hour}:${min}`;
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
    pendingWorldNames,
    addPendingWorld,
  } = useWorlds();

  const modalOpen = useStore((s) => s.ui.modalOpen);
  const openModal = useStore((s) => s.actions.openModal);
  const closeModal = useStore((s) => s.actions.closeModal);
  const addLog = useStore((s) => s.actions.addLog);
  const serverStatus = useStore((s) => s.server.status);
  const worldGenerating = useStore((s) => s.server.worldGenerating);
  const setEditingField = useStore((s) => s.actions.setEditingField);

  const [mode, setModeInternal] = useState<Mode>("list");
  const [inputPath, setInputPath] = useState("");
  const [newWorldName, setNewWorldName] = useState("");
  const [newWorldSeed, setNewWorldSeed] = useState("");
  const [createStep, setCreateStep] = useState<"name" | "seed">("name");
  const [loading, setLoading] = useState(false);
  const [operationStatus, setOperationStatus] = useState("");
  // Track if the "not generated" pending config at the top is selected
  const [pendingConfigSelected, setPendingConfigSelected] = useState(false);
  const [prevServerStatus, setPrevServerStatus] = useState(serverStatus);
  const [prevWorldGenerating, setPrevWorldGenerating] =
    useState(worldGenerating);

  // Check if there's a configured world that doesn't exist in the worlds list
  const hasPendingConfig =
    config.world && !worlds.some((w) => w.name === config.world);

  // Get all pending worlds that are not the active config (show separately in list)
  const otherPendingWorlds = pendingWorldNames.filter(
    (name) => name !== config.world && !worlds.some((w) => w.name === name)
  );

  // Get selected world name for display (account for pending config)
  const selectedWorld = pendingConfigSelected
    ? null
    : (worlds[selectedIndex]?.name ?? null);

  // Wrapper to set mode and update editingField for global input prevention
  const setMode = useCallback(
    (newMode: Mode) => {
      setModeInternal(newMode);
      // Set editingField when in input modes to prevent global shortcuts
      setEditingField(newMode === "list" ? null : `worlds-${newMode}`);
    },
    [setEditingField]
  );

  // Refresh worlds on mount
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Auto-refresh when server comes online (new world may have been created)
  useEffect(() => {
    if (prevServerStatus !== "online" && serverStatus === "online") {
      // Server just came online, refresh to pick up any new world files
      const timer = setTimeout(() => {
        refresh();
        addLog("info", "Refreshed worlds list after server started");
      }, 2000); // Small delay to let Valheim create world files
      return () => clearTimeout(timer);
    }
    setPrevServerStatus(serverStatus);
  }, [serverStatus, prevServerStatus, refresh, addLog]);

  // Auto-refresh when world generation completes
  useEffect(() => {
    if (prevWorldGenerating && !worldGenerating) {
      // World generation just completed, refresh worlds list
      refresh();
      addLog("info", "Refreshed worlds list after world generation completed");
    }
    setPrevWorldGenerating(worldGenerating);
  }, [worldGenerating, prevWorldGenerating, refresh, addLog]);

  // Reset pending config selection when it no longer exists
  useEffect(() => {
    if (!hasPendingConfig && pendingConfigSelected) {
      setPendingConfigSelected(false);
    }
  }, [hasPendingConfig, pendingConfigSelected]);

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

  // Handle create new world
  const handleCreateWorld = useCallback(async () => {
    if (!newWorldName.trim()) {
      addLog("error", "Please enter a world name");
      return;
    }

    const worldName = newWorldName.trim();

    // Check if world already exists
    const existingWorld = worlds.find(
      (w) => w.name.toLowerCase() === worldName.toLowerCase()
    );
    if (existingWorld) {
      addLog("error", `World "${worldName}" already exists`);
      return;
    }

    if (serverStatus !== "offline") {
      addLog("warn", "Stop the server before creating a new world");
      return;
    }

    try {
      // Set the new world as active - Valheim will create it on server start
      await setActive(worldName);
      await updateServerConfig({ world: worldName });
      // Track as pending until server generates the files
      addPendingWorld(worldName);
      addLog("info", `Created world configuration: ${worldName}`);
      addLog("info", "Start the server to generate the world files");

      // Reset and return to list
      setMode("list");
      setNewWorldName("");
      setNewWorldSeed("");
      setCreateStep("name");
    } catch (err) {
      addLog("error", `Failed to create world: ${err}`);
    }
  }, [
    newWorldName,
    worlds,
    serverStatus,
    setActive,
    updateServerConfig,
    addPendingWorld,
    addLog,
    setMode,
  ]);

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
  }, [inputPath, importWorld, refresh, addLog, setMode]);

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
  }, [getSelectedWorld, inputPath, exportWorld, addLog, setMode]);

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
  }, [getSelectedWorld, inputPath, backupWorld, addLog, setMode]);

  // Handle delete confirmation
  const handleDeleteConfirm = useCallback(
    async (includeBackups: boolean) => {
      closeModal();
      const world = getSelectedWorld();
      if (!world) return;

      if (world.name === config.world) {
        addLog("error", "Cannot delete the active world");
        return;
      }

      setLoading(true);
      setOperationStatus(
        includeBackups ? "Deleting world and backups..." : "Deleting world..."
      );

      try {
        await deleteWorld(world.name, includeBackups);
        const backupMsg =
          includeBackups && world.backups?.length
            ? ` and ${world.backups.length} backup${world.backups.length === 1 ? "" : "s"}`
            : "";
        addLog("info", `Deleted world: ${world.name}${backupMsg}`);
        await refresh();
      } catch (err) {
        addLog("error", `Delete failed: ${err}`);
      } finally {
        setLoading(false);
        setOperationStatus("");
      }
    },
    [closeModal, getSelectedWorld, config.world, deleteWorld, refresh, addLog]
  );

  // Handle input in list mode
  useInput(
    (input, key) => {
      if (modalOpen || loading) return;

      // Navigation
      if (key.upArrow || input === "k") {
        if (pendingConfigSelected) {
          // Already at top, do nothing
          return;
        }
        if (selectedIndex > 0) {
          select(selectedIndex - 1);
        } else if (selectedIndex === 0 && hasPendingConfig) {
          // Move to pending config at top
          setPendingConfigSelected(true);
        }
        return;
      }
      if (key.downArrow || input === "j") {
        if (pendingConfigSelected) {
          // Move from pending config to first world
          if (worlds.length > 0) {
            setPendingConfigSelected(false);
            select(0);
          }
          return;
        }
        if (selectedIndex < worlds.length - 1) select(selectedIndex + 1);
        return;
      }

      // Enter to set active
      if (key.return) {
        if (pendingConfigSelected) {
          // Already active, just inform user
          addLog("info", `"${config.world}" is already the active world`);
          return;
        }
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
            <DeleteWorldModal
              worldName={world.name}
              backupCount={world.backups?.length ?? 0}
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

      // Create new world
      if (input === "n" || input === "N") {
        if (serverStatus !== "offline") {
          addLog("warn", "Stop the server before creating a new world");
          return;
        }
        setMode("create");
        setCreateStep("name");
        return;
      }
    },
    { isActive: mode === "list" }
  );

  // Handle cancel in input modes
  const handleInputCancel = useCallback(() => {
    setMode("list");
    setInputPath("");
    setNewWorldName("");
    setNewWorldSeed("");
    setCreateStep("name");
  }, [setMode]);

  // Handle submit in input modes
  const handleInputSubmit = useCallback(() => {
    switch (mode) {
      case "create":
        if (createStep === "name") {
          // Move to seed step (optional)
          setCreateStep("seed");
        } else {
          handleCreateWorld();
        }
        break;
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
  }, [
    mode,
    createStep,
    handleCreateWorld,
    handleImport,
    handleExport,
    handleBackup,
  ]);

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

  // Render create world mode
  if (mode === "create") {
    return (
      <Box flexDirection="column" flexGrow={1} padding={1}>
        <Box marginBottom={1}>
          <Text bold color={theme.primary}>
            ─ Create New World ─
          </Text>
        </Box>

        {loading ? (
          <Spinner label={operationStatus} />
        ) : createStep === "name" ? (
          <>
            <Box marginBottom={1}>
              <Text>Enter a name for your new world:</Text>
            </Box>
            <Box>
              <TextInput
                value={newWorldName}
                onChange={setNewWorldName}
                onSubmit={handleInputSubmit}
                onCancel={handleInputCancel}
                placeholder="MyWorld"
                focus={true}
              />
            </Box>
            <Box marginTop={1}>
              <Text dimColor>Enter to continue, Esc to cancel</Text>
            </Box>
          </>
        ) : (
          <>
            <Box marginBottom={1}>
              <Text>World: </Text>
              <Text color={theme.primary} bold>
                {newWorldName}
              </Text>
            </Box>
            <Box marginBottom={1}>
              <Text>Enter a seed (optional, leave empty for random):</Text>
            </Box>
            <Box>
              <TextInput
                value={newWorldSeed}
                onChange={setNewWorldSeed}
                onSubmit={handleInputSubmit}
                onCancel={handleInputCancel}
                placeholder="Leave empty for random seed"
                focus={true}
              />
            </Box>
            <Box marginTop={1}>
              <Text dimColor>Enter to create world, Esc to cancel</Text>
            </Box>
            <Box marginTop={1}>
              <Text color={theme.warning}>
                Note: Start the server to generate the world files
              </Text>
            </Box>
          </>
        )}
      </Box>
    );
  }

  // Render input mode (import/export/backup)
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
          ↑/↓ Navigate | Enter Set Active | N New | I Import | E Export | B
          Backup | D Delete | R Refresh
        </Text>
      </Box>

      {/* Worlds List */}
      <Box flexDirection="column" overflow="hidden">
        {/* Show pending world if configured but not yet generated */}
        {hasPendingConfig && (
          <Box
            flexDirection="column"
            flexShrink={0}
            borderStyle={
              pendingConfigSelected || worlds.length === 0
                ? "single"
                : undefined
            }
            borderColor={
              pendingConfigSelected || worlds.length === 0
                ? theme.primary
                : undefined
            }
            paddingX={pendingConfigSelected || worlds.length === 0 ? 1 : 0}
            marginBottom={1}
          >
            <Box flexShrink={0}>
              <Text
                color={pendingConfigSelected ? theme.primary : undefined}
                bold
              >
                {config.world}
              </Text>
              <Text color={theme.success}> (Active)</Text>
              {worldGenerating ? (
                <Box marginLeft={1}>
                  <Spinner />
                  <Text color={theme.warning}> Generating...</Text>
                </Box>
              ) : serverStatus === "starting" ? (
                <Box marginLeft={1}>
                  <Spinner />
                  <Text color={theme.info}> Server starting...</Text>
                </Box>
              ) : (
                <Text color={theme.warning}> - Not generated</Text>
              )}
            </Box>
            <Box marginLeft={2} flexShrink={0}>
              {worldGenerating ? (
                <Text dimColor>
                  New world is being generated (this may take ~1 minute)
                </Text>
              ) : (
                <Text dimColor>Start the server to generate this world</Text>
              )}
            </Box>
          </Box>
        )}

        {worlds.length === 0 && !config.world ? (
          <Text dimColor>No worlds found. Press N to create one.</Text>
        ) : (
          worlds.map((world) => {
            const isSelected = world.name === selectedWorld;
            const isActive = world.name === config.world;

            return (
              <Box
                key={world.name}
                flexDirection="column"
                flexShrink={0}
                borderStyle={isSelected ? "single" : undefined}
                borderColor={isSelected ? theme.primary : undefined}
                paddingX={isSelected ? 1 : 0}
                marginBottom={1}
              >
                <Box flexShrink={0}>
                  <Text color={isSelected ? theme.primary : undefined} bold>
                    {world.name}
                  </Text>
                  {isActive && <Text color={theme.success}> (Active)</Text>}
                  {world.pendingSave && (
                    <Text color={theme.warning}> - Pending Save</Text>
                  )}
                  {world.backups && world.backups.length > 0 && (
                    <Text color={theme.info}>
                      {" "}
                      [{world.backups.length} backup
                      {world.backups.length === 1 ? "" : "s"}]
                    </Text>
                  )}
                </Box>
                <Box marginLeft={2} flexShrink={0}>
                  {world.pendingSave ? (
                    <Text dimColor>
                      World generated but not yet saved to disk
                    </Text>
                  ) : (
                    <>
                      <Text dimColor>Size: {formatBytes(world.size)}</Text>
                      <Text dimColor> | </Text>
                      <Text dimColor>{getSourceLabel(world.source)}</Text>
                    </>
                  )}
                </Box>
                {!world.pendingSave && (
                  <Box marginLeft={2} flexShrink={0}>
                    <Text dimColor>Modified: {formatDate(world.modified)}</Text>
                  </Box>
                )}
                {/* Show backup summaries when selected */}
                {isSelected && world.backups && world.backups.length > 0 && (
                  <Box marginLeft={2} flexDirection="column" flexShrink={0}>
                    <Text dimColor>Backups:</Text>
                    {world.backups.slice(0, 3).map((backup) => (
                      <Box key={backup.name} marginLeft={2}>
                        <Text dimColor>
                          •{" "}
                          {formatBackupTimestamp(backup.backupTimestamp ?? "")}
                          {backup.pendingSave
                            ? " (pending)"
                            : ` (${formatBytes(backup.size)})`}
                        </Text>
                      </Box>
                    ))}
                    {world.backups.length > 3 && (
                      <Box marginLeft={2}>
                        <Text dimColor>
                          ... and {world.backups.length - 3} more
                        </Text>
                      </Box>
                    )}
                  </Box>
                )}
              </Box>
            );
          })
        )}

        {/* Other pending worlds (configured but not yet generated, and not active) */}
        {otherPendingWorlds.map((name) => (
          <Box
            key={`pending-${name}`}
            flexDirection="column"
            flexShrink={0}
            marginBottom={1}
          >
            <Box flexShrink={0}>
              <Text dimColor>{name}</Text>
              <Text color={theme.warning}> - Not generated</Text>
            </Box>
            <Box marginLeft={2} flexShrink={0}>
              <Text dimColor>
                Set as active and start the server to generate
              </Text>
            </Box>
          </Box>
        ))}
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
