import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { api } from "@/lib/api";
import type { ModLoader, ModSummary, Platform, ProjectType, SearchResultPage, SearchSort } from "@/types";
import { ShadowGlyph } from "../../../components/ShadowGlyph";
import { useInstallQueue } from "../../../hooks/useInstallQueue";
import type { IInstallState } from "../../../types";
import { voidClientStyles } from "../void-client.styles";

type SourceFilter = "all" | Platform;
type SortOption = SearchSort;

const PAGE_SIZE = 24;
const SOURCE_OPTIONS: readonly { id: SourceFilter; label: string; detail: string }[] = [
  { id: "all", label: "All sources", detail: "Modrinth + CurseForge" },
  { id: "modrinth", label: "Modrinth", detail: "Open ecosystem" },
  { id: "curseforge", label: "CurseForge", detail: "Curated vault" },
] as const;
const KIND_OPTIONS: readonly { id: ProjectType; label: string }[] = [
  { id: "mod", label: "Mods" },
  { id: "modpack", label: "Modpacks" },
  { id: "shader", label: "Shaders" },
] as const;
const SORT_OPTIONS: readonly { id: SortOption; label: string }[] = [
  { id: "relevance", label: "Relevance" },
  { id: "downloads", label: "Downloads" },
  { id: "updated", label: "Recently updated" },
  { id: "name", label: "Name" },
] as const;
const GAME_VERSION_OPTIONS = ["all", "1.21.1", "1.21", "1.20.6", "1.20.1", "1.19.4", "1.18.2"] as const;
const LOADER_OPTIONS = ["all", "fabric", "forge", "neoforge", "quilt"] as const;

type CombinedPage = SearchResultPage & { warning?: string };

