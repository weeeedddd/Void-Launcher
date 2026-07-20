import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type MouseEvent } from "react";
import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Flame,
  Layers3,
  LoaderCircle,
  Package,
  Search,
  ShieldCheck,
  Sparkles,
  Swords,
  WandSparkles,
} from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { api } from "@/lib/api";
import { playSuccess } from "@/lib/sound";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useUiStore } from "@/stores/ui";
import type { ModLoader, ModSummary, Platform } from "@/types";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Toast, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast";
import { ModCard } from "./ModCard";

const GAME_VERSIONS = ["1.21.4", "1.21.1", "1.20.6", "1.20.1", "1.19.2", "1.18.2"];
const LOADERS: ModLoader[] = ["fabric", "neoforge", "forge", "quilt"];
const PAGE_SIZE = 9;
const LAST_PAGE = 12;

const COMMUNITY_PACKS = [
  { id: "eclipse", title: "Eclipse Dominion", subtitle: "Arcane exploration and ruthless progression", version: "1.21.1", mods: 186, downloads: "1.8M", icon: WandSparkles, tone: "from-violet-950 via-[#28113e] to-blue-950", accent: "bg-violet-400" },
  { id: "abyss", title: "Abyss Protocol", subtitle: "Technology, automation and deep-space survival", version: "1.20.1", mods: 243, downloads: "984K", icon: Layers3, tone: "from-slate-950 via-[#101c35] to-indigo-950", accent: "bg-blue-400" },
  { id: "bloodmoon", title: "Blood Moon Requiem", subtitle: "Hardcore combat beneath a hostile crimson sky", version: "1.20.1", mods: 154, downloads: "712K", icon: Swords, tone: "from-red-950 via-[#25101f] to-violet-950", accent: "bg-red-400" },
  { id: "astral", title: "Astral Sovereign", subtitle: "Magic, dimensions and cinematic boss encounters", version: "1.21.1", mods: 201, downloads: "2.4M", icon: Sparkles, tone: "from-blue-950 via-[#1b1648] to-fuchsia-950", accent: "bg-fuchsia-400" },
] as const;

type BrowserTab = "mods" | "modpacks";

