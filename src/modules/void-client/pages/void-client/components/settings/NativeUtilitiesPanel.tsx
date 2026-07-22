import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isTauri } from "@tauri-apps/api/core";
import { api } from "@/lib/api";
import type { StorageCategory } from "@/types";
import { ShadowGlyph } from "../../../../components/ShadowGlyph";
import {
  clearStorageCategoryWithNotification,
  openLauncherFolderWithNotification,
} from "../../../../notifications/notificationOperations";
import { voidClientStyles } from "../../void-client.styles";
import { MatrixPanel } from "./SettingsPrimitives";

function formatBytes(bytes: number) {
  if (bytes < 1_024) return `${bytes} B`;
  if (bytes < 1_024 ** 2) return `${(bytes / 1_024).toFixed(1)} KB`;
  if (bytes < 1_024 ** 3) return `${(bytes / 1_024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1_024 ** 3).toFixed(2)} GB`;
}

export function NativeUtilitiesPanel() {
  const nativeRuntime = isTauri();
  const queryClient = useQueryClient();
  const storage = useQuery({
    queryKey: ["native-storage-report"],
    queryFn: api.getStorageReport,
    enabled: nativeRuntime,
    retry: false,
  });
  const openLogs = useMutation({
    mutationFn: () => openLauncherFolderWithNotification("launcherLogs"),
  });
  const clearStorage = useMutation({
    mutationFn: (category: Extract<StorageCategory, "logs" | "cache">) => clearStorageCategoryWithNotification(category),
    onSuccess: (report) => queryClient.setQueryData(["native-storage-report"], report),
  });

  const error = storage.error ?? openLogs.error ?? clearStorage.error;

  return (
    <MatrixPanel className="mt-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className={voidClientStyles.sectionKicker}>Native storage</p>
          <h2 className="mt-1 text-base font-semibold text-[#F4F4F5]">Launcher-managed files</h2>
          <p className="mt-1 text-xs leading-5 text-[#92929B]">
            These actions are restricted to Void Launcher data directories. They never accept a path from the interface.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void storage.refetch()}
          disabled={!nativeRuntime || storage.isFetching}
          className={voidClientStyles.secondaryButton}
        >
          <ShadowGlyph name="sync" size={15} />
          {storage.isFetching ? "Reading..." : "Refresh"}
        </button>
      </div>

      {storage.data ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {storage.data.segments.map((category) => (
            <div key={category.category} className="rounded-lg border border-[#29292F] bg-[#111114] p-3.5">
              <p className="text-xs capitalize text-[#777780]">{category.category}</p>
              <p className="mt-1 font-mono text-sm font-semibold tabular-nums text-[#F4F4F5]">{formatBytes(category.bytes)}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 rounded-lg border border-[#29292F] bg-[#111114] p-3.5 text-xs text-[#92929B]">
          {nativeRuntime ? "Storage usage has not been read yet." : "Storage controls require the packaged native launcher."}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => openLogs.mutate()} disabled={!nativeRuntime || openLogs.isPending} className={voidClientStyles.secondaryButton}>
          <ShadowGlyph name="folder" size={15} />Open logs
        </button>
        <button type="button" onClick={() => clearStorage.mutate("logs")} disabled={!nativeRuntime || clearStorage.isPending} className={voidClientStyles.secondaryButton}>
          Clear logs
        </button>
        <button type="button" onClick={() => clearStorage.mutate("cache")} disabled={!nativeRuntime || clearStorage.isPending} className={voidClientStyles.secondaryButton}>
          Clear cache
        </button>
      </div>

      {error ? <p role="alert" className="mt-3 text-xs text-[#FCA5A5]">{String(error)}</p> : null}
      {clearStorage.isSuccess ? <p role="status" className="mt-3 text-xs text-[#86EFAC]">Managed storage was cleared and rescanned.</p> : null}
    </MatrixPanel>
  );
}

export default NativeUtilitiesPanel;
