# BepInEx Plugin Support & Management - Implementation Plan

## Executive Summary

This plan adds BepInEx mod framework support to the Valheim DSM, enabling:
- Detection and installation of BepInEx
- Management of a curated set of server-side plugins (enable/disable)
- RCON features that only activate when the RCON plugin is installed
- Admin role management (promote/demote players, manage root users)
- A new "Plugins" TUI menu/screen for plugin management
- TUI layout refinements to fix text overlap issues

---

## Phase 1: BepInEx Core Module

**Goal**: Create foundation module for BepInEx detection, installation, and plugin management.

### 1.1 Create BepInEx Types and Schema

**File**: `src/bepinex/types.ts`

```typescript
/** Supported plugin definitions - Server-side only, no client install required */
export type PluginId = 
  | "bepinex-rcon"        // RCON protocol library (AviiNL)
  | "server-devcommands"; // Enhanced admin commands (JereKuusela)

export type PluginDefinition = {
  id: PluginId;
  name: string;
  description: string;
  version: string;
  author: string;
  downloadUrl: string;
  dllFile: string;  // Main DLL filename to check for
  configFile?: string;
  requiresBepInEx: boolean;
  category: "core";
};

export type InstalledPlugin = {
  id: PluginId;
  enabled: boolean;
  version: string | null;
  configPath: string | null;
};

export type BepInExState = {
  installed: boolean | null;  // null = not checked
  version: string | null;
  path: string | null;
  plugins: InstalledPlugin[];
};
```

**File**: `src/config/schema.ts` (additions)

```typescript
// Add BepInEx configuration to AppConfigSchema
export const BepInExConfigSchema = z.object({
  autoInstall: z.boolean().default(false), // Don't auto-install mods
  enabledPlugins: z.array(z.string()).default([]),
  customPluginPaths: z.array(z.string()).default([]),
});
```

### 1.2 Create BepInEx Paths and Detection

**File**: `src/bepinex/paths.ts`

```typescript
// BepInEx installs inside the Valheim dedicated server folder
// e.g., C:\SteamLibrary\steamapps\common\Valheim dedicated server\BepInEx\

// Functions:
// - getBepInExPath(): string - Returns {valheimPath}/BepInEx
// - isBepInExInstalled(): Promise<boolean> - Checks for BepInEx/core/BepInEx.dll
// - getBepInExVersion(): Promise<string | null> - Reads from BepInEx/core/BepInEx.dll metadata
// - getPluginsPath(): string - Returns {valheimPath}/BepInEx/plugins
// - getConfigPath(): string - Returns {valheimPath}/BepInEx/config
// - getDisabledPluginsPath(): string - Returns {valheimPath}/BepInEx/plugins_disabled

// Note: Requires valheimPath from app config (src/config/store.ts)
```

### 1.3 Create BepInEx Installer

**File**: `src/bepinex/installer.ts`

```typescript
// BepInEx Download URLs
export const BEPINEX_URLS = {
  // Valheim-specific BepInEx pack (recommended)
  valheimPack: "https://valheim.thunderstore.io/package/download/denikson/BepInExPack_Valheim/5.4.2202/",
  // Fallback: Generic BepInEx x64
  generic: "https://github.com/BepInEx/BepInEx/releases/download/v5.4.21/BepInEx_x64_5.4.21.0.zip",
};

// Functions:
// - downloadBepInEx(onProgress): Promise<void> - Downloads BepInEx pack
// - installBepInEx(onProgress): Promise<void> - Extracts and configures
// - uninstallBepInEx(): Promise<void> - Removes BepInEx cleanly
// - verifyBepInExInstallation(): Promise<{valid: boolean, message: string}>
```

### 1.4 Create Plugin Manager

**File**: `src/bepinex/plugins.ts`

