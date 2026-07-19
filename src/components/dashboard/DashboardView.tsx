import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Blocks, Settings, Shirt } from "lucide-react";
import { DashboardSidebar, type DashNav } from "@/components/dashboard/DashboardSidebar";
import { HomeView } from "@/components/dashboard/views/HomeView";
import { VoidView } from "@/components/dashboard/views/VoidView";
import { PlaceholderView } from "@/components/dashboard/views/PlaceholderView";

/**
 * VIEW 2 — Main Dashboard shell (browser-only).
 *
 * Persistent dockable sidebar + a content area that routes between sections.
 * The active section cross-fades via AnimatePresence; `motion.main layout`
 * handles the reflow when the sidebar docks to the other side.
 */
export default function DashboardView() {
  const [nav, setNav] = useState<DashNav>("home");

  const renderView = () => {
    switch (nav) {
      case "home":
      case "play":
        return <HomeView />;
      case "void":
        return <VoidView />;
      case "builder":
        return <PlaceholderView icon={Blocks} title="Modpack Builder" message="Tabbed Mods / Resource Packs / Shaders / Data Packs with a CurseForge ↔ Modrinth source — coming next." />;
      case "cosmetics":
        return <PlaceholderView icon={Shirt} title="Shadow Vault" message="Everything you've pulled from the gacha will live here." />;
      case "settings":
        return <PlaceholderView icon={Settings} title="Settings" message="Client, graphics and account preferences." />;
    }
  };

  return (
    <div className="flex h-full w-full overflow-hidden">
      <DashboardSidebar active={nav} onNavigate={setNav} />

      <motion.main layout className="order-1 min-w-0 flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={nav}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="h-full"
          >
            {renderView()}
          </motion.div>
        </AnimatePresence>
      </motion.main>
    </div>
  );
}
