# Void Crash Diagnostics

The crash-screen page owns the fatal runtime presentation for Void Launcher. It renders a privacy-sanitized stack trace, a readable diagnosis and recovery suggestion, crash-log preferences, and a deterministic four-phase repair sequence.

## Public exports

- `CrashScreen` renders the diagnostic surface for a supplied error.
- `VoidRuntimeBoundary` catches React render errors from its descendants and mounts `CrashScreen` instead of leaving a black window.
- `sanitizeDiagnosticText` removes control characters and redacts common user paths, email addresses, and credential fields before diagnostic text reaches the DOM.

The module barrel is `pages/crash-screen/index.ts`. The parent `void-client` barrel can re-export this page when it becomes part of the application shell.

## Repair sources

`repairSource="local-preview"` is the default. It animates a recovery analysis but never changes Minecraft, launcher, or instance files.

`repairSource="native"` enables the native-source disclosure and requires `onAnalyzeAndRepair`. The handler performs the native operation and returns an optional `IRepairResult`. A rejected promise or `{ success: false }` places the sequence in an accessible failed state. The surface itself never assumes that a native repair succeeded.

## Crash-log preferences

`automaticallyUploadLogs` and `logDestination` are display preferences. Rendering this screen does not upload a log. Upload authorization and transport remain the responsibility of the native launcher layer.

## Runtime boundary behavior

`VoidRuntimeBoundary` provides two recovery paths:

1. **Retry Launch** clears the captured React error and remounts the child tree. `onReset` runs after the boundary has reset.
2. **Return to Launcher** calls `onReload` when supplied; otherwise it reloads the current window.

Changing `resetKey` also clears a captured error. `onError` receives only a sanitized `IRuntimeErrorReport`; raw stack data is not forwarded.

## Accessibility and motion

The crash heading receives focus when the surface mounts. The stack trace is keyboard focusable and selectable, recovery progress uses native ARIA progress semantics, and state changes are announced through polite live regions. Every icon comes from the custom `ShadowGlyph` family. When `prefers-reduced-motion` is enabled, the entrance fade is removed and phase progress advances in short discrete steps.
