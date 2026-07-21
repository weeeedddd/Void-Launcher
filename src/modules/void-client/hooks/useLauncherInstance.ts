import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAccountStore } from "@/stores/account";
import { useVoidClientStore } from "../stores/voidClient.store";

export function useLauncherInstance(selectedInstanceId?: string | null) {
  const profile = useAccountStore((state) => state.profile);
  const signalLaunchLoad = useVoidClientStore((state) => state.signalLaunchLoad);
  const beginLaunch = useVoidClientStore((state) => state.beginLaunch);
  const finishLaunch = useVoidClientStore((state) => state.finishLaunch);
  const instancesQuery = useQuery({ queryKey: ["instances"], queryFn: api.listInstances });
  const instance = instancesQuery.data?.find((candidate) => candidate.id === selectedInstanceId)
    ?? instancesQuery.data?.[0]
    ?? null;
  const launchMutation = useMutation({
    mutationFn: async () => {
      if (!instance) throw new Error("Create a Minecraft instance before launching.");
      if (!profile) throw new Error("Sign in with a verified Microsoft account before launching.");
      await api.launchInstance(instance.id);
    },
    onMutate: () => {
      beginLaunch(instance?.name ?? "Minecraft");
      signalLaunchLoad(14_000);
    },
    onSuccess: () => {
      signalLaunchLoad(9_000);
      finishLaunch("Minecraft is running. The launcher will keep the startup log available.");
    },
    onError: (error) => finishLaunch(error instanceof Error ? error.message : String(error), true),
  });

  return {
    profile,
    instance,
    instances: instancesQuery.data ?? [],
    isLoadingInstances: instancesQuery.isLoading,
    launchMutation,
  };
}
