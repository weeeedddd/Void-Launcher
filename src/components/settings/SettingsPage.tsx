import { useUiStore } from "@/stores/ui";
import { playClick } from "@/lib/sound";

/** Global launcher settings. Instance-specific values live on each instance. */
export function SettingsPage() {
  const { soundEnabled, setSoundEnabled } = useUiStore();

  return (
    <div className="mx-auto max-w-3xl px-8 py-8">
      <h2 className="text-2xl font-bold">Settings</h2>
      <p className="mt-1 mb-6 text-sm text-ink-500">Global defaults — instances can override them.</p>

      <div className="flex flex-col gap-4">
        {/* ── UI sounds ── */}
        <section className="flex items-center justify-between gap-4 rounded-xl border border-void-700 bg-void-800/70 p-5">
          <div>
            <h3 className="font-semibold">Interface sounds</h3>
            <p className="mt-1 text-sm leading-relaxed text-ink-300">
              Subtle clicks and completion chimes, generated with WebAudio — no audio files, no
              volume spikes.
            </p>
          </div>
          <Toggle
            checked={soundEnabled}
            onChange={(value) => {
              setSoundEnabled(value);
              if (value) playClick(); // instant feedback when switching on
            }}
          />
        </section>

        {/* ── Sidebar ── */}
        <section className="rounded-xl border border-void-700 bg-void-800/70 p-5">
          <h3 className="font-semibold">Sidebar position</h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-300">
            Drag the sidebar by its grip handle to either screen edge, or use the arrows button in
            its header. The position is remembered across restarts.
          </p>
        </section>

        {/* ── CurseForge key ── */}
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

        {/* ── Java ── */}
        <section className="rounded-xl border border-void-700 bg-void-800/70 p-5">
          <h3 className="font-semibold">Java runtimes</h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-300">
            Managed automatically: the Optimizer detects which Java each Minecraft version needs
            (8 / 17 / 21), downloads the matching Eclipse Temurin JRE in the background, verifies
            it and installs it isolated under{" "}
            <code className="rounded bg-void-700 px-1.5 py-0.5 text-xs">
              &lt;launcher-data&gt;/java/&lt;major&gt;/
            </code>
            . No system-wide Java required — a manual per-instance override is still possible in
            the instance settings.
          </p>
        </section>
      </div>
    </div>
  );
}

/** Minimal accessible switch in the launcher's accent style. */
function Toggle({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={
        "relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors " +
        (checked ? "bg-accent-600" : "bg-void-600")
      }
    >
      <span
        className={
          "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-ink-100 transition-transform " +
          (checked ? "translate-x-5" : "")
        }
      />
    </button>
  );
}
