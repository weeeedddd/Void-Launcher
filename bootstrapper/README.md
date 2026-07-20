# Void Launcher Bootstrapper Frontend

This directory is an independent React application for the one-time Void Launcher Bootstrapper. It does not import the main launcher, and the main launcher must not import this package.

## Application boundary

- `WELCOME` selects one of 13 installer languages.
- `PATH_SELECT` validates an absolute Windows path and requires Terms of Service consent.
- `DOWNLOADING_CLIENT` renders progress emitted by the native installer.
- `DONE` starts the separately installed Void Client and lets the native Bootstrapper exit.

The browser build is a clearly labelled visual preview. It never writes files, downloads a payload, launches an executable, or claims that a real installation succeeded.

## Native IPC contract

The co-located `src/installerApi.ts` service is the only frontend boundary allowed to call Tauri:

| Contract | Direction | Shape |
| --- | --- | --- |
| `get_default_install_path` | invoke | `() -> string` |
| `installer-progress` | event | `{ downloadedBytes, totalBytes, percentage, status }` |
| `install_client` | invoke | `({ installationDir }) -> { installedExecutable, version }` |
| `finish_and_launch` | invoke | `() -> void` |

The native window uses `decorations: false`, so the custom draggable title bar and window controls are authoritative. The dialog plugin grants only the folder-selection capability needed by the installer.

## Local verification

```powershell
npm install
npm run typecheck
npm run build
npm run tauri -- build --no-bundle
```

Vite serves the isolated preview on `127.0.0.1:1430`. Production asset URLs are relative so the compiled frontend can be embedded by the Bootstrapper bundle.

## Security and accessibility

- Installation paths are validated in both layers; the native command accepts absolute local Windows drive paths and rejects traversal, device paths, network paths and Windows system directories.
- Native progress status text is length-limited and rendered through React text nodes; no HTML injection sink is used.
- Destructive close during a transfer requires confirmation.
- Controls have visible keyboard focus, semantic labels, minimum interaction sizes, and reduced-motion behavior.
- The document CSP denies frames, objects, forms, remote media, and unapproved network connections.
