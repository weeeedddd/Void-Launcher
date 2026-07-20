import { useCallback, useState, type ChangeEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import {
  Activity,
  ChevronDown,
  ChevronRight,
  Flame,
  Gamepad2,
  HardDrive,
  Layers3,
  ListMusic,
  LoaderCircle,
  MemoryStick,
  Play,
  Plus,
  Shield,
  Sparkles,
  TriangleAlert,
  WifiOff,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { useAccountStore } from "@/stores/account";
import { useUiStore } from "@/stores/ui";
import { CreateInstanceDialog } from "@/components/instances/CreateInstanceDialog";
import { FriendsWidget as RealFriendsWidget } from "@/components/dashboard/FriendsWidget";
import { MusicIntegrationWidget } from "@/components/dashboard/MusicIntegrationWidget";
import type { Instance } from "@/types";

type ContentSource = "curseforge" | "modrinth";

const STREAK_DAYS = ["M", "T", "W", "T", "F", "S", "S"] as const;

export function DashboardPage() {
  const profile = useAccountStore((state) => state.profile);
  const setView = useUiStore((state) => state.setView);
  const widgets = useUiStore((state) => state.widgetVisibility);
  const [creating, setCreating] = useState(false);
  const [contentSource, setContentSource] = useState<ContentSource>("curseforge");
  const [selectedInstance, setSelectedInstance] = useState<Instance | null>(null);
  const { data: instances } = useQuery({ queryKey: ["instances"], queryFn: api.listInstances });

  const openModManager = useCallback(() => setView("mods"), [setView]);
  const openCreator = useCallback(() => setCreating(true), []);
  const closeCreator = useCallback(() => setCreating(false), []);
  const openInstance = useCallback((instance: Instance) => setSelectedInstance(instance), []);
  const closeInstance = useCallback(() => setSelectedInstance(null), []);
  const changeContentSource = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    setContentSource(event.target.value as ContentSource);
  }, []);

  return (
    <div className="mx-auto max-w-[1540px] px-3 pt-4 pb-28 sm:px-5 sm:pt-6 sm:pb-36 2xl:px-10">
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
        className="shadow-panel aaa-card relative mb-5 min-h-70 overflow-hidden rounded-[24px] border p-5 sm:rounded-[28px] sm:p-7 lg:p-9"
      >
        <div className="pointer-events-none absolute inset-0">
          <img src="/shadow-key-art.png" alt="" className="absolute inset-y-0 right-0 h-full w-[64%] object-cover object-center opacity-45 mix-blend-screen [mask-image:linear-gradient(to_right,transparent,black_28%)] motion-reduce:transform-none" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#08050d] via-[#08050d]/82 to-[#130b21]/20" />
          <div className="absolute -top-24 right-[7%] h-72 w-72 rounded-full bg-accent-500/20 blur-[100px]" />
          <div className="absolute -right-12 -bottom-40 h-80 w-80 rotate-45 border border-accent-500/16 bg-midnight-500/7 shadow-[0_0_90px_rgb(123_44_191_/_0.14)]" />
          <div className="shadow-energy-rail absolute inset-y-0 left-0 w-1" />
        </div>

        <div className="relative flex h-full flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <div className="max-w-3xl">
            <p className="mb-3 flex items-center gap-2 text-[11px] font-bold tracking-[0.28em] text-accent-300 uppercase">
              <Sparkles size={14} /> Shadow Garden Operations
            </p>
            <h1 className="font-display text-3xl leading-[0.98] font-black tracking-[-0.04em] text-white sm:text-4xl lg:text-6xl">
              Welcome back,
              <span className="block bg-gradient-to-r from-white via-accent-300 to-midnight-300 bg-clip-text text-transparent">
                {profile?.name ?? "Shadow"}.
              </span>
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-ink-300">
              Your instances, social network, music and performance profile are synchronized in one command center.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={openCreator} className="h-11 rounded-xl bg-black/20 px-5">
              <Plus size={16} /> New instance
            </Button>
            <Button onClick={openModManager} className="h-11 rounded-xl px-5">
              Explore content <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      </motion.section>

      <div className={`grid gap-5 ${widgets.friends ? "xl:grid-cols-[1.55fr_0.85fr]" : ""}`}>
        <div className="grid min-w-0 gap-5 md:grid-cols-2">
          {widgets.music && <MusicIntegrationWidget />}
          {widgets.status && <StatusWidget instanceCount={instances?.length ?? 0} />}
          {widgets.streak && <PlayStreakWidget />}

          <section className="shadow-panel aaa-card rounded-3xl border p-5 lg:col-span-2">
            <div className="mb-4 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <p className="section-kicker">Ready profiles</p>
                <h2 className="mt-1 font-display text-xl font-bold text-white">Instance manager</h2>
              </div>
              <div className="flex items-center gap-2">
                <label className="relative">
                  <span className="sr-only">Mod API source</span>
                  <select
                    value={contentSource}
                    onChange={changeContentSource}
                    className="h-11 cursor-pointer appearance-none rounded-xl border border-white/8 bg-black/25 py-0 pr-9 pl-3 text-xs font-bold text-white outline-none transition hover:border-accent-500/35 focus:border-accent-400 focus:ring-2 focus:ring-accent-500/20"
                    aria-label="Mod API source"
                  >
                    <option value="curseforge">CurseForge</option>
                    <option value="modrinth">Modrinth</option>
                  </select>
                  <ChevronDown size={14} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-accent-300" />
                </label>
                <button
                  type="button"
                  onClick={openCreator}
                  className="grid size-11 cursor-pointer place-items-center rounded-xl border border-white/8 bg-white/[0.035] text-ink-300 transition hover:border-accent-500/35 hover:bg-accent-500/12 hover:text-white focus-visible:outline-2 focus-visible:outline-accent-400"
                  aria-label="Create a new instance"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {instances?.map((instance) => (
                <DashboardInstanceCard key={instance.id} instance={instance} onOpen={openInstance} />
              ))}
              {!instances?.length && (
                <button
                  type="button"
                  onClick={openCreator}
                  className="group flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-white/12 bg-black/15 text-ink-500 transition hover:border-accent-500/40 hover:bg-accent-500/6 hover:text-accent-300"
                >
                  <Plus size={25} className="mb-2 transition group-hover:rotate-90" />
                  <span className="text-sm font-semibold">Create your first instance</span>
                </button>
              )}
            </div>
          </section>
        </div>

        {widgets.friends && <RealFriendsWidget />}
      </div>

      {creating && <CreateInstanceDialog onClose={closeCreator} />}
      {selectedInstance && <InstanceDetailDialog instance={selectedInstance} onClose={closeInstance} />}
    </div>
  );
}

