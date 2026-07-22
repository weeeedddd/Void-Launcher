import { isTauri } from "@tauri-apps/api/core";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Boxes,
  Cpu,
  Gauge,
  LogIn,
  MemoryStick,
  PackageSearch,
  Palette,
  Play,
  Plus,
  ShieldCheck,
  SquareTerminal,
  Users,
  Wifi,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAccountStore } from "@/stores/account";
import type { Instance, NetworkLatency } from "@/types";
import { NEWS_ENTRIES } from "../../../constants";
import { useLauncherInstance } from "../../../hooks/useLauncherInstance";
import { useVoidClientStore } from "../../../stores/voidClient.store";
import type { CatalogKind, VoidView } from "../../../types";

const UPDATE_IMAGES = ["/shadow-key-art.png", "/void-obsidian-rift-header.png"] as const;
const clampPercent = (value: number) => Math.min(100, Math.max(0, value));

export function MainDashboard() {
  const {
    profile,
    instance,
    instances,
    isLoadingInstances,
    launchMutation,
    setActiveInstanceId,
  } = useLauncherInstance();
  const login = useAccountStore((state) => state.login);
  const setActiveView = useVoidClientStore((state) => state.setActiveView);
  const setCatalogKind = useVoidClientStore((state) => state.setCatalogKind);
  const nativeRuntime = isTauri();

  const contentQuery = useQuery({
    queryKey: ["instance-content", instance?.id],
    queryFn: () => api.listInstanceContent(instance!.id),
    enabled: nativeRuntime && Boolean(instance),
    refetchInterval: 15_000,
  });
  const content = contentQuery.data ?? [];
  const modCount = content.filter((entry) => entry.kind === "mod").length;
  const shaderCount = content.filter((entry) => entry.kind === "shader").length;

  const openView = (view: VoidView) => setActiveView(view);
  const openCatalog = (kind: CatalogKind) => {
    setCatalogKind(kind);
    setActiveView("mods");
  };

  return (
    <div className="flex h-full min-h-0 bg-[#09090B]">
      <section className="min-w-0 flex-1 overflow-y-auto" aria-label="Launcher dashboard">
        <div className="mx-auto w-full max-w-[1480px] p-6">
          <LaunchHero
            profileName={profile?.name ?? null}
            instance={instance}
            instances={instances}
            loadingInstances={isLoadingInstances}
            launchPending={launchMutation.isPending}
            launchError={launchMutation.isError ? String(launchMutation.error) : null}
            launchSucceeded={launchMutation.isSuccess}
            onSelectInstance={setActiveInstanceId}
            onLaunch={() => launchMutation.mutate()}
            onSignIn={() => void login()}
            onCreateInstance={() => openView("deployments")}
          />

          <QuickAccessGrid
            modCount={modCount}
            shaderCount={shaderCount}
            contentLoading={contentQuery.isLoading}
            onOpenCatalog={openCatalog}
            onOpenTelemetry={() => openView("telemetry")}
          />

          <LatestUpdates onOpenNews={() => openView("chronicle")} />
        </div>
      </section>

      <RightRail
        profileName={profile?.name ?? null}
        nativeRuntime={nativeRuntime}
        onOpenSettings={() => openView("settings")}
        onOpenTelemetry={() => openView("telemetry")}
      />
    </div>
  );
}

interface ILaunchHeroProps {
  profileName: string | null;
  instance: Instance | null;
  instances: Instance[];
  loadingInstances: boolean;
  launchPending: boolean;
  launchError: string | null;
  launchSucceeded: boolean;
  onSelectInstance: (instanceId: string) => void;
  onLaunch: () => void;
  onSignIn: () => void;
  onCreateInstance: () => void;
}

