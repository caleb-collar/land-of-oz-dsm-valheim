# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/land-of-oz/valheim-dsm/compare/v0.4.0...HEAD
[0.4.0]: https://github.com/land-of-oz/valheim-dsm/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/land-of-oz/valheim-dsm/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/land-of-oz/valheim-dsm/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/land-of-oz/valheim-dsm/releases/tag/v0.1.0
