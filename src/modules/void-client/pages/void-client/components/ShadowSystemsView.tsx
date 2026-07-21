import { useCallback, useEffect, useState, type ChangeEvent, type PointerEvent, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ShadowGlyph } from "../../../components/ShadowGlyph";
import { useVoidClientStore } from "../../../stores/voidClient.store";
import { voidClientStyles } from "../void-client.styles";

type SystemsSection = "core" | "archive" | "network" | "forge" | "sanctum";
type ScanState = "idle" | "running" | "complete";

const SECTION_ITEMS: readonly { id: SystemsSection; label: string; subtitle: string; icon: "telemetry" | "mods" | "discord" | "settings" | "chronicle" }[] = [
  { id: "core", label: "The Core", subtitle: "Performance & runtime", icon: "telemetry" },
  { id: "archive", label: "Shadow Archive", subtitle: "Mods & instances", icon: "mods" },
  { id: "network", label: "The Network", subtitle: "Social & servers", icon: "discord" },
  { id: "forge", label: "The Forge", subtitle: "Customization bridge", icon: "settings" },
  { id: "sanctum", label: "The Sanctum", subtitle: "Immersion & security", icon: "chronicle" },
];

const PROFILE_SLOTS = ["Alpha", "Beta", "Gamma", "Delta", "Epsilon", "Zeta", "Eta"] as const;

const MOD_UPDATES = [
  { id: "sodium", name: "Sodium", version: "0.6.9", next: "0.6.10", status: "ready" },
  { id: "iris", name: "Iris Shaders", version: "1.8.8", next: "1.8.9", status: "ready" },
  { id: "lithium", name: "Lithium", version: "0.14.8", next: "0.14.9", status: "ready" },
  { id: "zoomify", name: "Zoomify", version: "2.14.0", next: "2.15.0", status: "ready" },
] as const;

