import { useEffect, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { api } from "@/lib/api";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useUiStore } from "@/stores/ui";
import type { ModLoader, Platform } from "@/types";
import { ModCard } from "./ModCard";

// TODO: fetch the real version list from Mojang's version manifest
// (https://piston-meta.mojang.com/mc/game/version_manifest_v2.json)
const GAME_VERSIONS = ["1.21.4", "1.21.1", "1.20.6", "1.20.1", "1.19.2", "1.18.2"];
const LOADERS: ModLoader[] = ["fabric", "neoforge", "forge", "quilt"];

/**
 * Mod browser: search either platform, filter by game version + loader,
 * and install results into one of your instances with one click.
 */
export function ModSearchPage() {
  const [query, setQuery] = useState("");
  const [platform, setPlatform] = useState<Platform>("modrinth");
  const [gameVersion, setGameVersion] = useState("1.21.1");
  const [loader, setLoader] = useState<ModLoader>("fabric");
  const [targetId, setTargetId] = useState<string>();

  // Debounce typing so we don't hammer the APIs on every keystroke.
  const debouncedQuery = useDebouncedValue(query);

  // Deep links (voidlauncher://mod/...) land here as a pre-filled search.
  const pendingSearch = useUiStore((s) => s.pendingSearch);
  const setPendingSearch = useUiStore((s) => s.setPendingSearch);
  useEffect(() => {
    if (pendingSearch) {
      setQuery(pendingSearch);
      setPendingSearch(null);
    }
  }, [pendingSearch, setPendingSearch]);

  // The actual search — runs on the Rust side (see search_mods command).
  const {
    data: mods,
    isFetching,
    error,
  } = useQuery({
    queryKey: ["mod-search", platform, debouncedQuery, gameVersion, loader],
    queryFn: () =>
      api.searchMods({ platform, query: debouncedQuery, gameVersion, loader, limit: 24 }),
    placeholderData: keepPreviousData, // keep old results visible while refetching
  });

  // Instances so the user can pick an install target.
  const { data: instances } = useQuery({ queryKey: ["instances"], queryFn: api.listInstances });
  const target = targetId ?? instances?.[0]?.id;

  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      {/* ── Header ── */}
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Browse Mods</h2>
          <p className="mt-1 text-sm text-ink-500">
            Search CurseForge &amp; Modrinth and add mods straight to your instances.
          </p>
        </div>

        {/* Install target selector */}
        {instances && instances.length > 0 && (
          <label className="flex items-center gap-2 text-sm text-ink-300">
            Install into
            <select
              className="control select-text"
              value={target}
              onChange={(e) => setTargetId(e.target.value)}
            >
              {instances.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {/* ── Search & filters ── */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        {/* Search box */}
        <div className="relative min-w-64 flex-1">
          <Search size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-ink-500" />
          <input
            className="control w-full select-text pl-9"
            placeholder="Search mods… (e.g. Sodium, JEI, Create)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {/* Platform toggle (segmented control) */}
        <div className="flex overflow-hidden rounded-lg border border-void-600">
          {(["modrinth", "curseforge"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPlatform(p)}
              className={
                "cursor-pointer px-4 py-2 text-sm font-medium capitalize transition-colors " +
                (platform === p
                  ? "bg-accent-600 text-white"
                  : "bg-void-800 text-ink-300 hover:text-ink-100")
              }
            >
              {p}
            </button>
          ))}
        </div>

        {/* Game version filter */}
        <select
          className="control"
          value={gameVersion}
          onChange={(e) => setGameVersion(e.target.value)}
        >
          {GAME_VERSIONS.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>

        {/* Loader filter */}
        <select
          className="control capitalize"
          value={loader}
          onChange={(e) => setLoader(e.target.value as ModLoader)}
        >
          {LOADERS.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </div>

      {/* ── Results ── */}
      {error ? (
        <div className="rounded-xl border border-red-900 bg-red-950/40 p-6 text-sm text-red-300">
          {String(error)}
        </div>
      ) : (
        <div
          className={
            "grid grid-cols-1 gap-4 transition-opacity lg:grid-cols-2 xl:grid-cols-3 " +
            (isFetching ? "opacity-60" : "opacity-100")
          }
        >
          {mods?.map((mod) => (
            <ModCard
              key={`${mod.platform}:${mod.id}`}
              mod={mod}
              onInstall={target ? () => api.installMod(target, mod.platform, mod.id) : undefined}
            />
          ))}
          {mods?.length === 0 && !isFetching && (
            <p className="col-span-full py-16 text-center text-sm text-ink-500">
              No mods found — try a different search or filters.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
