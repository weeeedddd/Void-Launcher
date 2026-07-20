import { useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { FlaskConical, Gamepad2, LoaderCircle, LogIn, Play, RadioTower } from "lucide-react";
import { motion } from "motion/react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAccountStore } from "@/stores/account";
import { useUiStore } from "@/stores/ui";

export function LaunchClientButton() {
  const profile = useAccountStore((state) => state.profile);
  const accountMode = useAccountStore((state) => state.mode);
  const pending = useAccountStore((state) => state.pending);
  const login = useAccountStore((state) => state.login);
  const sidebarSide = useUiStore((state) => state.sidebarSide);
  const sidebarCollapsed = useUiStore((state) => state.sidebarCollapsed);
  const setView = useUiStore((state) => state.setView);
  const { data: instances } = useQuery({ queryKey: ["instances"], queryFn: api.listInstances });
  const instance = instances?.[0];
  const developerMode = accountMode === "developer";
  const offlineMode = accountMode === "offline";
  const simulationMode = developerMode || offlineMode;
  const launch = useMutation({ mutationFn: (instanceId: string) => api.launchInstance(instanceId, simulationMode) });

  const activate = useCallback(() => {
    if (!profile) {
      void login();
      return;
    }
    if (!instance) {
      setView("instances");
      return;
    }
    launch.mutate(instance.id);
  }, [instance, launch, login, profile, setView]);

  const subtitle = pending
    ? "Waiting for Microsoft"
    : launch.isPending
      ? "Downloading and verifying game files"
      : launch.isError
        ? "Launch failed — open Instances for details"
      : launch.isSuccess
        ? offlineMode ? "Singleplayer simulation complete" : developerMode ? "Test launch simulated" : "Client is running"
        : !profile
          ? "Microsoft sign-in required"
          : offlineMode
            ? "Multiplayer disabled — local simulation"
            : developerMode
            ? "No game process will be started"
            : instance?.name ?? "Create an instance first";

  return (
    <div
      className={cn(
        "pointer-events-none fixed right-3 bottom-3 z-60 transition-[right] duration-300 sm:right-5 sm:bottom-5 lg:right-6 lg:bottom-6",
        sidebarSide === "right" && !sidebarCollapsed ? "lg:right-[calc(16.75rem+1.5rem)]" : "",
        sidebarSide === "right" && sidebarCollapsed ? "lg:right-[calc(5rem+1.5rem)]" : "",
      )}
    >
      <motion.button
        type="button"
        onClick={activate}
        disabled={launch.isPending || Boolean(pending)}
        whileHover={{ scale: 1.035, y: -2 }}
        whileTap={{ scale: 0.975 }}
        transition={{ type: "spring", stiffness: 420, damping: 24 }}
        className="launch-client-button pointer-events-auto relative flex cursor-pointer items-center gap-3 overflow-hidden rounded-2xl border border-accent-400/55 p-2.5 text-left text-white sm:min-w-64 sm:px-5 sm:py-3.5 disabled:cursor-wait disabled:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent-300"
      >
        <span className="grid size-12 place-items-center rounded-xl border border-white/15 bg-white/10 shadow-[inset_0_1px_0_rgb(255_255_255_/_0.16)]">
          {pending || launch.isPending ? (
            <LoaderCircle size={23} className="animate-spin" />
          ) : !profile ? (
            <LogIn size={22} />
          ) : offlineMode ? (
            <Gamepad2 size={22} />
          ) : developerMode ? (
            <FlaskConical size={22} />
          ) : launch.isSuccess ? (
            <RadioTower size={22} />
          ) : (
            <Play size={22} fill="currentColor" />
          )}
        </span>
        <span className="hidden sm:block">
          <span className="font-display block text-base font-black tracking-[0.12em]">{offlineMode ? "LAUNCH SINGLEPLAYER" : developerMode ? "SIMULATE CLIENT" : "LAUNCH CLIENT"}</span>
          <span className="mt-1 block text-[10px] font-medium tracking-wide text-white/65">{subtitle}</span>
        </span>
      </motion.button>
      {launch.isError && (
        <p
          role="alert"
          title={String(launch.error)}
          className="pointer-events-auto mt-2 max-w-72 rounded-xl border border-red-400/20 bg-red-950/85 px-3 py-2 text-[10px] leading-4 text-red-200 shadow-xl backdrop-blur-xl"
        >
          {String(launch.error)}
        </p>
      )}
    </div>
  );
}