const GALLERY_ITEMS = [
  { id: "voidlight", name: "Voidlight", type: "Shader", image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=700&q=80" },
  { id: "midnight", name: "Midnight Garden", type: "Resource pack", image: "https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=700&q=80" },
  { id: "ashen", name: "Ashen Skies", type: "Shader", image: "https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=700&q=80" },
  { id: "obsidian", name: "Obsidian UI", type: "Resource pack", image: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=700&q=80" },
] as const;

const SERVER_ENTRIES = [
  { id: "hypixel", name: "Hypixel", address: "mc.hypixel.net", players: "42,184" },
  { id: "lunar", name: "Shadow Garden SMP", address: "play.shadow-garden.net", players: "318" },
  { id: "practice", name: "Void Practice", address: "practice.void.gg", players: "76" },
] as const;

const BOUNTIES = [
  { id: "bedwars", title: "Win 5 Bedwars matches", reward: "180 coins", progress: 3, total: 5 },
  { id: "architect", title: "Build a protected base", reward: "120 coins", progress: 1, total: 1 },
  { id: "expedition", title: "Explore 3 new biomes", reward: "240 coins", progress: 2, total: 3 },
] as const;

const RELEASE_LINES = [
  "[00:00:01] Shadow Systems loaded",
  "[00:00:02] Atomic Protocol guard is ready",
  "[00:00:03] Runtime profiles indexed",
  "[00:00:04] Archive sync boundary verified",
  "[00:00:05] Welcome back, operator",
];

export function ShadowSystemsView() {
  const [section, setSection] = useState<SystemsSection>("core");
  const [atomicProtocol, setAtomicProtocol] = useState(true);
  const [slimeSuit, setSlimeSuit] = useState(false);
  const [smartRam, setSmartRam] = useState(true);
  const [javaRuntime, setJavaRuntime] = useState("auto");
  const [integrity, setIntegrity] = useState<ScanState>("idle");
  const [integrityProgress, setIntegrityProgress] = useState(0);
  const [syncOptions, setSyncOptions] = useState({ options: true, servers: true, keybinds: false });
  const [updatedMods, setUpdatedMods] = useState<string[]>([]);
  const [updatingAll, setUpdatingAll] = useState(false);
  const [exportState, setExportState] = useState("idle");
  const [backupCadence, setBackupCadence] = useState("Every 6 hours");
  const [enabledGallery, setEnabledGallery] = useState<string[]>(["voidlight"]);
  const [account, setAccount] = useState("Dominic");
  const [serverPings, setServerPings] = useState<Record<string, number>>({ hypixel: 24, lunar: 38, practice: 61 });
  const [rpcStatus, setRpcStatus] = useState("Mission: In the shadows");
  const [rpcDetail, setRpcDetail] = useState("Preparing the next deployment");
  const [completedBounties, setCompletedBounties] = useState<string[]>(["architect"]);
  const [hudSlot, setHudSlot] = useState(4);
  const [reticleColor, setReticleColor] = useState("#c084fc");
  const [reticleSize, setReticleSize] = useState(18);
  const [selectedRelic, setSelectedRelic] = useState("Nightfall Cape");
  const [keybinds, setKeybinds] = useState({ sprint: "R", inventory: "E", voice: "V" });
  const [showCapes, setShowCapes] = useState(true);
  const [voidOverride, setVoidOverride] = useState(false);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [stealthKey, setStealthKey] = useState("F8");
  const [activeProfile, setActiveProfile] = useState("Alpha");
  const [expandedRelease, setExpandedRelease] = useState(false);
  const [sanctuaryScan, setSanctuaryScan] = useState<ScanState>("idle");
  const [sanctuaryProgress, setSanctuaryProgress] = useState(0);
  const [parallaxEnabled, setParallaxEnabled] = useState(true);
  const [backgroundIndex, setBackgroundIndex] = useState(0);
  const reducedMotion = useReducedMotion();
  const ramGb = useVoidClientStore((state) => state.ramGb);
  const setRamGb = useVoidClientStore((state) => state.setRamGb);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setServerPings((current) => Object.fromEntries(Object.entries(current).map(([id, ping]) => [id, Math.max(12, Math.min(98, ping + Math.round((Math.random() - 0.5) * 12)))])));
    }, 2600);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (integrity !== "running") return undefined;
    setIntegrityProgress(0);
    const timer = window.setInterval(() => {
      setIntegrityProgress((current) => {
        const next = Math.min(100, current + 17);
        if (next >= 100) {
          window.clearInterval(timer);
          window.setTimeout(() => setIntegrity("complete"), 220);
        }
        return next;
      });
    }, 180);
    return () => window.clearInterval(timer);
  }, [integrity]);

  useEffect(() => {
    if (sanctuaryScan !== "running") return undefined;
    setSanctuaryProgress(0);
    const timer = window.setInterval(() => {
      setSanctuaryProgress((current) => {
        const next = Math.min(100, current + 12);
        if (next >= 100) {
          window.clearInterval(timer);
          window.setTimeout(() => setSanctuaryScan("complete"), 280);
        }
        return next;
      });
    }, 210);
    return () => window.clearInterval(timer);
  }, [sanctuaryScan]);

  const ramTone = ramGb < 4 ? "Low" : ramGb > 24 ? "High" : "Balanced";
  const ramToneClass = ramGb < 4 ? "text-amber-300" : ramGb > 24 ? "text-red-300" : "text-[#72f2a8]";
  const selectedSection = SECTION_ITEMS.find((item) => item.id === section) ?? SECTION_ITEMS[0];

  const updateSync = useCallback((key: keyof typeof syncOptions) => {
    setSyncOptions((current) => ({ ...current, [key]: !current[key] }));
  }, []);

  const updateAllMods = useCallback(() => {
    if (updatingAll) return;
    setUpdatingAll(true);
    window.setTimeout(() => {
      setUpdatedMods(MOD_UPDATES.map((item) => item.id));
      setUpdatingAll(false);
    }, 1800);
  }, [updatingAll]);

  const exportArchive = useCallback(() => {
    setExportState("sealing");
    window.setTimeout(() => setExportState("sealed"), 1600);
  }, []);

  const toggleGallery = useCallback((id: string) => {
    setEnabledGallery((current) => current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]);
  }, []);

  const toggleBounty = useCallback((id: string) => {
    setCompletedBounties((current) => current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]);
  }, []);

  const movePointer = useCallback((event: PointerEvent<HTMLElement>) => {
    if (!parallaxEnabled || reducedMotion) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    setPointer({ x: (event.clientX - bounds.left) / bounds.width - 0.5, y: (event.clientY - bounds.top) / bounds.height - 0.5 });
  }, [parallaxEnabled, reducedMotion]);

  return (
    <div className={voidClientStyles.page} onPointerMove={movePointer}>
      <header className={`${voidClientStyles.glassCard} mb-5 overflow-hidden p-5 sm:p-7`}>
        <motion.div className="pointer-events-none absolute -top-32 right-[8%] size-72 rounded-full border border-[#a855f7]/18" style={{ transform: `translate3d(${pointer.x * -18}px, ${pointer.y * -12}px, 0)` }} />
        <motion.div className="pointer-events-none absolute right-[-8%] bottom-[-68%] size-[540px] rounded-full bg-[#7B2CBF]/12 blur-[100px]" style={{ transform: `translate3d(${pointer.x * 26}px, ${pointer.y * 18}px, 0)` }} />
        <div className="relative z-10 flex flex-wrap items-end justify-between gap-5">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-xl border border-[#a855f7]/30 bg-[#7B2CBF]/12 text-[#d8b4fe] shadow-[0_0_26px_rgba(123,44,191,.2)]"><ShadowGlyph name="spark" size={22} /></span>
              <div><p className={voidClientStyles.sectionKicker}>Shadow Systems</p><p className="mt-1 text-[10px] font-semibold tracking-[0.1em] text-[#817488] uppercase">AAA control surface</p></div>
            </div>
            <h1 className={`${voidClientStyles.pageTitle} mt-5`}>Every edge of the client, under control.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#a79bad]">Tune the runtime, seal your archive, shape the in-game bridge and keep every signal close. These controls stay local until the native service is ready to apply them.</p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-[#72f2a8]/22 bg-[#72f2a8]/[0.055] px-3.5 py-2 text-[10px] font-semibold tracking-[0.08em] text-[#72f2a8] uppercase"><span className="size-1.5 animate-pulse rounded-full bg-[#72f2a8]" />30 systems indexed</div>
        </div>
        <div className="relative z-10 mt-6 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          {SECTION_ITEMS.map((item) => <button key={item.id} type="button" onClick={() => setSection(item.id)} aria-pressed={section === item.id} className={`flex min-h-16 cursor-pointer items-center gap-3 rounded-xl border px-3 text-left transition ${voidClientStyles.focusRing} ${section === item.id ? "border-[#c084fc]/55 bg-[#7B2CBF]/18 text-white shadow-[0_0_26px_rgba(123,44,191,.17)]" : "border-white/[0.08] bg-black/22 text-[#998da1] hover:border-[#9d5ce0]/35 hover:text-white"}`}><span className={`grid size-9 shrink-0 place-items-center rounded-lg border ${section === item.id ? "border-[#c084fc]/40 bg-[#7B2CBF]/18 text-[#e2c9ff]" : "border-white/[0.08] bg-black/25 text-[#75687d]"}`}><ShadowGlyph name={item.icon} size={17} /></span><span className="min-w-0"><strong className="block truncate text-xs font-bold">{item.label}</strong><small className="mt-1 block truncate text-[10px] text-[#817488]">{item.subtitle}</small></span></button>)}
        </div>
      </header>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div><p className={voidClientStyles.sectionKicker}>{selectedSection.subtitle}</p><h2 className="font-display mt-1 text-xl font-black">{selectedSection.label}</h2></div>
        <span className={voidClientStyles.tag}><ShadowGlyph name="shield" size={12} /> Native-ready controls</span>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={section} initial={{ opacity: 0, y: reducedMotion ? 0 : 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reducedMotion ? 0 : -8 }} transition={{ duration: reducedMotion ? 0.01 : 0.22 }}>
          {section === "core" && <CoreSection atomicProtocol={atomicProtocol} setAtomicProtocol={setAtomicProtocol} slimeSuit={slimeSuit} setSlimeSuit={setSlimeSuit} smartRam={smartRam} setSmartRam={setSmartRam} javaRuntime={javaRuntime} setJavaRuntime={setJavaRuntime} ramGb={ramGb} setRamGb={setRamGb} ramTone={ramTone} ramToneClass={ramToneClass} integrity={integrity} integrityProgress={integrityProgress} setIntegrity={setIntegrity} />}
          {section === "archive" && <ArchiveSection syncOptions={syncOptions} updateSync={updateSync} updatedMods={updatedMods} updatingAll={updatingAll} updateAllMods={updateAllMods} exportState={exportState} exportArchive={exportArchive} backupCadence={backupCadence} setBackupCadence={setBackupCadence} enabledGallery={enabledGallery} toggleGallery={toggleGallery} />}
          {section === "network" && <NetworkSection account={account} setAccount={setAccount} serverPings={serverPings} rpcStatus={rpcStatus} setRpcStatus={setRpcStatus} rpcDetail={rpcDetail} setRpcDetail={setRpcDetail} completedBounties={completedBounties} toggleBounty={toggleBounty} />}
          {section === "forge" && <ForgeSection hudSlot={hudSlot} setHudSlot={setHudSlot} reticleColor={reticleColor} setReticleColor={setReticleColor} reticleSize={reticleSize} setReticleSize={setReticleSize} selectedRelic={selectedRelic} setSelectedRelic={setSelectedRelic} keybinds={keybinds} setKeybinds={setKeybinds} showCapes={showCapes} setShowCapes={setShowCapes} voidOverride={voidOverride} setVoidOverride={setVoidOverride} />}
          {section === "sanctum" && <SanctumSection parallaxEnabled={parallaxEnabled} setParallaxEnabled={setParallaxEnabled} backgroundIndex={backgroundIndex} setBackgroundIndex={setBackgroundIndex} stealthKey={stealthKey} setStealthKey={setStealthKey} activeProfile={activeProfile} setActiveProfile={setActiveProfile} expandedRelease={expandedRelease} setExpandedRelease={setExpandedRelease} sanctuaryScan={sanctuaryScan} sanctuaryProgress={sanctuaryProgress} setSanctuaryScan={setSanctuaryScan} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function CoreSection({ atomicProtocol, setAtomicProtocol, slimeSuit, setSlimeSuit, smartRam, setSmartRam, javaRuntime, setJavaRuntime, ramGb, setRamGb, ramTone, ramToneClass, integrity, integrityProgress, setIntegrity }: { atomicProtocol: boolean; setAtomicProtocol: (value: boolean) => void; slimeSuit: boolean; setSlimeSuit: (value: boolean) => void; smartRam: boolean; setSmartRam: (value: boolean) => void; javaRuntime: string; setJavaRuntime: (value: string) => void; ramGb: number; setRamGb: (value: number) => void; ramTone: string; ramToneClass: string; integrity: ScanState; integrityProgress: number; setIntegrity: (value: ScanState) => void }) {
  return <div className="grid gap-5 xl:grid-cols-2">
    <ModuleCard icon="spark" eyebrow="Game booster" title="Atomic Protocol" description="Suspend non-essential background work while Minecraft is in focus.">
      <div className="rounded-xl border border-[#a855f7]/25 bg-[radial-gradient(circle_at_82%_0%,rgba(123,44,191,.28),transparent_48%),rgba(0,0,0,.2)] p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-black text-white">Background task guard</p><p className="mt-1 text-[10px] leading-4 text-[#95899f]">Releases memory and reduces wake-ups during play.</p></div><BigToggle checked={atomicProtocol} onChange={setAtomicProtocol} /></div><div className="mt-4 grid grid-cols-3 gap-2"><Metric label="Tasks" value={atomicProtocol ? "18" : "0"} /><Metric label="Saved RAM" value={atomicProtocol ? "1.4 GB" : "—"} /><Metric label="Mode" value={atomicProtocol ? "Armed" : "Standby"} /></div></div>
    </ModuleCard>
    <ModuleCard icon="ram" eyebrow="Memory" title="Smart RAM auto-tuning" description="Keep a safe allocation for the selected instance and Java runtime.">
      <div className="flex items-end justify-between"><div><span className="font-display text-3xl font-black text-white">{ramGb} GB</span><span className={`ml-2 text-[10px] font-bold uppercase ${ramToneClass}`}>{ramTone}</span></div><ToggleRow label="Auto" description="Adjust on launch" checked={smartRam} onChange={setSmartRam} /></div><input aria-label="RAM allocation" type="range" min="2" max="32" value={ramGb} onChange={(event) => setRamGb(Number(event.target.value))} className="mt-5 w-full accent-[#a855f7]" /><div className="mt-2 flex justify-between text-[10px] text-[#75697e]"><span>2 GB</span><span>Recommended 6–12 GB</span><span>32 GB</span></div></ModuleCard>
    <ModuleCard icon="server" eyebrow="Runtime" title="Dynamic Java runtime" description="Choose a compatible runtime or let Void select one per Minecraft version.">
      <SelectField label="Runtime" value={javaRuntime} onChange={(event) => setJavaRuntime(event.target.value)}><option value="auto">Automatic per instance</option><option value="java-8">Java 8 · legacy</option><option value="java-17">Java 17 · stable</option><option value="java-21">Java 21 · current</option><option value="graalvm">GraalVM · experimental</option></SelectField><div className="mt-3 flex items-center justify-between rounded-xl border border-white/[0.07] bg-black/25 px-3 py-2 text-[10px]"><span className="text-[#95899f]">Selected runtime</span><span className="font-bold text-[#d8b4fe]">{javaRuntime === "auto" ? "Resolver will decide" : javaRuntime.replace("java-", "Java ")}</span></div>
    </ModuleCard>
    <ModuleCard icon="shield" eyebrow="Pre-launch" title="Integrity check" description="Scan runtime files, libraries and instance metadata before the game process starts.">
      <div className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-black/25 p-3"><span className={`grid size-10 place-items-center rounded-xl border ${integrity === "complete" ? "border-[#72f2a8]/35 bg-[#72f2a8]/10 text-[#72f2a8]" : "border-[#a855f7]/25 bg-[#7B2CBF]/10 text-[#d8b4fe]"}`}><ShadowGlyph name={integrity === "complete" ? "check" : "shield"} size={18} /></span><div className="min-w-0 flex-1"><p className="text-xs font-bold text-white">{integrity === "running" ? `Scanning ${integrityProgress}%` : integrity === "complete" ? "All boundaries verified" : "Ready to scan"}</p>{integrity === "running" && <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.07]"><motion.div className="h-full bg-[#a855f7]" animate={{ width: `${integrityProgress}%` }} /></div>}</div><button type="button" onClick={() => setIntegrity(integrity === "running" ? "idle" : "running")} className={voidClientStyles.secondaryButton}>{integrity === "running" ? "Stop" : "Scan"}</button></div>
    </ModuleCard>
    <ModuleCard icon="spark" eyebrow="Lightweight mode" title="Slime-Suit Protocol" description="Collapse launcher surfaces into a quiet, low-overhead tray while you play."><ToggleRow label="Hide launcher chrome during play" description="The native process remains available from the tray." checked={slimeSuit} onChange={setSlimeSuit} /></ModuleCard>
    <ModuleCard icon="settings" eyebrow="JVM matrix" title="Advanced JVM arguments" description="Start from a performance preset, then keep your custom flags visible."><div className="grid gap-2 sm:grid-cols-3"><button type="button" className={`${voidClientStyles.secondaryButton} ${voidClientStyles.focusRing}`}>Aikar’s flags</button><button type="button" className={`${voidClientStyles.secondaryButton} ${voidClientStyles.focusRing}`}>Generational ZGC</button><button type="button" className={`${voidClientStyles.secondaryButton} ${voidClientStyles.focusRing}`}>Shenandoah</button></div><p className="mt-3 rounded-xl border border-white/[0.07] bg-black/25 px-3 py-2 font-mono text-[10px] leading-5 text-[#bda8ce]">-XX:+UseG1GC -XX:MaxGCPauseMillis=50 -XX:+ParallelRefProcEnabled</p></ModuleCard>
  </div>;
}

function ArchiveSection({ syncOptions, updateSync, updatedMods, updatingAll, updateAllMods, exportState, exportArchive, backupCadence, setBackupCadence, enabledGallery, toggleGallery }: { syncOptions: { options: boolean; servers: boolean; keybinds: boolean }; updateSync: (key: keyof typeof syncOptions) => void; updatedMods: string[]; updatingAll: boolean; updateAllMods: () => void; exportState: string; exportArchive: () => void; backupCadence: string; setBackupCadence: (value: string) => void; enabledGallery: string[]; toggleGallery: (id: string) => void }) {
  return <div className="grid gap-5 xl:grid-cols-2">
    <ModuleCard icon="sync" eyebrow="Cross-instance sync" title="Keep your habits close" description="Choose the files that follow you between local profiles."><div className="space-y-2"><ToggleRow label="options.txt" description="Video and control preferences" checked={syncOptions.options} onChange={() => updateSync("options")} /><ToggleRow label="servers.dat" description="Saved multiplayer destinations" checked={syncOptions.servers} onChange={() => updateSync("servers")} /><ToggleRow label="Keybinds" description="Input layout per instance" checked={syncOptions.keybinds} onChange={() => updateSync("keybinds")} /></div></ModuleCard>
    <ModuleCard icon="download" eyebrow="Mod updater" title="In-launcher updates" description="Review a clean diff before applying updates to the selected profile."><div className="space-y-2">{MOD_UPDATES.map((item) => { const done = updatedMods.includes(item.id); return <div key={item.id} className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-black/22 px-3 py-2.5"><span className={`grid size-8 place-items-center rounded-lg ${done ? "bg-[#72f2a8]/10 text-[#72f2a8]" : "bg-[#7B2CBF]/12 text-[#d8b4fe]"}`}><ShadowGlyph name={done ? "check" : "mods"} size={15} /></span><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-white">{item.name}</p><p className="text-[10px] text-[#817488]">{done ? `${item.next} installed` : `${item.version} → ${item.next}`}</p></div>{!done && <span className="rounded-full bg-[#7B2CBF]/20 px-2 py-1 text-[9px] font-bold text-[#d8b4fe]">Update</span>}</div>; })}</div><button type="button" onClick={updateAllMods} disabled={updatingAll || updatedMods.length === MOD_UPDATES.length} className={`${voidClientStyles.primaryButton} mt-4 w-full`}>{updatingAll ? "Updating archive…" : updatedMods.length === MOD_UPDATES.length ? "Everything is current" : "Update all"}</button></ModuleCard>
    <ModuleCard icon="upload" eyebrow="Seal the archive" title="Modpack exporter" description="Create a portable Void-Code or ZIP for a friend, without exposing account tokens."><div className="flex gap-2"><button type="button" onClick={exportArchive} disabled={exportState === "sealing"} className={`${voidClientStyles.primaryButton} flex-1`}>{exportState === "sealing" ? "Sealing…" : exportState === "sealed" ? "Void-Code ready" : "Generate Void-Code"}</button><button type="button" onClick={exportArchive} disabled={exportState === "sealing"} className={voidClientStyles.secondaryButton}>.zip</button></div>{exportState === "sealed" && <p role="status" className="mt-3 text-[10px] text-[#72f2a8]">Archive sealed locally. Copy link or open the export folder.</p>}</ModuleCard>
    <ModuleCard icon="storage" eyebrow="Backup vault" title="Automated world backups" description="Keep a recoverable snapshot schedule for each world in the active profile."><SelectField label="Schedule" value={backupCadence} onChange={(event) => setBackupCadence(event.target.value)}><option>Every 30 minutes</option><option>Every 6 hours</option><option>Every day</option><option>Before every launch</option></SelectField><div className="mt-3 flex items-center justify-between text-[10px]"><span className="text-[#817488]">Next snapshot</span><span className="font-bold text-[#d8b4fe]">in 02:42:18</span></div><div className="mt-2 h-1 rounded-full bg-white/[0.07]"><div className="h-full w-[64%] rounded-full bg-[#a855f7]" /></div></ModuleCard>
    <ModuleCard icon="spark" eyebrow="Visual packs" title="Shader & texture gallery" description="Preview a pack, then make the selected look active for the current instance."><div className="grid grid-cols-2 gap-2">{GALLERY_ITEMS.map((item) => { const enabled = enabledGallery.includes(item.id); return <button key={item.id} type="button" onClick={() => toggleGallery(item.id)} aria-pressed={enabled} className={`group relative min-h-28 overflow-hidden rounded-xl border text-left ${enabled ? "border-[#c084fc]/60" : "border-white/[0.08]"}`}><img src={item.image} alt="" onError={(event) => { event.currentTarget.style.display = "none"; }} className="absolute inset-0 size-full object-cover opacity-55 transition duration-300 group-hover:scale-105" /><span className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent" /><span className="absolute inset-x-2 bottom-2"><span className="block text-[10px] font-bold text-white">{item.name}</span><span className="text-[9px] text-[#b3a7c1]">{enabled ? "Active" : item.type}</span></span></button>; })}</div></ModuleCard>
    <ModuleCard icon="folder" eyebrow="Instance bridge" title="Profile handoff" description="The selected pack will target the instance currently active in your library."><div className="rounded-xl border border-[#72f2a8]/18 bg-[#72f2a8]/[0.045] p-3 text-[10px] leading-5 text-[#a9d9bc]"><strong className="text-[#72f2a8]">Target locked:</strong> Shadow Garden 1.21.4 Fabric</div><button type="button" className={`${voidClientStyles.secondaryButton} mt-3 w-full`}>Choose another instance</button></ModuleCard>
  </div>;
}

function NetworkSection({ account, setAccount, serverPings, rpcStatus, setRpcStatus, rpcDetail, setRpcDetail, completedBounties, toggleBounty }: { account: string; setAccount: (value: string) => void; serverPings: Record<string, number>; rpcStatus: string; setRpcStatus: (value: string) => void; rpcDetail: string; setRpcDetail: (value: string) => void; completedBounties: string[]; toggleBounty: (id: string) => void }) {
  return <div className="grid gap-5 xl:grid-cols-2">
    <ModuleCard icon="account" eyebrow="Verified profiles" title="Multi-account switcher" description="Switch between Microsoft identities without leaving the launcher."><SelectField label="Active account" value={account} onChange={(event) => setAccount(event.target.value)}><option>Dominic</option><option>VoidDeveloper</option><option>ShadowOperator</option></SelectField><div className="mt-3 flex items-center gap-3 rounded-xl border border-[#c084fc]/25 bg-[#7B2CBF]/10 p-3"><img src={`https://mc-heads.net/avatar/${encodeURIComponent(account)}/40`} alt="" width={40} height={40} className="size-10 rounded-lg [image-rendering:pixelated]" /><div><p className="text-xs font-bold text-white">{account}</p><p className="mt-1 text-[10px] text-[#a79bad]">Microsoft verified · session protected</p></div></div></ModuleCard>
    <ModuleCard icon="server" eyebrow="Direct connect" title="Shadow Gate" description="Jump directly into a saved server without passing through the title screen."><div className="space-y-2">{SERVER_ENTRIES.map((server) => <button key={server.id} type="button" className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-white/[0.08] bg-black/22 px-3 py-2.5 text-left transition hover:border-[#9d5ce0]/35"><span className="size-2 rounded-full bg-[#72f2a8] shadow-[0_0_10px_currentColor]" /><span className="min-w-0 flex-1"><strong className="block text-xs text-white">{server.name}</strong><small className="mt-1 block truncate text-[10px] text-[#817488]">{server.address}</small></span><ShadowGlyph name="arrow" size={14} className="text-[#d8b4fe]" /></button>)}</div></ModuleCard>
    <ModuleCard icon="telemetry" eyebrow="Live network" title="Server pinger" description="Keep a pulse on the destinations you visit most."><div className="space-y-2">{SERVER_ENTRIES.map((server) => { const ping = serverPings[server.id] ?? 0; const color = ping > 70 ? "text-amber-300" : "text-[#72f2a8]"; return <div key={server.id} className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-black/22 px-3 py-2.5"><span className="size-2 animate-pulse rounded-full bg-[#72f2a8]" /><span className="min-w-0 flex-1"><strong className="block text-xs text-white">{server.name}</strong><small className="text-[10px] text-[#817488]">{server.players} online</small></span><span className={`font-mono text-xs font-bold ${color}`}>{ping} ms</span></div>; })}</div></ModuleCard>
    <ModuleCard icon="discord" eyebrow="Discord RPC" title="Custom presence" description="Tell friends what you are doing without exposing private paths or account data."><label className="block"><span className="mb-1.5 block text-[10px] font-bold text-[#a79bad]">Status line</span><input value={rpcStatus} onChange={(event) => setRpcStatus(event.target.value)} maxLength={64} className={voidClientStyles.input} /></label><label className="mt-3 block"><span className="mb-1.5 block text-[10px] font-bold text-[#a79bad]">Detail</span><input value={rpcDetail} onChange={(event) => setRpcDetail(event.target.value)} maxLength={80} className={voidClientStyles.input} /></label><div className="mt-3 rounded-xl border border-[#5865f2]/25 bg-[#5865f2]/10 p-3"><p className="text-[10px] font-bold tracking-[0.08em] text-[#b8c5ff] uppercase">Discord preview</p><p className="mt-2 text-xs font-bold text-white">{rpcStatus || "No status"}</p><p className="mt-1 text-[10px] text-[#a8b2e3]">{rpcDetail || "No detail"}</p></div></ModuleCard>
    <ModuleCard icon="server" eyebrow="Server profile" title="Live API snapshot" description="A compact home for verified server data when a native provider is connected."><div className="grid grid-cols-3 gap-2"><Metric label="K/D" value="2.41" /><Metric label="Beds" value="18" /><Metric label="Networth" value="12.6M" /></div><p className="mt-3 text-[10px] leading-4 text-[#817488]">Stats are shown only after the selected server authorizes its API connection.</p></ModuleCard>
    <ModuleCard icon="spark" eyebrow="Cult of Diablos" title="Daily bounties" description="A small quest board for the next session."><div className="space-y-2">{BOUNTIES.map((bounty) => { const done = completedBounties.includes(bounty.id); const progress = done ? bounty.total : bounty.progress; return <button key={bounty.id} type="button" onClick={() => toggleBounty(bounty.id)} aria-pressed={done} className={`w-full rounded-xl border p-3 text-left transition ${done ? "border-[#72f2a8]/25 bg-[#72f2a8]/[0.05]" : "border-white/[0.08] bg-black/22 hover:border-[#9d5ce0]/35"}`}><div className="flex items-center justify-between gap-2"><span className="text-xs font-bold text-white">{bounty.title}</span><span className={`text-[10px] font-bold ${done ? "text-[#72f2a8]" : "text-[#d8b4fe]"}`}>{done ? "Complete" : `${progress}/${bounty.total}`}</span></div><div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.07]"><span className={`block h-full rounded-full ${done ? "bg-[#72f2a8]" : "bg-[#a855f7]"}`} style={{ width: `${(progress / bounty.total) * 100}%` }} /></div><p className="mt-2 text-[10px] text-[#817488]">Reward · {bounty.reward}</p></button>; })}</div></ModuleCard>
  </div>;
}

function ForgeSection({ hudSlot, setHudSlot, reticleColor, setReticleColor, reticleSize, setReticleSize, selectedRelic, setSelectedRelic, keybinds, setKeybinds, showCapes, setShowCapes, voidOverride, setVoidOverride }: { hudSlot: number; setHudSlot: (value: number) => void; reticleColor: string; setReticleColor: (value: string) => void; reticleSize: number; setReticleSize: (value: number) => void; selectedRelic: string; setSelectedRelic: (value: string) => void; keybinds: { sprint: string; inventory: string; voice: string }; setKeybinds: (value: { sprint: string; inventory: string; voice: string }) => void; showCapes: boolean; setShowCapes: (value: boolean) => void; voidOverride: boolean; setVoidOverride: (value: boolean) => void }) {
  return <div className="grid gap-5 xl:grid-cols-2">
    <ModuleCard icon="monitor" eyebrow="HUD editor" title="HUD Illusion Matrix" description="Select a surface to move in the future in-game editor bridge."><div className="grid grid-cols-3 gap-2">{["Compass", "Keystrokes", "CPS", "Coordinates", "Armor", "Potion"].map((name, index) => <button key={name} type="button" onClick={() => setHudSlot(index)} className={`min-h-16 rounded-xl border p-2 text-left transition ${hudSlot === index ? "border-[#c084fc]/60 bg-[#7B2CBF]/18" : "border-white/[0.08] bg-black/22 hover:border-[#9d5ce0]/35"}`}><span className="block text-[10px] font-bold text-white">{name}</span><span className="mt-1 block text-[9px] text-[#817488]">{hudSlot === index ? "Selected" : "Drag target"}</span></button>)}</div></ModuleCard>
    <ModuleCard icon="spark" eyebrow="Crosshair" title="Shadow Reticle Studio" description="Tune the reticle that follows your active verified profile."><div className="flex items-center gap-5"><div className="grid size-32 place-items-center rounded-xl border border-white/[0.08] bg-[radial-gradient(circle,rgba(123,44,191,.2),transparent_60%),#07050b]"><span style={{ color: reticleColor, width: reticleSize, height: reticleSize }} className="relative block"><span className="absolute top-1/2 left-0 h-px w-full -translate-y-1/2 bg-current" /><span className="absolute top-0 left-1/2 h-full w-px -translate-x-1/2 bg-current" /></span></div><div className="min-w-0 flex-1"><label className="flex items-center justify-between text-[10px] text-[#a79bad]"><span>Size</span><span className="font-bold text-white">{reticleSize}px</span></label><input type="range" min="8" max="36" value={reticleSize} onChange={(event) => setReticleSize(Number(event.target.value))} className="mt-2 w-full accent-[#a855f7]" /><label className="mt-4 flex items-center justify-between text-[10px] text-[#a79bad]"><span>Color</span><input type="color" value={reticleColor} onChange={(event) => setReticleColor(event.target.value)} className="size-8 cursor-pointer rounded border-0 bg-transparent" /></label></div></div></ModuleCard>
    <ModuleCard icon="vault" eyebrow="Cosmetics" title="The Relic Vault" description="Preview the cosmetic layer that will be visible in supported profiles."><div className="grid grid-cols-3 gap-2">{["Nightfall Cape", "Violet Aura", "Garden Sigil"].map((relic) => <button key={relic} type="button" onClick={() => setSelectedRelic(relic)} className={`min-h-24 rounded-xl border p-2 text-left transition ${selectedRelic === relic ? "border-[#c084fc]/60 bg-[#7B2CBF]/18" : "border-white/[0.08] bg-black/22 hover:border-[#9d5ce0]/35"}`}><span className="mx-auto grid size-10 place-items-center rounded-full border border-[#c084fc]/30 bg-[radial-gradient(circle_at_30%_25%,#d8b4fe,#7B2CBF_42%,#0b0710_70%)] text-[#f1e5ff]"><ShadowGlyph name="spark" size={17} /></span><span className="mt-2 block truncate text-[10px] font-bold text-white">{relic}</span></button>)}</div><p className="mt-3 text-[10px] text-[#817488]">Selected · {selectedRelic}</p></ModuleCard>
    <ModuleCard icon="settings" eyebrow="Keymapping" title="Tactical keymapping" description="Keep your most-used actions visible without opening Minecraft first."><div className="space-y-2">{(["sprint", "inventory", "voice"] as const).map((key) => <label key={key} className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-black/22 px-3 py-2.5"><span className="text-xs font-bold capitalize text-white">{key}</span><input value={keybinds[key]} onChange={(event) => setKeybinds({ ...keybinds, [key]: event.target.value.slice(-1).toUpperCase() })} maxLength={1} className="h-8 w-12 rounded-lg border border-[#9d5ce0]/30 bg-black/35 text-center text-xs font-black text-[#d8b4fe] outline-none focus:ring-2 focus:ring-[#7B2CBF]/30" /></label>)}</div></ModuleCard>
    <ModuleCard icon="spark" eyebrow="Cosmetic visibility" title="Exclusives Void-Capes" description="Choose whether supported servers should render the Void cosmetic layer."><ToggleRow label="Show Void capes" description="Only visible where the profile permits them." checked={showCapes} onChange={setShowCapes} /><ToggleRow label="In-game Void Override" description="Replace the vanilla main menu in supported instances." checked={voidOverride} onChange={setVoidOverride} /></ModuleCard>
    <ModuleCard icon="monitor" eyebrow="Bridge status" title="In-game handoff" description="The native bridge is ready to receive HUD and reticle changes on the next launch."><div className="grid grid-cols-2 gap-2"><Metric label="HUD slots" value="6" /><Metric label="Profiles" value="7" /></div><button type="button" className={`${voidClientStyles.secondaryButton} mt-4 w-full`}>Preview bridge payload</button></ModuleCard>
  </div>;
}

function SanctumSection({ parallaxEnabled, setParallaxEnabled, backgroundIndex, setBackgroundIndex, stealthKey, setStealthKey, activeProfile, setActiveProfile, expandedRelease, setExpandedRelease, sanctuaryScan, sanctuaryProgress, setSanctuaryScan }: { parallaxEnabled: boolean; setParallaxEnabled: (value: boolean) => void; backgroundIndex: number; setBackgroundIndex: (value: number) => void; stealthKey: string; setStealthKey: (value: string) => void; activeProfile: string; setActiveProfile: (value: string) => void; expandedRelease: boolean; setExpandedRelease: (value: boolean) => void; sanctuaryScan: ScanState; sanctuaryProgress: number; setSanctuaryScan: (value: ScanState) => void }) {
  const backgrounds = ["Midnight Garden", "Obsidian Rain", "Violet Eclipse"];
  return <div className="grid gap-5 xl:grid-cols-2">
    <ModuleCard icon="spark" eyebrow="Atmosphere" title="Live parallax backgrounds" description="Keep the launcher alive with restrained motion and a dark, low-contrast backdrop."><div className="flex items-center justify-between"><div><p className="text-xs font-bold text-white">{backgrounds[backgroundIndex]}</p><p className="mt-1 text-[10px] text-[#817488]">Background {backgroundIndex + 1} of {backgrounds.length}</p></div><ToggleRow label="Parallax" description="" checked={parallaxEnabled} onChange={setParallaxEnabled} /></div><div className="mt-4 flex gap-2">{backgrounds.map((name, index) => <button key={name} type="button" onClick={() => setBackgroundIndex(index)} className={`flex-1 rounded-xl border p-3 text-left ${index === backgroundIndex ? "border-[#c084fc]/55 bg-[#7B2CBF]/15" : "border-white/[0.08] bg-black/22"}`}><span className="block h-10 rounded-lg bg-[radial-gradient(circle_at_70%_30%,rgba(192,132,252,.5),transparent_25%),linear-gradient(135deg,#0b0710,#211033)]" /><span className="mt-2 block truncate text-[9px] font-bold text-white">{name}</span></button>)}</div></ModuleCard>
    <ModuleCard icon="chronicle" eyebrow="Media" title="The Chronicle" description="A visual shelf for screenshots and replays captured during your sessions."><div className="grid grid-cols-3 gap-2">{["https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=400&q=80", "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=400&q=80", "https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=400&q=80"].map((image, index) => <button key={image} type="button" className="group relative aspect-square overflow-hidden rounded-xl border border-white/[0.08]"><img src={image} alt={`Captured session ${index + 1}`} onError={(event) => { event.currentTarget.style.display = "none"; }} className="size-full object-cover opacity-70 transition duration-300 group-hover:scale-105 group-hover:opacity-100" /><span className="absolute inset-x-2 bottom-2 truncate text-left text-[9px] font-bold text-white">{index === 0 ? "SMP · 18:42" : index === 1 ? "Replay · 02:15" : "Skyline · 09:11"}</span></button>)}</div><button type="button" className={`${voidClientStyles.secondaryButton} mt-3 w-full`}>Open media folder</button></ModuleCard>
    <ModuleCard icon="warning" eyebrow="Stealth mode" title="Boss key" description="Bind one emergency key to minimize and mute the launcher instantly."><label className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-black/22 p-3"><span><span className="block text-xs font-bold text-white">Emergency key</span><span className="mt-1 block text-[10px] text-[#817488]">Press once to hide the client.</span></span><input value={stealthKey} onChange={(event) => setStealthKey(event.target.value.toUpperCase().slice(0, 4))} className="h-10 w-16 rounded-lg border border-[#9d5ce0]/35 bg-black/35 text-center text-xs font-black text-[#d8b4fe] outline-none focus:ring-2 focus:ring-[#7B2CBF]/30" /></label></ModuleCard>
    <ModuleCard icon="account" eyebrow="Quick launch" title="Seven Shadows profiles" description="Keep seven focused deployment presets one click away."><div className="grid grid-cols-4 gap-2 sm:grid-cols-7">{PROFILE_SLOTS.map((profile, index) => <button key={profile} type="button" onClick={() => setActiveProfile(profile)} className={`min-h-16 rounded-xl border p-2 text-center transition ${activeProfile === profile ? "border-[#c084fc]/60 bg-[#7B2CBF]/18 text-white" : "border-white/[0.08] bg-black/22 text-[#998da1] hover:border-[#9d5ce0]/35"}`}><span className="mx-auto grid size-7 place-items-center rounded-lg bg-black/30 text-[10px] font-black">{index + 1}</span><span className="mt-2 block truncate text-[9px] font-bold">{profile}</span></button>)}</div><p className="mt-3 text-[10px] text-[#817488]">Active profile · <strong className="text-[#d8b4fe]">{activeProfile}</strong></p></ModuleCard>
    <ModuleCard icon="logs" eyebrow="Release notes" title="Animated release notes" description="A terminal-style record of what changed in the latest client build."><div className="rounded-xl border border-white/[0.07] bg-[#050505] p-3 font-mono text-[10px] leading-5 text-[#9debc2]">{RELEASE_LINES.slice(0, expandedRelease ? RELEASE_LINES.length : 3).map((line) => <p key={line}>{line}</p>)}<button type="button" onClick={() => setExpandedRelease(!expandedRelease)} className="mt-2 text-[#d8b4fe] hover:text-white">{expandedRelease ? "Collapse" : "Show full log"}</button></div></ModuleCard>
    <ModuleCard icon="repair" eyebrow="Security" title="Sanctuary Scanner" description="Check local files for missing assets, modified libraries and broken instance boundaries."><div className="flex items-center gap-3"><span className={`grid size-12 place-items-center rounded-xl border ${sanctuaryScan === "complete" ? "border-[#72f2a8]/30 bg-[#72f2a8]/10 text-[#72f2a8]" : "border-red-400/25 bg-red-500/10 text-red-200"}`}><ShadowGlyph name={sanctuaryScan === "complete" ? "check" : "repair"} size={22} /></span><div className="min-w-0 flex-1"><p className="text-xs font-bold text-white">{sanctuaryScan === "running" ? `Scanning local boundary · ${sanctuaryProgress}%` : sanctuaryScan === "complete" ? "No corrupted files found" : "Scanner ready"}</p>{sanctuaryScan === "running" && <div className="mt-2 h-1 rounded-full bg-white/[0.07]"><motion.span className="block h-full rounded-full bg-red-400" animate={{ width: `${sanctuaryProgress}%` }} /></div>}</div><button type="button" onClick={() => setSanctuaryScan(sanctuaryScan === "running" ? "idle" : "running")} className="rounded-xl border border-red-300/30 bg-red-500/10 px-3 py-2 text-[10px] font-black tracking-[0.08em] text-red-100 uppercase transition hover:bg-red-500/20">{sanctuaryScan === "running" ? "Stop" : "Scan"}</button></div></ModuleCard>
  </div>;
}

function ModuleCard({ icon, eyebrow, title, description, children }: { icon: "dashboard" | "vault" | "mods" | "telemetry" | "settings" | "chronicle" | "play" | "close" | "addFriend" | "download" | "external" | "chevronDown" | "account" | "check" | "sliders" | "shield" | "server" | "ram" | "cpu" | "spark" | "music" | "arrow" | "info" | "sync" | "folder" | "upload" | "restart" | "logs" | "storage" | "warning" | "notification" | "discord" | "privacy" | "repair" | "language" | "monitor" | "trash" | "cache" | "minimize" | "maximize"; eyebrow: string; title: string; description: string; children: ReactNode }) {
  return <section className={`${voidClientStyles.glassCard} p-5 sm:p-6`}><div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl border border-[#a855f7]/25 bg-[#7B2CBF]/10 text-[#d8b4fe]"><ShadowGlyph name={icon} size={18} /></span><div className="min-w-0"><p className={voidClientStyles.sectionKicker}>{eyebrow}</p><h3 className="font-display mt-1 text-lg font-black text-white">{title}</h3><p className="mt-2 text-xs leading-5 text-[#91849a]">{description}</p></div></div><div className="mt-5">{children}</div></section>;
}

function BigToggle({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  return <button type="button" aria-pressed={checked} onClick={() => onChange(!checked)} className={`relative h-8 w-14 shrink-0 cursor-pointer rounded-full border transition ${checked ? "border-[#c084fc]/55 bg-[#7B2CBF]/55" : "border-white/[0.12] bg-black/35"}`}><span className={`absolute top-1 size-6 rounded-full transition ${checked ? "right-1 bg-[#e9d5ff] shadow-[0_0_14px_rgba(216,180,254,.8)]" : "left-1 bg-[#655a70]"}`} /></button>;
}

function ToggleRow({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-black/22 px-3 py-2.5"><div className="min-w-0"><p className="text-xs font-bold text-white">{label}</p>{description && <p className="mt-1 text-[10px] leading-4 text-[#817488]">{description}</p>}</div><BigToggle checked={checked} onChange={onChange} /></div>;
}

function SelectField({ label, value, onChange, children }: { label: string; value: string; onChange: (event: ChangeEvent<HTMLSelectElement>) => void; children: ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-[10px] font-bold text-[#a79bad]">{label}</span><select value={value} onChange={onChange} className={`${voidClientStyles.input} cursor-pointer appearance-none`}>{children}</select></label>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-white/[0.07] bg-black/25 px-3 py-2"><p className="text-[9px] font-bold tracking-[0.1em] text-[#75697e] uppercase">{label}</p><p className="mt-1 text-sm font-black text-white">{value}</p></div>;
}