```typescript
// Curated plugin definitions
export const SUPPORTED_PLUGINS: PluginDefinition[] = [
  {
    id: "bepinex-rcon",
    name: "BepInEx.rcon",
    description: "RCON protocol library for remote server management",
    version: "1.0.4",
    author: "AviiNL",
    downloadUrl: "https://github.com/AviiNL/BepInEx.rcon/releases/download/v1.0.4/rcon.dll",
    dllFile: "rcon.dll",
    configFile: "nl.avii.plugins.rcon.cfg",
    requiresBepInEx: true,
    category: "core",
  },
  {
    id: "server-devcommands",
    name: "Server DevCommands",
    description: "Enhanced admin commands for server management",
    version: "1.74.0",
    author: "JereKuusela",
    downloadUrl: "https://valheim.thunderstore.io/package/download/JereKuusela/Server_devcommands/1.74.0/",
    dllFile: "ServerDevcommands.dll",
    configFile: "server_devcommands.cfg",
    requiresBepInEx: true,
    category: "core",
  },
];

// Functions:
// - getInstalledPlugins(): Promise<InstalledPlugin[]>
// - isPluginInstalled(pluginId: PluginId): Promise<boolean>
// - installPlugin(pluginId: PluginId, onProgress): Promise<void>
// - uninstallPlugin(pluginId: PluginId): Promise<void>
// - enablePlugin(pluginId: PluginId): Promise<void>  // Move to plugins/
// - disablePlugin(pluginId: PluginId): Promise<void> // Move to plugins_disabled/
// - getPluginConfig(pluginId: PluginId): Promise<object | null>
// - updatePluginConfig(pluginId: PluginId, config: object): Promise<void>
```

### 1.5 Create Module Barrel

**File**: `src/bepinex/mod.ts`

```typescript
export * from "./types.js";
export * from "./paths.js";
export * from "./installer.js";
export * from "./plugins.js";
```

### 1.6 Update Main Module Export

**File**: `src/mod.ts` - Add bepinex exports

---

## Phase 2: RCON Conditional Activation

**Goal**: RCON features only activate when the RCON BepInEx plugin is installed and enabled.

**Important Discovery**: The BepInEx.rcon plugin is a **protocol library only** - it does not ship with any commands. The Server DevCommands plugin registers admin commands that can be executed via RCON. Both plugins work together:

- **BepInEx.rcon**: Provides TCP RCON protocol listener
- **Server DevCommands**: Registers admin commands (events, broadcast, kick, etc.)

### 2.1 Update RCON Manager

**File**: `src/rcon/manager.ts`

Changes:
- Add `isRconPluginAvailable()` check before connecting
- Make `initialize()` check for RCON plugin presence
- Return graceful "RCON not available" messages when plugin missing
- Add new method: `checkRconPluginStatus(): Promise<boolean>`

### 2.2 Update Config Defaults

**File**: `src/config/defaults.ts`

Changes:
- Set `rcon.enabled: false` by default
- Add note that RCON requires BepInEx + RCON plugin

### 2.3 Update Store with BepInEx State

**File**: `src/tui/store.ts`

Add new state slice:
```typescript
type BepInExStoreState = {
  installed: boolean | null;
  installing: boolean;
  installProgress: string;
  installPercent: number;
  version: string | null;
  path: string | null;
  plugins: {
    id: string;
    name: string;
    enabled: boolean;
    installed: boolean;
    installing: boolean;
  }[];
};
```

Add actions:
```typescript
// BepInEx actions
setBepInExInstalled: (installed: boolean | null) => void;
setBepInExInstalling: (installing: boolean) => void;
setBepInExInstallProgress: (message: string, percent: number) => void;
setBepInExVersion: (version: string | null) => void;
setBepInExPath: (path: string | null) => void;
setPlugins: (plugins: PluginState[]) => void;
setPluginEnabled: (pluginId: string, enabled: boolean) => void;
setPluginInstalling: (pluginId: string, installing: boolean) => void;
```

### 2.4 Update Dashboard RCON Display

**File**: `src/tui/screens/Dashboard.tsx`

Changes:
- Show RCON status based on plugin availability
- Add message: "RCON requires BepInEx RCON plugin" when not available
- Hide RCON actions when plugin not installed
- Add quick action: "[M] Manage Plugins" when BepInEx not installed

---

## Phase 3: Plugins TUI Screen

**Goal**: Create new "Plugins" screen for managing BepInEx and plugins.

### 3.1 Update Screen Type and Navigation

**File**: `src/tui/store.ts`

```typescript
export type Screen = "dashboard" | "settings" | "worlds" | "console" | "plugins";
```

**File**: `src/tui/components/Menu.tsx`

Add new menu item:
```typescript
{ key: "5", label: "Plugins", screen: "plugins" },
```

**File**: `src/tui/App.tsx`

Add import and screen mapping for Plugins screen.

### 3.2 Create Plugins Screen

**File**: `src/tui/screens/Plugins.tsx`

