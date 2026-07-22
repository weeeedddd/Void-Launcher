import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isTauri } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import { api } from "@/lib/api";
import type { CreateInstanceSpec, Instance, InstanceLoader, ModLoader, ModSummary, Platform, ProjectType, SearchSort } from "@/types";
import { ShadowGlyph } from "../../../components/ShadowGlyph";
import {
  installModpackWithNotification,
  installModWithNotification,
  installShaderWithNotification,
  provisionModpackWithNotification,
} from "../../../notifications/notificationOperations";
import type { IInstallState } from "../../../types";
import { useVoidClientStore } from "../../../stores/voidClient.store";
import { voidClientStyles } from "../void-client.styles";

const PAGE_SIZE = 24;
const GAME_VERSIONS = ["all", "1.21.1", "1.21", "1.20.6", "1.20.1", "1.19.4", "1.18.2"] as const;
const LOADERS = ["all", "fabric", "forge", "neoforge", "quilt"] as const;
const PROJECT_TYPES: readonly { id: ProjectType; label: string }[] = [{ id: "mod", label: "Mods" }, { id: "modpack", label: "Modpacks" }, { id: "shader", label: "Shaders" }];
const SORTS: readonly { id: SearchSort; label: string }[] = [{ id: "relevance", label: "Relevance" }, { id: "downloads", label: "Downloads" }, { id: "updated", label: "Recently updated" }, { id: "name", label: "Name" }];

type SourceFilter = "all" | Platform;
type SearchPayload = { items: ModSummary[]; total: number; warning: string | null };

