import { useMutation } from "@tanstack/react-query";
import { LoaderCircle, Play } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { useAccountStore } from "@/stores/account";
import type { Instance } from "@/types";

/** One instance tile: banner, name, version/loader chips, play button. */
export function InstanceCard({ instance }: { instance: Instance }) {
  const accountMode = useAccountStore((state) => state.mode);
  const developerMode = accountMode === "developer";
  const offlineMode = accountMode === "offline";
  const simulationMode = developerMode || offlineMode;
  const launch = useMutation({ mutationFn: () => api.launchInstance(instance.id, simulationMode) });
  const modCount = instance.mods.filter((m) => m.enabled).length;

  return (
    <article
      className="overflow-hidden rounded-xl border border-void-700 bg-void-800/70
                 transition-all duration-150 hover:border-accent-700
                 hover:shadow-[0_0_24px_rgb(124_58_237_/_0.12)]"
    >
      {/* Banner: gradient + oversized first letter as a simple identicon */}
      <div className="relative flex h-20 items-end bg-gradient-to-br from-accent-800/70 via-void-700 to-void-800 px-4">
        <span className="absolute right-3 -bottom-2 text-6xl font-black text-white/10 select-none">
          {instance.name.charAt(0).toUpperCase()}
        </span>
      </div>

      <div className="flex flex-col gap-3 p-4">
        <div>
          <h3 className="truncate font-semibold">{instance.name}</h3>
          <div className="mt-1.5 flex gap-1.5">
            <span className="rounded-md bg-void-700/70 px-2 py-0.5 text-[11px] font-medium text-ink-300">
              {instance.gameVersion}
            </span>
            <span className="rounded-md bg-accent-800/40 px-2 py-0.5 text-[11px] font-medium text-accent-300 capitalize">
              {instance.loader}
            </span>
            {modCount > 0 && (
              <span className="rounded-md bg-void-700/70 px-2 py-0.5 text-[11px] font-medium text-ink-300">
                {modCount} mods
              </span>
            )}
          </div>
        </div>

        <Button className={`w-full ${simulationMode ? "aaa-launch-pulse" : ""}`} disabled={launch.isPending} onClick={() => launch.mutate()}>
          {launch.isPending ? (
            <LoaderCircle size={15} className="animate-spin" />
          ) : (
            <Play size={15} />
          )}
          {launch.isPending ? (simulationMode ? "Simulating..." : "Launching...") : (offlineMode ? "Launch singleplayer" : developerMode ? "Simulate launch" : "Play")}
        </Button>

        {launch.isSuccess && simulationMode && <p role="status" className="text-xs text-amber-300">{offlineMode ? "Singleplayer simulation complete." : "Simulation complete."} No game process was started.</p>}
        {launch.isError && <p className="text-xs text-red-400">{String(launch.error)}</p>}
      </div>
    </article>
  );
}
