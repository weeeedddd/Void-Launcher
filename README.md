# Void Launcher

A custom Minecraft launcher in a **dark-purple** design — with Microsoft login, CurseForge & Modrinth integration, and a custom modpack builder.

Built with **Tauri 2 + React + TypeScript + Tailwind CSS 4** (Rust backend).

> ⚠️ Not affiliated with Mojang or Microsoft. Users must own Minecraft: Java Edition — this launcher only signs in legitimate accounts via the official Microsoft flow.

## Features

| Status | Feature |
| ------ | ------- |
| ✅ scaffolded | Microsoft / Xbox Live login (device-code flow, full token chain in Rust) |
| ✅ scaffolded | Unified mod search across **Modrinth** & **CurseForge** with version/loader filters |
| ✅ scaffolded | Custom modpack builder: instances with Minecraft version + Fabric/NeoForge/Forge/Quilt |
| ✅ scaffolded | One-click mod install (SHA-1 verified) + enable/disable per mod |
| ✅ scaffolded | Per-instance settings: RAM allocation, Java path, extra JVM args |
| 🚧 Milestone 3 | Game file download pipeline (client jar, libraries, assets, loader profiles) & launch |

## Documentation

- **[docs/CONCEPT.md](docs/CONCEPT.md)** — full concept: tech-stack decision, architecture, design system, roadmap
- **[docs/AUTHENTICATION.md](docs/AUTHENTICATION.md)** — the Microsoft → Xbox → XSTS → Minecraft token chain, step by step
- **[docs/MOD_APIS.md](docs/MOD_APIS.md)** — Modrinth & CurseForge API guide (endpoints, filters, gotchas)

## Getting started

Prerequisites:

- **Node.js 20+** and **Rust (stable)** — [Tauri prerequisites](https://tauri.app/start/prerequisites/) per OS
  (Linux additionally needs `libwebkit2gtk-4.1-dev` etc.; Windows needs the WebView2 runtime, preinstalled on Win 11)
- A **CurseForge API key** (free, [console.curseforge.com](https://console.curseforge.com/)) — Modrinth needs none
- An **Azure app registration** approved for the Minecraft API — see [docs/AUTHENTICATION.md](docs/AUTHENTICATION.md)

```bash
npm install                       # frontend deps
export CURSEFORGE_API_KEY=cf-...  # or put it in settings.json later
npm run tauri dev                 # starts Vite + compiles the Rust backend
```

Set your Azure client ID in `src-tauri/src/auth/microsoft.rs` (`CLIENT_ID`).

## Project structure

```
void-launcher/
├── src/                        # React frontend (WebView)
│   ├── components/             #   UI: sidebar, mod browser, instances, dialogs
│   ├── stores/                 #   zustand state (ui, account)
│   ├── lib/api.ts              #   typed IPC wrapper — the only invoke() call site
│   ├── styles/theme.css        #   dark-purple design tokens (Tailwind v4 @theme)
│   └── types/                  #   shared types, mirror the Rust structs
├── src-tauri/                  # Rust backend
│   └── src/
│       ├── auth/               #   Microsoft → Xbox → XSTS → Minecraft chain
│       ├── modplatform/        #   Modrinth + CurseForge behind one unified model
│       ├── instance/           #   modpack builder: create/settings/install/toggle
│       ├── launch/             #   Java args + process spawn (pipeline = Milestone 3)
│       ├── state.rs            #   shared HTTP client, data dir, session
│       └── error.rs            #   one serializable error type for all commands
└── docs/                       # concept & integration guides
```

## License note

Respect the [Minecraft EULA](https://www.minecraft.net/eula), the [CurseForge 3rd-party API ToS](https://support.curseforge.com/en/support/solutions/articles/9000207405) and the [Modrinth API terms](https://docs.modrinth.com/api/). Mods whose authors opted out of API distribution must be downloaded from the CurseForge website — the launcher surfaces this instead of bypassing it.
