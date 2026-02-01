/**
 * Root App component for the TUI
 * Three-zone layout: Header, Main Content (Menu + Screen), Log Feed
 *
 * Layout achieved with pure flexbox - withFullScreen from fullscreen-ink
 * automatically wraps this in a FullScreenBox that fills the terminal.
 */

import { Box, useApp, useInput } from "ink";
import { type FC, useEffect } from "react";
import { Header } from "./components/Header.js";
import { HelpOverlay } from "./components/HelpOverlay.js";
import { LogFeed } from "./components/LogFeed.js";
import { Menu } from "./components/Menu.js";
import { useConfigSync } from "./hooks/useConfig.js";
import { Console } from "./screens/Console.js";
import { Dashboard } from "./screens/Dashboard.js";
import { Settings } from "./screens/Settings.js";
import { Worlds } from "./screens/Worlds.js";
import { cleanupOnExit } from "./serverManager.js";
import { type Screen, useStore } from "./store.js";
import { theme } from "./theme.js";

/** Screen component mapping */
const screens: Record<Screen, FC> = {
  dashboard: Dashboard,
  settings: Settings,
  worlds: Worlds,
  console: Console,
};

/**
 * Main TUI Application component
 * Uses fullscreen-ink which wraps this in a FullScreenBox
 */
export const App: FC = () => {
  const { exit } = useApp();
  const activeScreen = useStore((s) => s.ui.activeScreen);
  const modalOpen = useStore((s) => s.ui.modalOpen);
  const modalContent = useStore((s) => s.ui.modalContent);
  const editingField = useStore((s) => s.ui.editingField);
  const setScreen = useStore((s) => s.actions.setScreen);
  const openModal = useStore((s) => s.actions.openModal);
  const addLog = useStore((s) => s.actions.addLog);

  // Sync configuration on mount
  useConfigSync();

  // Log startup message
  useEffect(() => {
    addLog("info", "TUI started");
    addLog("info", "Press 1-4 to navigate, ? for help, Q to quit");
  }, [addLog]);

  // Global keyboard handling
  useInput((input, key) => {
    // Don't handle global keys when modal is open or editing a field
    if (modalOpen || editingField) return;

    // Quit - use useApp().exit() for proper fullscreen cleanup
    if (input === "q" || input === "Q" || (key.ctrl && input === "c")) {
      addLog("info", "Shutting down...");
      // Cleanup server before exiting
      cleanupOnExit()
        .catch(() => {})
        .finally(() => exit());
      return;
    }

    // Help overlay
    if (input === "?") {
      openModal(<HelpOverlay />);
      return;
    }

    // Screen navigation
    if (input === "1") setScreen("dashboard");
    if (input === "2") setScreen("settings");
    if (input === "3") setScreen("worlds");
    if (input === "4") setScreen("console");
  });

  // Get the active screen component
  const ScreenComponent = screens[activeScreen] ?? Dashboard;

  // Use percentage-based sizing like the working ink-app-template example
  return (
    <Box flexDirection="column" height="100%" width="100%">
      {/* Zone 1: Header - natural height based on content */}
      <Header />

      {/* Zone 2: Main Content - expands to fill available space */}
      <Box flexGrow={1} flexDirection="row" height="100%">
        {/* Left: Navigation Menu - fixed width */}
        <Menu />

        {/* Right: Content Area - fills remaining width */}
        <Box
          flexGrow={1}
          borderStyle="single"
          borderColor={theme.muted}
          flexDirection="column"
          height="100%"
        >
          <ScreenComponent />
        </Box>
      </Box>

      {/* Zone 3: Log Feed - natural height based on content */}
      <LogFeed />

      {/* Modal Overlay - centered over content */}
      {modalOpen && modalContent && (
        <Box
          position="absolute"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          width="100%"
          height="100%"
          backgroundColor={theme.background}
        >
          {modalContent}
        </Box>
      )}
    </Box>
  );
};
