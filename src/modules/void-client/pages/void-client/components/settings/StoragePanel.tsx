import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, useReducedMotion } from "motion/react";
import { api } from "@/lib/api";
import type { StorageCategory, StorageReport } from "@/types";
import { ShadowGlyph } from "../../../../components/ShadowGlyph";
import { useLauncherInstance } from "../../../../hooks/useLauncherInstance";
import { useVoidClientStore } from "../../../../stores/voidClient.store";
import type { LogRetention } from "../../../../types";
import { voidClientStyles } from "../../void-client.styles";
import { ConfirmDialog, MatrixPanel, SelectField } from "./SettingsPrimitives";

const STORAGE_META: Record<StorageCategory, { label: string; color: string; text: string }> = {
  logs: { label: "Logs", color: "fill-[#f43f5e]", text: "text-[#fb7185]" },
  profiles: { label: "Profiles", color: "fill-[#a855f7]", text: "text-[#c084fc]" },
  assets: { label: "Assets", color: "fill-[#4c6fdc]", text: "text-[#86a8ff]" },
  cache: { label: "Cache", color: "fill-[#f59e0b]", text: "text-[#fbbf24]" },
};

const STORAGE_ORDER: readonly StorageCategory[] = ["logs", "profiles", "assets", "cache"];

function formatBytes(bytes: number) {
  if (bytes < 1_024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1_024).toFixed(1)} KB`;
  if (bytes < 1_073_741_824) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  return `${(bytes / 1_073_741_824).toFixed(2)} GB`;
}

export function StoragePanel() {
  const [clearTarget, setClearTarget] = useState<Extract<StorageCategory, "logs" | "cache"> | null>(null);
  const reducedMotion = useReducedMotion();
  const queryClient = useQueryClient();
  const { instance } = useLauncherInstance();
  const logRetention = useVoidClientStore((state) => state.logRetention);
  const setLogRetention = useVoidClientStore((state) => state.setLogRetention);
  const storageQuery = useQuery({ queryKey: ["native-storage-report"], queryFn: api.getStorageReport, retry: false });

  const openMutation = useMutation({
    mutationFn: ({ kind, instanceId }: { kind: "launcherLogs" | "gameLogs"; instanceId?: string }) => api.openLauncherFolder(kind, instanceId),
  });
  const clearMutation = useMutation({
    mutationFn: (category: Extract<StorageCategory, "logs" | "cache">) => api.clearStorageCategory(category),
    onSuccess: (report) => queryClient.setQueryData(["native-storage-report"], report),
  });

  const report = storageQuery.data;
  const segments = useMemo(() => buildSegments(report), [report]);
  const openLauncherLogs = useCallback(() => openMutation.mutate({ kind: "launcherLogs" }), [openMutation]);
  const openGameLogs = useCallback(() => openMutation.mutate({ kind: "gameLogs", instanceId: instance?.id }), [instance?.id, openMutation]);
  const chooseClearLogs = useCallback(() => setClearTarget("logs"), []);
  const chooseClearCache = useCallback(() => setClearTarget("cache"), []);
  const closeConfirm = useCallback(() => setClearTarget(null), []);
  const confirmClear = useCallback(() => {
    if (!clearTarget) return;
    clearMutation.mutate(clearTarget);
    setClearTarget(null);
  }, [clearMutation, clearTarget]);

  return (
    <>
      <MatrixPanel className="mt-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center border border-[#a855f7]/25 bg-[#7B2CBF]/10 text-[#d8b4fe] [clip-path:polygon(12%_0,100%_0,88%_100%,0_82%)]"><ShadowGlyph name="storage" size={21} /></span>
            <div><p className={voidClientStyles.sectionKicker}>Storage management</p><h3 className="font-display mt-1 text-lg font-black">The Void Cache</h3></div>
          </div>
          <strong className="font-display text-xl font-black text-white">Total: {formatBytes(report?.totalBytes ?? 0)}</strong>
        </div>

        <div className="mt-6 overflow-hidden border border-white/[0.075] bg-black/35 p-2 [clip-path:polygon(0_0,98%_0,100%_35%,100%_100%,2%_100%,0_65%)]">
          <svg viewBox="0 0 1000 38" role="img" aria-label="Disk usage divided into logs, profiles, assets and cache" className="h-10 w-full overflow-visible">
            <rect x="0" y="4" width="1000" height="30" rx="2" className="fill-white/[0.045]" />
            <motion.g initial={reducedMotion ? undefined : { scaleX: 0, opacity: 0.25 }} animate={{ scaleX: 1, opacity: 1 }} transition={{ duration: reducedMotion ? 0 : 0.62, ease: [0.22, 1, 0.36, 1] }} className="origin-left">
              {segments.map((segment) => <polygon key={segment.category} points={segment.points} className={`${STORAGE_META[segment.category].color} drop-shadow-[0_0_8px_rgba(123,44,191,0.3)]`} />)}
            </motion.g>
          </svg>
        </div>

        <dl className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {STORAGE_ORDER.map((category) => {
            const bytes = report?.segments.find((segment) => segment.category === category)?.bytes ?? 0;
            const meta = STORAGE_META[category];
            return <div key={category} className="border border-white/[0.06] bg-black/20 px-3 py-3 [clip-path:polygon(0_0,96%_0,100%_25%,100%_100%,4%_100%,0_75%)]"><dt className={`text-[9px] font-black tracking-[0.13em] uppercase ${meta.text}`}>{meta.label}</dt><dd className="mt-1 text-xs font-bold text-white">{formatBytes(bytes)}</dd></div>;
          })}
        </dl>

        <div className="mt-5 grid gap-4 border-t border-white/[0.06] pt-5 xl:grid-cols-[minmax(230px,0.7fr)_minmax(0,1.3fr)] xl:items-end">
          <SelectField id="log-retention" label="Log retention" value={logRetention} onChange={(value) => setLogRetention(value as LogRetention)}>
            <option value="forever">Forever</option><option value="one-year">1 Year</option><option value="six-months">6 Months</option><option value="thirty-days">30 Days</option><option value="seven-days">7 Days</option>
          </SelectField>
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" onClick={openLauncherLogs} disabled={openMutation.isPending} className={voidClientStyles.secondaryButton}><ShadowGlyph name="folder" size={15} />Open Logs Folder</button>
            <button type="button" onClick={openGameLogs} disabled={!instance || openMutation.isPending} className={voidClientStyles.secondaryButton}><ShadowGlyph name="logs" size={15} />Game Logs</button>
            <button type="button" onClick={chooseClearLogs} disabled={clearMutation.isPending} className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-red-400/20 bg-red-500/[0.045] px-4 py-2.5 text-xs font-bold text-red-200 transition hover:border-red-300/38 hover:bg-red-500/[0.08] disabled:cursor-not-allowed disabled:opacity-40"><ShadowGlyph name="trash" size={15} />Clear Logs</button>
            <button type="button" onClick={chooseClearCache} disabled={clearMutation.isPending} className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-amber-300/20 bg-amber-300/[0.045] px-4 py-2.5 text-xs font-bold text-amber-100 transition hover:border-amber-200/38 hover:bg-amber-300/[0.08] disabled:cursor-not-allowed disabled:opacity-40"><ShadowGlyph name="cache" size={15} />Clear Cache</button>
          </div>
        </div>

        <div aria-live="polite" className="mt-3 min-h-4 text-[10px]">
          {storageQuery.isError && <span className="text-amber-200">Storage details are available in the Windows launcher build.</span>}
          {openMutation.isError && <span className="text-red-300">{String(openMutation.error)}</span>}
          {clearMutation.isSuccess && <span className="text-[#4cff9a]">The selected managed directory was cleared safely.</span>}
          {clearMutation.isError && <span className="text-red-300">{String(clearMutation.error)}</span>}
        </div>
      </MatrixPanel>

      <ConfirmDialog open={clearTarget !== null} title={`Clear ${clearTarget === "logs" ? "launcher logs" : "managed cache"}?`} description="Only the selected launcher-managed directory will be cleared. Accounts, worlds, mods, settings and authentication data are excluded." confirmLabel={`Clear ${clearTarget === "logs" ? "logs" : "cache"}`} onConfirm={confirmClear} onClose={closeConfirm} />
    </>
  );
}

function buildSegments(report: StorageReport | undefined) {
  if (!report || report.totalBytes <= 0) return [];
  let cursor = 0;
  return STORAGE_ORDER.map((category, index) => {
    const bytes = report.segments.find((segment) => segment.category === category)?.bytes ?? 0;
    const width = Math.max(0, (bytes / report.totalBytes) * 1000);
    const start = cursor;
    const end = Math.min(1000, cursor + width);
    cursor = end;
    const cut = Math.min(9, Math.max(0, (end - start) / 4));
    return {
      category,
      points: `${start + (index === 0 ? 0 : cut)},4 ${end},4 ${Math.max(start, end - cut)},34 ${start},34`,
    };
  }).filter((segment) => segment.points !== "");
}