export function ModHubView() {
  const [source, setSource] = useState<SourceFilter>("all");
  const [kind, setKind] = useState<ProjectType>("mod");
  const [sortBy, setSortBy] = useState<SortOption>("relevance");
  const [gameVersion, setGameVersion] = useState<(typeof GAME_VERSION_OPTIONS)[number]>("all");
  const [loader, setLoader] = useState<(typeof LOADER_OPTIONS)[number]>("all");
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const { getInstallState, install } = useInstallQueue();

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim().slice(0, 100)), 280);
    return () => window.clearTimeout(timer);
  }, [query]);

  const search = useInfiniteQuery({
    queryKey: ["shadow-archive", source, kind, sortBy, gameVersion, loader, debouncedQuery],
    initialPageParam: 0,
    queryFn: async ({ pageParam }): Promise<CombinedPage> => {
      const platforms: Platform[] = source === "all" ? ["modrinth", "curseforge"] : [source];
      const results = await Promise.allSettled(
        platforms.map((platform) => api.searchMods({
          platform,
          query: debouncedQuery,
          projectType: kind,
          sort: sortBy,
          gameVersion: gameVersion === "all" ? undefined : gameVersion,
          loader: loader === "all" ? undefined : loader as ModLoader,
          limit: PAGE_SIZE,
          offset: pageParam * PAGE_SIZE,
        })),
      );
      const pages = results.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
      const failed = results.filter((result): result is PromiseRejectedResult => result.status === "rejected");
      if (pages.length === 0) {
        throw new Error(failed.map((result) => String(result.reason)).join("; ") || "No platform response received.");
      }
      return {
        items: pages.flatMap((page) => page.items),
        total: pages.reduce((sum, page) => sum + page.total, 0),
        offset: pageParam * PAGE_SIZE,
        limit: pages.reduce((sum, page) => sum + page.limit, 0),
        warning: failed.length > 0 ? "One source is unavailable. Modrinth results remain live; configure CurseForge to search both vaults." : undefined,
      };
    },
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, page) => sum + page.items.length, 0);
      return loaded < lastPage.total && lastPage.items.length > 0 ? allPages.length : undefined;
    },
    staleTime: 45_000,
  });

  const allItems = useMemo(() => search.data?.pages.flatMap((page) => page.items) ?? [], [search.data?.pages]);
  const categoryOptions = useMemo(
    () => ["all", ...Array.from(new Set(allItems.flatMap((item) => item.categories))).sort()],
    [allItems],
  );
  const visibleItems = useMemo(() => {
    const filtered = category === "all" ? allItems : allItems.filter((item) => item.categories.includes(category));
    if (sortBy !== "name") return filtered;
    return [...filtered].sort((left, right) => left.name.localeCompare(right.name));
  }, [allItems, category, sortBy]);

  const updateQuery = useCallback((event: ChangeEvent<HTMLInputElement>) => setQuery(event.target.value), []);
  const clearFilters = useCallback(() => {
    setSource("all");
    setKind("mod");
    setSortBy("relevance");
    setCategory("all");
    setGameVersion("all");
    setLoader("all");
    setQuery("");
  }, []);
  const openProject = useCallback((item: ModSummary) => {
    if (/^https:\/\/(www\.)?(modrinth\.com|curseforge\.com)\//.test(item.pageUrl)) void openUrl(item.pageUrl);
  }, []);

  const total = search.data?.pages[0]?.total ?? 0;
  const warning = search.data?.pages.find((page) => page.warning)?.warning;
  const hasFilters = source !== "all" || kind !== "mod" || sortBy !== "relevance" || category !== "all" || gameVersion !== "all" || loader !== "all" || query.length > 0;

  return (
    <div className={voidClientStyles.page}>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-5">
        <div className="max-w-3xl">
          <p className={voidClientStyles.sectionKicker}>Live platform search // server paginated</p>
          <h1 className={voidClientStyles.pageTitle}>The Shadow Archive</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#8d8198]">
            Browse the real Modrinth and CurseForge catalogs. Results are fetched from the selected source and loaded continuously, so the archive is not capped at ten cards.
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-[#7B2CBF]/20 bg-[#7B2CBF]/[0.065] px-4 py-3 shadow-[0_0_34px_rgba(123,44,191,0.1)]">
          <span className="grid size-9 place-items-center rounded-xl border border-[#b36dff]/25 bg-black/25 text-[#d8b4fe]"><ShadowGlyph name="mods" size={18} /></span>
          <span><strong className="block text-xs text-white">{total.toLocaleString()} matching projects</strong><small className="mt-0.5 block text-[9px] font-bold tracking-[0.1em] text-[#8d8198] uppercase">Live API index</small></span>
        </div>
      </header>

      <section className={`${voidClientStyles.glassCard} mb-5 p-4 sm:p-5`} aria-label="Archive filters">
        <div className="pointer-events-none absolute -top-20 right-[8%] size-48 rounded-full bg-[#7B2CBF]/15 blur-[70px]" />
        <div className="relative grid gap-4 xl:grid-cols-[minmax(260px,0.9fr)_minmax(0,1.5fr)_auto] xl:items-end">
          <label className="block"><span className="mb-2 block text-[9px] font-black tracking-[0.15em] text-[#c796ff] uppercase">Search the live archive</span><input type="search" value={query} onChange={updateQuery} autoComplete="off" placeholder="Search Sodium, Create, Iris..." className={voidClientStyles.input} /></label>
          <div><span className="mb-2 block text-[9px] font-black tracking-[0.15em] text-[#c796ff] uppercase">Content class</span><div className="grid grid-cols-3 gap-1.5 rounded-xl border border-white/[0.07] bg-black/25 p-1.5">{KIND_OPTIONS.map((option) => <FilterButton key={option.id} active={kind === option.id} label={option.label} onClick={() => setKind(option.id)} />)}</div></div>
          <button type="button" onClick={clearFilters} disabled={!hasFilters} className={`${voidClientStyles.secondaryButton} h-11 xl:min-w-32`}><ShadowGlyph name="sliders" size={15} />Reset filters</button>
        </div>
        <div className="relative mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <ArchiveSelect id="archive-source" label="Source" value={source} onChange={(event) => setSource(event.target.value as SourceFilter)}>{SOURCE_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</ArchiveSelect>
          <ArchiveSelect id="archive-sort" label="Sort by" value={sortBy} onChange={(event) => setSortBy(event.target.value as SortOption)}>{SORT_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</ArchiveSelect>
          <ArchiveSelect id="archive-version" label="Game version" value={gameVersion} onChange={(event) => setGameVersion(event.target.value as typeof gameVersion)}>{GAME_VERSION_OPTIONS.map((option) => <option key={option} value={option}>{option === "all" ? "All versions" : option}</option>)}</ArchiveSelect>
          <ArchiveSelect id="archive-loader" label="Loader" value={loader} onChange={(event) => setLoader(event.target.value as typeof loader)}>{LOADER_OPTIONS.map((option) => <option key={option} value={option}>{option === "all" ? "All loaders" : option}</option>)}</ArchiveSelect>
        </div>
        <div className="relative mt-4 flex items-center gap-3 overflow-x-auto pb-1">{SOURCE_OPTIONS.map((option) => <button key={option.id} type="button" aria-pressed={source === option.id} onClick={() => setSource(option.id)} className={`shrink-0 rounded-xl border px-3.5 py-2.5 text-left transition ${voidClientStyles.focusRing} ${source === option.id ? "border-[#a855f7]/38 bg-[#7B2CBF]/18 text-white" : "border-white/[0.065] bg-white/[0.025] text-[#8d8198] hover:border-white/[0.13] hover:text-white"}`}><strong className="block text-[10px]">{option.label}</strong><small className="mt-0.5 block text-[8px] text-[#655a70]">{option.detail}</small></button>)}</div>
        {categoryOptions.length > 1 && <div className="relative mt-3 flex items-center gap-2 overflow-x-auto"><span className="shrink-0 text-[8px] font-black tracking-[0.12em] text-[#8f78a1] uppercase">Category</span><select value={category} onChange={(event) => setCategory(event.target.value)} className={`${voidClientStyles.input} h-9 min-w-40 py-1 text-[10px]`}>{categoryOptions.map((option) => <option key={option} value={option}>{option === "all" ? "All categories" : option}</option>)}</select></div>}
      </section>

      {warning && <div className="mb-4 rounded-xl border border-amber-300/20 bg-amber-300/[0.07] px-4 py-3 text-xs leading-5 text-amber-100">{warning}</div>}
      {search.error && <div className="mb-4 rounded-xl border border-red-400/25 bg-red-400/[0.07] px-4 py-3 text-xs leading-5 text-red-200">Live search failed: {String(search.error)}</div>}
      <div className="mb-4 flex items-center justify-between gap-4"><p aria-live="polite" className="text-[10px] font-bold tracking-[0.08em] text-[#776c82] uppercase">Showing {visibleItems.length.toLocaleString()} loaded of {total.toLocaleString()} matching {kind}s</p><div className="hidden h-px flex-1 bg-[linear-gradient(90deg,rgba(123,44,191,0.18),transparent)] sm:block" /></div>

      <div className="min-h-[360px]">
        {search.isPending && visibleItems.length === 0 ? <LoadingGrid /> : null}
        <motion.div layout className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3"><AnimatePresence initial={false} mode="popLayout">{visibleItems.map((item, index) => <LiveProjectCard key={`${item.platform}:${item.id}`} item={item} index={index} installState={getInstallState(`${item.platform}:${item.id}`)} onInstall={() => install(`${item.platform}:${item.id}`)} onOpen={() => openProject(item)} />)}</AnimatePresence></motion.div>
        {!search.isPending && visibleItems.length === 0 && <EmptyState onReset={clearFilters} />}
      </div>
      {search.hasNextPage && <div className="mt-7 flex justify-center"><button type="button" onClick={() => void search.fetchNextPage()} disabled={search.isFetchingNextPage} className={`${voidClientStyles.primaryButton} min-w-52`}>{search.isFetchingNextPage ? "Loading more projects..." : `Load more (${Math.max(0, total - allItems.length).toLocaleString()} remaining)`}</button></div>}
      <footer className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.055] pt-5 text-[9px] tracking-[0.08em] text-[#5f5469] uppercase"><span>Native backend keeps API keys out of the webview</span><span className="flex items-center gap-2 text-[#7f6b90]"><span className="size-1.5 rounded-full bg-[#8f55c5] shadow-[0_0_10px_rgba(143,85,197,0.65)]" />Live archive channel</span></footer>
    </div>
  );
}

function FilterButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return <button type="button" aria-pressed={active} onClick={onClick} className={`cursor-pointer rounded-lg px-3 py-2 text-[10px] font-black transition ${voidClientStyles.focusRing} ${active ? "bg-[#7B2CBF]/24 text-white shadow-[0_0_18px_rgba(123,44,191,0.14)]" : "text-[#776c82] hover:bg-white/[0.035] hover:text-[#c4b8ce]"}`}>{label}</button>;
}

function ArchiveSelect({ id, label, value, onChange, children }: { id: string; label: string; value: string; onChange: (event: ChangeEvent<HTMLSelectElement>) => void; children: React.ReactNode }) {
  return <label htmlFor={id}><span className="mb-1.5 block text-[8px] font-black tracking-[0.14em] text-[#8f78a1] uppercase">{label}</span><select id={id} value={value} onChange={onChange} className={`${voidClientStyles.input} cursor-pointer appearance-none`}>{children}</select></label>;
}

function LoadingGrid() {
  return <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">{Array.from({ length: 6 }, (_, index) => <div key={index} className="h-80 animate-pulse rounded-[24px] border border-white/[0.06] bg-white/[0.025]" />)}</div>;
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return <section className={`${voidClientStyles.glassCard} mt-5 grid min-h-72 place-items-center p-8 text-center`}><div><span className="mx-auto grid size-14 place-items-center rounded-2xl border border-[#7B2CBF]/25 bg-[#7B2CBF]/10 text-[#d8b4fe]"><ShadowGlyph name="mods" size={27} /></span><h2 className="font-display mt-5 text-lg font-black">No signal in this sector</h2><p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-[#8d8198]">Try another search, source, version or loader. The query is sent to the live platform index.</p><button type="button" onClick={onReset} className={`${voidClientStyles.secondaryButton} mt-5`}>Reset archive filters</button></div></section>;
}

const ACCENTS: Record<ProjectType, { canvas: string; line: string; badge: string; icon: string }> = {
  mod: { canvas: "bg-[radial-gradient(circle_at_72%_20%,rgba(168,85,247,0.42),transparent_38%),linear-gradient(135deg,#150b20,#08060d_72%)]", line: "border-[#b36dff]/35", badge: "border-[#b36dff]/30 bg-[#7B2CBF]/14 text-[#d8b4fe]", icon: "text-[#d8b4fe]" },
  modpack: { canvas: "bg-[radial-gradient(circle_at_72%_20%,rgba(58,112,255,0.38),transparent_38%),linear-gradient(135deg,#090f24,#07070d_72%)]", line: "border-[#678bff]/32", badge: "border-[#678bff]/28 bg-[#315be8]/12 text-[#a9c0ff]", icon: "text-[#a9c0ff]" },
  shader: { canvas: "bg-[radial-gradient(circle_at_72%_20%,rgba(245,158,11,0.3),transparent_38%),linear-gradient(135deg,#211307,#080706_72%)]", line: "border-amber-300/28", badge: "border-amber-300/24 bg-amber-300/[0.08] text-amber-200", icon: "text-amber-200" },
};

function LiveProjectCard({ item, index, installState, onInstall, onOpen }: { item: ModSummary; index: number; installState: IInstallState; onInstall: () => void; onOpen: () => void }) {
  const reducedMotion = useReducedMotion();
  const accent = ACCENTS[item.projectType];
  const isInstalling = installState.phase === "installing";
  const isInstalled = installState.phase === "installed";
  return <motion.article layout initial={{ opacity: 0, y: 18, scale: 0.975 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.3, delay: reducedMotion ? 0 : Math.min(index, 12) * 0.025 }} whileHover={reducedMotion ? undefined : { y: -5 }} className={`group relative overflow-hidden rounded-[24px] border bg-[linear-gradient(150deg,rgba(20,15,27,0.96),rgba(8,6,11,0.92))] shadow-[inset_0_1px_0_rgba(255,255,255,0.055),0_22px_60px_rgba(0,0,0,0.36)] backdrop-blur-2xl ${accent.line}`}>
    <div className={`relative h-40 overflow-hidden ${accent.canvas}`}>
      {item.iconUrl ? <img src={item.iconUrl} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover opacity-45 saturate-75 transition duration-700 group-hover:scale-[1.07] group-hover:opacity-65" /> : <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(255,255,255,0.14),transparent_32%)]" />}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_34%,rgba(5,5,5,0.8)_100%)]" />
      <div className="absolute inset-x-0 top-0 flex items-start justify-between p-4"><span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[8px] font-black tracking-[0.12em] uppercase backdrop-blur-xl ${accent.badge}`}><ShadowGlyph name={item.projectType === "shader" ? "spark" : "mods"} size={12} />{item.projectType}</span><span className="rounded-lg border border-white/[0.09] bg-black/35 px-2.5 py-1.5 text-[8px] font-black tracking-[0.1em] text-[#b9adbf] uppercase backdrop-blur-xl">{item.platform}</span></div>
      <div className={`absolute bottom-4 left-4 grid size-12 place-items-center rounded-2xl border bg-black/35 backdrop-blur-xl ${accent.line} ${accent.icon}`}><ShadowGlyph name={item.projectType === "shader" ? "spark" : "mods"} size={24} className="filter drop-shadow-[0_0_10px_currentColor]" /></div><span className="absolute right-4 bottom-4 text-[9px] font-bold tracking-[0.08em] text-white/70 uppercase">{formatDownloads(item.downloads)} downloads</span>
    </div>
    <div className="p-5"><div className="min-h-18"><p className="text-[9px] font-black tracking-[0.13em] text-[#765d8b] uppercase">By {item.author || "community author"}</p><h2 className="font-display mt-1.5 line-clamp-2 text-base leading-5 font-black text-white transition group-hover:text-[#e7d5ff]">{item.name}</h2></div><p className="mt-3 line-clamp-3 min-h-15 text-[11px] leading-5 text-[#8d8198]">{item.summary || "Community project indexed from the live platform catalog."}</p><div className="mt-4 flex min-h-6 flex-wrap gap-2">{item.categories.slice(0, 3).map((value) => <span key={value} className={voidClientStyles.tag}>{value}</span>)}</div><div className="mt-5 grid grid-cols-[1fr_auto] gap-2"><motion.button layout type="button" disabled={isInstalling || isInstalled} onClick={onInstall} whileHover={!isInstalling && !isInstalled && !reducedMotion ? { scale: 1.018 } : undefined} whileTap={!isInstalling && !isInstalled && !reducedMotion ? { scale: 0.985 } : undefined} className={`relative flex h-11 cursor-pointer items-center justify-center overflow-hidden rounded-xl border text-[10px] font-black tracking-[0.1em] uppercase transition ${voidClientStyles.focusRing} ${isInstalled ? "border-[#4cff9a]/24 bg-[#00e676]/[0.075] text-[#68ffa6]" : isInstalling ? "cursor-wait border-[#a855f7]/38 bg-[#160b20] text-white" : "border-[#a855f7]/32 bg-[linear-gradient(105deg,rgba(50,16,75,0.92),rgba(123,44,191,0.82),rgba(34,54,122,0.78))] text-white shadow-[0_0_24px_rgba(123,44,191,0.2)]"}`}>{isInstalling && <motion.span className="absolute inset-0 origin-left bg-[#9d4edd]/80" initial={{ scaleX: 0 }} animate={{ scaleX: installState.progress / 100 }} />}<span className="relative z-10 flex items-center gap-2"><ShadowGlyph name={isInstalled ? "check" : isInstalling ? "spark" : "download"} size={15} />{isInstalled ? "Installed" : isInstalling ? `Installing ${installState.progress}%` : "Prepare"}</span></motion.button><button type="button" onClick={onOpen} aria-label={`Open ${item.name} project page`} className={`${voidClientStyles.secondaryButton} h-11 px-3`}><ShadowGlyph name="external" size={15} /></button></div></div>
  </motion.article>;
}

function formatDownloads(value: number) {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}b`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}m`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return value.toString();
}
