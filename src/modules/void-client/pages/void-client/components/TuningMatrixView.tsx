import { useCallback, useMemo, useState, type ChangeEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { api } from "@/lib/api";
import { SETTINGS_NAVIGATION } from "../../../constants";
import { ShadowGlyph, type ShadowGlyphName } from "../../../components/ShadowGlyph";
import { useLauncherInstance } from "../../../hooks/useLauncherInstance";
import { useVoidClientStore } from "../../../stores/voidClient.store";
import type { CrashLogDestination, LauncherVisibility, MissionVisibility, RpcLanguage, SettingsSection } from "../../../types";
import { voidClientStyles } from "../void-client.styles";
import { NotificationMatrix } from "./settings/NotificationMatrix";
import { ConfirmDialog, MatrixPanel, SelectField, SettingsHeading, ShadowToggle } from "./settings/SettingsPrimitives";
import { StoragePanel } from "./settings/StoragePanel";

const SECTION_ICONS: Record<SettingsSection, ShadowGlyphName> = {
  general: "settings",
  launch: "play",
  mission: "monitor",
  rpc: "discord",
  privacy: "privacy",
};

function parseJvmArguments(value: string) {
  return value.match(/"[^"]*"|\S+/g)?.map((argument) => argument.replace(/^"|"$/g, "")) ?? [];
}

function tokenTone(token: string) {
  if (token.startsWith("-Xmx") || token.startsWith("-Xms")) return "text-[#d8b4fe]";
  if (token.startsWith("-XX:+")) return "text-[#86a8ff]";
  if (token.startsWith("-XX:-")) return "text-red-300";
  if (/\d/.test(token)) return "text-amber-200";
  return "text-[#b3a7c1]";
}

export function TuningMatrixView() {
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [hashConfirmOpen, setHashConfirmOpen] = useState(false);
  const settingsSection = useVoidClientStore((state) => state.settingsSection);
  const setSettingsSection = useVoidClientStore((state) => state.setSettingsSection);
  const reducedMotion = useReducedMotion();

  const selectSection = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    setSettingsSection(event.currentTarget.value as SettingsSection);
  }, [setSettingsSection]);
  const showResetConfirm = useCallback(() => setResetConfirmOpen(true), []);
  const hideResetConfirm = useCallback(() => setResetConfirmOpen(false), []);
  const showHashConfirm = useCallback(() => setHashConfirmOpen(true), []);
  const hideHashConfirm = useCallback(() => setHashConfirmOpen(false), []);

  return (
    <div className={voidClientStyles.page}>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className={voidClientStyles.sectionKicker}>Forbidden doctrine // live configuration</p>
          <h1 className={voidClientStyles.pageTitle}>Game Tuning Matrix</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#94879f]">A floating command matrix for launch behavior, mission signals, Discord presence and privacy boundaries.</p>
        </div>
        <span className="flex items-center gap-2 border border-[#7B2CBF]/24 bg-[#7B2CBF]/8 px-4 py-2 text-[9px] font-black tracking-[0.13em] text-[#d8b4fe] uppercase [clip-path:polygon(7%_0,100%_0,93%_100%,0_82%)]"><ShadowGlyph name="shield" size={14} />Preferences sealed locally</span>
      </header>

      <nav aria-label="Settings categories" role="tablist" className="relative mb-5 grid gap-2 border border-white/[0.065] bg-black/25 p-2 backdrop-blur-2xl [clip-path:polygon(0_0,98%_0,100%_22%,100%_100%,2%_100%,0_78%)] sm:grid-cols-5">
        <div className="pointer-events-none absolute inset-x-8 top-1/2 h-px bg-[linear-gradient(90deg,transparent,rgba(123,44,191,0.25),transparent)]" />
        {SETTINGS_NAVIGATION.map((item, index) => {
          const active = settingsSection === item.id;
          return (
            <button key={item.id} type="button" role="tab" aria-selected={active} aria-controls={`settings-panel-${item.id}`} value={item.id} onClick={selectSection} className={`group relative z-10 min-h-16 cursor-pointer overflow-visible px-3 py-2 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d8b4fe] ${active ? "text-white" : "text-[#776c82] hover:text-white"}`}>
              <span aria-hidden="true" className={`absolute inset-0 border transition [clip-path:polygon(${index === 0 ? "0_0" : "8%_0"},100%_0,92%_100%,0_84%)] ${active ? "border-[#a855f7]/45 bg-[linear-gradient(110deg,rgba(123,44,191,0.28),rgba(38,63,146,0.13))] shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_0_25px_rgba(123,44,191,0.16)]" : "border-white/[0.055] bg-[#110D17]/60 group-hover:border-[#7B2CBF]/24 group-hover:bg-[#7B2CBF]/8"}`} />
              {active && <motion.span layoutId="settings-command-rail" className="absolute inset-x-[14%] bottom-1 h-px bg-[#d8b4fe] shadow-[0_0_12px_rgba(216,180,254,0.85)]" />}
              <span className="relative flex items-center gap-2.5"><ShadowGlyph name={SECTION_ICONS[item.id]} size={17} className={active ? "text-[#d8b4fe] filter drop-shadow-[0_0_7px_currentColor]" : "text-[#655a70] group-hover:text-[#c796ff]"} /><span><strong className="block text-[10px]">{item.label}</strong><small className="mt-0.5 hidden text-[8px] text-[#655a70] xl:block">{item.description}</small></span></span>
            </button>
          );
        })}
      </nav>

      <AnimatePresence mode="wait" initial={false}>
        <motion.section key={settingsSection} id={`settings-panel-${settingsSection}`} role="tabpanel" initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 12, filter: "blur(4px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -8, filter: "blur(3px)" }} transition={{ duration: reducedMotion ? 0 : 0.24 }}>
          {settingsSection === "general" && <GeneralSettings onReset={showResetConfirm} />}
          {settingsSection === "launch" && <LaunchSettings onRequestUnsafeHash={showHashConfirm} />}
          {settingsSection === "mission" && <MissionControlSettings />}
          {settingsSection === "rpc" && <RpcSettings />}
          {settingsSection === "privacy" && <PrivacySettings />}
        </motion.section>
      </AnimatePresence>

      <ResetSettingsDialog open={resetConfirmOpen} onClose={hideResetConfirm} />
      <UnsafeHashDialog open={hashConfirmOpen} onClose={hideHashConfirm} />
    </div>
  );
}