export function ModHubView() {
  const [source, setSource] = useState<SourceFilter>("all");
  const kind = useVoidClientStore((state) => state.catalogKind);
  const setCatalogKind = useVoidClientStore((state) => state.setCatalogKind);
  const activeInstanceId = useVoidClientStore((state) => state.activeInstanceId);
  const setActiveInstanceId = useVoidClientStore((state) => state.setActiveInstanceId);
  const [sort, setSort] = useState<SearchSort>("relevance");
  const [gameVersion, setGameVersion] = useState<(typeof GAME_VERSIONS)[number]>("all");
  const [loader, setLoader] = useState<(typeof LOADERS)[number]>("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [keyOpen, setKeyOpen] = useState(false);
  const [curseforgeKey, setCurseforgeKey] = useState("");
  const [targetProject, setTargetProject] = useState<ModSummary | null>(null);
  const [targetInstanceId, setTargetInstanceId] = useState("");
  const [newInstanceName, setNewInstanceName] = useState("");
  const [newInstanceVersion, setNewInstanceVersion] = useState("1.21.1");
  const [newInstanceLoader, setNewInstanceLoader] = useState<InstanceLoader>("fabric");
  const [installStates, setInstallStates] = useState<Record<string, IInstallState>>({});
  const queryClient = useQueryClient();
  const instancesQuery = useQuery({ queryKey: ["instances"], queryFn: async () => (isTauri() ? api.listInstances() : []), retry: false });
  const settingsQuery = useQuery({ queryKey: ["settings-status"], queryFn: api.getSettingsStatus, enabled: isTauri(), retry: false });

  useEffect(() => setPage(0), [source, kind, sort, gameVersion, loader, query]);

  const searchQuery = useQuery<SearchPayload>({
    queryKey: ["shadow-archive", source, kind, sort, gameVersion, loader, query.trim(), page],
    queryFn: async () => {
      const platforms: Platform[] = source === "all" ? ["modrinth", "curseforge"] : [source];
      const results = await Promise.allSettled(platforms.map((platform) => api.searchMods({ platform, query: query.trim().slice(0, 100), projectType: kind, sort, gameVersion: gameVersion === "all" ? undefined : gameVersion, loader: loader === "all" ? undefined : loader as ModLoader, limit: PAGE_SIZE, offset: page * PAGE_SIZE })));
      const pages = results.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
      if (pages.length === 0) throw new Error(results.map((result) => result.status === "rejected" ? String(result.reason) : "").filter(Boolean).join("; ") || "No platform response received.");
      const failed = results.some((result) => result.status === "rejected");
      return { items: pages.flatMap((entry) => entry.items), total: pages.reduce((sum, entry) => sum + entry.total, 0), warning: failed ? "One catalog is unavailable. The visible results are from the responding source." : null };
    },
    enabled: isTauri(),
    retry: false,
  });

  const saveKey = useMutation({ mutationFn: (value: string | null) => api.setCurseforgeApiKey(value), onSuccess: (status) => { queryClient.setQueryData(["settings-status"], status); setCurseforgeKey(""); void queryClient.invalidateQueries({ queryKey: ["shadow-archive"] }); } });
  const installProject = useMutation({
    mutationFn: async ({ project, instanceId, createSpec, newProfileName }: { project: ModSummary; instanceId: string; createSpec?: CreateInstanceSpec; newProfileName: string }) => {
      let resolvedId = instanceId;
      let created: Instance | undefined;
      if (!resolvedId) {
        if (project.projectType === "modpack") {
          const provisioned = await provisionModpackWithNotification(project.platform, project.id, newProfileName);
          return { result: provisioned, created: provisioned.instance, instanceId: provisioned.instance.id };
        }
        if (!createSpec) throw new Error("Choose a version, loader and profile name.");
        created = await api.createInstance(createSpec);
        resolvedId = created.id;
      }
      const result = project.projectType === "modpack"
        ? await installModpackWithNotification(resolvedId, project.platform, project.id)
        : project.projectType === "shader"
          ? await installShaderWithNotification(resolvedId, project.platform, project.id)
          : await installModWithNotification(resolvedId, project.platform, project.id);
      return { result, created, instanceId: resolvedId };
    },
    onMutate: ({ project }) => setInstallStates((current) => ({ ...current, [`${project.platform}:${project.id}`]: { phase: "installing", progress: 0 } })),
    onSuccess: async ({ instanceId }, { project }) => { setInstallStates((current) => ({ ...current, [`${project.platform}:${project.id}`]: { phase: "installed", progress: 100 } })); setTargetInstanceId(instanceId); setActiveInstanceId(instanceId); await queryClient.invalidateQueries({ queryKey: ["instances"] }); },
    onError: (_error, { project }) => setInstallStates((current) => ({ ...current, [`${project.platform}:${project.id}`]: { phase: "idle", progress: 0 } })),
  });

  const clearFilters = useCallback(() => { setSource("all"); setCatalogKind("mod"); setSort("relevance"); setGameVersion("all"); setLoader("all"); setQuery(""); }, [setCatalogKind]);
  const openProject = useCallback((project: ModSummary) => {
    if (!/^https:\/\/(www\.)?(modrinth\.com|curseforge\.com)\//.test(project.pageUrl)) return;
    if (isTauri()) {
      void openUrl(project.pageUrl);
      return;
    }
    window.open(project.pageUrl, "_blank", "noopener,noreferrer");
  }, []);
  const openTargetSelector = useCallback((project: ModSummary) => {
    setTargetProject(project);
    // A modpack is a complete runtime definition. Default to provisioning a
    // fresh profile from its manifest instead of silently modifying the first
    // existing instance. Mods and shaders still default to the first profile
    // because they need a user-selected Minecraft runtime.
    const validActiveInstanceId = instancesQuery.data?.some((instance) => instance.id === activeInstanceId) ? activeInstanceId : null;
    setTargetInstanceId(project.projectType === "modpack" ? "" : (validActiveInstanceId ?? instancesQuery.data?.[0]?.id ?? ""));
    const version = gameVersion === "all" ? "1.21.1" : gameVersion;
    setNewInstanceVersion(version);
    setNewInstanceLoader(loader === "all" ? "fabric" : loader);
    setNewInstanceName(`${project.name} ${version}`.slice(0, 48));
    installProject.reset();
  }, [activeInstanceId, gameVersion, installProject, instancesQuery.data, loader]);
  const confirmInstall = useCallback(() => { if (!targetProject || installProject.isPending) return; installProject.mutate({ project: targetProject, instanceId: targetInstanceId, newProfileName: newInstanceName.trim(), createSpec: targetInstanceId || targetProject.projectType === "modpack" ? undefined : { name: newInstanceName.trim(), gameVersion: newInstanceVersion, loader: newInstanceLoader } }); }, [installProject, newInstanceLoader, newInstanceName, newInstanceVersion, targetInstanceId, targetProject]);
  const resetKeyMutation = useCallback(() => { saveKey.reset(); setKeyOpen((open) => !open); }, [saveKey]);
  const hasNextPage = Boolean(searchQuery.data && (page + 1) * PAGE_SIZE < searchQuery.data.total);
  const hasPreviousPage = page > 0;

  return <div className={voidClientStyles.page}>
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className={voidClientStyles.sectionKicker}>Content library</p><h1 className={`${voidClientStyles.pageTitle} mt-1`}>Mods and modpacks</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[#92929B]">Search the live Modrinth and CurseForge catalogs. Results are paged so the window stays compact.</p></div><button type="button" onClick={resetKeyMutation} aria-expanded={keyOpen} className={voidClientStyles.secondaryButton}><ShadowGlyph name="shield" size={15} />CurseForge key <span className={`size-2 rounded-full ${settingsQuery.data?.curseforgeConfigured ? "bg-[#4ADE80]" : "bg-[#F59E0B]"}`} /></button></header>
    {keyOpen && <form onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (curseforgeKey.trim()) saveKey.mutate(curseforgeKey.trim()); }} className={`${voidClientStyles.flatPanel} mb-4 grid gap-3 p-4 md:grid-cols-[1fr_1fr_auto] md:items-end`}><div><h2 className="text-sm font-semibold text-[#F5F5F5]">CurseForge API access</h2><p className="mt-1 text-xs leading-5 text-[#A3A3A3]">The key is encrypted by the native launcher and never returned to this interface.</p></div><label><span className="mb-1 block text-xs text-[#A3A3A3]">New Core API key</span><input type="password" value={curseforgeKey} onChange={(event) => setCurseforgeKey(event.target.value.slice(0, 512))} autoComplete="off" className={voidClientStyles.input} /></label><div className="flex gap-2"><button type="submit" disabled={!curseforgeKey.trim() || saveKey.isPending} className={voidClientStyles.primaryButton}>Save</button>{settingsQuery.data?.curseforgeConfigured && <button type="button" onClick={() => saveKey.mutate(null)} disabled={saveKey.isPending} className={voidClientStyles.secondaryButton}>Remove</button>}</div>{saveKey.isError && <p role="alert" className="text-xs text-[#FCA5A5] md:col-span-3">{String(saveKey.error)}</p>}</form>}
    <section className={`${voidClientStyles.flatPanel} mb-4 p-4`} aria-label="Archive filters"><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_repeat(5,minmax(120px,0.5fr))_auto]"><label><span className="mb-1.5 block text-xs font-medium text-[#A1A1AA]">Search</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Sodium, Iris, Create…" className={voidClientStyles.input} /></label><FilterSelect label="Type" value={kind} onChange={(value) => setCatalogKind(value as ProjectType)} options={PROJECT_TYPES.map((entry) => ({ value: entry.id, label: entry.label }))} /><FilterSelect label="Source" value={source} onChange={(value) => setSource(value as SourceFilter)} options={[{ value: "all", label: "All sources" }, { value: "modrinth", label: "Modrinth" }, { value: "curseforge", label: "CurseForge" }]} /><FilterSelect label="Version" value={gameVersion} onChange={(value) => setGameVersion(value as typeof gameVersion)} options={GAME_VERSIONS.map((value) => ({ value, label: value === "all" ? "All versions" : value }))} /><FilterSelect label="Loader" value={loader} onChange={(value) => setLoader(value as typeof loader)} options={LOADERS.map((value) => ({ value, label: value === "all" ? "All loaders" : value }))} /><FilterSelect label="Sort" value={sort} onChange={(value) => setSort(value as SearchSort)} options={SORTS.map((entry) => ({ value: entry.id, label: entry.label }))} /><button type="button" onClick={clearFilters} className={`${voidClientStyles.secondaryButton} self-end`}>Reset</button></div></section>
    {searchQuery.data?.warning && <p role="status" className="mb-4 rounded-lg border border-[#59411F] bg-[#2A2112] px-4 py-3 text-sm text-[#FCD34D]">{searchQuery.data.warning}</p>}
    {searchQuery.error && <p role="alert" className="mb-4 rounded-lg border border-[#5C2525] bg-[#2A1515] px-4 py-3 text-sm text-[#FCA5A5]">Live search failed: {String(searchQuery.error)}</p>}
    {!isTauri() && <p role="status" className="mb-4 rounded-lg border border-[#29292F] bg-[#151518] px-4 py-3 text-sm text-[#D4D4D8]">Live catalog search is available in the packaged native launcher.</p>}
    <div className="mb-3 flex items-center justify-between gap-3 text-xs text-[#92929B]"><span>{searchQuery.data ? `Page ${page + 1} · ${searchQuery.data.total.toLocaleString()} matching projects` : "No catalog response yet"}</span><span className={voidClientStyles.tag}>{searchQuery.isFetching ? "Loading…" : "Live API"}</span></div>
    <div className="grid max-h-[calc(100vh-390px)] min-h-[320px] grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-3">{searchQuery.data?.items.map((project) => <ProjectCard key={`${project.platform}:${project.id}`} project={project} installState={installStates[`${project.platform}:${project.id}`] ?? { phase: "idle", progress: 0 }} onInstall={() => openTargetSelector(project)} onOpen={() => openProject(project)} />)}</div>
    {searchQuery.data && searchQuery.data.items.length === 0 && <div className="mt-3 rounded-xl border border-[#29292F] bg-[#151518] px-4 py-10 text-center"><span className="mx-auto grid size-11 place-items-center rounded-lg bg-[#21152B] text-[#C084FC]"><ShadowGlyph name="mods" size={18} /></span><p className="mt-3 text-sm font-semibold text-[#F4F4F5]">No projects found</p><p className="mt-1 text-xs text-[#92929B]">Change the filters or clear the search.</p></div>}
    <nav className="mt-4 flex items-center justify-between gap-3 border-t border-[#29292F] pt-4" aria-label="Catalog pages"><button type="button" onClick={() => setPage((value) => Math.max(0, value - 1))} disabled={!hasPreviousPage || searchQuery.isFetching} className={voidClientStyles.secondaryButton}>Previous</button><span className="font-mono text-xs tabular-nums text-[#92929B]">Page {page + 1}</span><button type="button" onClick={() => setPage((value) => value + 1)} disabled={!hasNextPage || searchQuery.isFetching} className={voidClientStyles.primaryButton}>Next</button></nav>
    {targetProject && <TargetModal project={targetProject} instances={instancesQuery.data ?? []} selectedInstanceId={targetInstanceId} newInstanceName={newInstanceName} newInstanceVersion={newInstanceVersion} newInstanceLoader={newInstanceLoader} pending={installProject.isPending} success={installStates[`${targetProject.platform}:${targetProject.id}`]?.phase === "installed"} error={installProject.error ? String(installProject.error) : null} onSelect={setTargetInstanceId} onNewInstanceName={setNewInstanceName} onNewInstanceVersion={setNewInstanceVersion} onNewInstanceLoader={setNewInstanceLoader} onInstall={confirmInstall} onClose={() => { if (!installProject.isPending) setTargetProject(null); }} onOpen={() => openProject(targetProject)} />}
  </div>;
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: readonly { value: string; label: string }[] }) {
  return <label><span className="mb-1.5 block text-xs font-medium text-[#A1A1AA]">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className={`${voidClientStyles.input} cursor-pointer`}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}

