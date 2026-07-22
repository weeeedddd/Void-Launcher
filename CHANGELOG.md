# Changelog

All notable user-facing changes to Void Launcher are documented here.

## [0.1.4] - 2026-07-23

### Added

- Added a production dashboard with compact navigation, Mission Control logs, music controls, notification settings, native utilities, and a multi-account Microsoft session manager.
- Added direct Modrinth and CurseForge installation flows for mods, shaders, and modpacks, including automatic instance provisioning and archive validation.
- Added managed Minecraft launching with per-instance Java runtimes, loader resolution, real process tracking, and hidden `javaw.exe` startup on Windows.
- Added an official Mojang release catalog with every stable profile release, including the 26.x version line, exact sub-version selection, and refreshed update artwork.
- Added native Discord Rich Presence, protected OAuth token storage, Windows hardware/GPU discovery, storage controls, and process-priority management.
- Added a separate, localized Bootstrapper experience that verifies the client payload with SHA-256 before activation.

### Changed

- Reworked the launcher and installer around the flat Void visual system with bounded, responsive content areas and clearer active states.
- Updated Minecraft 26.x profiles to provision Java 25 while preserving the correct Java 8, 17, and 21 mappings for older releases.
- Hardened the Windows release workflow with synchronized version checks, frontend type checking, native tests, deterministic asset names, and checksum publication.

### Fixed

- Fixed Microsoft session persistence and account switching without exposing refresh tokens to the frontend.
- Fixed CurseForge project-type mapping, compatible Modrinth runtime selection, unsafe archive paths, and invalid mod/shader filenames.
- Fixed launcher console windows appearing behind Minecraft and improved multiple-GPU enumeration.
- Fixed Mission Control so it follows real native launch events instead of synthetic progress.

### Security

- OAuth credentials and refresh tokens remain inside the Rust boundary and are encrypted for the current Windows user with DPAPI.
- Downloads now enforce HTTPS, bounded sizes, safe relative paths, and cryptographic integrity checks where provider metadata supplies hashes.

[0.1.4]: https://github.com/weeeedddd/Void-Launcher/releases/tag/v0.1.4
