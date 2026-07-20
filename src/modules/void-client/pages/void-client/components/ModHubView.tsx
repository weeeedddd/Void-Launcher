import { useCallback, useMemo, useState, type ChangeEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { MOD_CATALOG } from "../../../constants";
import { ShadowGlyph } from "../../../components/ShadowGlyph";
import { useInstallQueue } from "../../../hooks/useInstallQueue";
import type {
  CatalogKind,
  CatalogSource,
  IInstallState,
  IModCatalogItem,
} from "../../../types";
import { voidClientStyles } from "../void-client.styles";

type SourceFilter = "all" | CatalogSource;
type KindFilter = "all" | CatalogKind;

const SOURCE_OPTIONS: readonly { id: SourceFilter; label: string; detail: string }[] = [
  { id: "all", label: "All Sources", detail: "Unified archive" },
  { id: "modrinth", label: "Modrinth", detail: "Open ecosystem" },
  { id: "curseforge", label: "CurseForge", detail: "Curated vault" },
] as const;

const KIND_OPTIONS: readonly { id: KindFilter; label: string }[] = [
  { id: "all", label: "All Content" },
  { id: "modpack", label: "Modpacks" },
  { id: "shader", label: "Shaders" },
] as const;

const ACCENT_STYLES: Record<
  IModCatalogItem["accent"],
  {
    canvas: string;
    glow: string;
    line: string;
    badge: string;
    icon: string;
  }
> = {
  violet: {
    canvas: "bg-[radial-gradient(circle_at_72%_20%,rgba(168,85,247,0.42),transparent_38%),linear-gradient(135deg,#150b20,#08060d_72%)]",
    glow: "bg-[#7B2CBF]/35 shadow-[0_0_70px_rgba(123,44,191,0.48)]",
    line: "border-[#b36dff]/35",
    badge: "border-[#b36dff]/30 bg-[#7B2CBF]/14 text-[#d8b4fe]",
    icon: "text-[#d8b4fe]",
  },
  blue: {
    canvas: "bg-[radial-gradient(circle_at_72%_20%,rgba(58,112,255,0.38),transparent_38%),linear-gradient(135deg,#090f24,#07070d_72%)]",
    glow: "bg-[#315be8]/32 shadow-[0_0_70px_rgba(49,91,232,0.42)]",
    line: "border-[#678bff]/32",
    badge: "border-[#678bff]/28 bg-[#315be8]/12 text-[#a9c0ff]",
    icon: "text-[#a9c0ff]",
  },
  crimson: {
    canvas: "bg-[radial-gradient(circle_at_72%_20%,rgba(190,34,72,0.34),transparent_38%),linear-gradient(135deg,#21090e,#080609_72%)]",
    glow: "bg-[#b42348]/30 shadow-[0_0_70px_rgba(180,35,72,0.4)]",
    line: "border-[#ff668a]/30",
    badge: "border-[#ff668a]/25 bg-[#b42348]/12 text-[#ff9cb3]",
    icon: "text-[#ff9cb3]",
  },
  amber: {
    canvas: "bg-[radial-gradient(circle_at_72%_20%,rgba(245,158,11,0.3),transparent_38%),linear-gradient(135deg,#211307,#080706_72%)]",
    glow: "bg-amber-400/25 shadow-[0_0_70px_rgba(245,158,11,0.34)]",
    line: "border-amber-300/28",
    badge: "border-amber-300/24 bg-amber-300/[0.08] text-amber-200",
    icon: "text-amber-200",
  },
};

export function ModHubView() {
  const [source, setSource] = useState<SourceFilter>("all");
  const [kind, setKind] = useState<KindFilter>("all");
  const [query, setQuery] = useState("");
  const { getInstallState, install } = useInstallQueue();

  const filteredCatalog = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();

    return MOD_CATALOG.filter((item) => {
      if (source !== "all" && item.source !== source) return false;
      if (kind !== "all" && item.kind !== kind) return false;
      if (!normalizedQuery) return true;

      const searchableText = [
        item.name,
        item.creator,
        item.description,
        item.version,
        item.gameVersion,
        item.source,
        item.kind,
      ]
        .join(" ")
        .toLocaleLowerCase();

      return searchableText.includes(normalizedQuery);
    });
  }, [kind, query, source]);

  const updateQuery = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value.slice(0, 80));
  }, []);

  const clearFilters = useCallback(() => {
    setSource("all");
    setKind("all");
    setQuery("");
  }, []);

  return (
    <div className={voidClientStyles.page}>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-5">
        <div className="max-w-3xl">
          <p className={voidClientStyles.sectionKicker}>Modrinth + CurseForge // synchronized</p>
          <h1 className={voidClientStyles.pageTitle}>The Shadow Archive</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#8d8198]">
            Discover complete modpacks and cinematic shaders across both source vaults,
            then prepare each artifact through an isolated installation sequence.
          </p>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-[#7B2CBF]/20 bg-[#7B2CBF]/[0.065] px-4 py-3 shadow-[0_0_34px_rgba(123,44,191,0.1)]">
          <span className="grid size-9 place-items-center rounded-xl border border-[#b36dff]/25 bg-black/25 text-[#d8b4fe]">
            <ShadowGlyph name="mods" size={18} className="filter drop-shadow-[0_0_8px_currentColor]" />
          </span>
          <span>
            <strong className="block text-xs text-white">{MOD_CATALOG.length} archive entries</strong>
            <small className="mt-0.5 block text-[9px] font-bold tracking-[0.1em] text-[#8d8198] uppercase">
              Source-aware catalog
            </small>
          </span>
        </div>
      </header>

      <section className={`${voidClientStyles.glassCard} mb-5 p-4 sm:p-5`} aria-label="Archive filters">
        <div className="pointer-events-none absolute -top-20 right-[8%] size-48 rounded-full bg-[#7B2CBF]/15 blur-[70px]" />
        <div className="relative grid gap-4 xl:grid-cols-[minmax(260px,0.9fr)_minmax(0,1.5fr)_auto] xl:items-end">
          <label className="block">
            <span className="mb-2 block text-[9px] font-black tracking-[0.15em] text-[#c796ff] uppercase">
              Search the archive
            </span>
            <span className="relative block">
              <ShadowGlyph
                name="spark"
                size={15}
                className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[#8d65ae]"
              />
              <input
                type="search"
                value={query}
                onChange={updateQuery}
                autoComplete="off"
                placeholder="Search title, creator, version…"
                className={`${voidClientStyles.input} pl-10`}
              />
            </span>
          </label>

          <div>
            <span className="mb-2 block text-[9px] font-black tracking-[0.15em] text-[#c796ff] uppercase">
              Content class
            </span>
            <div className="grid grid-cols-3 gap-1.5 rounded-xl border border-white/[0.07] bg-black/25 p-1.5">
              {KIND_OPTIONS.map((option) => (
                <FilterButton
                  key={option.id}
                  active={kind === option.id}
                  label={option.label}
                  onClick={() => setKind(option.id)}
                />
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={clearFilters}
            disabled={source === "all" && kind === "all" && query.length === 0}
            className={`${voidClientStyles.secondaryButton} h-11 xl:min-w-32`}
          >
            <ShadowGlyph name="sliders" size={15} />
            Reset filters
          </button>
        </div>

        <div className="relative mt-4 grid gap-2 md:grid-cols-3">
          {SOURCE_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={source === option.id}
              onClick={() => setSource(option.id)}
              className={`group/source flex cursor-pointer items-center justify-between rounded-xl border px-3.5 py-3 text-left transition ${voidClientStyles.focusRing} ${
                source === option.id
                  ? "border-[#a855f7]/38 bg-[linear-gradient(110deg,rgba(123,44,191,0.18),rgba(38,63,146,0.08))] shadow-[inset_0_1px_0_rgba(255,255,255,0.055),0_0_22px_rgba(123,44,191,0.12)]"
                  : "border-white/[0.065] bg-white/[0.025] hover:border-white/[0.13] hover:bg-white/[0.045]"
              }`}
            >
              <span>
                <strong className={`block text-[11px] ${source === option.id ? "text-white" : "text-[#c1b6cb]"}`}>
                  {option.label}
                </strong>
                <small className="mt-0.5 block text-[9px] text-[#655a70]">{option.detail}</small>
              </span>
              <span
                className={`size-2 rounded-full transition ${
                  source === option.id
                    ? "bg-[#c084fc] shadow-[0_0_12px_rgba(192,132,252,0.8)]"
                    : "bg-[#3b3043] group-hover/source:bg-[#655a70]"
                }`}
              />
            </button>
          ))}
        </div>
      </section>

      <div className="mb-4 flex items-center justify-between gap-4">
        <p aria-live="polite" className="text-[10px] font-bold tracking-[0.08em] text-[#776c82] uppercase">
          {filteredCatalog.length} {filteredCatalog.length === 1 ? "artifact" : "artifacts"} revealed
        </p>
        <div className="hidden h-px flex-1 bg-[linear-gradient(90deg,rgba(123,44,191,0.18),transparent)] sm:block" />
      </div>

      <motion.div layout className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
        <AnimatePresence initial={false} mode="popLayout">
          {filteredCatalog.map((item, index) => (
            <CatalogCard
              key={item.id}
              item={item}
              index={index}
              installState={getInstallState(item.id)}
              onInstall={() => install(item.id)}
            />
          ))}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>
        {filteredCatalog.length === 0 ? (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`${voidClientStyles.glassCard} grid min-h-72 place-items-center p-8 text-center`}
          >
            <div>
              <span className="mx-auto grid size-14 place-items-center rounded-2xl border border-[#7B2CBF]/25 bg-[#7B2CBF]/10 text-[#d8b4fe]">
                <ShadowGlyph name="mods" size={27} />
              </span>
              <h2 className="font-display mt-5 text-lg font-black">No signal in this sector</h2>
              <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-[#8d8198]">
                The current source, content class and search phrase do not reveal a matching artifact.
              </p>
              <button type="button" onClick={clearFilters} className={`${voidClientStyles.secondaryButton} mt-5`}>
                Reset archive filters
              </button>
            </div>
          </motion.section>
        ) : null}
      </AnimatePresence>

      <footer className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.055] pt-5 text-[9px] tracking-[0.08em] text-[#5f5469] uppercase">
        <span>Installation sequences are tracked independently per artifact</span>
        <span className="flex items-center gap-2 text-[#7f6b90]">
          <span className="size-1.5 rounded-full bg-[#8f55c5] shadow-[0_0_10px_rgba(143,85,197,0.65)]" />
          Archive channel stable
        </span>
      </footer>
    </div>
  );
}

function FilterButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`cursor-pointer rounded-lg px-3 py-2 text-[10px] font-black transition ${voidClientStyles.focusRing} ${
        active
          ? "bg-[#7B2CBF]/24 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_0_18px_rgba(123,44,191,0.14)]"
          : "text-[#776c82] hover:bg-white/[0.035] hover:text-[#c4b8ce]"
      }`}
    >
      {label}
    </button>
  );
}