Layout:
```
─ Plugins ─

BepInEx Framework
  Status: ● Installed (v5.4.21)
  Location: C:\...\BepInEx
  [B] Install/Reinstall BepInEx

─────────────────────────────────

Installed Plugins (1/2)

  Server Admin Plugins (no client install required)
  ▶ ● BepInEx.rcon          Enabled    v1.0.4
    ○ Server DevCommands    Disabled   (not installed)

─────────────────────────────────

[I] Install Selected  [U] Uninstall  [E] Enable/Disable
[C] Configure Plugin  [R] Refresh    [?] Help

Note: Server restart required for plugin changes
```

Features:
- Enable/disable toggle for installed plugins
- Install/uninstall actions
- Plugin configuration editing (opens config file or modal)
- Status indicators (installed, enabled, version)
- Clear messaging that these are server-side only plugins
- Inline configuration for key settings (RCON port, password)

### 3.3 Create Plugin Components

**File**: `src/tui/components/PluginItem.tsx`

```typescript
type PluginItemProps = {
  plugin: PluginDefinition;
  installed: boolean;
  enabled: boolean;
  version: string | null;
  selected: boolean;
  installing: boolean;
};
```

**File**: `src/tui/components/PluginConfigModal.tsx`

Modal for editing plugin configuration files.

### 3.4 Create usePlugins Hook

**File**: `src/tui/hooks/usePlugins.ts`

```typescript
export function usePlugins() {
  // Returns:
  // - plugins: PluginState[]
  // - bepInExInstalled: boolean
  // - installing: boolean
  // - installBepInEx: () => Promise<void>
  // - installPlugin: (id: string) => Promise<void>
  // - uninstallPlugin: (id: string) => Promise<void>
  // - togglePlugin: (id: string) => Promise<void>
  // - refreshPlugins: () => Promise<void>
}
```

### 3.5 Update Screen Exports

**File**: `src/tui/screens/mod.ts`

Add Plugins export.

---

## Phase 4: RCON Feature Gating

**Goal**: Gate all RCON features behind plugin availability check.

### 4.1 Create RCON Availability Hook

**File**: `src/tui/hooks/useRconAvailable.ts`

```typescript
export function useRconAvailable(): {
  available: boolean;      // RCON plugin installed + enabled
  connected: boolean;      // Actually connected to RCON
  hasCommands: boolean;    // Server DevCommands also installed (provides actual commands)
  reason: string | null;   // Why not available
} {
  // Check:
  // 1. BepInEx installed
  // 2. BepInEx.rcon plugin installed
  // 3. BepInEx.rcon plugin enabled  
  // 4. RCON config enabled (port/password set)
  // 5. Server online
  // 6. RCON connected
  // 7. (optional) Server DevCommands installed for command support
}
```

**Visibility Matrix**:

| BepInEx | RCON Plugin | DevCommands | Server | What to Show |
|---------|-------------|-------------|--------|--------------|
| ❌ | - | - | - | "Install BepInEx first" |
| ✅ | ❌ | - | - | "Install BepInEx.rcon plugin" |
| ✅ | ✅ | ❌ | - | "RCON ready, install Server DevCommands for admin commands" |
| ✅ | ✅ | ✅ | ❌ | "Start server to use RCON" |
| ✅ | ✅ | ✅ | ✅ | Show full RCON admin panel |

### 4.2 Update RCON-Dependent Components

**Dependency Requirements by Feature**:

| Component | Requires RCON | Requires DevCommands | Notes |
|-----------|--------------|---------------------|-------|
| PlayerManager | ✅ | ✅ | Uses `kick`, `ban`, `playerlist` |
| EventManager | ✅ | ✅ | Uses `event`, `stopevent`, `randomevent` |
| TimeControl | ✅ | ✅ | Uses `skiptime`, `sleep` |
| GlobalKeysManager | ✅ | ✅ | Uses `setkey`, `removekey`, `listkeys` |
| ServerInfoModal | ✅ | ✅ | Uses `info`, `seed` |
| Broadcast | ✅ | ✅ | Uses `broadcast` |
| AdminManager | ✅ (partial) | ✅ (for root users) | Online players list requires RCON; root user config requires DevCommands |

Files to update:
- `src/tui/screens/Dashboard.tsx` - Gate RCON actions, show plugin requirements
- `src/tui/components/PlayerManager.tsx` - Show unavailable message with specific requirements
- `src/tui/components/EventManager.tsx` - Show unavailable message
- `src/tui/components/TimeControl.tsx` - Show unavailable message
- `src/tui/components/GlobalKeysManager.tsx` - Show unavailable message
- `src/tui/components/ServerInfoModal.tsx` - Show unavailable message