function PlayStreakWidget() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.16, duration: 0.35 }}
      className="shadow-panel aaa-card relative overflow-hidden rounded-3xl border p-5 lg:col-span-2"
    >
      <div className="pointer-events-none absolute -top-14 right-16 size-40 rounded-full bg-accent-500/12 blur-3xl" />
      <div className="relative flex flex-col gap-5 md:flex-row md:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <div className="grid size-14 shrink-0 place-items-center rounded-2xl border border-accent-500/25 bg-accent-500/10 text-accent-300 shadow-[0_0_26px_rgb(123_44_191_/_0.18)]">
            <Flame size={25} />
          </div>
          <div>
            <p className="section-kicker">Play streak</p>
            <h2 className="mt-1 text-balance font-display text-2xl font-black text-white"><span className="tabular-nums">7</span> Day Streak</h2>
          </div>
        </div>

        <div className="flex items-end gap-2" aria-label="Seven active days">
          {STREAK_DAYS.map((day, index) => (
            <div key={`${day}-${index}`} className="flex flex-col items-center gap-1.5">
              <span className={`w-7 rounded-full bg-gradient-to-t from-accent-700 to-accent-300 shadow-[0_0_14px_rgb(123_44_191_/_0.22)] ${index === STREAK_DAYS.length - 1 ? "h-9" : "h-6"}`} />
              <span className="text-[9px] font-bold text-ink-500">{day}</span>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-white/7 bg-black/20 px-5 py-3 md:min-w-42">
          <p className="text-[10px] font-bold text-ink-500 uppercase">Peak Time</p>
          <p className="mt-1 font-display text-xl font-black text-white tabular-nums">12h</p>
        </div>
      </div>
    </motion.section>
  );
}

function StatusWidget({ instanceCount }: { instanceCount: number }) {
  const developerMode = useAccountStore((state) => state.mode === "developer");
  const offlineMode = useAccountStore((state) => state.mode === "offline");
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.14, duration: 0.35 }}
      className="shadow-panel aaa-card relative overflow-hidden rounded-3xl border p-5"
    >
      <div className="absolute top-0 right-0 h-36 w-36 rounded-full bg-midnight-500/12 blur-3xl" />
      <p className="section-kicker">Live server status</p>
      <h2 className={`mt-1 font-display text-lg font-bold ${offlineMode ? "text-amber-200" : "text-white"}`}>{offlineMode ? "Network gate locked" : "Combat ready"}</h2>
      {offlineMode && (
        <div role="status" className="relative mt-4 flex items-center gap-3 rounded-2xl border border-amber-400/25 bg-amber-400/[0.07] p-3 text-amber-200 shadow-[inset_0_1px_0_rgb(255_255_255_/_0.04),0_0_24px_rgb(251_191_36_/_0.08)]">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-amber-300/10"><WifiOff size={17} /></span>
          <div><strong className="block text-xs">Multiplayer Disabled (Offline Mode)</strong><small className="text-[10px] text-amber-100/50">Only the local singleplayer launch simulation is available.</small></div>
          <TriangleAlert size={15} className="ml-auto shrink-0" />
        </div>
      )}
      <div className="relative mt-5 grid grid-cols-2 gap-3">
        <StatusTile icon={Layers3} value={String(instanceCount).padStart(2, "0")} label="Instances" />
        <StatusTile icon={Activity} value="12 ms" label="Launcher" />
        <StatusTile icon={Shield} value={offlineMode ? "Offline" : developerMode ? "Test" : "Secure"} label={offlineMode ? "Local identity" : developerMode ? "Developer sandbox" : "Microsoft auth"} />
        <StatusTile icon={Zap} value="21" label="Java runtime" />
      </div>
    </motion.section>
  );
}

