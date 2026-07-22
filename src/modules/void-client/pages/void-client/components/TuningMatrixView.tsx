import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isTauri } from "@tauri-apps/api/core";
import { api } from "@/lib/api";
import { SETTINGS_NAVIGATION } from "../../../constants";
import { useLauncherInstance } from "../../../hooks/useLauncherInstance";
import { useVoidClientStore } from "../../../stores/voidClient.store";
import type { GarbageCollectorPreset, LauncherVisibility, MissionVisibility, RpcLanguage, SettingsSection } from "../../../types";
import { voidClientStyles } from "../void-client.styles";
import { NotificationMatrix } from "./settings/NotificationMatrix";
import { NativeUtilitiesPanel } from "./settings/NativeUtilitiesPanel";
import { ConfirmDialog, MatrixPanel, SelectField, SettingsHeading, ShadowToggle } from "./settings/SettingsPrimitives";

const GC_PRESETS: ReadonlyArray<{ id: GarbageCollectorPreset; label: string; requirement: string; args: string[] }> = [
  { id: "aikar-g1", label: "Aikar's G1GC", requirement: "Stable default", args: ["-XX:+UseG1GC", "-XX:+ParallelRefProcEnabled", "-XX:MaxGCPauseMillis=50", "-XX:+DisableExplicitGC", "-XX:+AlwaysPreTouch"] },
  { id: "generational-zgc", label: "Generational ZGC", requirement: "Java 21+", args: ["-XX:+UseZGC", "-XX:+ZGenerational", "-XX:+AlwaysPreTouch"] },
  { id: "shenandoah", label: "Shenandoah GC", requirement: "Temurin runtime", args: ["-XX:+UseShenandoahGC", "-XX:ShenandoahGCMode=satb", "-XX:+AlwaysPreTouch"] },
];

const GC_PREFIXES = ["-XX:+UseG1GC", "-XX:+UseZGC", "-XX:+ZGenerational", "-XX:+UseShenandoahGC", "-XX:ShenandoahGCMode=", "-XX:G1", "-XX:MaxGCPauseMillis=", "-XX:InitiatingHeapOccupancyPercent=", "-XX:+ParallelRefProcEnabled", "-XX:+DisableExplicitGC", "-XX:+AlwaysPreTouch", "-XX:ThreadPriorityPolicy=", "-XX:+UseLargePages"];

function parseArguments(value: string) { return value.match(/"[^\"]*"|\S+/g)?.map((item) => item.replace(/^"|"$/g, "")) ?? []; }
function composeArguments(value: string, preset: GarbageCollectorPreset, priority: boolean, largePages: boolean) {
  const base = parseArguments(value).filter((item) => !GC_PREFIXES.some((prefix) => item.startsWith(prefix)));
  const presetArgs = GC_PRESETS.find((item) => item.id === preset)?.args ?? GC_PRESETS[0].args;
  return [...base, ...presetArgs, ...(priority ? ["-XX:ThreadPriorityPolicy=1"] : []), ...(largePages ? ["-XX:+UseLargePages"] : [])];
}
function inferGarbageCollector(tokens: readonly string[]): GarbageCollectorPreset {
  if (tokens.some((token) => token === "-XX:+UseZGC" || token === "-XX:+ZGenerational")) return "generational-zgc";
  if (tokens.some((token) => token === "-XX:+UseShenandoahGC")) return "shenandoah";
  return "aikar-g1";
}
function tokenClass(token: string) { if (token.startsWith("-Xmx") || token.startsWith("-Xms")) return "text-[#D8B4FE]"; if (token.startsWith("-XX")) return "text-[#A9C2FF]"; if (/\d/.test(token)) return "text-[#FCD34D]"; return "text-[#A1A1AA]"; }