function LaunchHero({
  profileName,
  instance,
  instances,
  loadingInstances,
  launchPending,
  launchError,
  launchSucceeded,
  onSelectInstance,
  onLaunch,
  onSignIn,
  onCreateInstance,
}: ILaunchHeroProps) {
  const action = !profileName
    ? { label: "SIGN IN TO PLAY", icon: <LogIn size={18} />, handler: onSignIn, disabled: false }
    : !instance
      ? { label: "CREATE INSTANCE", icon: <Boxes size={18} />, handler: onCreateInstance, disabled: loadingInstances }
      : { label: launchPending ? "LAUNCHING..." : "LAUNCH GAME", icon: <Play size={18} fill="currentColor" />, handler: onLaunch, disabled: launchPending || loadingInstances };

  return (
    <section className="relative h-72 overflow-hidden rounded-2xl border border-[#24242A] bg-[#111114]" aria-labelledby="dashboard-title">
      <img
        src="/void-obsidian-rift-header.png"
        alt="Void citadel illuminated by violet energy"
        className="absolute inset-0 size-full object-cover object-center opacity-90"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#07070A] via-[#07070A]/80 to-transparent" aria-hidden="true" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#07070A]/70 via-transparent to-[#07070A]/15" aria-hidden="true" />

      <div className="relative flex h-full max-w-2xl translate-y-2 flex-col justify-center px-8 py-7">
        <span className="w-fit rounded-md border border-[#6D28A8] bg-[#251333]/90 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#C084FC]">
          {instance ? "Ready to launch" : "Setup required"}
        </span>
        <h1 id="dashboard-title" className="mt-4 text-3xl font-bold tracking-[-0.035em] text-white">
          {profileName ? <>Welcome back, <span className="text-[#A855F7]">{profileName}</span></> : "Welcome to Void Launcher"}
        </h1>
        <p className="mt-1.5 text-sm text-[#92929B]">
          {profileName ? "Your client is ready for the next session." : "Sign in with Microsoft to launch a verified Minecraft session."}
        </p>

        <div className="mt-5 flex max-w-[560px] items-stretch gap-3">
          <button
            type="button"
            onClick={action.handler}
            disabled={action.disabled}
            aria-busy={launchPending}
            className="inline-flex h-12 min-w-52 cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#9333EA] bg-[#7E22CE] px-6 text-sm font-bold tracking-[0.04em] text-white shadow-[0_12px_30px_rgba(126,34,206,0.22)] transition-[background-color,transform] duration-150 hover:-translate-y-0.5 hover:bg-[#9333EA] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C084FC] disabled:cursor-wait disabled:translate-y-0 disabled:border-[#34343A] disabled:bg-[#29292E] disabled:text-[#777780] disabled:shadow-none"
          >
            {action.icon}{action.label}
          </button>

          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Selected Minecraft instance</span>
            <select
              value={instance?.id ?? ""}
              onChange={(event) => onSelectInstance(event.target.value)}
              disabled={loadingInstances || instances.length === 0}
              className="h-12 w-full cursor-pointer appearance-none rounded-lg border border-[#34343A] bg-[#16161B]/95 px-4 pr-9 text-sm font-medium text-[#E4E4E7] outline-none transition-colors hover:border-[#4A4A52] focus:border-[#8B5CF6] disabled:cursor-not-allowed disabled:text-[#66666F]"
            >
              {instances.length === 0 ? <option value="">{loadingInstances ? "Loading versions..." : "No instance installed"}</option> : null}
              {instances.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>{candidate.gameVersion} {candidate.loader} · {candidate.name}</option>
              ))}
            </select>
            <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[#777780]">⌄</span>
          </label>
        </div>

        <div className="mt-2 min-h-5 text-xs" aria-live="polite">
          {launchError ? <p role="alert" className="text-[#FCA5A5]">{launchError}</p> : null}
          {launchSucceeded ? <p role="status" className="text-[#86EFAC]">Minecraft launch accepted. Mission Control is tracking startup.</p> : null}
        </div>
      </div>
    </section>
  );
}