function StatusTile({ icon: Icon, value, label }: { icon: typeof Activity; value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-white/6 bg-black/20 p-3">
      <Icon size={15} className="mb-3 text-accent-300" />
      <p className="text-sm font-bold text-white">{value}</p>
      <p className="mt-0.5 text-[10px] text-ink-500">{label}</p>
    </div>
  );
}

function DashboardInstanceCard({ instance, onOpen }: { instance: Instance; onOpen: (instance: Instance) => void }) {
  const accountMode = useAccountStore((state) => state.mode);
  const developerMode = accountMode === "developer";
  const offlineMode = accountMode === "offline";
  const simulationMode = developerMode || offlineMode;
  const launch = useMutation({ mutationFn: () => api.launchInstance(instance.id, simulationMode) });
  const enabledModCount = instance.mods.filter((mod) => mod.enabled).length;
  const openDetails = useCallback(() => onOpen(instance), [instance, onOpen]);
  const launchInstance = useCallback(() => launch.mutate(), [launch]);

  return (
    <article className="group overflow-hidden rounded-2xl border border-white/8 bg-black/20 transition hover:border-accent-500/35 hover:shadow-[0_0_28px_rgb(123_44_191_/_0.12)]">
      <button
        type="button"
        onClick={openDetails}
        className="block w-full cursor-pointer text-left focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent-400"
        aria-label={`Open details for ${instance.name}`}
      >
        <div className="relative flex h-24 items-end overflow-hidden bg-gradient-to-br from-accent-800/60 via-void-700 to-void-900 px-4 pb-3">
          <div className="absolute -top-8 right-3 size-24 rounded-full bg-accent-400/15 blur-2xl" />
          <span className="absolute right-4 -bottom-4 font-display text-7xl font-black text-white/8 select-none">
            {instance.name.charAt(0).toUpperCase()}
          </span>
          <span className="relative flex items-center gap-1.5 rounded-full border border-white/10 bg-black/35 px-2.5 py-1 text-[10px] font-bold text-white">
            <HardDrive size={11} className="text-accent-300" /> Local instance
          </span>
        </div>

        <div className="p-4 pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate font-display text-base font-bold text-white">{instance.name}</h3>
              <p className="mt-1 text-xs text-ink-500">Open to inspect the complete configuration</p>
            </div>
            <ChevronRight size={17} className="mt-1 shrink-0 text-ink-500 transition group-hover:translate-x-0.5 group-hover:text-accent-300" />
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="rounded-md bg-white/5 px-2 py-1 text-[10px] font-bold text-ink-300">Minecraft {instance.gameVersion}</span>
            <span className="rounded-md bg-accent-500/10 px-2 py-1 text-[10px] font-bold text-accent-300 capitalize">{instance.loader}</span>
            <span className="rounded-md bg-white/5 px-2 py-1 text-[10px] font-bold text-ink-300 tabular-nums">{enabledModCount} active mods</span>
          </div>
        </div>
      </button>

      <div className="px-4 pb-4">
        <Button className={`h-10 w-full rounded-xl ${simulationMode ? "aaa-launch-pulse" : ""}`} disabled={launch.isPending} onClick={launchInstance}>
          {launch.isPending ? <LoaderCircle size={15} className="animate-spin" /> : <Play size={15} />}
          {launch.isPending ? (simulationMode ? "Simulating..." : "Launching...") : (offlineMode ? "Launch singleplayer" : developerMode ? "Simulate launch" : "Play instance")}
        </Button>
        {launch.isSuccess && simulationMode && <p role="status" className="mt-2 text-xs text-amber-300">{offlineMode ? "Singleplayer simulation complete." : "Simulation complete."} No game process was started.</p>}
        {launch.isError && <p className="mt-2 text-xs text-red-400">{String(launch.error)}</p>}
      </div>
    </article>
  );
}

