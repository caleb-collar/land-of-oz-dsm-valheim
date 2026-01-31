/**
 * Root App component for the TUI
 * Three-zone layout: Header, Main Content (Menu + Screen), Log Feed
 */

import { type FC, useEffect } from "react";
import { Box, useApp, useInput } from "ink";
import { Header } from "./components/Header.tsx";
import { Menu } from "./components/Menu.tsx";
import { LogFeed } from "./components/LogFeed.tsx";
import { Dashboard } from "./screens/Dashboard.tsx";
import { Settings } from "./screens/Settings.tsx";
import { Worlds } from "./screens/Worlds.tsx";
import { Console } from "./screens/Console.tsx";
import { type Screen, useStore } from "./store.ts";
import { useConfigSync } from "./hooks/useConfig.ts";
import { theme } from "./theme.ts";

/** Screen component mapping */
const screens: Record<Screen, FC> = {
  dashboard: Dashboard,
  settings: Settings,
  worlds: Worlds,
  console: Console,
};

/**
 * Main TUI Application component
 */
export const App: FC = () => {
  const { exit } = useApp();
  const activeScreen = useStore((s) => s.ui.activeScreen);
  const modalOpen = useStore((s) => s.ui.modalOpen);
  const setScreen = useStore((s) => s.actions.setScreen);
  const addLog = useStore((s) => s.actions.addLog);

  // Sync configuration on mount
  useConfigSync();

  // Log startup message
  useEffect(() => {
    addLog("info", "TUI started");
    addLog("info", "Press 1-4 to navigate, Q to quit");
  }, [addLog]);

  // Global keyboard handling
  useInput((input, key) => {
    // Don't handle global keys when modal is open
    if (modalOpen) return;

    // Quit
    if (input === "q" || input === "Q" || (key.ctrl && input === "c")) {
      addLog("info", "Shutting down...");
      exit();
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

  return (
    <Box flexDirection="column" minHeight={30}>
      {/* Zone 1: Header */}
      <Header />

      {/* Zone 2: Main Content */}
      <Box flexGrow={1} flexDirection="row">
        {/* Left: Navigation Menu */}
        <Menu />

        {/* Right: Content Area */}
        <Box
          flexGrow={1}
          borderStyle="single"
          borderColor={theme.muted}
          flexDirection="column"
        >
          <ScreenComponent />
        </Box>
      </Box>

      {/* Zone 3: Log Feed */}
      <LogFeed />
    </Box>
  );
};
