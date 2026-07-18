# Advanced Features — Dockable Sidebar, Optimizer, Java Auto-Management

Technical companion for the v0.2 modules. Implementations:
[`Sidebar.tsx`](../src/components/layout/Sidebar.tsx) · [`OptimizerPage.tsx`](../src/components/optimizer/OptimizerPage.tsx) · [`system/`](../src-tauri/src/system/)

---

## 1. Dockable sidebar ("snap and dock")

### The model: docking is state, not geometry

The naive approach — dragging the sidebar around with `position: absolute` and pixel math — fights the layout engine and reflows the whole app every frame. Instead:

- The docked side is **one piece of state**: `sidebarSide: "left" | "right"` (zustand, persisted to localStorage).
- The app shell is a flex **row**; left vs. right is nothing but CSS `order`:
  sidebar `order: 0 | 2`, main content `order: 1`. Mirroring is a class swap (`border-r` ↔ `border-l`, the active-nav indicator flips its inset edge).
- **Motion** (`motion.aside layout`) animates the order swap using **FLIP**: it measures the element before/after the layout change and animates a GPU `transform` between the two snapshots. One reflow at the swap, compositor-only animation after — that's the whole performance story. No reparenting, no per-frame React renders.

### The drag interaction

```
grip pointer-down ─► dragControls.start()      (dragListener={false}:
        │                                       nav buttons stay clicks)
        ▼
panel rubber-bands (constraints 0/0, elastic 0.15)
pointer x > window/2 ?  ─►  dockPreview = "right"  (glow strip on target edge)
        │
release ─► setSidebarSide(target) ─► order swap ─► FLIP spring animation
```

Two details make it feel right: the **pointer** decides the target (not the panel position — the panel only nudges elastically), and the **preview strip** is rendered by `App.tsx` from store state, because a `position: fixed` element inside the transformed sidebar would be positioned relative to the transform, not the viewport.

Zero-dependency alternative: swap `order` in state and hand-roll FLIP with `getBoundingClientRect()` + `requestAnimationFrame` — ~30 lines; Motion just does it declaratively (and handles interruptions).

---

## 2. Performance optimizer

### Hardware detection — which library for what

| Stack | CPU/RAM/disks | GPU |
| --- | --- | --- |
| **Rust (ours)** | [`sysinfo`](https://crates.io/crates/sysinfo) — cross-platform, no config | sysinfo has no GPU API → WMI (`Win32_VideoController`) via PowerShell on Windows, `lspci` on Linux, `system_profiler` on macOS. Pure-Rust options: [`wmi`](https://crates.io/crates/wmi) crate, or `wgpu::Instance::enumerate_adapters` (driver-accurate, heavier) |
| Node/Electron | [`systeminformation`](https://www.npmjs.com/package/systeminformation) covers CPU/RAM/disk **and** GPU | same package (`si.graphics()`) |
| C#/.NET | `System.Management` (WMI) | `Win32_VideoController` query |

Our scan (`system/hardware.rs`) is blocking by nature (sysinfo refresh + child processes), so the command layer runs it in `spawn_blocking` — the UI thread never stalls.

### What the tiers actually do (`system/optimizer.rs`)

| | Heap (`-Xmx`) | Extra JVM flags (on top of the launcher's G1 baseline) |
| --- | --- | --- |
| **Light** | 25% of RAM, 2–4 GiB | none — stability first |
| **Balanced** | 35% of RAM, 3–8 GiB | `+ParallelRefProcEnabled`, `+UseStringDeduplication` |
| **Strong** | 50% of RAM, 4–12 GiB | those + `+AlwaysPreTouch`, `+PerfDisableSharedMem`, `MaxInlineLevel=15` |

Guardrails: always leave the OS ≥ 2 GiB; round to 512 MB steps; **replace** (never stack) the instance's extra args so re-running is idempotent. The flags REPLACE `extra_java_args`, and every decision becomes an `OptimizationLogEntry { kind, message }` — the transparent feedback list the UI renders.

**GPU "priority"** is the one thing you can do honestly on Windows: writing `GpuPreference=2;` for the Java executable under `HKCU\Software\Microsoft\DirectX\UserGpuPreferences` (the same key the Settings → Display → Graphics UI writes) forces hybrid-graphics laptops onto the dedicated GPU. On Linux/macOS there is no portable equivalent — the log entry says so instead of pretending.

### Full pass (`optimize_instance` command)

1. hardware snapshot → 2. heap per tier → 3. flags per tier → 4. `ensure_java` (below) → 5. GPU preference → save instance, return the log.

---

## 3. Automatic Java management (`system/java.rs`)

### Version mapping

| Minecraft | Required Java |
| --- | --- |
| 1.20.5+ (incl. all 1.21.x) | **21** |
| 1.17 – 1.20.4 | **17** |
| ≤ 1.16.5 | **8** |

### Download pipeline — Adoptium/Temurin

The [Adoptium API](https://api.adoptium.net/) is the de-facto standard for programmatic OpenJDK downloads (no key, stable URLs, checksums included):

```
GET https://api.adoptium.net/v3/assets/latest/21/hotspot
      ?os=windows&architecture=x64&image_type=jre&vendor=eclipse
→ [ { binary: { package: { link, checksum, name, size } }, release_name } ]
```

Pipeline (all in Rust, UI only watches events):

1. **Fast path** — `<data>/java/<major>/…/bin/java` already exists → done, nothing downloaded.
2. **Stream** the archive to disk with `reqwest`, hashing (`sha2`) per chunk; progress is throttled to ~1 event/MB and emitted as the `java-download-progress` Tauri event (`{phase, downloadedBytes, totalBytes}` — phases `download → verify → extract → done`).
3. **Verify** SHA-256 against Adoptium's checksum; mismatch deletes the file and errors.
4. **Extract** on a worker thread (`zip` on Windows, `tar`+`flate2` elsewhere) into `<data>/java/<major>/`, write a `.release` marker, locate `bin/java` (handles the archive's top-level dir and macOS `Contents/Home`).
5. The instance's `javaPath` is pinned to the managed runtime — the user configures **nothing**.

Isolation is the point: system Java (any version, or none) is never touched and never relied on. Mojang also publishes its own per-version JREs (`piston-meta` java-runtime manifest) — that's a fine alternative source; Temurin was chosen because the API is simpler and the builds are complete JREs.

Equivalent libraries elsewhere: Node — `systeminformation` + manual Adoptium fetch or `jdk-utils`; C# — `CmlLib.Core` ships Mojang-JRE handling out of the box.