function ProjectCard({ project, installState, onInstall, onOpen }: { project: ModSummary; installState: IInstallState; onInstall: () => void; onOpen: () => void }) {
  return <article className="group flex min-h-56 flex-col rounded-xl border border-[#29292F] bg-[#151518] p-4 transition-[border-color,background-color,transform] duration-200 hover:-translate-y-0.5 hover:border-[#46464F] hover:bg-[#18181C]"><div className="flex items-start gap-3"><img src={project.iconUrl ?? "/void-shadow-blade-app-icon.png"} alt="" width={48} height={48} loading="lazy" className="size-12 rounded-lg border border-[#34343A] bg-[#111114] object-cover" /><div className="min-w-0 flex-1"><h2 className="truncate text-sm font-semibold text-[#F4F4F5]">{project.name}</h2><p className="mt-1 text-[11px] text-[#85858E]">{project.platform === "modrinth" ? "Modrinth" : "CurseForge"} · {project.projectType}</p></div><span className="rounded-md border border-[#34343A] bg-[#1A1A1F] px-2 py-1 text-[10px] font-medium uppercase text-[#A1A1AA]">{project.projectType}</span></div><p className="mt-3 line-clamp-3 text-xs leading-5 text-[#92929B]">{project.summary || "No summary returned by the source."}</p><div className="mt-auto flex items-center gap-2 pt-4"><button type="button" onClick={onOpen} className={voidClientStyles.secondaryButton}>Details</button><button type="button" onClick={onInstall} disabled={installState.phase === "installing"} className={`${voidClientStyles.primaryButton} flex-1`}>{installState.phase === "installed" ? "Installed" : installState.phase === "installing" ? "Installing…" : `Install ${project.projectType}`}</button></div></article>;
}