Pattern for each:
```tsx
const { available, hasCommands, reason } = useRconAvailable();

if (!available) {
  return (
    <Box flexDirection="column" padding={1}>
      <Text color={theme.warning}>RCON Not Available</Text>
      <Text dimColor>{reason}</Text>
      <Text dimColor>Install required plugins via Plugins menu (press 5)</Text>
    </Box>
  );
}

if (!hasCommands) {
  return (
    <Box flexDirection="column" padding={1}>
      <Text color={theme.warning}>Admin Commands Not Available</Text>
      <Text dimColor>RCON connected but Server DevCommands plugin not installed</Text>
      <Text dimColor>Install Server DevCommands for admin features (press 5)</Text>
    </Box>
  );
}
```

### 4.3 Update Settings Screen

**File**: `src/tui/screens/Settings.tsx`

Changes:
- Add note in RCON section: "Requires BepInEx RCON plugin"
- Show warning if RCON enabled but plugin not installed
- Link to Plugins screen

---

## Phase 5: Admin Role Management

**Goal**: Provide TUI interface for managing server admins and root users.

### 5.1 Admin Management Types

**File**: `src/valheim/admins.ts`

```typescript
export type AdminRole = "player" | "admin" | "root";

export type ServerUser = {
  steamId: string;           // Steam64 ID
  name?: string;             // Display name (if known from playerlist)
  role: AdminRole;
  addedAt?: Date;
};

// Admin capabilities by role
export const ROLE_CAPABILITIES = {
  player: [],
  admin: [
    "kick", "ban", "playerlist", "broadcast",
    "event", "stopevent", "randomevent",
    "setkey", "removekey", "listkeys",
    "skiptime", "sleep", "find", "info"
  ],
  root: ["*"]  // All commands, bypasses disable_command
} as const;
```

### 5.2 Admin List File Management

**File**: `src/valheim/admins.ts` (functions)

```typescript
// File paths
// - getAdminListPath(): string - Returns path to adminlist.txt
// - getBanListPath(): string - Returns path to bannedlist.txt
// - getPermittedListPath(): string - Returns path to permittedlist.txt

// Admin list operations
// - getAdmins(): Promise<ServerUser[]> - Read adminlist.txt
// - addAdmin(steamId: string): Promise<void> - Add to adminlist.txt
// - removeAdmin(steamId: string): Promise<void> - Remove from adminlist.txt
// - isAdmin(steamId: string): Promise<boolean>

// Root user operations (Server DevCommands config)
// - getRootUsers(): Promise<string[]> - Read root_users from config
// - addRootUser(steamId: string): Promise<void> - Add to root_users
// - removeRootUser(steamId: string): Promise<void> - Remove from root_users
// - isRootUser(steamId: string): Promise<boolean>

// Combined role management
// - getUserRole(steamId: string): Promise<AdminRole>
// - setUserRole(steamId: string, role: AdminRole): Promise<void>
// - promoteUser(steamId: string): Promise<AdminRole> - player→admin→root
// - demoteUser(steamId: string): Promise<AdminRole> - root→admin→player
```

### 5.3 Admin Management TUI Component

**File**: `src/tui/components/AdminManager.tsx`

```typescript
type AdminManagerProps = {
  visible: boolean;
  onClose: () => void;
};
```

**Layout**:
```
─ Admin Management ─

Server Admins (adminlist.txt)
  76561198012345678  Admin    [Added 2024-01-15]
  76561198087654321  Admin    [Added 2024-02-01]

Root Users (bypass all restrictions)
  76561198012345678  Root     [DevCommands config]

Online Players (can promote)
  Viking_Steve       76561198011111111  Player
  DragonSlayer99     76561198022222222  Player

─────────────────────────────────

[A] Add Admin by Steam ID    [R] Add Root User
[P] Promote Selected         [D] Demote Selected
[X] Remove from Admin        [Enter] View Details
[Esc] Close

Note: Changes take effect immediately (no restart required)
```

**Features**:
- List current admins from adminlist.txt
- List root users from Server DevCommands config
- Show online players (via RCON playerlist) with promote option
- Add admin by Steam64 ID manually
- Promote: player → admin → root
- Demote: root → admin → player
- Remove admin entirely
- Visual role badges

**Graceful Degradation**:
- Without RCON: Can still manage admins/root users, but "Online Players" section hidden
- Without DevCommands: Root user section hidden (only admin list available)
- Without server running: Full admin management available (file-based operations)

### 5.4 Admin Store State

**File**: `src/tui/store.ts` (additions)

