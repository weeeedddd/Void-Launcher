import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAccountStore } from "@/stores/account";

export function useLauncherInstance() {
  const accountMode = useAccountStore((state) => state.mode);
  const profile = useAccountStore((state) => state.profile);
  const instancesQuery = useQuery({ queryKey: ["instances"], queryFn: api.listInstances });
  const instance = instancesQuery.data?.[0] ?? null;
  const simulationMode = accountMode === "offline" || accountMode === "developer";
  const launchMutation = useMutation({
    mutationFn: async () => {
      if (!instance) throw new Error("Create a Minecraft instance before launching.");
      if (!profile) throw new Error("Sign in with Microsoft or choose an offline simulation profile.");
      await api.launchInstance(instance.id, simulationMode);
    },
  });

  return {
    accountMode,
    profile,
    instance,
    isOffline: accountMode === "offline",
    isSimulation: simulationMode,
    isLoadingInstances: instancesQuery.isLoading,
    launchMutation,
  };
}
