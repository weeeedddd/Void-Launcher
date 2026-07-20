import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Eye, EyeOff, KeyRound, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { playClick } from "@/lib/sound";
import { useUiStore, type DashboardWidget, type PerformanceFeature } from "@/stores/ui";

const FALLBACK_GPUS = ["NVIDIA GeForce RTX 4070 Laptop GPU", "AMD Radeon 780M Graphics"];
const WIDGETS: { id: DashboardWidget; label: string }[] = [
  { id: "music", label: "Music integration" }, { id: "status", label: "Client status" },
  { id: "streak", label: "Play streak" }, { id: "friends", label: "Friends" },
];
const PERFORMANCE: { id: PerformanceFeature; label: string }[] = [
  { id: "pingOptimization", label: "Ping Optimization" }, { id: "improvedFps", label: "Improved FPS" },
  { id: "reducedInputLag", label: "Reduced Input Lag" },
];

export function SettingsPage() {
  const ui = useUiStore();
  const queryClient = useQueryClient();
  const hardware = useQuery({ queryKey: ["hardware"], queryFn: api.getHardwareReport });
  const gpus = hardware.data?.gpus.length ? hardware.data.gpus : FALLBACK_GPUS;
  const [curseforgeKey, setCurseforgeKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [ram, setRam] = useState(8192);
  const [shaderMode, setShaderMode] = useState("balanced");
  const [resolution, setResolution] = useState("64x");
  const [region, setRegion] = useState("auto");
  const [particles, setParticles] = useState(55);
  const [keybinds, setKeybinds] = useState({ launch: "Ctrl + Enter", search: "Ctrl + K", hide: "Ctrl + Shift + H" });

  useEffect(() => {
    if (!ui.selectedGpu || !gpus.includes(ui.selectedGpu)) ui.setSelectedGpu(gpus[0] ?? null);
  }, [gpus, ui.selectedGpu, ui.setSelectedGpu]);

  const settingsStatus = useQuery({ queryKey: ["settings-status"], queryFn: api.getSettingsStatus, retry: false });
  const saveKey = useMutation({ mutationFn: (apiKey: string | null) => api.setCurseforgeApiKey(apiKey), onSuccess: (status) => { queryClient.setQueryData(["settings-status"], status); setCurseforgeKey(""); setShowKey(false); } });
  const submitKey = useCallback((event: FormEvent) => { event.preventDefault(); const value = curseforgeKey.trim(); if (value) saveKey.mutate(value); }, [curseforgeKey, saveKey]);
  const changeSound = useCallback((value: boolean) => { ui.setSoundEnabled(value); if (value) playClick(); }, [ui]);

  return (
    <div className="mx-auto max-w-[1400px] px-3 pt-5 pb-32 sm:px-5 lg:px-8 lg:pt-8">
      <header className="mb-7"><p className="section-kicker">Control center</p><h1 className="font-display mt-1 text-3xl font-black tracking-tight text-white sm:text-4xl">Advanced Client Settings</h1><p className="mt-2 text-sm text-ink-300">Every persistent client preference, organized without hiding the important controls.</p></header>
      <Tabs defaultValue="ui">
        <div className="overflow-x-auto pb-2"><TabsList className="h-auto min-w-max flex-wrap"><TabsTrigger value="ui">UI Customization</TabsTrigger><TabsTrigger value="performance">Performance</TabsTrigger><TabsTrigger value="graphics">Graphics</TabsTrigger><TabsTrigger value="networking">Networking</TabsTrigger><TabsTrigger value="cosmetics">Launcher Cosmetics</TabsTrigger><TabsTrigger value="keybinds">Keybinds</TabsTrigger></TabsList></div>

        <TabsContent value="ui" className="grid gap-4 lg:grid-cols-2">
          <SettingsCard title="Interface">
            <SettingRow title="Interface sounds" description="Subtle interaction and completion feedback"><Switch checked={ui.soundEnabled} onCheckedChange={changeSound} label="Interface sounds" /></SettingRow>
            <SettingRow title="Animated backgrounds" description="Ambient transform-only motion"><Switch checked={ui.animatedBackgrounds} onCheckedChange={ui.setAnimatedBackgrounds} label="Animated backgrounds" /></SettingRow>
            <SettingRow title="Collapsed sidebar" description="Use an icon rail and restore it next launch"><Switch checked={ui.sidebarCollapsed} onCheckedChange={ui.setSidebarCollapsed} label="Collapsed sidebar" /></SettingRow>
            <SettingRow title="Sidebar dock" description="Move the navigation to either window edge"><select value={ui.sidebarSide} onChange={(e) => ui.setSidebarSide(e.target.value as "left" | "right")} className="control h-10 w-32"><option value="left">Left</option><option value="right">Right</option></select></SettingRow>
            <RangeRow label="UI scale" value={ui.uiScale} min={85} max={115} suffix="%" onChange={ui.setUiScale} />
          </SettingsCard>
          <SettingsCard title="Dashboard widgets">
            {WIDGETS.map((widget) => <SettingRow key={widget.id} title={widget.label} description="Show on the modular home dashboard"><Switch checked={ui.widgetVisibility[widget.id]} onCheckedChange={(enabled) => ui.setWidgetVisibility(widget.id, enabled)} label={widget.label} /></SettingRow>)}
          </SettingsCard>
        </TabsContent>

        <TabsContent value="performance" className="grid gap-4 lg:grid-cols-2">
          <SettingsCard title="Target hardware">
            <label className="text-xs font-bold text-ink-300" htmlFor="settings-gpu">Preferred GPU</label><select id="settings-gpu" value={ui.selectedGpu ?? ""} onChange={(e) => ui.setSelectedGpu(e.target.value)} className="control mt-2 h-11 w-full">{gpus.map((gpu) => <option key={gpu}>{gpu}</option>)}</select>
            <p className="mt-2 text-[10px] leading-4 text-ink-500">All detected adapters are shown. Windows and the display driver keep final routing control.</p>
            <RangeRow label="Allocated memory" value={ram} min={2048} max={16384} step={512} suffix=" MB" onChange={setRam} />
          </SettingsCard>
          <SettingsCard title="Runtime optimizations">{PERFORMANCE.map((feature) => <SettingRow key={feature.id} title={feature.label} description="Shared with Performance Optimizer"><Switch checked={ui.performanceFeatures[feature.id]} onCheckedChange={(enabled) => ui.setPerformanceFeature(feature.id, enabled)} label={feature.label} /></SettingRow>)}</SettingsCard>
        </TabsContent>

        <TabsContent value="graphics" className="grid gap-4 lg:grid-cols-2">
          <SettingsCard title="Rendering profile"><SelectRow label="Shader mode" value={shaderMode} onChange={setShaderMode} options={["performance", "balanced", "cinematic"]} /><SelectRow label="Resource pack resolution" value={resolution} onChange={setResolution} options={["16x", "32x", "64x", "128x", "256x"]} /><RangeRow label="Mipmap levels" value={4} min={0} max={8} suffix="" onChange={() => undefined} /></SettingsCard>
          <SettingsCard title="Display quality"><SettingRow title="Dynamic resolution" description="Reduce scale only when frame time spikes"><Switch checked={true} onCheckedChange={() => undefined} label="Dynamic resolution" /></SettingRow><SettingRow title="Entity shadows" description="Keep character grounding in performance mode"><Switch checked={false} onCheckedChange={() => undefined} label="Entity shadows" /></SettingRow></SettingsCard>
        </TabsContent>

        <TabsContent value="networking" className="grid gap-4 lg:grid-cols-2"><SettingsCard title="Connection"><SelectRow label="Preferred region" value={region} onChange={setRegion} options={["auto", "eu-central", "us-east", "asia-pacific"]} />{PERFORMANCE.filter((item) => item.id !== "improvedFps").map((feature) => <SettingRow key={feature.id} title={feature.label} description="Applies when the client launches"><Switch checked={ui.performanceFeatures[feature.id]} onCheckedChange={(enabled) => ui.setPerformanceFeature(feature.id, enabled)} label={feature.label} /></SettingRow>)}</SettingsCard><SettingsCard title="Network diagnostics"><RangeRow label="Ping alert threshold" value={80} min={20} max={250} suffix=" ms" onChange={() => undefined} /><p className="text-xs leading-5 text-ink-500">Network tuning changes launcher-owned process hints only. It does not bypass server rules or anti-cheat.</p></SettingsCard></TabsContent>

        <TabsContent value="cosmetics" className="grid gap-4 lg:grid-cols-2"><SettingsCard title="Shadow presentation"><SettingRow title="Gacha backgrounds" description="Rotate through locally unlocked scenes"><Switch checked={ui.gachaBackgrounds} onCheckedChange={ui.setGachaBackgrounds} label="Gacha backgrounds" /></SettingRow><SettingRow title="Animated backgrounds" description="Disable automatically for reduced motion"><Switch checked={ui.animatedBackgrounds} onCheckedChange={ui.setAnimatedBackgrounds} label="Animated backgrounds" /></SettingRow><RangeRow label="Particle density" value={particles} min={0} max={100} suffix="%" onChange={setParticles} /></SettingsCard><SettingsCard title="Content API key"><SecretKeyForm configured={Boolean(settingsStatus.data?.curseforgeConfigured)} value={curseforgeKey} visible={showKey} pending={saveKey.isPending} success={saveKey.isSuccess} error={settingsStatus.isError || saveKey.isError} onValue={setCurseforgeKey} onVisible={() => setShowKey((current) => !current)} onSubmit={submitKey} onRemove={() => saveKey.mutate(null)} /></SettingsCard></TabsContent>

        <TabsContent value="keybinds"><SettingsCard title="Launcher shortcuts" className="max-w-3xl">{Object.entries(keybinds).map(([id, value]) => <SettingRow key={id} title={id === "launch" ? "Launch client" : id === "search" ? "Global search" : "Hide launcher"} description="Click the field and enter a shortcut"><input value={value} onChange={(e) => setKeybinds((current) => ({ ...current, [id]: e.target.value.slice(0, 24) }))} className="control h-10 w-40 text-center" aria-label={`${id} keybind`} /></SettingRow>)}</SettingsCard></TabsContent>
      </Tabs>
    </div>
  );
}

function SettingsCard({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) { return <section className={`shadow-panel rounded-3xl border border-white/7 p-5 sm:p-6 ${className}`}><h2 className="font-display mb-5 text-base font-bold text-white">{title}</h2><div className="space-y-4">{children}</div></section>; }
function SettingRow({ title, description, children }: { title: string; description: string; children: React.ReactNode }) { return <div className="flex flex-col gap-3 border-b border-white/6 pb-4 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="text-sm font-semibold text-white">{title}</h3><p className="mt-1 text-xs leading-5 text-ink-500">{description}</p></div>{children}</div>; }
function RangeRow({ label, value, min, max, step = 1, suffix, onChange }: { label: string; value: number; min: number; max: number; step?: number; suffix: string; onChange: (value: number) => void }) { return <label className="block"><span className="mb-2 flex justify-between text-xs font-semibold text-ink-300"><span>{label}</span><span className="text-accent-300 tabular-nums">{value}{suffix}</span></span><input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-[#9d4edd]" /></label>; }
function SelectRow({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) { return <label className="flex flex-col gap-2 text-xs font-semibold text-ink-300 sm:flex-row sm:items-center sm:justify-between"><span>{label}</span><select value={value} onChange={(e) => onChange(e.target.value)} className="control h-10 min-w-44 capitalize">{options.map((option) => <option key={option}>{option}</option>)}</select></label>; }
function SecretKeyForm({ configured, value, visible, pending, success, error, onValue, onVisible, onSubmit, onRemove }: { configured: boolean; value: string; visible: boolean; pending: boolean; success: boolean; error: boolean; onValue: (value: string) => void; onVisible: () => void; onSubmit: (event: FormEvent) => void; onRemove: () => void }) { return <form onSubmit={onSubmit}><div className="mb-4 flex items-center gap-3"><KeyRound className="text-accent-300" /><div className="min-w-0"><p className="text-sm font-semibold text-white">CurseForge API key</p><p className="text-xs text-ink-500">Stored by the native launcher, never returned to this UI.</p></div>{configured && <CheckCircle2 className="ml-auto text-success-400" size={18} />}</div><div className="relative"><input type={visible ? "text" : "password"} value={value} onChange={(e: ChangeEvent<HTMLInputElement>) => onValue(e.target.value)} autoComplete="off" spellCheck={false} className="control h-11 w-full pr-11" placeholder="Enter a new API key" /><button type="button" onClick={onVisible} className="absolute inset-y-0 right-0 grid w-11 place-items-center text-ink-500" aria-label={visible ? "Hide key" : "Show key"}>{visible ? <EyeOff size={16} /> : <Eye size={16} />}</button></div><div className="mt-3 flex gap-2"><Button type="submit" disabled={!value.trim() || pending} className="rounded-xl"><Save size={15} /> Save</Button>{configured && <Button type="button" variant="danger" onClick={onRemove} disabled={pending} className="rounded-xl"><Trash2 size={15} /> Remove</Button>}</div>{success && <p className="mt-3 text-xs text-success-400">Setting saved successfully.</p>}{error && <p className="mt-3 text-xs text-red-300">The setting could not be read or saved.</p>}</form>; }
