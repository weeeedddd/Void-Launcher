import { AnimatePresence, motion, type Variants } from "motion/react";
import { ObsidianBackground } from "@/components/layout/ObsidianBackground";
import { StartupScreen } from "@/components/startup/StartupScreen";
import { InstallerStage } from "@/components/installer/InstallerStage";
import App from "@/App";
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
 *  The dashboard stage mounts the existing launcher shell (App.tsx: dockable
 *  sidebar + instances / mods / optimizer / settings), so nothing built so
 *  far is lost — the Eminence reskin of those inner pages is the next step.
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
          {stage === "dashboard" && <App />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
