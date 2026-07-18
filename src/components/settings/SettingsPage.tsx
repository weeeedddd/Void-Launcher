/**
 * Global launcher settings.
 *
 * Scaffold status: informational only. The Rust backend already reads
 * `settings.json` from the app-data directory (see src-tauri/src/state.rs);
 * building form UI that writes it via a `save_settings` command is a
 * straightforward next step (Roadmap → Milestone 4).
 */
export function SettingsPage() {
  return (
    <div className="mx-auto max-w-3xl px-8 py-8">
      <h2 className="text-2xl font-bold">Settings</h2>
      <p className="mt-1 mb-6 text-sm text-ink-500">Global defaults — instances can override them.</p>

      <div className="flex flex-col gap-4">
        <section className="rounded-xl border border-void-700 bg-void-800/70 p-5">
          <h3 className="font-semibold">CurseForge API key</h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-300">
            Searching CurseForge requires a free API key from{" "}
            <span className="text-accent-300">console.curseforge.com</span>. Set it as the{" "}
            <code className="rounded bg-void-700 px-1.5 py-0.5 text-xs">CURSEFORGE_API_KEY</code>{" "}
            environment variable, or add{" "}
            <code className="rounded bg-void-700 px-1.5 py-0.5 text-xs">
              {'{ "curseforgeApiKey": "…" }'}
            </code>{" "}
            to <code className="rounded bg-void-700 px-1.5 py-0.5 text-xs">settings.json</code> in
            the launcher's data folder. Modrinth works without any key.
          </p>
        </section>

        <section className="rounded-xl border border-void-700 bg-void-800/70 p-5">
          <h3 className="font-semibold">Java</h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-300">
            By default the launcher will download the matching Mojang Java runtime per Minecraft
            version (Milestone 3). A custom path and per-instance RAM allocation can be set in each
            instance's settings.
          </p>
        </section>
      </div>
    </div>
  );
}