function InstanceDetailDialog({ instance, onClose }: { instance: Instance; onClose: () => void }) {
  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) onClose();
  }, [onClose]);
  const loader = instance.loaderVersion
    ? `${instance.loader} ${instance.loaderVersion}`
    : instance.loader;
  const memoryInGb = instance.memoryMb / 1024;
  const memory = `${instance.memoryMb.toLocaleString("en-US")} MB (${Number.isInteger(memoryInGb) ? memoryInGb : memoryInGb.toFixed(1)} GB)`;

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl">
        <div className="relative overflow-hidden border-b border-white/8 bg-gradient-to-br from-accent-800/45 via-void-900 to-midnight-800/55 px-6 py-8 sm:px-8">
          <div className="pointer-events-none absolute -top-20 right-12 size-48 rounded-full bg-accent-500/18 blur-3xl" />
          <DialogHeader className="relative pr-12">
            <p className="section-kicker">Local instance dossier</p>
            <DialogTitle className="text-balance text-3xl">{instance.name}</DialogTitle>
            <DialogDescription className="text-pretty">
              Exact runtime configuration and every mod currently registered with this local instance.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-6 p-6 sm:p-8">
          <div className="grid gap-3 sm:grid-cols-3">
            <InstanceDetailMetric icon={Gamepad2} label="Minecraft Version" value={instance.gameVersion} />
            <InstanceDetailMetric icon={Layers3} label="Mod Loader" value={loader} capitalize />
            <InstanceDetailMetric icon={MemoryStick} label="Allocated Memory" value={memory} />
          </div>

          <section>
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <p className="section-kicker">Installed content</p>
                <h3 className="mt-1 flex items-center gap-2 font-display text-lg font-bold text-white">
                  <ListMusic size={17} className="text-accent-300" /> Full mod list
                </h3>
              </div>
              <span className="rounded-full border border-white/8 bg-white/4 px-3 py-1 text-[10px] font-bold text-ink-300 tabular-nums">
                {instance.mods.length} total
              </span>
            </div>

            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {instance.mods.map((mod) => (
                <div key={`${mod.platform}-${mod.projectId}-${mod.versionId}`} className="flex items-center gap-3 rounded-2xl border border-white/7 bg-black/20 p-3.5">
                  <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-accent-500/18 bg-accent-500/8 text-accent-300">
                    <Layers3 size={17} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-white" title={mod.name}>{mod.name}</p>
                    <p className="truncate text-[11px] text-ink-500" title={mod.fileName}>{mod.fileName}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[10px] font-bold text-accent-300 capitalize">{mod.platform}</p>
                    <p className={`mt-0.5 text-[10px] font-semibold ${mod.enabled ? "text-success-400" : "text-ink-500"}`}>
                      {mod.enabled ? "Enabled" : "Disabled"}
                    </p>
                  </div>
                </div>
              ))}

              {instance.mods.length === 0 && (
                <div className="grid min-h-32 place-items-center rounded-2xl border border-dashed border-white/10 bg-black/15 px-6 text-center">
                  <div>
                    <Layers3 size={22} className="mx-auto mb-2 text-ink-500" />
                    <p className="text-sm font-semibold text-ink-300">No mods installed</p>
                    <p className="mt-1 text-xs text-ink-500">This local instance currently runs without added mods.</p>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InstanceDetailMetric({ icon: Icon, label, value, capitalize = false }: { icon: typeof Activity; label: string; value: string; capitalize?: boolean }) {
  return (
    <div className="rounded-2xl border border-white/7 bg-black/20 p-4">
      <Icon size={16} className="mb-3 text-accent-300" />
      <p className="text-[10px] font-bold text-ink-500 uppercase">{label}</p>
      <p className={`mt-1 truncate text-sm font-bold text-white tabular-nums ${capitalize ? "capitalize" : ""}`} title={value}>{value}</p>
    </div>
  );
}