export function ModSearchPage() {
  const [tab, setTab] = useState<BrowserTab>("mods");
  const [query, setQuery] = useState("");
  const [platform, setPlatform] = useState<Platform>("modrinth");
  const [gameVersion, setGameVersion] = useState("1.21.1");
  const [loader, setLoader] = useState<ModLoader>("fabric");
  const [targetId, setTargetId] = useState<string>();
  const [page, setPage] = useState(1);
  const [selectedMod, setSelectedMod] = useState<ModSummary | null>(null);
  const [toast, setToast] = useState({ open: false, title: "", description: "" });
  const debouncedQuery = useDebouncedValue(query);

  const pendingSearch = useUiStore((state) => state.pendingSearch);
  const setPendingSearch = useUiStore((state) => state.setPendingSearch);
  useEffect(() => {
    if (!pendingSearch) return;
    setQuery(pendingSearch);
    setTab("mods");
    setPage(1);
    setPendingSearch(null);
  }, [pendingSearch, setPendingSearch]);

  const { data: mods, isFetching, error } = useQuery({
    queryKey: ["mod-search", platform, debouncedQuery, gameVersion, loader, page],
    queryFn: () => api.searchMods({ platform, query: debouncedQuery, gameVersion, loader, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });
  const { data: instances } = useQuery({ queryKey: ["instances"], queryFn: api.listInstances });
  const target = targetId ?? instances?.[0]?.id;

  const { data: versions, isFetching: versionsLoading } = useQuery({
    queryKey: ["mod-versions", selectedMod?.platform, selectedMod?.id, gameVersion, loader],
    queryFn: () => api.getModVersions(selectedMod!.platform, selectedMod!.id, gameVersion, loader),
    enabled: Boolean(selectedMod),
  });

  const compatibleVersions = useMemo(() => {
    const values = versions?.flatMap((version) => version.gameVersions) ?? [];
    return [...new Set(values)].filter((value) => /^\d+\.\d+/.test(value)).slice(0, 6);
  }, [versions]);

  const install = useMutation({
    mutationFn: (mod: ModSummary) => {
      if (!target) return Promise.reject(new Error("Create an instance before adding a mod."));
      return api.installMod(target, mod.platform, mod.id);
    },
    onSuccess: () => {
      playSuccess();
      setSelectedMod(null);
      setToast({ open: true, title: "Mod successfully added", description: "The mod is now part of your selected instance." });
    },
  });

  const selectTab = useCallback((value: string) => setTab(value as BrowserTab), []);
  const changeQuery = useCallback((event: ChangeEvent<HTMLInputElement>) => { setQuery(event.target.value); setPage(1); }, []);
  const changeGameVersion = useCallback((event: ChangeEvent<HTMLSelectElement>) => { setGameVersion(event.target.value); setPage(1); }, []);
  const changeLoader = useCallback((event: ChangeEvent<HTMLSelectElement>) => { setLoader(event.target.value as ModLoader); setPage(1); }, []);
  const changeTarget = useCallback((event: ChangeEvent<HTMLSelectElement>) => setTargetId(event.target.value), []);
  const selectPlatform = useCallback((event: MouseEvent<HTMLButtonElement>) => { setPlatform(event.currentTarget.value as Platform); setPage(1); }, []);
  const selectMod = useCallback((mod: ModSummary) => setSelectedMod(mod), []);
  const changePage = useCallback((nextPage: number) => setPage(nextPage), []);
  const changeDialogOpen = useCallback((open: boolean) => { if (!open) setSelectedMod(null); }, []);
  const addSelectedMod = useCallback(() => { if (selectedMod) install.mutate(selectedMod); }, [install, selectedMod]);
  const openProjectPage = useCallback(() => { if (selectedMod) void openUrl(selectedMod.pageUrl); }, [selectedMod]);
  const changeToastOpen = useCallback((open: boolean) => setToast((current) => ({ ...current, open })), []);
  const queueModpack = useCallback((title: string) => {
    playSuccess();
    setToast({ open: true, title: "Modpack download queued", description: `${title} will be prepared as a new instance.` });
  }, []);

  return (
    <ToastProvider swipeDirection="right">
      <div className="mx-auto max-w-[1540px] px-6 pt-7 pb-40 2xl:px-10">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="section-kicker">Content vault</p>
            <h1 className="font-display mt-1 text-3xl font-black tracking-tight text-white">Mods &amp; Modpacks</h1>
            <p className="mt-2 text-sm text-ink-300">Discover, inspect and deploy community content without leaving the launcher.</p>
          </div>
          {instances && instances.length > 0 && (
            <label className="flex items-center gap-3 text-xs font-semibold text-ink-300">
              Install into
              <select className="control h-11 min-w-44 select-text" value={target} onChange={changeTarget}>
                {instances.map((instance) => <option key={instance.id} value={instance.id}>{instance.name}</option>)}
              </select>
            </label>
          )}
        </header>

        <Tabs value={tab} onValueChange={selectTab}>
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/7 pb-5">
            <TabsList aria-label="Content type">
              <TabsTrigger value="mods"><Package size={14} className="mr-2 inline" /> Mods</TabsTrigger>
              <TabsTrigger value="modpacks"><Layers3 size={14} className="mr-2 inline" /> Modpacks</TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.15em] text-ink-500 uppercase"><ShieldCheck size={14} className="text-success-400" /> Verified sources</div>
          </div>

          <TabsContent value="mods">
            <div className="shadow-panel mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-white/7 p-4">
              <div className="relative min-w-64 flex-1">
                <Search size={16} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-500" />
                <label htmlFor="mod-search" className="sr-only">Search mods</label>
                <input id="mod-search" className="control h-11 w-full select-text pl-10" placeholder="Search Sodium, Iris, Create..." value={query} onChange={changeQuery} />
              </div>
              <div className="flex h-11 overflow-hidden rounded-xl border border-white/8 bg-black/25 p-1">
                {(["modrinth", "curseforge"] as const).map((source) => (
                  <button key={source} type="button" value={source} onClick={selectPlatform} className={`cursor-pointer rounded-lg px-4 text-xs font-bold capitalize transition ${platform === source ? "bg-accent-500/20 text-white shadow-[inset_0_0_0_1px_rgb(123_44_191_/_0.3)]" : "text-ink-500 hover:text-white"}`}>{source}</button>
                ))}
              </div>
              <label htmlFor="game-version" className="sr-only">Game version</label>
              <select id="game-version" className="control h-11" value={gameVersion} onChange={changeGameVersion}>{GAME_VERSIONS.map((version) => <option key={version} value={version}>{version}</option>)}</select>
              <label htmlFor="mod-loader" className="sr-only">Mod loader</label>
              <select id="mod-loader" className="control h-11 capitalize" value={loader} onChange={changeLoader}>{LOADERS.map((item) => <option key={item} value={item}>{item}</option>)}</select>
            </div>

            {error ? (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/7 p-6 text-sm text-red-300">{String(error)}</div>
            ) : (
              <div className="relative">
                {isFetching && <div className="absolute inset-x-0 -top-2 z-10 h-0.5 overflow-hidden rounded-full bg-white/5"><motion.div className="shadow-energy-rail h-full w-1/3" animate={{ x: ["-100%", "400%"] }} transition={{ repeat: Infinity, duration: 1.1, ease: "linear" }} /></div>}
                <AnimatePresence mode="popLayout">
                  <div className={`grid grid-cols-1 gap-4 transition-opacity md:grid-cols-2 2xl:grid-cols-3 ${isFetching ? "opacity-55" : "opacity-100"}`}>
                    {mods?.map((mod) => <ModCard key={`${mod.platform}:${mod.id}`} mod={mod} onSelect={selectMod} />)}
                    {mods?.length === 0 && !isFetching && <div className="col-span-full rounded-3xl border border-dashed border-white/10 py-20 text-center"><Search size={26} className="mx-auto mb-3 text-ink-500" /><p className="text-sm font-semibold text-ink-300">No mods found</p><p className="mt-1 text-xs text-ink-500">Try another search, version or loader.</p></div>}
                  </div>
                </AnimatePresence>
                <Pagination page={page} onPageChange={changePage} />
              </div>
            )}
          </TabsContent>

          <TabsContent value="modpacks">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div><p className="section-kicker">Curated experiences</p><h2 className="mt-1 font-display text-xl font-bold text-white">Community collections</h2></div>
              <span className="flex items-center gap-2 text-xs text-ink-500"><Flame size={15} className="text-orange-400" /> Trending this week</span>
            </div>
            <div className="grid gap-5 lg:grid-cols-2">
              {COMMUNITY_PACKS.map((pack) => <ModpackCard key={pack.id} pack={pack} onDownload={queueModpack} />)}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={Boolean(selectedMod)} onOpenChange={changeDialogOpen}>
        {selectedMod && (
          <DialogContent>
            <div className="relative h-60 overflow-hidden border-b border-white/8 bg-gradient-to-br from-[#1d1027] via-[#09070d] to-[#071329]">
              <div className="absolute inset-0 opacity-35 [background-image:radial-gradient(circle_at_72%_35%,rgb(123_44_191_/_0.65),transparent_27%),linear-gradient(120deg,transparent_40%,rgb(35_70_145_/_0.32),transparent_65%)]" />
              <div className="absolute right-[12%] bottom-[-70%] size-80 rotate-45 border border-accent-400/20 shadow-[0_0_90px_rgb(123_44_191_/_0.18)]" />
              <div className="absolute bottom-6 left-7 flex items-end gap-5">
                {selectedMod.iconUrl ? <img src={selectedMod.iconUrl} alt="" className="size-24 rounded-3xl border-4 border-[#0d0a11] bg-void-800 object-cover shadow-2xl" /> : <div className="grid size-24 place-items-center rounded-3xl border-4 border-[#0d0a11] bg-gradient-to-br from-accent-600 to-midnight-800"><Package size={34} /></div>}
                <div className="pb-1"><span className="rounded-full border border-accent-400/25 bg-accent-500/12 px-2.5 py-1 text-[9px] font-bold tracking-[0.14em] text-accent-300 uppercase">{selectedMod.platform}</span></div>
              </div>
            </div>
            <div className="grid gap-7 p-7 lg:grid-cols-[1fr_270px]">
              <div>
                <DialogHeader>
                  <DialogTitle>{selectedMod.name}</DialogTitle>
                  <DialogDescription>by {selectedMod.author || "unknown"} · {selectedMod.summary}</DialogDescription>
                </DialogHeader>
                <div className="mt-6 rounded-2xl border border-white/7 bg-black/18 p-5">
                  <h3 className="text-sm font-bold text-white">About this mod</h3>
                  <p className="mt-2 text-sm leading-6 text-ink-300">{selectedMod.summary} Built for players who want a polished, compatible addition to their instance while keeping installation and updates inside the launcher.</p>
                </div>
                <button type="button" onClick={openProjectPage} className="mt-5 flex cursor-pointer items-center gap-2 text-xs font-bold text-accent-300 transition hover:text-white focus-visible:outline-2 focus-visible:outline-accent-400">View project page <ExternalLink size={14} /></button>
              </div>
              <aside className="rounded-2xl border border-white/7 bg-black/22 p-5">
                <p className="section-kicker">Compatibility</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {versionsLoading ? <LoaderCircle size={18} className="animate-spin text-accent-300" /> : (compatibleVersions.length ? compatibleVersions : [gameVersion]).map((version) => <span key={version} className="rounded-lg border border-white/8 bg-white/[0.035] px-2.5 py-1.5 text-[10px] font-bold text-ink-300">MC {version}</span>)}
                </div>
                <div className="mt-5 space-y-3 text-xs text-ink-300"><p className="flex items-center justify-between"><span>Loader</span><strong className="capitalize text-white">{loader}</strong></p><p className="flex items-center justify-between"><span>Files found</span><strong className="text-white">{versions?.length ?? 0}</strong></p><p className="flex items-center justify-between"><span>Target</span><strong className="max-w-30 truncate text-white">{instances?.find((item) => item.id === target)?.name ?? "None"}</strong></p></div>
                <Button className="mt-6 h-12 w-full rounded-xl" onClick={addSelectedMod} disabled={!target || install.isPending}>
                  {install.isPending ? <LoaderCircle size={16} className="animate-spin" /> : <Download size={16} />} Add Mod
                </Button>
                {install.isError && <p className="mt-3 text-xs leading-5 text-red-300">{String(install.error)}</p>}
              </aside>
            </div>
          </DialogContent>
        )}
      </Dialog>

      <Toast open={toast.open} onOpenChange={changeToastOpen} duration={4200}>
        <div className="absolute inset-y-0 left-0 w-1 bg-success-500 shadow-[0_0_16px_var(--color-success-glow)]" />
        <div className="flex items-start gap-3 pl-1"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-success-500/12 text-success-400"><CheckCircle2 size={18} /></span><div><ToastTitle>{toast.title}</ToastTitle><ToastDescription>{toast.description}</ToastDescription></div></div>
      </Toast>
      <ToastViewport />
    </ToastProvider>
  );
}

function Pagination({ page, onPageChange }: { page: number; onPageChange: (page: number) => void }) {
  const previous = useCallback(() => onPageChange(Math.max(1, page - 1)), [onPageChange, page]);
  const next = useCallback(() => onPageChange(Math.min(LAST_PAGE, page + 1)), [onPageChange, page]);
  const last = useCallback(() => onPageChange(LAST_PAGE), [onPageChange]);
  const direct = useCallback((event: MouseEvent<HTMLButtonElement>) => onPageChange(Number(event.currentTarget.value)), [onPageChange]);

  return (
    <nav aria-label="Mod result pages" className="mt-8 flex flex-wrap items-center justify-center gap-2 border-t border-white/7 pt-6">
      <PageButton onClick={previous} disabled={page === 1}><ChevronLeft size={14} /> Previous</PageButton>
      {[1, 2, 3].map((number) => <PageButton key={number} value={number} onClick={direct} active={page === number}>{number}</PageButton>)}
      <span className="px-1 text-xs text-ink-500">Page {page} of {LAST_PAGE}</span>
      <PageButton onClick={next} disabled={page === LAST_PAGE}>Next <ChevronRight size={14} /></PageButton>
      <PageButton onClick={last} disabled={page === LAST_PAGE}>Last</PageButton>
    </nav>
  );
}

function PageButton({ active = false, className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return <button type="button" className={`inline-flex h-10 min-w-10 cursor-pointer items-center justify-center gap-1.5 rounded-xl border px-3 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-accent-400 ${active ? "border-accent-400/50 bg-accent-500/18 text-white shadow-[0_0_18px_rgb(123_44_191_/_0.18)]" : "border-white/8 bg-white/[0.025] text-ink-300 hover:border-accent-500/30 hover:text-white"} ${className}`} {...props} />;
}

function ModpackCard({ pack, onDownload }: { pack: (typeof COMMUNITY_PACKS)[number]; onDownload: (title: string) => void }) {
  const Icon = pack.icon;
  const download = useCallback(() => onDownload(pack.title), [onDownload, pack.title]);
  return (
    <article className="group shadow-panel overflow-hidden rounded-3xl border border-white/7 transition duration-250 hover:-translate-y-1 hover:border-accent-500/32">
      <div className={`relative h-52 overflow-hidden bg-gradient-to-br ${pack.tone}`}>
        <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgb(255_255_255_/_0.05)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255_/_0.05)_1px,transparent_1px)] [background-size:32px_32px]" />
        <div className="absolute -right-16 -bottom-28 size-72 rotate-45 border border-white/10 bg-white/[0.025] shadow-[0_0_80px_rgb(123_44_191_/_0.16)] transition duration-500 group-hover:rotate-[38deg]" />
        <div className="absolute inset-0 flex items-center justify-center"><div className="grid size-24 place-items-center rounded-[28px] border border-white/15 bg-black/25 text-white shadow-2xl backdrop-blur-xl"><Icon size={38} /></div></div>
        <span className={`absolute top-5 left-5 h-1.5 w-14 rounded-full ${pack.accent} shadow-[0_0_18px_currentColor]`} />
        <span className="absolute right-5 bottom-5 rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-[10px] font-bold text-white/70 backdrop-blur-lg">{pack.downloads} downloads</span>
      </div>
      <div className="flex items-end justify-between gap-4 p-5">
        <div className="min-w-0"><h3 className="font-display truncate text-xl font-bold text-white">{pack.title}</h3><p className="mt-1 line-clamp-1 text-xs text-ink-300">{pack.subtitle}</p><div className="mt-3 flex gap-2 text-[10px] font-semibold text-ink-500"><span>MC {pack.version}</span><span>·</span><span>{pack.mods} mods</span></div></div>
        <Button onClick={download} className="h-11 shrink-0 rounded-xl px-4"><Download size={15} /> Download</Button>
      </div>
    </article>
  );
}
