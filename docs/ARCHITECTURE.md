# Void Launcher architecture

Void Launcher is shipped as two Tauri applications that share a visual language but have different responsibilities:

```text
Bootstrapper (bootstrapper/)
  React installer -> typed Tauri commands -> Rust release installer
  -> HTTPS GitHub asset + SHA-256 verification -> atomic client activation

Daily client (src/ + src-tauri/)
  React/TanStack Query/Zustand UI
    -> typed IPC wrappers in src/lib/api.ts
      -> Rust Tauri commands in src-tauri/src/
        -> lyceris Java Edition install/launch, protected token store,
           Modrinth/CurseForge, Microsoft OAuth, music OAuth, Discord IPC,
           Windows process and hardware APIs
```

## Tiers

### Java game layer

The launcher does not inject an untrusted DLL or patch a running process. The Rust launch service builds a `lyceris` Minecraft configuration, installs the requested Vanilla/Fabric/Forge/NeoForge/Quilt runtime, resolves loader versions, adds the selected JVM arguments, and starts the managed Java process. A bounded launch adapter preserves Lyceris' argument construction while honoring the per-instance Temurin executable; on Windows it prefers `javaw.exe` so no console window remains open. Performance mods are downloaded into an instance by the mod-platform service and are loaded by the selected Minecraft profile.

### TypeScript/React layer

The production entry point is `src/main.tsx` -> `src/VoidClientApp.tsx` -> `src/modules/void-client/pages/void-client/VoidClient.tsx`. The active UI uses flat Lunar-style tokens (`#111111`, `#1A1A1A`, `#333333`, `#7B2CBF`), bounded scroll regions, and typed query/mutation state. It never receives access tokens, arbitrary native paths, or unverified process identifiers.

The bootstrapper entry point is `bootstrapper/src/main.tsx` -> `bootstrapper/src/VoidInstallerApp.tsx`. It is a separate bundle and executable; it is not imported by the daily client.

### Rust systems/network layer

Rust is the native systems boundary for the Tauri application. There is intentionally no second C++ bridge: adding one would duplicate process, filesystem, and IPC authority. Rust owns:

- Microsoft device-code authentication, a DPAPI-encrypted multi-account vault, and launch-time token refresh;
- Spotify/Google OAuth with PKCE, loopback callback validation, encrypted tokens, and Spotify playback commands;
- bounded HTTPS downloads, SHA-1/SHA-256 verification, ZIP path validation, and direct modpack provisioning;
- atomically staged Java/runtime installation and the managed `lyceris` launch adapter;
- Windows GPU enumeration, CPU/RAM/disk sampling, Minecraft PID tracking, and process priority;
- native Discord IPC and launcher/game log events;
- launcher-managed storage and safe folder operations.

## Important real flows

### Direct modpack installation

The Mod Hub can create a profile without an existing instance. `provision_modpack` downloads the newest compatible archive, validates its manifest, derives the exact Minecraft/loader/runtime, imports files, persists the profile, and removes the new directory on any failure. Existing instances still use the target selector and compatibility checks.

### Launch and Mission Control

`launch_instance` requires a valid Microsoft ownership session. The UI opens Mission Control from the actual mutation lifecycle; native launch phases and game stdout are emitted as `launcher-log` events. There is no preview launch, cracked branch, fake success timer, or synthetic hardware value.

### Music

The Music panel uses the native OAuth commands in `src-tauri/src/music/mod.rs`. Spotify supports current playback and play/pause/next/previous/seek. The official YouTube Data API can link an account and show channel identity, but it does not expose YouTube Music playback control; the UI states that limitation instead of fabricating a track.

## Security boundaries

- OAuth access/refresh tokens remain in Rust and are protected for the current Windows user with DPAPI.
- CurseForge keys are write-only from the UI; only a configured/not-configured boolean returns.
- Download URLs must be HTTPS and cannot target localhost, `.local`, loopback, link-local, or private IP ranges.
- Archive sizes, entry sizes, filenames, and relative paths are bounded and validated before writing.
- Process priority commands can address only the Minecraft PID created by this launcher session.
- Crash diagnostics redact local usernames, e-mail addresses, and common secret fields before rendering.

## Deliberate limitations

The current public build does not invent data for services that are not implemented: friends/presence has no backend endpoint yet, Windows toast dispatch is not wired, and in-game FPS/server ping require a game telemetry channel. These surfaces remain explicit and disabled/unavailable until a native service exists. Microsoft app approval, provider redirect registration, a per-user CurseForge key, and the optional `VOID_GOOGLE_CLIENT_SECRET` GitHub repository secret are external deployment requirements. Authenticode signing also requires a publisher certificate and is not configured in this repository; release SHA-256 files provide integrity checking but are not a substitute for publisher identity.

## Build gates

Run the same gates used by the Windows release workflow:

```powershell
npm.cmd run typecheck:all
npm.cmd run build:all
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
cargo test --manifest-path src-tauri/Cargo.toml
cargo fmt --manifest-path bootstrapper/src-tauri/Cargo.toml -- --check
cargo test --manifest-path bootstrapper/src-tauri/Cargo.toml
```

The release workflow also checks that the client, bootstrapper, Cargo manifests, and Tauri manifests all use the same tag version before producing the client/bootstrapper executables and their SHA-256 companion files.
