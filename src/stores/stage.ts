import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * The launcher's top-level *phases* (distinct from the in-dashboard nav tabs
 * in `stores/ui.ts`). This is the "global routing" that the Framer Motion
 * page transitions animate between:
 *
 *   startup ──▶ installer ──▶ dashboard
 *      │                          ▲
 *      └──── (if already installed)┘
 */
export type LauncherStage = "startup" | "installer" | "dashboard";

interface StageState {
  stage: LauncherStage;
  /** Persisted: once the client is set up, skip the installer on next launch. */
  installed: boolean;

  setStage: (stage: LauncherStage) => void;
  /** Startup splash finished → installer, or straight to dashboard if installed. */
  completeStartup: () => void;
  /** Installer's "PREPARE & DOWNLOAD" finished → dashboard, mark installed. */
  completeInstall: () => void;
  /** Replay the intro from the top (handy in dev / a "reset" action). */
  resetLauncher: () => void;
}

export const useStageStore = create<StageState>()(
  persist(
    (set, get) => ({
      // Always boot at the splash; `completeStartup` then routes by `installed`.
      stage: "startup",
      installed: false,

      setStage: (stage) => set({ stage }),
      completeStartup: () => set({ stage: get().installed ? "dashboard" : "installer" }),
      completeInstall: () => set({ installed: true, stage: "dashboard" }),
      resetLauncher: () => set({ stage: "startup" }),
    }),
    {
      name: "void-stage",
      // Only remember whether setup is done — the current stage is always
      // recomputed from the splash so the intro can play.
      partialize: (s) => ({ installed: s.installed }),
    },
  ),
);