function CatalogCard({
  item,
  index,
  installState,
  onInstall,
}: {
  item: IModCatalogItem;
  index: number;
  installState: IInstallState;
  onInstall: () => void;
}) {
  const reducedMotion = useReducedMotion();
  const accent = ACCENT_STYLES[item.accent];
  const isInstalling = installState.phase === "installing";
  const isInstalled = installState.phase === "installed";

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 18, scale: 0.975 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.97 }}
      transition={{ duration: 0.34, delay: reducedMotion ? 0 : index * 0.035 }}
      whileHover={reducedMotion ? undefined : { y: -6 }}
      className={`group relative overflow-hidden rounded-[24px] border bg-[linear-gradient(150deg,rgba(20,15,27,0.96),rgba(8,6,11,0.92))] shadow-[inset_0_1px_0_rgba(255,255,255,0.055),0_22px_60px_rgba(0,0,0,0.36)] backdrop-blur-2xl transition-colors duration-300 ${accent.line}`}
    >
      <div className={`relative h-40 overflow-hidden ${accent.canvas}`}>
        <div className="absolute inset-0 scale-100 transition-transform duration-700 ease-out group-hover:scale-[1.08]">
          <div className={`absolute -top-10 right-3 size-32 rounded-full blur-3xl ${accent.glow}`} />
          <div className="absolute -right-8 -bottom-12 size-40 rotate-45 border border-white/[0.08] bg-black/10" />
          <div className="absolute right-16 -bottom-16 size-40 rotate-45 border border-white/[0.055]" />
          <div className="absolute top-7 left-[47%] h-32 w-px rotate-[38deg] bg-[linear-gradient(transparent,rgba(255,255,255,0.26),transparent)]" />
          <div className="absolute top-12 right-12 size-20 rotate-45 border border-white/[0.12] shadow-[inset_0_0_28px_rgba(255,255,255,0.025)]" />
        </div>

        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_38%,rgba(5,5,5,0.74)_100%)]" />
        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-4">
          <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[8px] font-black tracking-[0.12em] uppercase backdrop-blur-xl ${accent.badge}`}>
            <ShadowGlyph name={item.kind === "shader" ? "spark" : "mods"} size={12} />
            {item.kind}
          </span>
          <span className="rounded-lg border border-white/[0.09] bg-black/35 px-2.5 py-1.5 text-[8px] font-black tracking-[0.1em] text-[#b9adbf] uppercase backdrop-blur-xl">
            {item.source}
          </span>
        </div>

        <div className={`absolute bottom-4 left-4 grid size-12 place-items-center rounded-2xl border bg-black/35 backdrop-blur-xl ${accent.line} ${accent.icon}`}>
          <ShadowGlyph
            name={item.kind === "shader" ? "spark" : "mods"}
            size={24}
            className="filter drop-shadow-[0_0_10px_currentColor]"
          />
        </div>
        <span className="absolute right-4 bottom-4 text-[9px] font-bold tracking-[0.08em] text-white/60 uppercase">
          {item.downloads} downloads
        </span>
      </div>

      <div className="p-5">
        <div className="min-h-18">
          <p className="text-[9px] font-black tracking-[0.13em] text-[#765d8b] uppercase">By {item.creator}</p>
          <h2 className="font-display mt-1.5 line-clamp-2 text-base leading-5 font-black text-white transition group-hover:text-[#e7d5ff]">
            {item.name}
          </h2>
        </div>

        <p className="mt-3 line-clamp-3 min-h-15 text-[11px] leading-5 text-[#8d8198]">{item.description}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className={voidClientStyles.tag}>{item.version}</span>
          <span className={voidClientStyles.tag}>MC {item.gameVersion}</span>
          <span className={`${voidClientStyles.tag} ${accent.badge}`}>{item.kind === "shader" ? "Iris-ready" : "Instance-ready"}</span>
        </div>

        <motion.button
          layout
          type="button"
          disabled={isInstalling || isInstalled}
          onClick={onInstall}
          whileHover={!isInstalling && !isInstalled && !reducedMotion ? { scale: 1.018, y: -1 } : undefined}
          whileTap={!isInstalling && !isInstalled && !reducedMotion ? { scale: 0.985 } : undefined}
          aria-label={isInstalled ? `${item.name} installed` : isInstalling ? `Installing ${item.name}, ${installState.progress}%` : `Install ${item.name}`}
          className={`relative mt-5 flex h-11 w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl border text-[10px] font-black tracking-[0.1em] uppercase transition ${voidClientStyles.focusRing} ${
            isInstalled
              ? "border-[#4cff9a]/24 bg-[#00e676]/[0.075] text-[#68ffa6] shadow-[0_0_24px_rgba(0,230,118,0.09)]"
              : isInstalling
                ? "cursor-wait border-[#a855f7]/38 bg-[#160b20] text-white"
                : "border-[#a855f7]/32 bg-[linear-gradient(105deg,rgba(50,16,75,0.92),rgba(123,44,191,0.82),rgba(34,54,122,0.78))] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_0_24px_rgba(123,44,191,0.2)] hover:border-[#d8b4fe]/55 hover:shadow-[0_8px_28px_rgba(0,0,0,0.4),0_0_30px_rgba(123,44,191,0.4)]"
          }`}
        >
          {isInstalling ? (
            <motion.span
              className="absolute inset-0 origin-left bg-[linear-gradient(90deg,rgba(80,24,120,0.86),rgba(157,78,221,0.95),rgba(63,86,190,0.9))] shadow-[0_0_28px_rgba(123,44,191,0.45)]"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: installState.progress / 100 }}
              transition={{ duration: reducedMotion ? 0 : 0.12, ease: "easeOut" }}
            />
          ) : null}

          <AnimatePresence initial={false} mode="wait">
            <motion.span
              key={installState.phase}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: reducedMotion ? 0 : 0.18 }}
              className="relative z-10 flex items-center gap-2"
            >
              <ShadowGlyph
                name={isInstalled ? "check" : isInstalling ? "spark" : "download"}
                size={15}
                className={isInstalling && !reducedMotion ? "animate-pulse filter drop-shadow-[0_0_8px_currentColor]" : ""}
              />
              {isInstalled ? "Installed" : isInstalling ? `Installing ${installState.progress}%` : "Install artifact"}
            </motion.span>
          </AnimatePresence>
        </motion.button>
      </div>
    </motion.article>
  );
}

