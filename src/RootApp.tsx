import { AnimatePresence, motion, type Variants } from "motion/react";
import { ObsidianBackground } from "@/components/layout/ObsidianBackground";
import { StartupScreen } from "@/components/startup/StartupScreen";
import { InstallerStage } from "@/components/installer/InstallerStage";
import DashboardView from "@/components/dashboard/DashboardView";
import { useStageStore } from "@/stores/stage";

/**
 * ─────────────────────────────────────────────────────────────────────────
 *  ROOT LAYOUT SKELETON + GLOBAL VIEW SWITCHING
 * ─────────────────────────────────────────────────────────────────────────
 *  The obsidian backdrop is mounted once and never unmounts. On top of it,
 *  `AnimatePresence mode="wait"` cross-fades between the launcher stages so
 *  each transition fully exits before the next enters:
 *
 *      startup ──▶ installer ──▶ dashboard
 *
 *  The dashboard stage mounts the browser-only Eminence dashboard
 *  (DashboardView: dockable sidebar + widgets grid + the massive PLAY button).
 *  The earlier Tauri-backed launcher shell (App.tsx and its pages) stays in the
 *  repo for the native build but is intentionally not mounted here, so this
 *  runs flawlessly as a standard web UI.
 */

// Enter/exit choreography shared by every stage: fade + gentle scale + blur.
const stageVariants: Variants = {
  enter: { opacity: 0, scale: 1.02, filter: "blur(8px)" },
  center: { opacity: 1, scale: 1, filter: "blur(0px)" },
  exit: { opacity: 0, scale: 0.98, filter: "blur(8px)" },
};

export default function RootApp() {
  const stage = useStageStore((s) => s.stage);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#050505] text-[#EAE4F4] antialiased">
      <ObsidianBackground />

      <AnimatePresence mode="wait">
        <motion.div
          key={stage}
          variants={stageVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0"
        >
          {stage === "startup" && <StartupScreen />}
          {stage === "installer" && <InstallerStage />}
          {stage === "dashboard" && <DashboardView />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