function GeneralSettings({ onReset }: { onReset: () => void }) {
  const animatedRunes = useVoidClientStore((state) => state.animatedRunes);
  const minimizeOnLaunch = useVoidClientStore((state) => state.minimizeOnLaunch);
  const bloom = useVoidClientStore((state) => state.bloom);
  const toggleAnimatedRunes = useVoidClientStore((state) => state.toggleAnimatedRunes);
  const toggleMinimizeOnLaunch = useVoidClientStore((state) => state.toggleMinimizeOnLaunch);
  const toggleBloom = useVoidClientStore((state) => state.toggleBloom);

  return (
    <div>
      <SettingsHeading eyebrow="Core launcher behavior" title="General Protocol" description="Control atmospheric rendering, window behavior and managed storage without exposing authentication material." icon="settings" />
      <div className="mt-6 grid gap-3 xl:grid-cols-3">
        <ShadowToggle title="Animated runes" description="Keep ambient magical-tech motion active across command surfaces." enabled={animatedRunes} onToggle={toggleAnimatedRunes} />
        <ShadowToggle title="Minimize on launch" description="Hide the launcher when the authenticated Java process starts." enabled={minimizeOnLaunch} onToggle={toggleMinimizeOnLaunch} />
        <ShadowToggle title="Shadow bloom" description="Apply restrained bloom to magical accents and active states." enabled={bloom} onToggle={toggleBloom} />
      </div>
      <StoragePanel />
      <MatrixPanel className="mt-5 border-red-400/18 bg-[radial-gradient(circle_at_90%_0%,rgba(190,24,93,0.13),transparent_35%),rgba(12,5,9,0.9)]">
        <div className="flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-3"><span className="grid size-11 place-items-center border border-red-400/25 bg-red-500/[0.07] text-red-300 [clip-path:polygon(12%_0,100%_0,88%_100%,0_82%)]"><ShadowGlyph name="warning" size={21} /></span><div><p className="text-[9px] font-black tracking-[0.15em] text-red-300 uppercase">Danger protocol</p><h3 className="mt-1 text-sm font-bold text-white">Reset every launcher preference</h3><p className="mt-1 text-[10px] text-[#8d7885]">Accounts, worlds, mods and authentication tokens are never deleted.</p></div></div><button type="button" onClick={onReset} className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-red-400/32 bg-[linear-gradient(110deg,#310912,#671235,#3b0d57)] px-5 py-3 text-xs font-black tracking-[0.08em] text-red-100 uppercase shadow-[0_0_24px_rgba(190,24,93,0.16)] transition hover:border-red-300/55 hover:brightness-125 focus-visible:outline-2 focus-visible:outline-red-300"><ShadowGlyph name="warning" size={16} />Reset All Settings</button></div>
      </MatrixPanel>
    </div>
  );
}

function LaunchSettings({ onRequestUnsafeHash }: { onRequestUnsafeHash: () => void }) {
  const width = useVoidClientStore((state) => state.resolutionWidth);
  const height = useVoidClientStore((state) => state.resolutionHeight);
  const fullscreen = useVoidClientStore((state) => state.fullscreen);
  const lockAspectRatio = useVoidClientStore((state) => state.lockAspectRatio);
  const ignoreHash = useVoidClientStore((state) => state.ignoreForgeProcessorHash);
  const launcherVisibility = useVoidClientStore((state) => state.launcherVisibility);
  const setWidth = useVoidClientStore((state) => state.setResolutionWidth);
  const setHeight = useVoidClientStore((state) => state.setResolutionHeight);
  const toggleFullscreen = useVoidClientStore((state) => state.toggleFullscreen);
  const toggleLockAspectRatio = useVoidClientStore((state) => state.toggleLockAspectRatio);
  const toggleIgnoreHash = useVoidClientStore((state) => state.toggleIgnoreForgeProcessorHash);
  const setLauncherVisibility = useVoidClientStore((state) => state.setLauncherVisibility);

  const changeWidth = useCallback((event: ChangeEvent<HTMLInputElement>) => setWidth(Number(event.target.value)), [setWidth]);
  const changeHeight = useCallback((event: ChangeEvent<HTMLInputElement>) => setHeight(Number(event.target.value)), [setHeight]);
  const handleHashToggle = useCallback(() => {
    if (ignoreHash) toggleIgnoreHash();
    else onRequestUnsafeHash();
  }, [ignoreHash, onRequestUnsafeHash, toggleIgnoreHash]);

  return (
    <div>
      <SettingsHeading eyebrow="Game launch doctrine" title="Launch Geometry" description="Tune resolution, visibility, Java memory and integrity behavior for the selected Minecraft instance." icon="play" />
      <div className="mt-6 grid gap-5 2xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <MatrixPanel>
          <p className={voidClientStyles.sectionKicker}>Game settings</p><h3 className="font-display mt-1 text-lg font-black">Render Aperture</h3>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <label htmlFor="resolution-width"><span className="text-[9px] font-black tracking-[0.13em] text-[#a995b7] uppercase">Width</span><input id="resolution-width" type="number" min="800" max="7680" value={width} onChange={changeWidth} className={`${voidClientStyles.input} mt-2 tabular-nums`} /></label>
            <label htmlFor="resolution-height"><span className="text-[9px] font-black tracking-[0.13em] text-[#a995b7] uppercase">Height</span><input id="resolution-height" type="number" min="600" max="4320" value={height} onChange={changeHeight} className={`${voidClientStyles.input} mt-2 tabular-nums`} /></label>
          </div>
          <div className="mt-4 space-y-2"><ShadowToggle title="Launch in Fullscreen Mode" description="Request exclusive fullscreen at game startup." enabled={fullscreen} onToggle={toggleFullscreen} /><ShadowToggle title="Lock Aspect Ratio" description="Maintain a 16:9 relationship while editing resolution." enabled={lockAspectRatio} onToggle={toggleLockAspectRatio} /><ShadowToggle title="Ignore Forge Processor Hash Check" description="Weakens one integrity check. Use only for known custom processors." enabled={ignoreHash} onToggle={handleHashToggle} warning /></div>
          <div className="mt-4"><SelectField id="launcher-visibility" label="Launcher visibility" value={launcherVisibility} onChange={(value) => setLauncherVisibility(value as LauncherVisibility)}><option value="keep-open">Keep Open</option><option value="hide">Hide</option><option value="close">Close</option></SelectField></div>
        </MatrixPanel>
        <JavaDoctrine />
      </div>
    </div>
  );
}

function JavaDoctrine() {
  const ramGb = useVoidClientStore((state) => state.ramGb);
  const jvmArguments = useVoidClientStore((state) => state.jvmArguments);
  const nativeMemoryGuard = useVoidClientStore((state) => state.nativeMemoryGuard);
  const lowLatencyMode = useVoidClientStore((state) => state.lowLatencyMode);
  const setRamGb = useVoidClientStore((state) => state.setRamGb);
  const setJvmArguments = useVoidClientStore((state) => state.setJvmArguments);
  const toggleNativeMemoryGuard = useVoidClientStore((state) => state.toggleNativeMemoryGuard);
  const toggleLowLatencyMode = useVoidClientStore((state) => state.toggleLowLatencyMode);
  const { instance } = useLauncherInstance();
  const queryClient = useQueryClient();
  const tokens = useMemo(() => parseJvmArguments(jvmArguments), [jvmArguments]);
  const saveMutation = useMutation({ mutationFn: async () => {
    if (!instance) throw new Error("Create an instance before saving native Java settings.");
    return api.updateInstanceSettings(instance.id, { memoryMb: ramGb * 1_024, javaPath: instance.javaPath, extraJavaArgs: parseJvmArguments(jvmArguments) });
  }, onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["instances"] }) });
  const changeRam = useCallback((event: ChangeEvent<HTMLInputElement>) => setRamGb(Number(event.target.value)), [setRamGb]);
  const changeJvm = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => setJvmArguments(event.target.value), [setJvmArguments]);
  const save = useCallback(() => saveMutation.mutate(), [saveMutation]);

  return (
    <MatrixPanel>
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className={voidClientStyles.sectionKicker}>Java tweaks</p><h3 className="font-display mt-1 text-lg font-black">Cid Kagenou Runtime</h3></div><motion.output key={ramGb} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} htmlFor="matrix-ram" className="font-display text-3xl font-black text-[#d8b4fe] filter drop-shadow-[0_0_12px_rgba(168,85,247,0.5)]">{ramGb}<small className="ml-1 text-xs text-[#8d8198]">GB</small></motion.output></div>
      <input id="matrix-ram" aria-label="RAM allocation" type="range" min="2" max="32" step="1" value={ramGb} onChange={changeRam} className="mt-5 h-2 w-full cursor-pointer appearance-none rounded-full bg-[linear-gradient(90deg,#3b0d57,#7B2CBF_52%,#263f92)] accent-[#a855f7] shadow-[0_0_18px_rgba(123,44,191,0.22)]" />
      <div className="mt-2 flex justify-between text-[9px] text-[#655a70]"><span>2 GB</span><span>16 GB</span><span>32 GB</span></div>
      <label htmlFor="matrix-jvm" className="mt-5 block text-[9px] font-black tracking-[0.13em] text-[#a995b7] uppercase">JVM Arguments</label>
      <textarea id="matrix-jvm" value={jvmArguments} onChange={changeJvm} spellCheck={false} className={`${voidClientStyles.input} mt-2 h-28 resize-y select-text py-3 font-mono text-[11px] leading-5`} />
      <div className="mt-2 min-h-16 border border-white/[0.06] bg-black/35 p-3 font-mono text-[10px] leading-5 [clip-path:polygon(0_0,98%_0,100%_18%,100%_100%,2%_100%,0_82%)]" aria-label="Syntax highlighted JVM argument preview">{tokens.map((token, index) => <span key={`${token}-${index}`} className={tokenTone(token)}>{token}{" "}</span>)}</div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2"><ShadowToggle title="Native Memory Guard" description="Clamp unsafe native allocation requests." enabled={nativeMemoryGuard} onToggle={toggleNativeMemoryGuard} /><ShadowToggle title="Low-Latency Queue" description="Prefer immediate frame submission." enabled={lowLatencyMode} onToggle={toggleLowLatencyMode} /></div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><span aria-live="polite" className="text-[10px]">{saveMutation.isSuccess && <span className="text-[#4cff9a]">Java doctrine saved.</span>}{saveMutation.isError && <span className="text-red-300">{String(saveMutation.error)}</span>}</span><button type="button" onClick={save} disabled={!instance || saveMutation.isPending} className={voidClientStyles.primaryButton}><ShadowGlyph name={saveMutation.isSuccess ? "check" : "download"} size={15} />{saveMutation.isPending ? "Saving…" : "Save Java Doctrine"}</button></div>
    </MatrixPanel>
  );
}