```typescript
type AdminStoreState = {
  admins: ServerUser[];
  rootUsers: string[];
  loading: boolean;
  error: string | null;
};

// Actions
setAdmins: (admins: ServerUser[]) => void;
setRootUsers: (rootUsers: string[]) => void;
addAdmin: (steamId: string) => void;
removeAdmin: (steamId: string) => void;
setUserRole: (steamId: string, role: AdminRole) => void;
refreshAdmins: () => Promise<void>;
```

### 5.5 useAdminManager Hook

**File**: `src/tui/hooks/useAdminManager.ts`

```typescript
export function useAdminManager() {
  return {
    admins: ServerUser[];
    rootUsers: string[];
    onlinePlayers: Player[];
    loading: boolean;
    error: string | null;
    
    // Actions
    addAdmin: (steamId: string) => Promise<void>;
    removeAdmin: (steamId: string) => Promise<void>;
    promoteUser: (steamId: string) => Promise<AdminRole>;
    demoteUser: (steamId: string) => Promise<AdminRole>;
    setUserRole: (steamId: string, role: AdminRole) => Promise<void>;
    refresh: () => Promise<void>;
  };
}
```

### 5.6 Integration Points

**Dashboard.tsx** - Add quick access:
```
[A] Manage Admins
```

**Plugins Screen** - Show admin count when DevCommands installed:
```
Server DevCommands    Enabled    v1.2.3
  └─ 3 admins, 1 root user configured
```

**Settings Screen** - Link to admin management:
```
Server Access
  Admins: 3 configured    [A] Manage
  Root Users: 1           
  Password: ● Enabled
```

### 5.7 Steam ID Validation

```typescript
// Validate Steam64 ID format (17 digits starting with 7656119)
export function isValidSteam64Id(id: string): boolean {
  return /^7656119\d{10}$/.test(id);
}

// Show friendly error messages
export function validateSteamId(id: string): { valid: boolean; error?: string } {
  if (!id) return { valid: false, error: "Steam ID required" };
  if (!/^\d+$/.test(id)) return { valid: false, error: "Steam ID must be numeric" };
  if (id.length !== 17) return { valid: false, error: "Steam64 ID must be 17 digits" };
  if (!id.startsWith("7656119")) return { valid: false, error: "Invalid Steam64 ID prefix" };
  return { valid: true };
}
```

### 5.8 Admin Role Quick Reference

| Action | File Modified | Restart Required |
|--------|--------------|------------------|
| Add/Remove Admin | `adminlist.txt` | No |
| Add/Remove Root User | `server_devcommands.cfg` | No* |

*DevCommands reloads config on the fly for most settings.

### 5.9 Update Module Exports

**File**: `src/valheim/mod.ts`

Add admin exports.

---

## Phase 6: TUI Layout Refinements

**Goal**: Fix text overlap issues and improve layout consistency across all menus.

### 6.1 Audit Current Layout Issues

Common problems to fix:
1. Text overflow when terminal is narrow
2. Long paths/values not truncating
3. Overlapping elements in flex layouts
4. Missing `flexShrink={0}` on fixed-height elements
5. Missing `overflow="hidden"` on scrollable containers
6. Inconsistent padding/margins

### 6.2 Create Layout Utilities

**File**: `src/tui/components/TruncatedText.tsx`

```typescript
type TruncatedTextProps = {
  children: string;
  maxWidth: number;
  ellipsis?: string;
  color?: string;
};

// Truncates text to maxWidth with ellipsis
export const TruncatedText: FC<TruncatedTextProps> = ({...}) => {
  const truncated = text.length > maxWidth 
    ? text.slice(0, maxWidth - ellipsis.length) + ellipsis
    : text;
  return <Text color={color}>{truncated}</Text>;
};
```

**File**: `src/tui/components/Row.tsx`

```typescript
// Consistent row layout with proper flexShrink
export const Row: FC<RowProps> = ({ label, value, color }) => (
  <Box flexShrink={0} minHeight={1}>
    <Text>{label}: </Text>
    <Text color={color}>{value}</Text>
  </Box>
);
```

### 6.3 Fix Dashboard.tsx

Changes:
- Wrap all status rows with `flexShrink={0}` and `minHeight={1}`
- Add `overflow="hidden"` to main container
- Truncate long paths (steamcmd path, valheim path)
- Use fixed widths for status labels
- Ensure Quick Actions don't overflow

### 6.4 Fix Settings.tsx

Changes:
- Already has good patterns, verify all rows have `flexShrink={0}`
- Add width constraints to value display
- Fix select dropdown positioning