function QuickAccessGrid({ modCount, shaderCount, contentLoading, onOpenCatalog, onOpenTelemetry }: {
  modCount: number;
  shaderCount: number;
  contentLoading: boolean;
  onOpenCatalog: (kind: CatalogKind) => void;
  onOpenTelemetry: () => void;
}) {
  const cards = [
    {
      id: "mods",
      title: "Mods",
      detail: contentLoading ? "Scanning instance" : `${modCount} installed`,
      icon: <PackageSearch size={20} />,
      iconClass: "bg-[#25142F] text-[#B455E7]",
      action: () => onOpenCatalog("mod"),
    },
    {
      id: "shaders",
      title: "Shaders",
      detail: contentLoading ? "Scanning instance" : `${shaderCount} installed`,
      icon: <Palette size={20} />,
      iconClass: "bg-[#13233A] text-[#4D9DFF]",
      action: () => onOpenCatalog("shader"),
    },
    {
      id: "performance",
      title: "Performance",
      detail: "Live native metrics",
      icon: <Gauge size={20} />,
      iconClass: "bg-[#103023] text-[#31D17C]",
      action: onOpenTelemetry,
    },
  ] as const;

  return (
    <section className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3" aria-label="Quick access">
      {cards.map((card) => (
        <button
          key={card.id}
          type="button"
          onClick={card.action}
          className="group flex h-[78px] cursor-pointer items-center gap-3 rounded-xl border border-[#24242A] bg-[#141417] px-4 text-left transition-[border-color,background-color,transform] duration-150 hover:-translate-y-0.5 hover:border-[#3B3B43] hover:bg-[#18181C] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8B5CF6]"
        >
          <span className={`grid size-11 shrink-0 place-items-center rounded-lg ${card.iconClass}`}>{card.icon}</span>
          <span className="min-w-0 flex-1">
            <strong className="block truncate text-sm font-semibold text-[#F4F4F5]">{card.title}</strong>
            <small className="mt-0.5 block truncate text-xs text-[#777780]">{card.detail}</small>
          </span>
          <ArrowRight size={16} className="text-[#55555E] transition-transform group-hover:translate-x-0.5 group-hover:text-[#A855F7]" />
        </button>
      ))}
    </section>
  );
}