function MissionControlSettings() {
  const missionVisibility = useVoidClientStore((state) => state.missionVisibility);
  const setMissionVisibility = useVoidClientStore((state) => state.setMissionVisibility);
  const autoUpload = useVoidClientStore((state) => state.autoUploadCrashLogs);
  const toggleAutoUpload = useVoidClientStore((state) => state.toggleAutoUploadCrashLogs);
  const destination = useVoidClientStore((state) => state.crashLogDestination);
  const setDestination = useVoidClientStore((state) => state.setCrashLogDestination);
  const openCrash = useVoidClientStore((state) => state.setCrashScreenOpen);
  const showCrash = useCallback(() => openCrash(true), [openCrash]);

  return (
    <div>
      <SettingsHeading eyebrow="Mission control" title="Signal & Recovery Grid" description="Choose where Mission Control appears, which events can interrupt you and how crash evidence is handled." icon="monitor" />
      <div className="mt-6 grid gap-5 xl:grid-cols-2">
        <MatrixPanel><SelectField id="mission-visibility" label="Visibility on game launch" value={missionVisibility} onChange={(value) => setMissionVisibility(value as MissionVisibility)} description="Controls how the mission surface behaves when Minecraft starts."><option value="best-monitor">Show on best available Monitor</option><option value="background">Open in Background</option><option value="hidden">Don't Show</option></SelectField><div className="mt-5 border border-[#4c6fdc]/18 bg-[#263f92]/[0.055] p-4 [clip-path:polygon(0_0,97%_0,100%_18%,100%_100%,3%_100%,0_82%)]"><div className="flex items-center gap-3 text-[#86a8ff]"><ShadowGlyph name="monitor" size={20} /><strong className="text-xs text-white">Monitor routing preview</strong></div><p className="mt-2 text-[10px] leading-5 text-[#81788d]">Mission Control uses available display telemetry when the native monitor bridge is connected.</p></div></MatrixPanel>
        <MatrixPanel><p className={voidClientStyles.sectionKicker}>Automatic crash reporter</p><h3 className="font-display mt-1 text-lg font-black">Void Diagnostics</h3><div className="mt-4"><ShadowToggle title="Automatically Upload Logs on Game Crash" description="Consent preference only. No upload occurs until a diagnostic endpoint is configured." enabled={autoUpload} onToggle={toggleAutoUpload} warning /></div><div className="mt-4"><SelectField id="crash-destination" label="Log destination" value={destination} onChange={(value) => setDestination(value as CrashLogDestination)}><option value="mc-logs">MC-Logs.gs</option><option value="void-native">Void Logs Native</option></SelectField></div><button type="button" onClick={showCrash} className={`${voidClientStyles.primaryButton} mt-5 w-full`}><ShadowGlyph name="warning" size={16} />Preview Crash Diagnostics</button><p className="mt-2 text-[9px] leading-4 text-amber-100/55">Preview mode never uploads files or claims a native repair occurred.</p></MatrixPanel>
      </div>
      <NotificationMatrix />
    </div>
  );
}

