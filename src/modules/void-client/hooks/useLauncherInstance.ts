import { useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { isTauri } from "@tauri-apps/api/core";
import { api } from "@/lib/api";
import { closeCurrentWindow, minimizeCurrentWindow } from "@/lib/windowControls";
import { useAccountStore } from "@/stores/account";
import type { Instance } from "@/types";
import { useVoidClientStore } from "../stores/voidClient.store";

export function resolveActiveInstance(instances: readonly Instance[], activeInstanceId: string | null) {
  return instances.find((candidate) => candidate.id === activeInstanceId)
    ?? instances[0]
    ?? null;
}

export function useLauncherInstance() {
  const profile = useAccountStore((state) => state.profile);
  const refreshAccounts = useAccountStore((state) => state.refreshAccounts);
  const activeInstanceId = useVoidClientStore((state) => state.activeInstanceId);
  const setActiveInstanceId = useVoidClientStore((state) => state.setActiveInstanceId);
  const beginLaunch = useVoidClientStore((state) => state.beginLaunch);
  const finishLaunch = useVoidClientStore((state) => state.finishLaunch);
  const resolutionWidth = useVoidClientStore((state) => state.resolutionWidth);
  const resolutionHeight = useVoidClientStore((state) => state.resolutionHeight);
  const fullscreen = useVoidClientStore((state) => state.fullscreen);
  const highThreadPriority = useVoidClientStore((state) => state.highThreadPriority);
  const launcherVisibility = useVoidClientStore((state) => state.launcherVisibility);
  const nativeRuntime = isTauri();
  const instancesQuery = useQuery({
    queryKey: ["instances"],
    queryFn: async () => (nativeRuntime ? api.listInstances() : []),
  });
  const instances = instancesQuery.data ?? [];
  const instance = resolveActiveInstance(instances, activeInstanceId);

  useEffect(() => {
    if (!nativeRuntime || instancesQuery.isLoading || instancesQuery.isError) return;
    const resolvedId = instance?.id ?? null;
    if (resolvedId !== activeInstanceId) setActiveInstanceId(resolvedId);
  }, [activeInstanceId, instance?.id, instancesQuery.isError, instancesQuery.isLoading, nativeRuntime, setActiveInstanceId]);
  const launchMutation = useMutation({
    mutationFn: async () => {
      if (!instance) throw new Error("Create a Minecraft instance before launching.");
      if (!profile) throw new Error("Sign in with a verified Microsoft account before launching.");
      await api.launchInstance(instance.id, {
        width: resolutionWidth,
        height: resolutionHeight,
        fullscreen,
      });
      if (highThreadPriority) {
        await api.setMinecraftProcessPriority("high").catch(() => undefined);
      }
      if (launcherVisibility === "hide") minimizeCurrentWindow();
      if (launcherVisibility === "close") closeCurrentWindow();
    },
    onMutate: () => {
      beginLaunch(instance?.name ?? "Minecraft");
    },
    onSuccess: () => {
      finishLaunch("Minecraft is running. The launcher will keep the startup log available.");
    },
    onError: (error) => {
      finishLaunch(error instanceof Error ? error.message : String(error), true);
      // Launch performs a native session freshness check. Reflect a rejected
      // or expired native session in the account header instead of leaving a
      // stale "Microsoft verified" profile in React.
      void refreshAccounts().catch(() => undefined);
    },
  });

  return {
    profile,
    instance,
    instances,
    activeInstanceId: instance?.id ?? null,
    setActiveInstanceId,
    isLoadingInstances: instancesQuery.isLoading,
    launchMutation,
  };
}