function TargetModal({ project, instances, selectedInstanceId, newInstanceName, newInstanceVersion, newInstanceLoader, pending, success, error, onSelect, onNewInstanceName, onNewInstanceVersion, onNewInstanceLoader, onInstall, onClose, onOpen }: { project: ModSummary; instances: Instance[]; selectedInstanceId: string; newInstanceName: string; newInstanceVersion: string; newInstanceLoader: InstanceLoader; pending: boolean; success: boolean; error: string | null; onSelect: (value: string) => void; onNewInstanceName: (value: string) => void; onNewInstanceVersion: (value: string) => void; onNewInstanceLoader: (value: InstanceLoader) => void; onInstall: () => void; onClose: () => void; onOpen: () => void }) {
  const createsModpackProfile = project.projectType === "modpack" && !selectedInstanceId;
  return <div className="fixed inset-0 z-[440] grid place-items-center bg-[#111111] p-4" role="presentation" onMouseDown={onClose}><section role="dialog" aria-modal="true" aria-labelledby="target-modal-title" onMouseDown={(event) => event.stopPropagation()} className="w-full max-w-xl rounded-sm border border-[#333333] bg-[#1A1A1A] p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-[#A3A3A3]">Install target</p><h2 id="target-modal-title" className="mt-1 text-lg font-semibold text-[#F5F5F5]">{project.name}</h2></div><button type="button" onClick={onClose} disabled={pending} aria-label="Close install target" className={voidClientStyles.iconButton}><ShadowGlyph name="close" size={15} /></button></div><p className="mt-3 text-sm leading-5 text-[#A3A3A3]">{project.projectType === "modpack" ? "Create a profile from the pack's exact Minecraft and loader versions, or import it into an existing compatible profile." : `The ${project.projectType} is downloaded and verified in the selected profile.`}</p><label className="mt-4 block"><span className="mb-1 block text-xs text-[#A3A3A3]">Install destination</span><select value={selectedInstanceId} onChange={(event) => onSelect(event.target.value)} disabled={pending} className={`${voidClientStyles.input} cursor-pointer`}><option value="">Create a new profile</option>{instances.map((instance) => <option key={instance.id} value={instance.id}>{instance.name} · {instance.gameVersion} · {instance.loader}</option>)}</select></label>{!selectedInstanceId && <fieldset className="mt-4 grid gap-3 rounded-sm border border-[#333333] bg-[#111111] p-3 sm:grid-cols-3"><legend className="px-1 text-xs font-semibold text-[#D4D4D4]">New profile</legend><label className="sm:col-span-3"><span className="mb-1 block text-xs text-[#A3A3A3]">Name</span><input value={newInstanceName} onChange={(event) => onNewInstanceName(event.target.value.slice(0, 48))} className={voidClientStyles.input} minLength={3} maxLength={48} /></label>{createsModpackProfile ? <p className="sm:col-span-3 text-xs leading-5 text-[#A3A3A3]">Minecraft, mod loader and loader build are detected from the downloaded manifest. A failed import removes the incomplete profile.</p> : <><FilterSelect label="Minecraft version" value={newInstanceVersion} onChange={onNewInstanceVersion} options={["1.21.1", "1.21", "1.20.6", "1.20.1", "1.19.4", "1.18.2"].map((value) => ({ value, label: value }))} /><FilterSelect label="Loader" value={newInstanceLoader} onChange={(value) => onNewInstanceLoader(value as InstanceLoader)} options={["fabric", "forge", "neoforge", "quilt", "vanilla"].map((value) => ({ value, label: value }))} /></>}</fieldset>}{error && <p role="alert" className="mt-3 border border-[#333333] bg-[#2A1515] px-3 py-2 text-xs text-[#FCA5A5]">{error}</p>}{success && <p role="status" className="mt-3 border border-[#333333] bg-[#14251B] px-3 py-2 text-xs text-[#86EFAC]">Installed and verified. The instance list has been refreshed.</p>}<div className="mt-5 flex flex-wrap justify-end gap-2"><button type="button" onClick={onClose} disabled={pending} className={voidClientStyles.secondaryButton}>Close</button><button type="button" onClick={onOpen} className={voidClientStyles.secondaryButton}><ShadowGlyph name="external" size={15} />Source page</button><button type="button" onClick={onInstall} disabled={pending || (!selectedInstanceId && newInstanceName.trim().length < 3)} className={voidClientStyles.primaryButton}>{pending ? "Installing…" : success ? "Installed" : selectedInstanceId ? `Install ${project.projectType}` : `Create & install ${project.projectType}`}</button></div></section></div>;
}

export default ModHubView;
