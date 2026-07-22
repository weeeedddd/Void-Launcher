import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isTauri } from "@tauri-apps/api/core";
import { api } from "@/lib/api";
import { buildMinecraftVersionGroups, INSTANCE_LOADERS, MINECRAFT_VERSION_GROUPS } from "@/data/minecraftVersions";
import type { Instance, InstanceLoader } from "@/types";
import { ShadowGlyph } from "../../../components/ShadowGlyph";
import { useLauncherInstance } from "../../../hooks/useLauncherInstance";
import { publishLauncherNotification } from "../../../notifications/notificationStore";
import { useVoidClientStore } from "../../../stores/voidClient.store";
import { voidClientStyles } from "../void-client.styles";

const PERFORMANCE_MODS = [{ id: "YL57xq9U", name: "Iris Shaders" }, { id: "AANobbMI", name: "Sodium" }, { id: "Bh37bMuy", name: "Reese's Sodium Options" }, { id: "gvQqBUqZ", name: "Lithium" }, { id: "w7ThoJFB", name: "Zoomify" }] as const;

export function DeploymentVaultView() {
  const [selectedMajor, setSelectedMajor] = useState(MINECRAFT_VERSION_GROUPS[0].major);
  const [selectedVersion, setSelectedVersion] = useState(MINECRAFT_VERSION_GROUPS[0].versions[0]);
  const [selectedLoader, setSelectedLoader] = useState<InstanceLoader>("fabric");
  const [instanceName, setInstanceName] = useState("Void Chaos Cubed");
  const [versionQuery, setVersionQuery] = useState("");
  const [enabledMods, setEnabledMods] = useState<string[]>(PERFORMANCE_MODS.map((item) => item.id));
  const queryClient = useQueryClient();
  const nativeRuntime = isTauri();
  const versionCatalogQuery = useQuery({
    queryKey: ["minecraft-version-catalog"],
    queryFn: api.getMinecraftVersionCatalog,
    enabled: nativeRuntime,
    retry: 1,
    staleTime: 30 * 60 * 1_000,
  });
  const versionGroups = useMemo(() => {
    if (!versionCatalogQuery.data) return MINECRAFT_VERSION_GROUPS;
    const remoteGroups = buildMinecraftVersionGroups(versionCatalogQuery.data);
    return remoteGroups.length > 0 ? remoteGroups : MINECRAFT_VERSION_GROUPS;
  }, [versionCatalogQuery.data]);
  const setActiveView = useVoidClientStore((state) => state.setActiveView);
  const { profile, instance, instances, isLoadingInstances, launchMutation, setActiveInstanceId } = useLauncherInstance();
  const selectedGroup = versionGroups.find((group) => group.major === selectedMajor) ?? versionGroups[0];
  const visibleGroups = useMemo(() => { const needle = versionQuery.trim().toLowerCase(); return needle ? versionGroups.filter((group) => `${group.major} ${group.title} ${group.era} ${group.versions.join(" ")}`.toLowerCase().includes(needle)) : versionGroups; }, [versionGroups, versionQuery]);

  useEffect(() => {
    if (versionGroups.some((group) => group.major === selectedMajor)) return;
    const newest = versionGroups[0];
    setSelectedMajor(newest.major);
    setSelectedVersion(newest.versions[0]);
    setInstanceName(`Void ${newest.title}`.slice(0, 48));
  }, [selectedMajor, versionGroups]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const created = await api.createInstance({ name: instanceName.trim(), gameVersion: selectedVersion, loader: selectedLoader });
      const warnings: string[] = [];
      let installedCount = 0;
      if (selectedLoader !== "vanilla") {
        for (const project of PERFORMANCE_MODS.filter((item) => enabledMods.includes(item.id))) {
          try { await api.installMod(created.id, "modrinth", project.id); installedCount += 1; } catch (error) { warnings.push(`${project.name}: ${error instanceof Error ? error.message : String(error)}`); }
        }
      } else if (enabledMods.length > 0) warnings.push("Vanilla cannot load mod jars; performance mods were skipped.");
      return { created, warnings, installedCount };
    },
    onSuccess: ({ created, installedCount, warnings }) => {
      queryClient.setQueryData<Instance[]>(["instances"], (current = []) => [created, ...current.filter((entry) => entry.id !== created.id)]);
      setActiveInstanceId(created.id);
      void queryClient.invalidateQueries({ queryKey: ["instances"] });
      publishLauncherNotification({
        title: "Instance created",
        message: warnings.length > 0
          ? `${created.name} is ready with ${installedCount} performance mods and ${warnings.length} reported warning${warnings.length === 1 ? "" : "s"}.`
          : `${created.name} is ready with ${installedCount} performance mods.`,
        tone: warnings.length > 0 ? "warning" : "success",
        preference: "content-installed",
        dedupeKey: `instance:created:${created.id}`,
      });
    },
  });

  const selectMajor = useCallback((major: string) => { const group = versionGroups.find((candidate) => candidate.major === major); if (!group) return; setSelectedMajor(group.major); setSelectedVersion(group.versions[0]); setInstanceName(`Void ${group.title}`.slice(0, 48)); createMutation.reset(); }, [createMutation, versionGroups]);
  const submitCreate = useCallback((event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (instanceName.trim().length >= 3 && !createMutation.isPending) createMutation.mutate(); }, [createMutation, instanceName]);
  const launchDisabled = launchMutation.isPending || isLoadingInstances || !instance || !profile;

  return <div className={voidClientStyles.page}>
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className={voidClientStyles.sectionKicker}>Game profiles</p><h1 className={`${voidClientStyles.pageTitle} mt-1`}>Instances</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[#92929B]">Choose an official Minecraft Java release, exact patch and loader. The packaged launcher refreshes this list directly from Mojang.</p></div><div className="flex items-center gap-2"><span className={voidClientStyles.tag}>{versionCatalogQuery.data ? `Mojang · ${versionCatalogQuery.data.releases.length} releases` : nativeRuntime ? "Loading Mojang catalog" : "Bundled release catalog"}</span>{nativeRuntime && <button type="button" onClick={() => void versionCatalogQuery.refetch()} disabled={versionCatalogQuery.isFetching} className={voidClientStyles.iconButton} aria-label="Refresh Minecraft releases" title="Refresh Minecraft releases"><ShadowGlyph name="sync" size={15} /></button>}</div></header>
    {instances.length > 0 && <section className={`${voidClientStyles.flatPanel} mb-4 p-4`} aria-labelledby="existing-instances-title"><div className="flex items-center justify-between gap-3"><h2 id="existing-instances-title" className="text-sm font-semibold text-[#F4F4F5]">Your instances</h2><span className={voidClientStyles.tag}>{instances.length} local</span></div><div className="mt-3 grid max-h-32 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2 xl:grid-cols-3">{instances.map((candidate) => <button key={candidate.id} type="button" onClick={() => setActiveInstanceId(candidate.id)} aria-pressed={instance?.id === candidate.id} className={`min-h-16 cursor-pointer rounded-lg border p-3 text-left transition-[border-color,background-color] duration-150 ${voidClientStyles.focusRing} ${instance?.id === candidate.id ? "border-[#7E22CE] bg-[#21152B] text-white" : "border-[#29292F] bg-[#111114] text-[#D4D4D8] hover:border-[#46464F] hover:bg-[#1B1B20]"}`}><strong className="block truncate text-sm">{candidate.name}</strong><span className="mt-1 block truncate font-mono text-[11px] opacity-75">{candidate.gameVersion} · {loaderLabel(candidate.loader)}</span></button>)}</div></section>}
    <div className="grid min-h-0 gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
      <section className={`${voidClientStyles.flatPanel} flex min-h-0 flex-col p-4`} aria-labelledby="major-updates-title"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className={voidClientStyles.sectionKicker}>Minecraft Java</p><h2 id="major-updates-title" className="mt-1 text-base font-semibold text-[#F4F4F5]">Release library</h2></div><label className="w-full sm:w-56"><span className="sr-only">Search Minecraft releases</span><input value={versionQuery} onChange={(event) => setVersionQuery(event.target.value.slice(0, 50))} placeholder="Version or update name" className={voidClientStyles.input} /></label></div>{versionCatalogQuery.isError && <p role="status" className="mt-3 rounded-lg border border-[#59411F] bg-[#2A2112] px-3 py-2 text-xs text-[#FCD34D]">Mojang could not be reached. The complete bundled release list is still available.</p>}<div className="mt-4 grid max-h-[calc(100vh-270px)] grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2">{visibleGroups.map((group) => <button key={group.major} type="button" onClick={() => selectMajor(group.major)} aria-pressed={group.major === selectedGroup.major} className={`group relative min-h-40 cursor-pointer overflow-hidden rounded-xl border text-left transition-[border-color,transform] duration-200 ${voidClientStyles.focusRing} ${group.major === selectedGroup.major ? "border-[#8B5CF6] text-white" : "border-[#29292F] text-[#D4D4D8] hover:-translate-y-0.5 hover:border-[#52525B]"}`}><img src={group.imageUrl} alt="" loading="lazy" className={`absolute inset-0 size-full object-cover transition-[opacity,transform] duration-500 group-hover:scale-[1.025] ${group.major === selectedGroup.major ? "opacity-80" : "opacity-60"}`} /><span className="absolute inset-0 bg-gradient-to-t from-[#0B0B0E] via-[#0B0B0E]/35 to-black/10" aria-hidden="true" /><span className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3"><span className="rounded-md border border-white/15 bg-black/60 px-2 py-1 font-mono text-[10px] font-semibold text-white">JAVA {group.major}</span>{group.isLatest ? <span className="rounded-md border border-[#A855F7] bg-[#7E22CE] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white">Latest</span> : group.releaseDate ? <time className="rounded-md bg-black/55 px-2 py-1 font-mono text-[10px] text-[#D4D4D8]">{formatReleaseDate(group.releaseDate)}</time> : null}</span><span className="absolute inset-x-0 bottom-0 block p-4"><strong className="block text-base font-semibold text-white">{group.title}</strong><span className="mt-1 line-clamp-1 block text-xs text-[#D4D4D8]">{group.era}</span><span className="mt-2 block font-mono text-[10px] text-[#A1A1AA]">{group.versions.length} stable {group.versions.length === 1 ? "release" : "releases"} · newest {group.versions[0]}</span></span></button>)}</div>{visibleGroups.length === 0 && <p className="p-6 text-center text-sm text-[#92929B]">No stable Minecraft release matches that search.</p>}</section>
      <aside className={`${voidClientStyles.flatPanel} p-5`} aria-label="Version and loader configuration"><div className="border-b border-[#333333] pb-4"><p className={voidClientStyles.sectionKicker}>Selected update</p><h2 className="mt-1 text-lg font-semibold text-[#F5F5F5]">{selectedGroup.major} {selectedGroup.title}</h2><p className="mt-1 text-xs text-[#A3A3A3]">{selectedGroup.era}</p></div><form onSubmit={submitCreate} className="mt-4"><label htmlFor="deployment-version" className="block text-xs font-semibold text-[#D4D4D4]">Exact version</label><select id="deployment-version" value={selectedVersion} onChange={(event) => setSelectedVersion(event.target.value)} className={`${voidClientStyles.input} mt-1 cursor-pointer`}>{selectedGroup.versions.map((version) => <option key={version} value={version}>{version}</option>)}</select><fieldset className="mt-4"><legend className="text-xs font-semibold text-[#D4D4D4]">Loader</legend><div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">{INSTANCE_LOADERS.map((loader) => <button key={loader} type="button" value={loader} onClick={() => setSelectedLoader(loader)} aria-pressed={selectedLoader === loader} className={`min-h-11 cursor-pointer rounded-sm border px-2 text-xs font-semibold transition-colors duration-150 ${voidClientStyles.focusRing} ${selectedLoader === loader ? "border-[#333333] bg-[#7B2CBF] text-white" : "border-[#333333] bg-[#111111] text-[#A3A3A3] hover:bg-[#242424]"}`}>{loaderLabel(loader)}</button>)}</div><p className="mt-2 text-xs leading-5 text-[#A3A3A3]">All loaders remain selectable. Native launch validation reports incompatible versions.</p></fieldset><fieldset className="mt-4"><legend className="text-xs font-semibold text-[#D4D4D4]">Performance essentials</legend><div className="mt-2 space-y-2">{PERFORMANCE_MODS.map((item) => { const enabled = enabledMods.includes(item.id); return <button key={item.id} type="button" onClick={() => setEnabledMods((current) => enabled ? current.filter((id) => id !== item.id) : [...current, item.id])} aria-pressed={enabled} className={`flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-sm border px-3 text-left text-xs font-medium transition-colors duration-150 ${enabled ? "border-[#333333] bg-[#7B2CBF] text-white" : "border-[#333333] bg-[#111111] text-[#A3A3A3] hover:bg-[#242424]"}`}><span className="grid size-5 place-items-center rounded-sm border border-[#333333]">{enabled && <ShadowGlyph name="check" size={12} />}</span>{item.name}</button>; })}</div></fieldset><label htmlFor="deployment-name" className="mt-4 block text-xs font-semibold text-[#D4D4D4]">Instance name</label><input id="deployment-name" value={instanceName} onChange={(event) => setInstanceName(event.target.value.slice(0, 48))} minLength={3} maxLength={48} required className={`${voidClientStyles.input} mt-1`} /><button type="submit" disabled={instanceName.trim().length < 3 || createMutation.isPending} className={`${voidClientStyles.secondaryButton} mt-3 w-full`}><ShadowGlyph name="vault" size={15} />{createMutation.isPending ? "Creating…" : "Create instance"}</button>{createMutation.error && <p role="alert" className="mt-2 border border-[#333333] bg-[#2A1515] px-3 py-2 text-xs text-[#FCA5A5]">{String(createMutation.error)}</p>}{createMutation.data && <div role="status" className="mt-2 border border-[#333333] bg-[#14251B] px-3 py-2 text-xs leading-5 text-[#86EFAC]">Created with {createMutation.data.installedCount} performance mods.{createMutation.data.warnings.length > 0 && <ul className="mt-1 list-disc pl-4 text-[#FCD34D]">{createMutation.data.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>}</div>}</form><div className="mt-5 border-t border-[#333333] pt-4"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="text-xs text-[#737373]">Launch target</p><p className="mt-1 truncate text-sm font-medium text-[#D4D4D4]">{instance ? `${instance.name} · ${instance.gameVersion} · ${loaderLabel(instance.loader)}` : "No instance selected"}</p></div><button type="button" onClick={() => setActiveView("settings")} aria-label="Open launch settings" className={voidClientStyles.iconButton}><ShadowGlyph name="settings" size={16} /></button></div><button type="button" onClick={() => launchMutation.mutate()} disabled={launchDisabled} className={`${voidClientStyles.primaryButton} mt-3 w-full`}><ShadowGlyph name={launchMutation.isPending ? "spark" : "play"} size={17} />{launchMutation.isPending ? "Starting Minecraft…" : "Launch Void"}</button>{!profile && <p className="mt-2 text-center text-xs text-[#FCD34D]">Microsoft verification is required before launch.</p>}{launchMutation.error && <p role="alert" className="mt-2 text-center text-xs text-[#FCA5A5]">{String(launchMutation.error)}</p>}{launchMutation.isSuccess && <p role="status" className="mt-2 text-center text-xs text-[#86EFAC]">Minecraft launch accepted. Mission Control has the native log.</p>}</div></aside>
    </div>
  </div>;
}

function formatReleaseDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", { month: "short", year: "numeric" }).format(date);
}

function loaderLabel(loader: InstanceLoader) { return loader === "neoforge" ? "NeoForge" : loader.charAt(0).toUpperCase() + loader.slice(1); }

export default DeploymentVaultView;