function RpcSettings() {
  const enabled = useVoidClientStore((state) => state.discordRpcEnabled);
  const idle = useVoidClientStore((state) => state.hideRpcWhenIdle);
  const language = useVoidClientStore((state) => state.rpcLanguage);
  const toggleEnabled = useVoidClientStore((state) => state.toggleDiscordRpc);
  const toggleIdle = useVoidClientStore((state) => state.toggleHideRpcWhenIdle);
  const setLanguage = useVoidClientStore((state) => state.setRpcLanguage);
  return <div><SettingsHeading eyebrow="Discord rich presence" title="Shadow Presence Relay" description="Define what the future Discord bridge may display. These preferences remain local until native RPC is connected." icon="discord" /><div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]"><MatrixPanel><div className="space-y-3"><ShadowToggle title="Show Game Status on Discord" description="Publish the active instance and elapsed time when the native RPC bridge is available." enabled={enabled} onToggle={toggleEnabled} /><ShadowToggle title="Hide Rich Presence when Idle" description="Clear presence after the client becomes inactive." enabled={idle} onToggle={toggleIdle} disabled={!enabled} /></div><div className="mt-4"><SelectField id="rpc-language" label="RPC language" value={language} onChange={(value) => setLanguage(value as RpcLanguage)}><option value="english">English</option><option value="german">German</option><option value="russian">Russian</option><option value="japanese">Japanese</option><option value="korean">Korean</option><option value="spanish">Spanish</option><option value="chinese">Chinese</option><option value="polish">Polish</option></SelectField></div></MatrixPanel><MatrixPanel className="min-h-64"><p className={voidClientStyles.sectionKicker}>Presence preview</p><div className="mt-5 flex items-start gap-4 border border-[#5865f2]/20 bg-[#5865f2]/[0.055] p-5 [clip-path:polygon(0_0,97%_0,100%_13%,100%_100%,3%_100%,0_87%)]"><span className="grid size-16 shrink-0 place-items-center border border-[#7f8cff]/24 bg-[#5865f2]/14 text-[#aeb7ff] [clip-path:polygon(12%_0,100%_0,88%_100%,0_82%)]"><ShadowGlyph name="discord" size={30} /></span><div><p className="text-[9px] font-black tracking-[0.14em] text-[#8d96ff] uppercase">Playing a game</p><h3 className="mt-2 text-sm font-bold text-white">Step Beyond the Ordinary Client</h3><p className="mt-1 text-xs text-[#a7a0ad]">Eminence Protocol · Minecraft 1.21.1</p><p className="mt-4 text-[10px] text-[#776c82]">Elapsed Time: 02:45:12</p><span className={`mt-3 inline-flex items-center gap-2 text-[9px] font-black uppercase ${enabled ? "text-[#4cff9a]" : "text-[#776c82]"}`}><span className={`size-1.5 rounded-full ${enabled ? "bg-[#4cff9a]" : "bg-[#655a70]"}`} />{enabled ? "Preference enabled" : "Presence disabled"}</span></div></div></MatrixPanel></div></div>;
}

