# Void Launcher — Claude handoff

## Ziel

Bitte diesen Quellstand als aktuellen Void-Launcher-Stand übernehmen und auf GitHub veröffentlichen. Nicht nur die ZIP committen: entpacke sie und committe den Projektinhalt in das Repository.

## Umgesetzte Änderungen

- Die aktive Tauri/React-Hauptansicht wurde auf einen echten „Deployment Vault“ umgestellt.
- Chronologische Minecraft-Versionserfassung von 1.21 bis 1.1 in `src/data/minecraftVersions.ts`.
- Major-Update-Karten links, genaue Patch-Auswahl rechts.
- Unterstützte Loader in der Oberfläche: Vanilla, Forge, Fabric, NeoForge und Quilt für jede Version.
- Die Auswahl ruft tatsächlich `api.createInstance(...)` auf und erzeugt native Minecraft-Instanzen.
- Die ausgewählte native Instanz wird anschließend mit `api.launchInstance(...)` gestartet; der Launch-Button ist kein reiner Demo-Button mehr.
- Microsoft-only Account-Architektur: Offline-, Cracked-, Guest- und Developer-Account-Flows wurden aus dem Account-Store und den aktiven Account-Menüs entfernt.
- Account-Menü mit Minecraft-Avatar, sehr hoher Layer-Priorität (`z-[200]`/`z-[250]`), `bg-[#050505]/95` und `backdrop-blur-2xl`.
- Friends starten als leere React-State-Liste. Erst ein vom Benutzer eingegebener Name erzeugt eine sichtbare Anfrage.
- Play Streak wird unter `void-client-play-streak-v1` in `localStorage` gelesen und nach erfolgreichen Launches fortgeschrieben.
- CPU/RAM-Telemetrie reagiert auf den Launch-Hook mit einem sichtbaren Boot-Surge und Framer-Motion-Wertanimationen.
- Native Discord RPC bleibt über die Rust-IPC-Bridge angebunden. Es wird nur eine öffentliche Discord Application ID benötigt; keine Client Secret in die UI eintragen.
- Modrinth- und CurseForge-Suche bleibt paginiert und nach Mod, Modpack und Shader filterbar.

## Wichtige Dateien

- `src/modules/void-client/pages/void-client/components/DeploymentVaultView.tsx`
- `src/data/minecraftVersions.ts`
- `src/modules/void-client/pages/void-client/components/AccountDropdown.tsx`
- `src/stores/account.ts`
- `src/modules/void-client/pages/void-client/components/DashboardView.tsx`
- `src/modules/void-client/hooks/useLauncherInstance.ts`
- `src/modules/void-client/hooks/useTelemetry.ts`
- `src/modules/void-client/pages/void-client/components/TelemetryPanel.tsx`
- `src/modules/void-client/stores/voidClient.store.ts`
- `src-tauri/src/discord_rpc.rs`

## Verifikation

Erfolgreich ausgeführt:

```text
npm.cmd run typecheck:all
npm.cmd run build:all
cargo test --offline --manifest-path src-tauri/Cargo.toml --lib
```

Rust-Ergebnis: 10 Tests bestanden.

## Release

Die zuletzt gebaute Client-EXE liegt außerhalb dieser Quell-ZIP unter:

`outputs/Void-Launcher-Shadow-Logic-Overhaul.exe`

Für GitHub bitte einen Windows-Release-Workflow verwenden und die EXE als Release-Asset hochladen. Keine privaten API-Keys, Spotify-Secrets oder CurseForge-Secrets committen. Verwende `.env.example` beziehungsweise die nativen Einstellungen.

## Empfohlener Commit

```text
feat: ship verified launcher version matrix and native launch telemetry
```
