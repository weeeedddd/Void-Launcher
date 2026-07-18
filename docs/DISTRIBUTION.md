# Distribution — Branded Installer, Windows EXE, Website & Deep Links

How Void Launcher gets to users. Config lives in
[`tauri.conf.json`](../src-tauri/tauri.conf.json) (`bundle.windows.nsis`, `plugins.deep-link`)
and [`src-tauri/installer/`](../src-tauri/installer/).

---

## 1. Building the Windows `.exe`

```bash
npm run tauri build          # on a Windows machine or CI runner
```

Outputs (in `src-tauri/target/release/bundle/`):

- `nsis/Void Launcher_0.1.0_x64-setup.exe` — the **NSIS installer** (what you ship)
- plus the bare `void-launcher.exe` next to it (portable use)

Cross-note: Windows installers must be built **on Windows** — use a GitHub Actions matrix (`windows-latest`) with `tauri-apps/tauri-action`; it builds, signs (if configured) and attaches artifacts to a GitHub Release, which is exactly what the website's download button links to. Code-signing (OV/EV cert or Azure Trusted Signing) is strongly recommended — unsigned installers trip SmartScreen.

## 2. The branded installer

### Tool comparison

| Tool | Look & feel ceiling | Sound | Effort | Verdict |
| --- | --- | --- | --- | --- |
| **Tauri's NSIS bundler** (ours) | header + sidebar bitmaps, icon, hooks, or a fully custom `.nsi` template | WAV via `winmm.dll` call in a hook | low | ✅ best default — stays inside `tauri build` |
| Raw **NSIS** custom template | anything (nsDialogs, custom pages) | same | high | when the wizard itself must be fully custom |
| **Inno Setup** | `WizardImageFile`, Pascal scripting, custom pages | via DLL calls | medium | fine, but outside the Tauri pipeline |
| **WiX (MSI)** | theming is hardest | no | high | enterprise/GPO deployments |

### What's configured here

`tauri.conf.json → bundle.windows.nsis`:

- `installerIcon` / `headerImage` (150×57 BMP) / `sidebarImage` (164×314 BMP) — the purple-gradient placeholders in `src-tauri/installer/` set the dark-purple tone on the welcome/finish pages; swap them for real branding (same paths & sizes).
- `installMode: currentUser` — no UAC prompt, smoother first impression.
- `installerHooks: installer/hooks.nsh` — Tauri's four extension points (`NSIS_HOOK_PRE/POSTINSTALL`, `PRE/POSTUNINSTALL`). Ours plays a completion chime via `winmm.dll::PlaySoundW` if you ship `sounds/done.wav` as a bundle resource (`"resources": ["sounds/done.wav"]`); it's a silent no-op otherwise.

### The honest limit — and the pattern that beats it

The NSIS wizard is a Win32 dialog: bitmaps, yes — **CSS-grade animations, no**. Every launcher with a genuinely "immersive" install experience (Discord-style) uses the same trick:

> **Keep the system installer minimal, do the show in-app.** The installer's only job is copying files + registering the URL scheme. The *first run* of the app then shows a branded bootstrap screen — animated logo, glowing progress bar, WebAudio sounds — while it downloads Java runtimes and assets.

Void Launcher is already built for this: the optimizer's Java download streams progress events into an animated purple progress bar, and `src/lib/sound.ts` synthesizes the subtle click/success sounds (no audio files). Wrapping that into a dedicated first-run screen is UI work only — no installer hacking, and the same experience ships on every OS.

## 3. Landing page (`website/index.html`)

A single self-contained file using the launcher's design tokens:

- **Hero** — logo wordmark + one-line pitch.
- **Download CTA** → `https://github.com/weeeedddd/Void-Launcher/releases/latest` (always the newest CI build; swap for your domain later).
- **Deep-link demo button** → `voidlauncher://mod/modrinth/sodium`, with the standard fallback UX: browsers give no reliable "scheme not handled" signal, so if the tab still has focus ~1.5 s after the click, the page shows a "launcher not installed?" hint.
- **Feature cards + legal footer.**

Host it anywhere static (GitHub Pages, Cloudflare Pages). Natural extensions: an `/api/latest` redirect for stable download URLs, and share pages like `void.dev/pack/<id>` that render pack info and link `voidlauncher://modpack/...`.

## 4. Deep linking (`voidlauncher://`)

End-to-end flow:

```
website <a href="voidlauncher://mod/modrinth/sodium">
   │  scheme registered by the NSIS installer (deep-link plugin config)
   ▼
OS launches (or signals) Void Launcher
   ├─ app already running → single-instance plugin forwards argv,
   │                        refocuses the window (lib.rs)
   └─ cold start / runtime → deep-link plugin on_open_url (lib.rs)
   ▼
Rust emits "deep-link" event ─► App.tsx ─► parseDeepLink() (strict grammar)
   ▼
mod browser opens with the shared project pre-searched
```

Pieces involved:

- `tauri.conf.json → plugins.deep-link.desktop.schemes: ["voidlauncher"]` — the NSIS/deb bundles register the scheme at install time; in dev, `register_all()` does it at runtime (`lib.rs`).
- `tauri-plugin-single-instance` (registered **first**, with the `deep-link` feature) — on Windows a clicked link starts a second process; the plugin hands its argv to the running instance instead.
- `src/lib/deeplink.ts` — **treat URLs as untrusted input**: strict regex grammar (`voidlauncher://(mod|modpack)/(modrinth|curseforge)/<id>`), conservative id charset, unknown links ignored. Never feed URL contents into shell commands or file paths.

URL grammar today: `mod` and `modpack` kinds; the scaffold routes both to a pre-filled mod search. Milestone 5 upgrades the `modpack` kind into a full pack import (resolve manifest → create instance → install mods).
