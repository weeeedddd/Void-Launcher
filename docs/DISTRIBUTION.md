# Distribution — Two Windows Applications

Void Launcher is intentionally shipped as two separate native applications:

1. **Void Bootstrapper** (`Void-Bootstrapper.exe`) is the small, one-time installer. It selects a destination, downloads and verifies the client, creates shortcuts, registers `voidlauncher://`, starts the client and exits.
2. **Void Client** (`Void-Launcher-Client.exe`) is the daily-use launcher. Its bundle contains only the dashboard, settings, storage, notification, account and crash views; it has no installer state or installer UI.

The split is enforced by separate Vite projects and separate Tauri manifests:

| App | Frontend | Native project | Product / identifier |
| --- | --- | --- | --- |
| Bootstrapper | `bootstrapper/` | `bootstrapper/src-tauri/` | `Void Bootstrapper` / `dev.void.bootstrapper` |
| Client | `src/` | `src-tauri/` | `Void Launcher` / `dev.void.launcher` |

## Local builds

Install the workspace once:

```powershell
npm install
```

Build the two web payloads independently:

```powershell
npm run build:client
npm run build:bootstrapper
```

Build production Windows executables with the Tauri CLI (no NSIS wrapper is required; the Bootstrapper is the installer):

```powershell
npm run release:client
npm run release:bootstrapper
```

Do not ship an executable produced by plain `cargo build`. That command keeps Tauri's development configuration and makes the WebView request the local Vite URL. `tauri build --no-bundle` runs the frontend build and embeds `frontendDist` into the executable.

The resulting Cargo binaries are named `void-launcher.exe` and `void-bootstrapper.exe`. For shipping, rename them exactly to `Void-Launcher-Client.exe` and `Void-Bootstrapper.exe` and publish the companion SHA-256 files.

## Release contract

`.github/workflows/release-windows.yml` runs on `v*` tags or manually with an existing tag. It builds Windows x64/MSVC binaries and publishes exactly these assets:

```text
Void-Launcher-Client.exe
Void-Launcher-Client.exe.sha256
Void-Bootstrapper.exe
Void-Bootstrapper.exe.sha256
```

The Bootstrapper queries the public latest release endpoint for `weeeedddd/Void-Launcher`. It accepts only the exact client filename and its exact companion checksum, follows HTTPS redirects only to GitHub release hosts, caps metadata/checksum/payload sizes, streams to a `.part` file, verifies the SHA-256 and PE `MZ` signature, then atomically activates the file. A missing release or missing checksum is a hard install error; the Bootstrapper never falls back to an unverified URL.

The current local build is unsigned. Before distributing to other users, sign both EXEs with an Authenticode certificate (or Azure Trusted Signing) and keep the checksum generated after signing.

## Native window and process behavior

Both binaries use the Windows GUI subsystem. Starting the client from the Bootstrapper uses `CREATE_NO_WINDOW`, so no background CMD window is opened. The Bootstrapper creates a Desktop shortcut, a Start Menu shortcut and the per-user `voidlauncher://` protocol registration without requiring administrator privileges.

## Optional design-board preview

The static workflow showcase remains available separately:

```powershell
npm run build:workflow
```

It emits to `dist-workflow/` and is never an input to either Tauri application.