function PrivacySettings() {
  const analytics = useVoidClientStore((state) => state.analyticsEnabled);
  const toggleAnalytics = useVoidClientStore((state) => state.toggleAnalytics);
  return <div><SettingsHeading eyebrow="Privacy boundary" title="The Sealed Identity Vault" description="Analytics is opt-in. Authentication tokens remain in Rust and never enter React, logs or diagnostic previews." icon="privacy" /><div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]"><MatrixPanel><ShadowToggle title="Allow Analytics & Usage Data Collection" description="Permit future privacy-preserving launcher metrics. Disabled by default; no analytics service is currently connected." enabled={analytics} onToggle={toggleAnalytics} /><div className="mt-4 border border-amber-300/16 bg-amber-300/[0.035] p-4 text-[10px] leading-5 text-amber-100/65 [clip-path:polygon(0_0,97%_0,100%_22%,100%_100%,3%_100%,0_78%)]">Changing this preference never uploads historical data. Future analytics must enforce the same consent in the native layer before transmission.</div></MatrixPanel><MatrixPanel><p className={voidClientStyles.sectionKicker}>Protected boundaries</p><div className="mt-4 space-y-3"><BoundaryRow label="Microsoft OAuth tokens" state="Rust only" /><BoundaryRow label="Music provider tokens" state="OS encrypted" /><BoundaryRow label="Diagnostic uploads" state="Explicit consent" /><BoundaryRow label="Analytics" state={analytics ? "Allowed" : "Blocked"} /></div></MatrixPanel></div></div>;
}