export function TuningMatrixView() {
  const section = useVoidClientStore((state) => state.settingsSection);
  const setSection = useVoidClientStore((state) => state.setSettingsSection);
  const [resetOpen, setResetOpen] = useState(false);
  const selectSection = useCallback((event: React.MouseEvent<HTMLButtonElement>) => setSection(event.currentTarget.value as SettingsSection), [setSection]);
  return <div className={voidClientStyles.page}>
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className={voidClientStyles.sectionKicker}>Settings</p><h1 className={`${voidClientStyles.pageTitle} mt-1`}>Launcher preferences</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[#92929B]">All values below are persisted locally. Instance-specific Java values are written through the native bridge when the packaged client is running.</p></div><span className={voidClientStyles.tag}>Saved locally</span></header>
    <nav aria-label="Settings categories" role="tablist" className="mb-5 grid gap-1.5 rounded-xl border border-[#29292F] bg-[#151518] p-1.5 sm:grid-cols-5">{SETTINGS_NAVIGATION.map((item) => { const active = section === item.id; return <button key={item.id} type="button" role="tab" aria-selected={active} value={item.id} onClick={selectSection} className={`flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 text-left text-xs font-semibold transition-[border-color,background-color,color] ${active ? "border-[#7E22CE] bg-[#7E22CE] text-white" : "border-transparent text-[#92929B] hover:border-[#34343A] hover:bg-[#202026] hover:text-white"}`}><span className="shrink-0"><span className="sr-only">{item.label}</span><svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d={item.id === "general" ? "M12 3v18M3 12h18" : item.id === "launch" ? "M8 5l11 7-11 7V5z" : item.id === "mission" ? "M4 5h16v14H4zM8 9h8M8 13h5" : item.id === "rpc" ? "M5 5h14v10H8l-3 3V5z" : "M12 3l7 3v5c0 4.5-3 7.6-7 10-4-2.4-7-5.5-7-10V6l7-3z"} /></svg></span>{item.label}</button>; })}</nav>
    {section === "general" && <GeneralSettings onReset={() => setResetOpen(true)} />}
    {section === "launch" && <LaunchSettings />}
    {section === "mission" && <MissionSettings />}
    {section === "rpc" && <RpcSettings />}
    {section === "privacy" && <PrivacySettings />}
    <ConfirmDialog open={resetOpen} title="Reset launcher settings?" description="This resets local UI preferences only. Accounts, instances and managed files are not deleted." confirmLabel="Reset settings" onConfirm={() => { useVoidClientStore.getState().resetSettings(); setResetOpen(false); }} onClose={() => setResetOpen(false)} />
  </div>;
}

function GeneralSettings({ onReset }: { onReset: () => void }) {
  const animatedRunes = useVoidClientStore((state) => state.animatedRunes);
  return <><SettingsHeading eyebrow="Launcher" title="General" description="Control window behavior and local interface preferences." icon="settings" /><div className="mt-5 grid gap-3"><ShadowToggle title="Animated interface" description="Keep small navigation transitions enabled." enabled={animatedRunes} onToggle={() => useVoidClientStore.getState().toggleAnimatedRunes()} /></div><NativeUtilitiesPanel /><MatrixPanel className="mt-4 border-[#4A2929]"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-sm font-semibold text-[#F4F4F5]">Reset local preferences</h2><p className="mt-1 text-xs text-[#92929B]">Instances, files and Microsoft authentication remain untouched.</p></div><button type="button" onClick={onReset} className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-[#991B1B] bg-[#7F1D1D] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#991B1B]">Reset settings</button></div></MatrixPanel></>;
}

function LaunchSettings() {
  const width = useVoidClientStore((state) => state.resolutionWidth); const height = useVoidClientStore((state) => state.resolutionHeight); const fullscreen = useVoidClientStore((state) => state.fullscreen); const lock = useVoidClientStore((state) => state.lockAspectRatio); const launcherVisibility = useVoidClientStore((state) => state.launcherVisibility);
  return <><SettingsHeading eyebrow="Game" title="Launch settings" description="Choose display behavior and persist a Java profile for the selected instance." icon="play" /><div className="mt-5 grid gap-4 xl:grid-cols-2"><MatrixPanel><h2 className="text-sm font-semibold text-[#F5F5F5]">Display</h2><div className="mt-4 grid grid-cols-2 gap-3"><NumberInput id="resolution-width" label="Width" value={width} onChange={(value) => useVoidClientStore.getState().setResolutionWidth(value)} min={800} max={7680} /><NumberInput id="resolution-height" label="Height" value={height} onChange={(value) => useVoidClientStore.getState().setResolutionHeight(value)} min={600} max={4320} /></div><div className="mt-4 space-y-2"><ShadowToggle title="Fullscreen" description="Pass the fullscreen launch flag to Minecraft." enabled={fullscreen} onToggle={() => useVoidClientStore.getState().toggleFullscreen()} /><ShadowToggle title="Lock aspect ratio" description="Keep the current 16:9 ratio while editing dimensions." enabled={lock} onToggle={() => useVoidClientStore.getState().toggleLockAspectRatio()} /></div><SelectField id="launcher-visibility" label="Launcher visibility" value={launcherVisibility} onChange={(value) => useVoidClientStore.getState().setLauncherVisibility(value as LauncherVisibility)} description="Applied after the native Minecraft process starts."><option value="keep-open">Keep open</option><option value="hide">Minimize</option><option value="close">Close</option></SelectField></MatrixPanel><JavaSettings /></div></>;
}

function NumberInput({ id, label, value, onChange, min, max }: { id: string; label: string; value: number; onChange: (value: number) => void; min: number; max: number }) { return <label htmlFor={id} className="block"><span className="text-xs font-semibold text-[#D4D4D4]">{label}</span><input id={id} type="number" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} className={`${voidClientStyles.input} mt-2 tabular-nums`} /></label>; }

function JavaSettings() {
  const { instance, instances, activeInstanceId, isLoadingInstances, setActiveInstanceId } = useLauncherInstance(); const queryClient = useQueryClient(); const ram = useVoidClientStore((state) => state.ramGb); const args = useVoidClientStore((state) => state.jvmArguments); const gc = useVoidClientStore((state) => state.garbageCollector); const priority = useVoidClientStore((state) => state.highThreadPriority); const largePages = useVoidClientStore((state) => state.largePages); const setRam = useVoidClientStore((state) => state.setRamGb); const setArgs = useVoidClientStore((state) => state.setJvmArguments); const tokens = useMemo(() => parseArguments(args), [args]);
  useEffect(() => {
    if (!instance) return;
    const instanceArguments = instance.extraJavaArgs;
    const state = useVoidClientStore.getState();
    state.setRamGb(Math.round(instance.memoryMb / 1024));
    state.setJvmArguments(instanceArguments.join(" "));
    state.setGarbageCollector(inferGarbageCollector(instanceArguments));
    const instanceUsesHighPriority = instanceArguments.includes("-XX:ThreadPriorityPolicy=1");
    const instanceUsesLargePages = instanceArguments.includes("-XX:+UseLargePages");
    if (state.highThreadPriority !== instanceUsesHighPriority) state.toggleHighThreadPriority();
    if (state.largePages !== instanceUsesLargePages) state.toggleLargePages();
  }, [instance?.id]);
  const save = useMutation({ mutationFn: async () => { if (!instance) throw new Error("Create an instance before saving Java settings."); if (gc === "generational-zgc") { const java = await api.getJavaStatus(instance.id); if (java.requiredMajor < 21) throw new Error("Generational ZGC requires Java 21."); } const nextArgs = composeArguments(args, gc, priority, largePages); setArgs(nextArgs.join(" ")); return api.updateInstanceSettings(instance.id, { memoryMb: ram * 1024, javaPath: instance.javaPath, extraJavaArgs: nextArgs }); }, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["instances"] }) });
  const chooseGc = (value: GarbageCollectorPreset) => { useVoidClientStore.getState().setGarbageCollector(value); setArgs(composeArguments(args, value, priority, largePages).join(" ")); save.reset(); };
  return <MatrixPanel><div className="flex items-start justify-between gap-3"><div><p className={voidClientStyles.sectionKicker}>Java runtime</p><h2 className="mt-1 text-lg font-semibold text-[#F5F5F5]">Memory and flags</h2></div><output className="text-2xl font-semibold tabular-nums text-[#D8B4FE]">{ram}<small className="ml-1 text-xs text-[#A3A3A3]">GB</small></output></div><label htmlFor="java-settings-instance" className="mt-4 block"><span className="text-xs font-semibold text-[#D4D4D4]">Target instance</span><select id="java-settings-instance" value={activeInstanceId ?? ""} onChange={(event) => { setActiveInstanceId(event.target.value || null); save.reset(); }} disabled={isLoadingInstances || instances.length === 0 || save.isPending} className={`${voidClientStyles.input} mt-2 cursor-pointer disabled:cursor-not-allowed disabled:text-[#737373]`}>{instances.length === 0 && <option value="">{isLoadingInstances ? "Loading instances…" : "No instances available"}</option>}{instances.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name} · {candidate.gameVersion} · {candidate.loader}</option>)}</select><span className="mt-2 block text-xs leading-5 text-[#A3A3A3]">RAM and JVM flags are loaded from and saved only to this instance.</span></label><label htmlFor="ram-allocation" className="mt-4 block"><span className="text-xs font-semibold text-[#D4D4D4]">RAM allocation</span><input id="ram-allocation" type="range" min="2" max="32" step="1" value={ram} onChange={(event) => setRam(Number(event.target.value))} className="mt-3 w-full accent-[#7B2CBF]" /><span className="mt-1 flex justify-between text-xs text-[#737373]"><span>2 GB</span><span>32 GB</span></span></label><fieldset className="mt-5"><legend className="text-xs font-semibold text-[#D4D4D4]">Garbage collector</legend><div className="mt-2 grid gap-2 sm:grid-cols-3">{GC_PRESETS.map((preset) => <button key={preset.id} type="button" aria-pressed={gc === preset.id} onClick={() => chooseGc(preset.id)} className={`min-h-14 cursor-pointer rounded-sm border px-3 py-2 text-left text-xs transition-colors ${gc === preset.id ? "border-[#333333] bg-[#7B2CBF] text-white" : "border-[#333333] bg-[#111111] text-[#A3A3A3] hover:bg-[#242424] hover:text-white"}`}><strong className="block">{preset.label}</strong><span className="mt-1 block text-[11px]">{preset.requirement}</span></button>)}</div></fieldset><label htmlFor="jvm-arguments" className="mt-5 block text-xs font-semibold text-[#D4D4D4]">JVM arguments</label><textarea id="jvm-arguments" value={args} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setArgs(event.target.value)} spellCheck={false} className={`${voidClientStyles.input} mt-2 h-24 resize-y font-mono text-xs`} /><div className="mt-2 min-h-14 border border-[#333333] bg-[#111111] p-3 font-mono text-xs leading-5" aria-label="JVM argument preview">{tokens.map((token, index) => <span key={`${token}-${index}`} className={tokenClass(token)}>{token} </span>)}</div><div className="mt-4 grid gap-2 sm:grid-cols-2"><ShadowToggle title="High thread priority" description="Add the Windows JVM thread policy and apply it to the running Minecraft process." enabled={priority} onToggle={() => useVoidClientStore.getState().toggleHighThreadPriority()} /><ShadowToggle title="Large pages" description="Add the JVM large-page flag; the operating system may reject it without privileges." enabled={largePages} warning onToggle={() => useVoidClientStore.getState().toggleLargePages()} /></div><div className="mt-4 flex flex-wrap items-center justify-between gap-3"><span aria-live="polite" className="text-xs text-[#A3A3A3]">{save.isSuccess ? `Saved to ${instance?.name ?? "the selected instance"}.` : save.isError ? String(save.error) : instance ? `Selected instance: ${instance.name}` : "Create an instance to save Java settings."}</span><button type="button" onClick={() => save.mutate()} disabled={!instance || save.isPending} className={voidClientStyles.primaryButton}>{save.isPending ? "Saving…" : "Save Java settings"}</button></div></MatrixPanel>;
}