### 6.5 Fix Worlds.tsx

Changes:
- Truncate world names if too long
- Fix date formatting to consistent width
- Add `flexShrink={0}` to all rows

### 6.6 Fix Console.tsx

Changes:
- Ensure log entries don't cause horizontal overflow
- Add word wrapping for long log messages
- Fix input field positioning

### 6.7 Fix LogFeed.tsx

Changes:
- Truncate long log messages
- Ensure consistent timestamp width
- Add horizontal scroll or truncation for paths

### 6.8 Fix All Modal Components

Files:
- `ConfirmModal` - Wrap message text
- `ServerInfoModal` - Truncate long values
- `PlayerManager` - Handle long player names
- `EventManager` - Consistent row heights
- `TimeControl` - Input field alignment
- `GlobalKeysManager` - Key list truncation

### 6.9 Create useTerminalSize Hook

**File**: `src/tui/hooks/useTerminalSize.ts`

```typescript
export function useTerminalSize(): { width: number; height: number } {
  // Returns current terminal dimensions
  // Updates on resize
}
```

Use this to calculate appropriate truncation widths.

---

## Phase 7: Testing & Documentation

### 7.1 Unit Tests

Files to create:
- `src/bepinex/paths.test.ts`
- `src/bepinex/installer.test.ts`
- `src/bepinex/plugins.test.ts`
- `src/valheim/admins.test.ts`

### 7.2 Integration Tests

- Test BepInEx installation flow
- Test plugin enable/disable
- Test RCON conditional activation
- Test admin add/remove/promote/demote

### 7.3 Update Documentation

Files to update:
- `README.md` - Add BepInEx/plugin section
- `AGENTS.md` - Add bepinex module reference
- `.agent-docs/00-overview.md` - Add plugin architecture

### 7.4 Update Config Schema Tests

**File**: `src/config/schema.test.ts`

Add tests for BepInEx config schema.

---

## Implementation Order (Agentic Steps)

### Step 1: Foundation (15-20 min)
1. Create `src/bepinex/types.ts`
2. Create `src/bepinex/paths.ts` with detection functions
3. Create `src/bepinex/mod.ts`
4. Update `src/mod.ts` exports
5. Run `npm run typecheck`

### Step 2: BepInEx Installer (20-25 min)
1. Create `src/bepinex/installer.ts`
2. Add BepInEx download URL constants
3. Implement download and extract logic
4. Create `src/bepinex/installer.test.ts`
5. Run `npm run typecheck && npm test`

### Step 3: Plugin Manager (20-25 min)
1. Create `src/bepinex/plugins.ts` with SUPPORTED_PLUGINS
2. Implement plugin detection functions
3. Implement install/uninstall functions
4. Implement enable/disable functions
5. Create `src/bepinex/plugins.test.ts`
6. Run `npm run typecheck && npm test`

### Step 4: Config Schema (10-15 min)
1. Update `src/config/schema.ts` with BepInExConfigSchema
2. Update `src/config/defaults.ts`
3. Update config schema tests
4. Run `npm run typecheck && npm test`

### Step 5: Store Updates (15-20 min)
1. Add BepInEx state slice to `src/tui/store.ts`
2. Add all BepInEx actions
3. Add selectors
4. Update Screen type
5. Run `npm run typecheck`

### Step 6: Plugins Screen (25-30 min)
1. Create `src/tui/screens/Plugins.tsx`
2. Create `src/tui/components/PluginItem.tsx`
3. Create `src/tui/components/PluginConfigModal.tsx`
4. Create `src/tui/hooks/usePlugins.ts`
5. Update `src/tui/screens/mod.ts`
6. Update `src/tui/components/Menu.tsx`
7. Update `src/tui/App.tsx`
8. Run `npm run typecheck`

### Step 7: RCON Gating (20-25 min)
1. Create `src/tui/hooks/useRconAvailable.ts`
2. Update `src/rcon/manager.ts` with plugin check
3. Update Dashboard.tsx RCON section
4. Update all RCON-dependent components
5. Run `npm run typecheck`

### Step 8: Admin Role Management (20-25 min)
1. Create `src/valheim/admins.ts` with types and file operations
2. Create `src/tui/components/AdminManager.tsx`
3. Create `src/tui/hooks/useAdminManager.ts`
4. Add admin state to store
5. Update Dashboard with admin quick action
6. Create `src/valheim/admins.test.ts`
7. Run `npm run typecheck && npm test`