function BoundaryRow({ label, state }: { label: string; state: string }) {
  return <div className="flex items-center justify-between gap-4 border-b border-white/[0.055] pb-3 last:border-0 last:pb-0"><span className="text-xs text-[#94879f]">{label}</span><strong className="text-[9px] font-black tracking-[0.11em] text-[#4cff9a] uppercase">{state}</strong></div>;
}

function ResetSettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const reset = useVoidClientStore((state) => state.resetSettings);
  const confirm = useCallback(() => { reset(); onClose(); }, [onClose, reset]);
  return <ConfirmDialog open={open} title="Reset all launcher settings?" description="Resolution, notification, RPC, privacy, Java and visual preferences return to safe defaults. Accounts, instances, worlds and authentication remain untouched." confirmLabel="Reset preferences" onConfirm={confirm} onClose={onClose} />;
}

function UnsafeHashDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toggle = useVoidClientStore((state) => state.toggleIgnoreForgeProcessorHash);
  const confirm = useCallback(() => { toggle(); onClose(); }, [onClose, toggle]);
  return <ConfirmDialog open={open} title="Weaken Forge integrity verification?" description="Ignoring the processor hash check can allow modified or corrupted processors to run. Enable it only for a trusted custom Forge setup." confirmLabel="Enable unsafe option" onConfirm={confirm} onClose={onClose} />;
}