function MissionSettings() { const visibility = useVoidClientStore((state) => state.missionVisibility); return <><SettingsHeading eyebrow="Notifications" title="Mission control" description="Choose exactly when the native launch console is shown. Launch logs continue to be collected in every mode." icon="monitor" /><SelectField id="mission-visibility" label="Console behavior" value={visibility} onChange={(value) => useVoidClientStore.getState().setMissionVisibility(value as MissionVisibility)} description="Auto-open shows the console at launch. Manual keeps a global Open Console button available. Hidden suppresses the console and its button."><option value="auto-open">Auto-open on launch</option><option value="manual">Manual</option><option value="hidden">Hidden</option></SelectField><NotificationMatrix /></>; }
function RpcSettings() {
  const nativeRuntime = isTauri();
  const desiredEnabled = useVoidClientStore((state) => state.discordRpcEnabled);
  const connected = useVoidClientStore((state) => state.discordRpcConnected);
  const pending = useVoidClientStore((state) => state.discordRpcPending);
  const error = useVoidClientStore((state) => state.discordRpcError);
  const message = useVoidClientStore((state) => state.discordRpcMessage);
  const hideIdle = useVoidClientStore((state) => state.hideRpcWhenIdle);
  const language = useVoidClientStore((state) => state.rpcLanguage);
  const description = pending
    ? message
    : error
      ? desiredEnabled
        ? "Enabled in settings, but the Discord desktop connection failed."
        : "Disabled locally, but Discord did not acknowledge the clear request."
      : desiredEnabled && connected
        ? message
        : desiredEnabled
          ? "Enabled in settings; waiting for the Discord desktop app."
          : "Connect to the Discord desktop client through native IPC.";

  return <><SettingsHeading eyebrow="Discord" title="Rich Presence" description="The launcher uses its public application ID automatically. No secret or application ID is requested from the player." icon="discord" />{!nativeRuntime && <p role="status" className="mt-4 border border-[#333333] bg-[#2A2112] px-4 py-3 text-sm text-[#FCD34D]">Discord IPC is available only in the packaged launcher.</p>}<div className="mt-5 grid gap-3 md:grid-cols-2"><ShadowToggle title="Show game status" description={description} enabled={desiredEnabled} disabled={!nativeRuntime || pending} onToggle={() => useVoidClientStore.getState().setDiscordRpcEnabled(!desiredEnabled)} /><ShadowToggle title="Hide when idle" description="Remove the presence after five minutes without keyboard, pointer or touch activity." enabled={hideIdle} disabled={!nativeRuntime || pending} onToggle={() => useVoidClientStore.getState().toggleHideRpcWhenIdle()} /></div><div className="mt-4 max-w-sm"><SelectField id="rpc-language" label="RPC language" value={language} onChange={(value) => useVoidClientStore.getState().setRpcLanguage(value as RpcLanguage)}><option value="english">English</option><option value="german">German</option><option value="russian">Russian</option><option value="japanese">Japanese</option><option value="korean">Korean</option><option value="spanish">Spanish</option><option value="chinese">Chinese</option><option value="polish">Polish</option></SelectField></div>{error && <p role="alert" className="mt-3 border border-[#7F1D1D] bg-[#1F1111] px-4 py-3 text-sm text-[#FCA5A5]">Discord RPC error: {error}</p>}</>;
}
function PrivacySettings() { return <><SettingsHeading eyebrow="Data" title="Privacy and crash reports" description="This build keeps diagnostics local. No analytics or automatic crash-log upload endpoint is configured." icon="privacy" /><div className="mt-5 grid gap-3 md:grid-cols-2"><MatrixPanel><h2 className="text-sm font-semibold text-[#F5F5F5]">Analytics</h2><p className="mt-2 text-sm leading-5 text-[#A3A3A3]">Disabled. The launcher does not collect or transmit usage data.</p></MatrixPanel><MatrixPanel><h2 className="text-sm font-semibold text-[#F5F5F5]">Crash reports</h2><p className="mt-2 text-sm leading-5 text-[#A3A3A3]">Stored locally only. No upload request is made by the launcher.</p></MatrixPanel></div></>; }

export default TuningMatrixView;