### Step 9: TUI Layout Fixes (25-30 min)
1. Create `src/tui/components/TruncatedText.tsx`
2. Create `src/tui/hooks/useTerminalSize.ts`
3. Fix Dashboard.tsx layout issues
4. Fix Settings.tsx layout issues
5. Fix Worlds.tsx layout issues
6. Fix Console.tsx layout issues
7. Fix LogFeed.tsx layout issues
8. Fix all modal components
9. Run `npm run typecheck`

### Step 10: Testing & Validation (15-20 min)
1. Run full test suite: `npm test`
2. Run linter: `npm run lint`
3. Test TUI manually in terminal
4. Verify all screens render correctly
5. Test narrow terminal widths
6. Test admin promote/demote flow

### Step 11: Documentation (10-15 min)
1. Update README.md with plugin section
2. Update AGENTS.md with bepinex module
3. Bump version in package.json
4. Run final verification: `npm run typecheck && npm run lint && npm test`

---

## Curated Plugin List

Server-side only plugins (no client installation required, safe for existing saves):

| ID | Name | Author | Description | Why It's Safe |
|----|------|--------|-------------|---------------|
| `bepinex-rcon` | BepInEx.rcon | AviiNL | RCON protocol library for remote connections | Server-side only, vanilla clients connect normally |
| `server-devcommands` | Server DevCommands | JereKuusela | Enhanced admin/dev commands for server | Server-side only, no client impact |

**Note**: We intentionally exclude mods like Valheim Plus, Epic Loot, Config Manager, etc. because they require matching client installations and can modify save files.

---

## Plugin Integration Details

### BepInEx.rcon (AviiNL)

**Repository**: https://github.com/AviiNL/BepInEx.rcon
**Latest Version**: v1.0.4
**DLL**: `rcon.dll`

#### Configuration

Config file: `BepInEx/config/nl.avii.plugins.rcon.cfg`

```ini
[General]
# Enable RCON server
enabled = true

# RCON port (recommend GamePort + 2, e.g., 2458 for default Valheim)
port = 2458

# RCON password (required for authentication)
password = your_secure_password
```

#### Important Notes

1. **This is a protocol library** - it provides the RCON network layer but does NOT ship with commands
2. Other plugins (like Server DevCommands) can register commands with it
3. Without additional plugins, RCON will accept connections but have no commands
4. Port must be forwarded separately from game port if hosting remotely

#### TUI Configuration Options

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| Enabled | Toggle | false | Enable RCON server |
| Port | Number | 2458 | RCON listen port (1024-65535) |
| Password | Password | - | RCON authentication password |

---

### Server DevCommands (JereKuusela)

**Repository**: https://github.com/JereKuusela/valheim-dev
**DLL**: `ServerDevcommands.dll`

#### Configuration

Config file: `BepInEx/config/server_devcommands.cfg`

#### Key Server-Side Features (no client install needed)

When installed on server only, these features are available to admins:

| Feature | Command | Description |
|---------|---------|-------------|
| Disable Events | `server dev_config disable_events 1` | Prevents random raids |
| Block Global Keys | `server dev_config disable_global_key defeated_eikthyr,...` | Prevent boss progress flags |
| Disable Commands | `server dev_config disable_command event` | Restrict command access |
| Enhanced Events | `event [name] [x] [z]` | Start events at coordinates |
| Stop Events | `stopevent` | Stop current event |
| Random Event | `randomevent` | Trigger random event |
| Find Objects | `find [id] [limit]` | Locate objects in world |
| Player List | `playerlist` | Show online players with IDs |
| Broadcast | `broadcast [center/side] [message]` | Send message to all players |

#### Admin Requirement

Users must be in `adminlist.txt` with their Steam64 ID to use commands.

#### Key Configuration Options for TUI

**Server-Side Settings** (can be set via `server dev_config`):

| Setting | Key | Default | Description |
|---------|-----|---------|-------------|
| Disable Events | `disable_events` | false | Prevent random raids |
| Disabled Global Keys | `disable_global_key` | "" | Comma-separated boss keys to block |
| Disabled Commands | `disable_command` | "" | Commands non-root users can't execute |
| Root Users | `root_users` | "" | Steam IDs that bypass command restrictions |
| Show Private Players | `private_players` | false | Show hidden players on map (admin) |
| Server Chat | `server_chat` | false | Enable server chat messages |
| Command Log Format | `command_log_format` | See docs | Log format for command auditing |

#### TUI Display Sections (Only When Plugin Installed)

