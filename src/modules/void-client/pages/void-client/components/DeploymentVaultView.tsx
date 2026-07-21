import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { api } from "@/lib/api";
import { MINECRAFT_VERSION_GROUPS, INSTANCE_LOADERS, type IMinecraftVersionGroup } from "@/data/minecraftVersions";
import type { Instance, InstanceLoader } from "@/types";
import { ShadowGlyph } from "../../../components/ShadowGlyph";
import { AutoTuneModal } from "./AutoTuneModal";
import { useLauncherInstance } from "../../../hooks/useLauncherInstance";
import { useVoidClientStore } from "../../../stores/voidClient.store";
import { voidClientStyles } from "../void-client.styles";

const PERFORMANCE_MODS = [
  { id: "YL57xq9U", name: "Iris Shaders" },
  { id: "AANobbMI", name: "Sodium" },
  { id: "Bh37bMuy", name: "Reese's Sodium Options" },
  { id: "gvQqBUqZ", name: "Lithium" },
  { id: "w7ThoJFB", name: "Zoomify" },
] as const;

export function DeploymentVaultView() {
  const [selectedMajor, setSelectedMajor] = useState(MINECRAFT_VERSION_GROUPS[0].major);
  const [selectedVersion, setSelectedVersion] = useState(MINECRAFT_VERSION_GROUPS[0].versions[0]);
  const [selectedLoader, setSelectedLoader] = useState<InstanceLoader>("fabric");
  const [instanceName, setInstanceName] = useState("Void Tricky Trials");
  const [versionQuery, setVersionQuery] = useState("");
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [enabledPerformanceMods, setEnabledPerformanceMods] = useState<string[]>(PERFORMANCE_MODS.map((item) => item.id));
  const [autoTuneOpen, setAutoTuneOpen] = useState(false);
  const reducedMotion = useReducedMotion();
  const queryClient = useQueryClient();
  const setActiveView = useVoidClientStore((state) => state.setActiveView);
  const { profile, instance, instances, isLoadingInstances, launchMutation } = useLauncherInstance(selectedInstanceId);

  const selectedGroup = MINECRAFT_VERSION_GROUPS.find((group) => group.major === selectedMajor) ?? MINECRAFT_VERSION_GROUPS[0];
  const visibleGroups = useMemo(() => {
    const normalized = versionQuery.trim().toLocaleLowerCase();
    if (!normalized) return MINECRAFT_VERSION_GROUPS;
    return MINECRAFT_VERSION_GROUPS.filter((group) => [group.major, group.title, group.era].join(" ").toLocaleLowerCase().includes(normalized));
  }, [versionQuery]);

  useEffect(() => {
    if (!selectedInstanceId && instances[0]) setSelectedInstanceId(instances[0].id);
  }, [instances, selectedInstanceId]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const created = await api.createInstance({ name: instanceName.trim(), gameVersion: selectedVersion, loader: selectedLoader });
      const warnings: string[] = [];
      let installedCount = 0;
      if (selectedLoader === "vanilla" && enabledPerformanceMods.length > 0) {
        warnings.push("Performance mods were skipped because Vanilla does not load mod jars.");
      } else {
        for (const projectId of enabledPerformanceMods) {
          try {
            await api.installMod(created.id, "modrinth", projectId);
            installedCount += 1;
          } catch (error) {
            const item = PERFORMANCE_MODS.find((candidate) => candidate.id === projectId);
            warnings.push(`${item?.name ?? projectId}: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
      }
      return { created, installedCount, warnings };
    },
    onSuccess: ({ created }) => {
      queryClient.setQueryData<Instance[]>(["instances"], (current = []) => [created, ...current.filter((candidate) => candidate.id !== created.id)]);
      setSelectedInstanceId(created.id);
      void queryClient.invalidateQueries({ queryKey: ["instances"] });
    },
  });

  const selectMajor = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    const major = event.currentTarget.dataset.major;
    const group = MINECRAFT_VERSION_GROUPS.find((candidate) => candidate.major === major);
    if (!group) return;
    setSelectedMajor(group.major);
    setSelectedVersion(group.versions[0]);
    setInstanceName(`Void ${group.major} ${group.title}`.slice(0, 48));
    createMutation.reset();
  }, [createMutation]);

  const selectLoader = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    setSelectedLoader(event.currentTarget.value as InstanceLoader);
    createMutation.reset();
  }, [createMutation]);

  const selectExistingInstance = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    setSelectedInstanceId(event.currentTarget.value);
  }, []);

  const togglePerformanceMod = useCallback((projectId: string) => {
    setEnabledPerformanceMods((current) => current.includes(projectId) ? current.filter((id) => id !== projectId) : [...current, projectId]);
    createMutation.reset();
  }, [createMutation]);

  const submitCreate = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (instanceName.trim().length >= 3 && !createMutation.isPending) createMutation.mutate();
  }, [createMutation, instanceName]);

  const startLaunch = useCallback(() => launchMutation.mutate(), [launchMutation]);
  const openSettings = useCallback(() => setActiveView("settings"), [setActiveView]);
  const launchDisabled = launchMutation.isPending || isLoadingInstances || !instance || !profile;

  return (
    <div className={voidClientStyles.page}>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className={voidClientStyles.sectionKicker}>Minecraft versions · 1.21 to 1.1</p>
          <h1 className={voidClientStyles.pageTitle}>Instance Library</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#a79bad]">Choose a major Minecraft update, its exact patch, and a mod loader. Compatibility is checked during installation.</p>
        </div>
        <div className="flex items-center gap-2 border border-[#4cff9a]/18 bg-[#00e676]/[0.045] px-4 py-2 text-[9px] font-black tracking-[0.14em] text-[#4cff9a] uppercase [clip-path:polygon(5%_0,100%_0,95%_100%,0_100%)]"><span className="size-1.5 rounded-full bg-[#4cff9a] shadow-[0_0_10px_currentColor]" /> Ready</div>
      </header>

      {instances.length > 0 && (
        <section className={`${voidClientStyles.glassCard} mb-5 p-4`} aria-labelledby="existing-instances-title">
          <div className="flex items-center justify-between gap-3"><div><p className={voidClientStyles.sectionKicker}>Installed instances</p><h2 id="existing-instances-title" className="mt-1 text-sm font-black text-white">Select an instance to launch</h2></div><span className="text-[10px] tabular-nums text-[#a79bad]">{instances.length} local</span></div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {instances.map((candidate) => (
              <button key={candidate.id} type="button" value={candidate.id} onClick={selectExistingInstance} aria-pressed={instance?.id === candidate.id} className={`min-h-14 min-w-52 cursor-pointer border px-3.5 py-2 text-left transition ${voidClientStyles.focusRing} ${instance?.id === candidate.id ? "border-[#c084fc]/55 bg-[#7B2CBF]/16 shadow-[0_0_24px_rgba(123,44,191,0.16)]" : "border-white/[0.08] bg-black/25 hover:border-[#9d5ce0]/35"} [clip-path:polygon(0_0,95%_0,100%_24%,100%_100%,5%_100%,0_76%)]`}>
                <strong className="block truncate text-xs text-white">{candidate.name}</strong>
                <small className="mt-1 block text-[9px] font-bold tracking-[0.08em] text-[#a79bad] uppercase">{candidate.gameVersion} · {loaderLabel(candidate.loader)}</small>
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="grid min-h-[720px] gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(380px,0.65fr)]">
        <section className={`${voidClientStyles.glassCard} flex min-h-0 flex-col p-4 sm:p-5`} aria-labelledby="major-updates-title">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div><p className={voidClientStyles.sectionKicker}>Minecraft releases</p><h2 id="major-updates-title" className="font-display mt-1 text-lg font-black">Major Updates</h2></div>
            <label className="w-full sm:w-64"><span className="sr-only">Search Minecraft updates</span><span className="relative block"><ShadowGlyph name="vault" size={15} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[#8d65ae]" /><input type="search" value={versionQuery} onChange={(event) => setVersionQuery(event.target.value.slice(0, 50))} placeholder="Search era or version…" className={`${voidClientStyles.input} pl-10`} /></span></label>
          </div>

          <div className="mt-5 flex-1 overflow-y-auto pr-1">
            <motion.div layout className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
              <AnimatePresence initial={false} mode="popLayout">
                {visibleGroups.map((group, index) => <MajorUpdateCard key={group.major} group={group} selected={group.major === selectedGroup.major} index={index} onSelect={selectMajor} />)}
              </AnimatePresence>
            </motion.div>
            {visibleGroups.length === 0 && <div className="grid min-h-64 place-items-center text-center"><div><ShadowGlyph name="vault" size={34} className="mx-auto text-[#765884]" /><p className="mt-3 text-sm font-bold text-white">No Minecraft era found</p><p className="mt-1 text-xs text-[#a79bad]">Clear the search to restore every major update.</p></div></div>}
          </div>
        </section>

        <aside className={`${voidClientStyles.glassCard} flex min-h-0 flex-col`} aria-label="Version and loader configuration">
          <div className="relative h-56 shrink-0 overflow-hidden">
            <span aria-hidden="true" className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${selectedGroup.palette[2]} 0%, ${selectedGroup.palette[1]} 52%, ${selectedGroup.palette[0]} 150%)` }} />
            <img src={selectedGroup.imageUrl} alt={`${selectedGroup.major} ${selectedGroup.title} pixel update artwork`} width={640} height={360} decoding="async" onError={(event) => { event.currentTarget.style.display = "none"; }} className="relative h-full w-full object-cover" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_20%,rgba(5,5,5,0.98))]" />
            <div className="absolute inset-x-6 bottom-5"><span className="border border-[#c084fc]/30 bg-[#7B2CBF]/18 px-2.5 py-1 text-[8px] font-black tracking-[0.14em] text-[#e2c9ff] uppercase backdrop-blur-xl">Major {selectedGroup.major}</span><h2 className="font-display mt-3 text-2xl font-black">{selectedGroup.title}</h2><p className="mt-1 text-[10px] text-[#c3b8cc]">{selectedGroup.era}</p></div>
          </div>

          <form onSubmit={submitCreate} className="flex flex-1 flex-col p-5 sm:p-6">
            <label htmlFor="exact-minecraft-version" className="text-[9px] font-black tracking-[0.14em] text-[#c796ff] uppercase">Exact sub-version</label>
            <select id="exact-minecraft-version" value={selectedVersion} onChange={(event) => { setSelectedVersion(event.target.value); createMutation.reset(); }} className={`${voidClientStyles.input} mt-2 cursor-pointer appearance-none`}>
              {selectedGroup.versions.map((version) => <option key={version} value={version}>Minecraft {version}</option>)}
            </select>
            <p className="mt-2 text-[10px] leading-4 text-[#a79bad]">Every known patch in the selected major era is listed newest first.</p>

            <fieldset className="mt-5">
              <legend className="text-[9px] font-black tracking-[0.14em] text-[#c796ff] uppercase">Mod loader</legend>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {INSTANCE_LOADERS.map((loader) => (
                  <button key={loader} type="button" value={loader} onClick={selectLoader} aria-pressed={selectedLoader === loader} className={`min-h-11 cursor-pointer border px-3 text-[10px] font-black tracking-[0.08em] uppercase transition ${voidClientStyles.focusRing} ${selectedLoader === loader ? "border-[#c084fc]/55 bg-[#7B2CBF]/22 text-white shadow-[0_0_20px_rgba(123,44,191,0.2)]" : "border-white/[0.08] bg-black/25 text-[#a79bad] hover:border-[#9d5ce0]/35 hover:text-white"} [clip-path:polygon(8%_0,100%_0,92%_100%,0_100%)]`}>{loaderLabel(loader)}</button>
                ))}
              </div>
              <p className="mt-2 text-[10px] leading-4 text-[#a79bad]">No UI restriction is applied. If a loader never published support for the chosen patch, the native resolver returns a precise compatibility error.</p>
            </fieldset>

            <fieldset className="mt-5">
              <legend className="text-[9px] font-black tracking-[0.14em] text-[#c796ff] uppercase">Performance essentials</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {PERFORMANCE_MODS.map((item) => {
                  const enabled = enabledPerformanceMods.includes(item.id);
                  return <button key={item.id} type="button" onClick={() => togglePerformanceMod(item.id)} aria-pressed={enabled} className={`flex min-h-11 cursor-pointer items-center gap-2 border px-3 text-left text-[10px] font-bold transition ${enabled ? "border-[#a855f7]/38 bg-[#7B2CBF]/14 text-white" : "border-white/[0.075] bg-black/20 text-[#8f8199] hover:border-white/[0.14] hover:text-white"} ${voidClientStyles.focusRing}`}><span className={`grid size-5 shrink-0 place-items-center border ${enabled ? "border-[#d8b4fe]/50 bg-[#7B2CBF]/35 text-[#e7d5ff]" : "border-[#5f5368]"}`}>{enabled && <ShadowGlyph name="check" size={12} />}</span><span className="truncate">{item.name}</span></button>;
                })}
              </div>
              <p className="mt-2 text-[10px] leading-4 text-[#91849a]">Enabled items are downloaded from Modrinth into the new instance. Incompatible versions are skipped with a visible warning.</p>
            </fieldset>

            <label htmlFor="instance-name" className="mt-5 text-[9px] font-black tracking-[0.14em] text-[#c796ff] uppercase">Instance name</label>
            <input id="instance-name" value={instanceName} onChange={(event) => { setInstanceName(event.target.value.slice(0, 48)); createMutation.reset(); }} minLength={3} maxLength={48} required className={`${voidClientStyles.input} mt-2`} />

            <button type="submit" disabled={instanceName.trim().length < 3 || createMutation.isPending} className={`${voidClientStyles.secondaryButton} mt-4 min-h-12 w-full`}><ShadowGlyph name={createMutation.isPending ? "spark" : "vault"} size={16} />{createMutation.isPending ? "CREATING INSTANCE…" : `CREATE ${selectedVersion} ${loaderLabel(selectedLoader).toUpperCase()} INSTANCE`}</button>
            {createMutation.isError && <p role="alert" className="mt-2 rounded-xl border border-red-400/18 bg-red-400/[0.055] px-3 py-2 text-[10px] leading-4 text-red-300">{String(createMutation.error)}</p>}
            {createMutation.isSuccess && <div role="status" className="mt-2 rounded-xl border border-[#4cff9a]/18 bg-[#00e676]/[0.045] px-3 py-2 text-[10px] leading-4 text-[#4cff9a]"><p>Native instance created with {createMutation.data.installedCount} performance mods.</p>{createMutation.data.warnings.length > 0 && <ul className="mt-2 space-y-1 text-amber-200">{createMutation.data.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>}</div>}

            <div className="mt-auto pt-6">
              <button type="button" onClick={() => setAutoTuneOpen(true)} disabled={!instance} className={`${voidClientStyles.secondaryButton} mb-2 min-h-11 w-full`}><ShadowGlyph name="telemetry" size={16} />Auto-Tune Selected Modpack</button>
              <div className="mb-3 flex items-center justify-between gap-3 border border-white/[0.07] bg-black/25 px-3.5 py-3"><span className="min-w-0"><small className="block text-[8px] font-black tracking-[0.12em] text-[#a79bad] uppercase">Launch target</small><strong className="mt-1 block truncate text-xs text-white">{instance ? `${instance.name} · ${instance.gameVersion} · ${loaderLabel(instance.loader)}` : "No native instance selected"}</strong></span><button type="button" onClick={openSettings} aria-label="Open launch settings" className={`grid size-11 shrink-0 cursor-pointer place-items-center border border-white/[0.09] bg-black/30 text-[#b99cc9] transition hover:border-[#9d5ce0]/50 hover:text-white ${voidClientStyles.focusRing}`}><ShadowGlyph name="settings" size={18} /></button></div>
              <motion.button type="button" onClick={startLaunch} disabled={launchDisabled} whileHover={!reducedMotion && !launchDisabled ? { y: -2, scale: 1.015 } : undefined} whileTap={!reducedMotion && !launchDisabled ? { scale: 0.985 } : undefined} className={`${voidClientStyles.primaryButton} min-h-16 w-full text-sm`}><ShadowGlyph name={launchMutation.isPending ? "spark" : "play"} size={21} className={launchMutation.isPending ? "animate-pulse" : ""} />{launchMutation.isPending ? "STARTING MINECRAFT…" : "LAUNCH VOID"}</motion.button>
              {!profile && <p role="status" className="mt-2 text-center text-[10px] text-amber-200">Microsoft verification is required before launch.</p>}
              {launchMutation.isError && <p role="alert" className="mt-2 text-center text-[10px] text-red-300">{String(launchMutation.error)}</p>}
              {launchMutation.isSuccess && <p role="status" className="mt-2 text-center text-[10px] text-[#4cff9a]">Minecraft is starting. Live logs are open.</p>}
            </div>
          </form>
        </aside>
      </div>
      <AnimatePresence>{autoTuneOpen && instance && <AutoTuneModal instance={instance} onClose={() => setAutoTuneOpen(false)} />}</AnimatePresence>
    </div>
  );
}

function MajorUpdateCard({ group, selected, index, onSelect }: { group: IMinecraftVersionGroup; selected: boolean; index: number; onSelect: (event: React.MouseEvent<HTMLButtonElement>) => void }) {
  const reducedMotion = useReducedMotion();
  return (
    <motion.button layout type="button" data-major={group.major} aria-pressed={selected} onClick={onSelect} initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: reducedMotion ? 0.01 : 0.24, delay: reducedMotion ? 0 : Math.min(index, 9) * 0.025 }} className={`group relative min-h-44 cursor-pointer overflow-hidden border text-left transition-colors ${voidClientStyles.focusRing} ${selected ? "border-[#c084fc]/62 shadow-[0_0_30px_rgba(123,44,191,0.26)]" : "border-white/[0.08] hover:border-[#9d5ce0]/42"} [clip-path:polygon(0_0,91%_0,100%_14%,100%_100%,8%_100%,0_86%)]`}>
      <span
        aria-hidden="true"
        className="absolute inset-0"
        style={{ background: `linear-gradient(135deg, ${group.palette[2]} 0%, ${group.palette[1]} 52%, ${group.palette[0]} 150%)` }}
      />
      <img
        src={group.imageUrl}
        alt=""
        width={640}
        height={360}
        decoding="async"
        onError={(event) => { event.currentTarget.style.display = "none"; }}
        className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-[1.025]"
      />
      <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,5,5,0.04),rgba(5,5,5,0.97)_82%)]" />
      <span className="absolute inset-x-4 bottom-4"><span className="flex items-center justify-between"><span className="text-[8px] font-black tracking-[0.14em] text-[#d8b4fe] uppercase">{group.versions.length} releases</span>{selected && <ShadowGlyph name="check" size={15} className="text-[#d8b4fe]" />}</span><strong className="font-display mt-2 block text-base font-black text-white">{group.major} {group.title}</strong><small className="mt-1 block truncate text-[9px] text-[#b3a7bb]">{group.era}</small></span>
    </motion.button>
  );
}

function loaderLabel(loader: InstanceLoader) {
  if (loader === "neoforge") return "NeoForge";
  return loader.charAt(0).toUpperCase() + loader.slice(1);
}

export default DeploymentVaultView;
