# Mod Platform APIs — Modrinth & CurseForge

How the launcher searches and downloads mods. Implementations:
[`modrinth.rs`](../src-tauri/src/modplatform/modrinth.rs) · [`curseforge.rs`](../src-tauri/src/modplatform/curseforge.rs) · unified model in [`modplatform/mod.rs`](../src-tauri/src/modplatform/mod.rs).

## At a glance

| | **Modrinth** | **CurseForge** |
| --- | --- | --- |
| Base URL | `https://api.modrinth.com/v2` | `https://api.curseforge.com/v1` |
| Auth | none for read/download | **API key required** — free at [console.curseforge.com](https://console.curseforge.com/), header `x-api-key` |
| Etiquette | descriptive `User-Agent` required (set globally in `state.rs`) | — |
| Rate limit | 300 req/min | per-key quota |
| Search | `GET /search` with **facets** | `GET /mods/search` with query params |
| Versions/files | `GET /project/{id}/version` | `GET /mods/{id}/files` |
| Download URL | always present | **can be `null`** — author opted out of third-party distribution → link to website instead (ToS: don't bypass) |
| File hash | `hashes.sha1` / `sha512` | `hashes[]` with `algo` (1 = SHA-1, 2 = MD5) |

## Modrinth specifics

Filtering uses **facets** — a JSON array of arrays: outer = AND, inner = OR. Loaders are expressed as categories:

```
GET /v2/search?query=sodium&limit=20&index=relevance
    &facets=[["project_type:mod"],["versions:1.21.1"],["categories:fabric"]]
```

`index` options: `relevance`, `downloads`, `newest`, `updated`. Version filtering on the versions endpoint uses JSON-encoded arrays too: `?game_versions=["1.21.1"]&loaders=["fabric"]`. Each version has one file with `"primary": true` — that's the jar to install.

## CurseForge specifics

Everything is IDs and enums:

```
GET /v1/mods/search?gameId=432&classId=6&searchFilter=jei
    &gameVersion=1.21.1&modLoaderType=4&sortField=2&sortOrder=desc&pageSize=20
```

| Constant | Value |
| --- | --- |
| `gameId` Minecraft | **432** |
| `classId` mods | **6** (modpacks 4471, resource packs 12) |
| `modLoaderType` | 0 Any · **1 Forge** · 3 LiteLoader · **4 Fabric** · **5 Quilt** · **6 NeoForge** |
| `sortField` | 1 Featured · **2 Popularity** · 3 LastUpdated · 4 Name · 6 TotalDownloads |

Responses wrap payloads in `{ "data": … }`. Gotchas handled in our client: `downloadUrl` may be `null` (opt-out — we surface a friendly error and the website link); `file.gameVersions` mixes versions and loader names (`["1.21.1", "Fabric"]`); pagination caps at `index + pageSize ≤ 10 000`.

## The unified model

Both clients normalize into the same two structs, so the UI and installer are platform-agnostic:

```
ModSummary      platform · id · slug · name · summary · author · iconUrl
                downloads · categories · pageUrl
ModVersionInfo  id · versionNumber · fileName · downloadUrl? · sha1?
                fileSize · gameVersions · loaders
```

Install flow (`instance/commands.rs → install_mod`): resolve newest compatible version → download → **verify SHA-1** → write to `instances/<id>/mods/` → record in `instance.json`.

## Testing without the UI

```bash
# Modrinth (no key)
curl -H 'User-Agent: void-launcher/0.1.0 (dev test)' \
  'https://api.modrinth.com/v2/search?query=sodium&facets=[["project_type:mod"],["categories:fabric"]]&limit=3'

# CurseForge
curl -H "x-api-key: $CURSEFORGE_API_KEY" \
  'https://api.curseforge.com/v1/mods/search?gameId=432&classId=6&searchFilter=jei&pageSize=3'
```
