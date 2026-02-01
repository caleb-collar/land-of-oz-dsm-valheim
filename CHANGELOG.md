# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.5.1] - 2026-02-01

### Fixed
- Fixed Valheim server installing to wrong location (was installing directly to steamcmd Data folder instead of `steamapps/common/Valheim dedicated server`)
- Removed unnecessary custom path from `steamcmd.install()` call to use SteamCMD's default installation directory structure

## [1.5.0] - 2026-02-01

### Added
- Valheim Dedicated Server status section in Dashboard showing installation status, verification, build ID, and location
- Automatic Valheim server installation after SteamCMD is installed
- Installation verification that checks for required files (executable, data folder, DLLs)
- `[V]` keyboard shortcut to manually install/reinstall/verify Valheim server
- `verifyValheimInstallation()` function with detailed verification results
- Valheim server state management in Zustand store

### Changed
- Server start and update actions now require Valheim to be installed (not just SteamCMD)
- Quick Actions section updated to show Valheim install prompts when needed

### Fixed
- Valheim dedicated server now installs to the correct location (`steamapps/common/Valheim dedicated server`)

## [1.4.3] - 2026-02-01

### Fixed
- Fixed `react-devtools-core` module not found error when installing package
- Simplified build configuration to not bundle dependencies, resolving module resolution issues
- Set `NODE_ENV` to production in bundled output to disable development tools

## [1.0.9] - 2026-02-01

### Fixed
- Worlds with only `.fwl` files (generated but not yet saved) now appear in worlds list
- Added `pendingSave` field to WorldInfo to distinguish between saved and unsaved worlds
- Worlds screen now shows "Pending Save" status for worlds not yet saved to disk
- `worldExists()` now checks for `.fwl` files (not just `.db`) since Valheim creates `.fwl` first
- Properly handles new world generation workflow where `.db` is only created on first save

## [1.0.8] - 2026-02-01

### Fixed
- `worldExists()` now checks both `worlds/` and `worlds_local/` directories
- Worlds in `worlds_local/` folder (created by Valheim client) are now properly discovered
- Added `source` field to WorldInfo to track which folder a world is in
- Worlds screen now shows which folder each world is stored in (worlds vs worlds_local)

## [1.0.7] - 2026-02-01

### Fixed
- World generation detection now properly detects when new worlds are generated
- Worlds screen now shows a spinner when a new world is being generated
- Worlds list now refreshes after world generation completes (instead of fixed 2-second delay)
- Added `world_generated` event detection to log parser (triggers on "Done generating locations" message)
- Added `worldGenerating` state to track when server is generating a new world
- World save events now properly update the "Last Save" timestamp

## [1.0.0] - 2026-02-01

### Changed
- **BREAKING**: Renamed package from `oz-dsm-valheim` to `valheim-oz-dsm`
- Added `.gitattributes` for consistent LF line endings across platforms
- Adjusted coverage thresholds for CI stability

### Added
- Startup task management utilities
- First stable release

## [0.4.0] - 2026-01-31

### Added
- Integrated `@caleb-collar/steamcmd` npm package for SteamCMD operations
- Re-exported steamcmd package error classes (SteamCmdError, DownloadError, InstallError)
- Enhanced doctor command with package-based platform detection

### Changed
- Refactored `src/steamcmd/paths.ts` to use steamcmd package for path resolution
- Refactored `src/steamcmd/installer.ts` to use steamcmd package's ensureInstalled
- Refactored `src/steamcmd/updater.ts` to use steamcmd package's install/getInstalledVersion
- Simplified SteamCMD module by delegating core functionality to external package
- Updated VALHEIM_APP_ID from string to number type

### Removed
- Custom SteamCMD download and extraction logic (now handled by package)
- Manual archive extraction functions (extractZip, extractTarGz)

## [0.3.0] - 2026-01-30

### Added
- Enhanced Renovate configuration with auto-merge for patch/minor updates
- npm publish workflow for automated npm releases
- Security scanning workflow (weekly + on PR)
- Stale issue/PR management workflow
- GitHub Copilot prompt files for common tasks
- CHANGELOG.md for tracking version history

### Changed
- Upgraded React from 18.x to 19.2.4
- Upgraded Ink from 5.x to 6.6.0
- Upgraded Zod from 3.x to 4.3.6
- Upgraded Biome from 1.x to 2.3.13
- Upgraded fullscreen-ink from 0.0.2 to 0.1.0
- Updated package name from `oz-valheim` to `oz-dsm-valheim`
- Updated Biome configuration for v2 (ran `biome migrate`)

## [0.2.0] - 2026-01-30

### Added
- TUI with fullscreen support using fullscreen-ink
- Dashboard screen with server status and quick actions
- Settings screen with editable configuration
- Worlds screen with world management
- Console screen with log viewing
- Input components: TextInput, NumberInput, SelectInput, Toggle, PathInput
- Help overlay (press `?`) for keyboard shortcuts
- Spinner and loading state components
- Doctor command for system diagnostics
- RCON client for remote server administration
- Watchdog for automatic server restart
- Log parsing and streaming
- Configuration persistence using `conf` package

### Changed
- Migrated from Deno to Node.js runtime
- Updated project structure for Node.js ecosystem

### Fixed
- Terminal resize handling (resolved by Node.js migration)

## [0.1.0] - 2026-01-15

### Added
- Initial Deno-based implementation
- SteamCMD installation and Valheim server updates
- CLI commands: install, start, stop, config, worlds
- Configuration schema with Zod validation
- Platform detection for Windows, Linux, macOS
- Basic TUI framework with Ink

[Unreleased]: https://github.com/caleb-collar/land-of-oz-dsm-valheim/compare/v1.5.1...HEAD
[1.5.1]: https://github.com/caleb-collar/land-of-oz-dsm-valheim/compare/v1.5.0...v1.5.1
[1.5.0]: https://github.com/caleb-collar/land-of-oz-dsm-valheim/compare/v1.4.3...v1.5.0
[1.4.3]: https://github.com/caleb-collar/land-of-oz-dsm-valheim/compare/v1.0.9...v1.4.3
[1.0.9]: https://github.com/caleb-collar/land-of-oz-dsm-valheim/compare/v1.0.8...v1.0.9
[1.0.8]: https://github.com/caleb-collar/land-of-oz-dsm-valheim/compare/v1.0.7...v1.0.8
[1.0.7]: https://github.com/caleb-collar/land-of-oz-dsm-valheim/compare/v1.0.0...v1.0.7
[1.0.0]: https://github.com/caleb-collar/land-of-oz-dsm-valheim/compare/v0.4.0...v1.0.0
[0.4.0]: https://github.com/caleb-collar/land-of-oz-dsm-valheim/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/caleb-collar/land-of-oz-dsm-valheim/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/caleb-collar/land-of-oz-dsm-valheim/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/caleb-collar/land-of-oz-dsm-valheim/releases/tag/v0.1.0