function LatestUpdates({ onOpenNews }: { onOpenNews: () => void }) {
  return (
    <section className="mt-7" aria-labelledby="updates-title">
      <header className="mb-3 flex items-center justify-between">
        <h2 id="updates-title" className="text-lg font-semibold text-[#F4F4F5]">Latest Updates</h2>
        <button type="button" onClick={onOpenNews} className="cursor-pointer text-xs font-medium text-[#92929B] transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8B5CF6]">View all</button>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {NEWS_ENTRIES.slice(0, 2).map((entry, index) => (
          <button
            key={entry.id}
            type="button"
            onClick={onOpenNews}
            className="group overflow-hidden rounded-xl border border-[#24242A] bg-[#141417] text-left transition-[border-color,transform] duration-150 hover:-translate-y-0.5 hover:border-[#3B3B43] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8B5CF6]"
          >
            <div className="h-32 overflow-hidden bg-[#0E0E11]">
              <img src={UPDATE_IMAGES[index] ?? UPDATE_IMAGES[0]} alt="" className={`size-full object-cover transition-transform duration-500 group-hover:scale-[1.03] ${index === 0 ? "object-[50%_37%]" : "object-center"}`} />
            </div>
            <div className="p-4">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.09em] text-[#A855F7]"><span className="rounded bg-[#2A1437] px-2 py-0.5">{entry.category}</span><span className="font-normal text-[#66666F]">{entry.date}</span></div>
              <h3 className="mt-2 text-sm font-semibold text-[#F4F4F5]">{entry.title}</h3>
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#85858E]">{entry.summary}</p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

function RightRail({ profileName, nativeRuntime, onOpenSettings, onOpenTelemetry }: {
  profileName: string | null;
  nativeRuntime: boolean;
  onOpenSettings: () => void;
  onOpenTelemetry: () => void;
}) {
  return (
    <aside className="hidden h-full w-80 shrink-0 overflow-y-auto border-l border-[#202025] bg-[#0C0C0F] p-4 xl:block" aria-label="Friends and telemetry">
      <FriendsPanel profileName={profileName} onOpenSettings={onOpenSettings} />
      <TelemetryPanel nativeRuntime={nativeRuntime} onOpenTelemetry={onOpenTelemetry} />
    </aside>
  );
}

function FriendsPanel({ profileName, onOpenSettings }: { profileName: string | null; onOpenSettings: () => void }) {
  return (
    <section className="flex min-h-[324px] flex-col overflow-hidden rounded-xl border border-[#29292F] bg-[#151518]" aria-labelledby="friends-title">
      <header className="flex items-center justify-between px-4 pt-4">
        <div>
          <h2 id="friends-title" className="text-sm font-semibold text-[#F4F4F5]">Mission Control</h2>
          <p className="mt-0.5 text-[11px] text-[#74747D]">Friends & presence</p>
        </div>
        <span className="rounded-md bg-[#202025] px-2 py-1 text-[10px] font-medium text-[#85858E]">0 online</span>
      </header>

      {profileName ? (
        <div className="mx-3 mt-4 flex items-center gap-3 rounded-lg border border-[#2C2C33] bg-[#19191E] p-3 text-left">
          <img src={`https://mc-heads.net/avatar/${encodeURIComponent(profileName)}/40`} alt="" className="size-10 rounded-md bg-[#202025] object-cover" />
          <span className="min-w-0 flex-1"><strong className="block truncate text-sm font-semibold text-[#F4F4F5]">{profileName}</strong><small className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[#8B8B94]"><span className="size-1.5 rounded-full bg-[#22C55E]" />In Void Launcher</small></span>
          <span className="text-[10px] font-medium text-[#66666F]">YOU</span>
        </div>
      ) : null}

      <div className="grid min-h-0 flex-1 place-items-center px-5 text-center">
        <div>
          <span className="mx-auto grid size-10 place-items-center rounded-lg bg-[#21152B] text-[#A855F7]"><Users size={18} /></span>
          <h3 className="mt-3 text-sm font-semibold text-[#E4E4E7]">No friends connected</h3>
          <p className="mt-1 text-xs leading-5 text-[#777780]">A native Friends service has not been connected, so no players are fabricated here.</p>
        </div>
      </div>

      <div className="p-3 pt-0">
        <button type="button" onClick={onOpenSettings} className="inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#34343A] bg-[#1A1A1F] text-xs font-semibold text-[#D4D4D8] transition-colors hover:border-[#4A4A52] hover:bg-[#202026] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8B5CF6]"><Plus size={15} /> Configure Friends</button>
      </div>
    </section>
  );
}

function TelemetryPanel({ nativeRuntime, onOpenTelemetry }: { nativeRuntime: boolean; onOpenTelemetry: () => void }) {
  const setMissionControlOpen = useVoidClientStore((state) => state.setMissionControlOpen);
  const missionVisibility = useVoidClientStore((state) => state.missionVisibility);
  const metricsQuery = useQuery({
    queryKey: ["live-system-metrics", "dashboard"],
    queryFn: api.getLiveSystemMetrics,
    enabled: nativeRuntime,
    refetchInterval: 1_000,
    retry: 1,
  });
  const latencyQuery = useQuery({
    queryKey: ["minecraft-api-latency"],
    queryFn: api.getNetworkLatency,
    enabled: nativeRuntime,
    refetchInterval: 10_000,
    retry: 1,
  });
  const metrics = metricsQuery.data;
  const latency = latencyQuery.data;
  const memoryPercent = metrics && metrics.memoryTotalMb > 0
    ? clampPercent((metrics.memoryUsedMb / metrics.memoryTotalMb) * 100)
    : 0;
  const stateLabel = !nativeRuntime ? "Preview" : metricsQuery.isError ? "Unavailable" : metrics ? "Stable" : "Connecting";

  return (
    <section className="mt-4 overflow-hidden rounded-xl border border-[#29292F] bg-[#151518]" aria-labelledby="telemetry-title">
      <header className="flex items-center justify-between border-b border-[#25252B] px-4 py-4">
        <h2 id="telemetry-title" className="text-sm font-semibold text-[#F4F4F5]">System Telemetry</h2>
        <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold ${metrics ? "text-[#22C55E]" : "text-[#A1A1AA]"}`}><span className={`size-1.5 rounded-full ${metrics ? "bg-[#22C55E]" : "bg-[#71717A]"}`} />{stateLabel}</span>
      </header>

      <div className="px-4 py-2">
        <MetricRow icon={<MemoryStick size={14} />} label="System RAM" value={metrics ? `${(metrics.memoryUsedMb / 1024).toFixed(1)} / ${(metrics.memoryTotalMb / 1024).toFixed(1)} GB` : "N/A"} percent={memoryPercent} color="bg-[#8B5CF6]" />
        <MetricRow icon={<Cpu size={14} />} label="CPU Load" value={metrics ? `${metrics.cpuUsagePercent.toFixed(0)}%` : "N/A"} percent={metrics?.cpuUsagePercent ?? 0} color="bg-[#3B82F6]" />
        <MetricRow icon={<Wifi size={14} />} label="MC API RTT" value={formatLatency(latency)} percent={latency?.latencyMs ? clampPercent(100 - latency.latencyMs / 3) : 0} color={latency?.reachable === false ? "bg-[#F59E0B]" : "bg-[#22C55E]"} />
      </div>

      <footer className="grid grid-cols-[1fr_auto] border-t border-[#25252B]">
        <button type="button" onClick={onOpenTelemetry} className="flex h-11 cursor-pointer items-center justify-between px-4 text-xs text-[#777780] transition-colors hover:bg-[#1A1A1F] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#8B5CF6]"><span className="flex items-center gap-2"><ShieldCheck size={14} /> Rust Native Core</span><ArrowRight size={14} /></button>
        <button type="button" onClick={() => setMissionControlOpen(true)} disabled={missionVisibility === "hidden"} aria-label="Open Mission Control log" title={missionVisibility === "hidden" ? "Mission Control is disabled in settings" : "Open Mission Control log"} className="grid w-11 cursor-pointer place-items-center border-l border-[#25252B] text-[#85858E] transition-colors hover:bg-[#7E22CE] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#C084FC] disabled:cursor-not-allowed disabled:text-[#3F3F46] disabled:hover:bg-transparent"><SquareTerminal size={15} /></button>
      </footer>
    </section>
  );
}

function MetricRow({ icon, label, value, percent, color }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  percent: number;
  color: string;
}) {
  return (
    <div className="border-b border-[#24242A] py-2 last:border-b-0">
      <div className="flex items-center gap-2 text-xs">
        <span className="text-[#8B5CF6]">{icon}</span>
        <span className="flex-1 text-[#85858E]">{label}</span>
        <strong className="font-mono text-[10px] font-medium text-[#D4D4D8]">{value}</strong>
      </div>
      <div className="mt-2 h-1 rounded-full bg-[#29292F]" aria-hidden="true"><div className={`h-full rounded-full transition-[width] duration-500 ${color}`} style={{ width: `${clampPercent(percent)}%` }} /></div>
    </div>
  );
}

function formatLatency(latency: NetworkLatency | undefined) {
  if (!latency) return "N/A";
  if (!latency.reachable || latency.latencyMs === null) return "Offline";
  return `${latency.latencyMs} ms`;
}

export default MainDashboard;