**Server Admin Panel** (new section in Dashboard when plugin detected):
```
─ DevCommands Admin ─
  Events: ● Enabled / ○ Disabled
  Blocked Boss Keys: (none)
  Restricted Commands: (none)
  Command Logging: ● Enabled
  
  [D] Toggle Events  [B] Manage Boss Keys  [L] Toggle Logging
```

---

## TUI Feature Visibility Rules

### RCON Features (Dashboard)

Show ONLY when:
1. BepInEx is installed AND
2. BepInEx.rcon plugin is installed AND enabled AND
3. Server is online

When visible, show:
```
─ RCON Status ─
  Status: ● Connected (port 2458)
  
  [Commands via Server DevCommands plugin]
```

When NOT available, show:
```
─ RCON Status ─
  Status: ○ Not Available
  Reason: BepInEx.rcon plugin not installed
  
  [5] Go to Plugins to install
```

### DevCommands Features (Dashboard)

Show ONLY when:
1. BepInEx is installed AND
2. Server DevCommands plugin is installed AND enabled AND
3. Server is online

When visible, show:
```
─ Server Admin (DevCommands) ─
  Random Events: ● Enabled   [D] Toggle
  Command Logging: ● Enabled  [L] Toggle
  
  [E] Trigger Event  [S] Stop Event  [P] Player List
  [B] Broadcast Message  [F] Find Objects
```

When NOT available:
```
─ Server Admin ─
  Status: ○ Not Available
  Reason: Server DevCommands plugin required
  
  [5] Go to Plugins to install
```

### Settings Screen RCON Section

When BepInEx.rcon NOT installed:
```
RCON Settings
  ⚠ Requires BepInEx.rcon plugin
  Status: Not installed
  [Press 5 to manage plugins]
```

When installed but not enabled:
```
RCON Settings  
  ▶ Enabled: No
    Port: 2458
    Password: ********
    
  ⚠ Enable plugin in Plugins menu to use
```

When fully configured:
```
RCON Settings
  ▶ Enabled: Yes
    Port: 2458
    Password: ********
    Timeout: 5000ms
    Auto-reconnect: Yes
```

---

## Verification Checklist

After implementation, verify:

- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes  
- [ ] `npm test` passes
- [ ] TUI renders correctly at 80x24 terminal size
- [ ] TUI renders correctly at 120x40 terminal size
- [ ] No text overlap in Dashboard
- [ ] No text overlap in Settings
- [ ] No text overlap in Worlds
- [ ] No text overlap in Console
- [ ] No text overlap in Plugins (new)
- [ ] Plugins screen shows BepInEx status
- [ ] Plugins can be enabled/disabled
- [ ] RCON features hidden when plugin not installed
- [ ] RCON features appear when plugin installed
- [ ] Admin Manager accessible from Dashboard
- [ ] Can add/remove admins via TUI
- [ ] Can promote player → admin → root
- [ ] Can demote root → admin → player
- [ ] Version bumped in package.json

---

## Risk Mitigation

1. **BepInEx download URL changes**: Use fallback URLs and version detection
2. **Plugin compatibility**: Pin to specific tested versions
3. **File permission errors**: Add proper error handling for Windows UAC
4. **Terminal size edge cases**: Set minimum supported size (80x24)
5. **RCON connection failures**: Graceful degradation with clear messaging
6. **Admin file locking**: Use atomic file writes, handle server reading the file
7. **Thunderstore API changes**: Cache plugin manifests, use direct GitHub releases as fallback
8. **Steam ID lookup**: Provide manual Steam64 ID entry; online players show ID from RCON

---

## Appendix: File Locations Summary

| File/Folder | Path | Purpose |
|-------------|------|---------|
| BepInEx root | `{valheim}/BepInEx/` | Mod framework installation |
| Plugins folder | `{valheim}/BepInEx/plugins/` | Active plugin DLLs |
| Disabled plugins | `{valheim}/BepInEx/plugins_disabled/` | Manually disabled plugins |
| Config folder | `{valheim}/BepInEx/config/` | Plugin configuration files |
| RCON config | `{valheim}/BepInEx/config/nl.avii.plugins.rcon.cfg` | RCON port/password |
| DevCommands config | `{valheim}/BepInEx/config/server_devcommands.cfg` | Root users, disabled commands |
| Admin list | `{valheim}/adminlist.txt` | Steam64 IDs for admin access |
| Ban list | `{valheim}/bannedlist.txt` | Banned Steam64 IDs |
| Permitted list | `{valheim}/permittedlist.txt` | Whitelist (if enabled) |
