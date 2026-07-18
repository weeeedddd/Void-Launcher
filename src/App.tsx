import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { motion } from "motion/react";
import { Sidebar } from "@/components/layout/Sidebar";
import { InstancesPage } from "@/components/instances/InstancesPage";
import { ModSearchPage } from "@/components/mods/ModSearchPage";
import { OptimizerPage } from "@/components/optimizer/OptimizerPage";
import { SettingsPage } from "@/components/settings/SettingsPage";
import { parseDeepLink } from "@/lib/deeplink";
import { useUiStore } from "@/stores/ui";

/**
 * App shell: dockable sidebar + active page in a flex row.
 * The sidebar sets its own CSS `order` (0 or 2); main content is order 1 —
 * that's the whole left/right docking model. `motion.main layout` makes the
 * content glide when the sidebar swaps sides instead of jumping.
 */
export default function App() {
  const view = useUiStore((s) => s.view);
  const dockPreview = useUiStore((s) => s.dockPreview);
  const setView = useUiStore((s) => s.setView);
  const setPendingSearch = useUiStore((s) => s.setPendingSearch);

  // voidlauncher:// links (from the website, chat messages, …) arrive as a
  // "deep-link" event emitted by the Rust side — see src-tauri/src/lib.rs.
  useEffect(() => {
    const unlisten = listen<string[]>("deep-link", (event) => {
      const link = event.payload.map(parseDeepLink).find((l) => l !== null);
      if (!link) return;
      // Scaffold behavior: jump to the mod browser and search the shared id.
      // TODO: resolve the project via get_mod_versions and open a detail view
      //       (or run a full modpack import) instead of a plain search.
      setPendingSearch(link.projectId);
      setView("mods");
    });
    return () => {
      void unlisten.then((f) => f());
    };
  }, [setPendingSearch, setView]);

  return (
    <div className="flex h-screen select-none bg-transparent text-ink-100">
      <Sidebar />

      <motion.main layout style={{ order: 1 }} className="flex-1 overflow-y-auto">
        {view === "instances" && <InstancesPage />}
        {view === "mods" && <ModSearchPage />}
        {view === "optimizer" && <OptimizerPage />}
        {view === "settings" && <SettingsPage />}
      </motion.main>

      {/* Snap preview: glowing strip on the edge the sidebar would dock to */}
      {dockPreview && (
        <div
          className={
            "pointer-events-none fixed inset-y-0 z-50 w-1 bg-accent-500/70 blur-[1px] " +
            (dockPreview === "right" ? "right-0" : "left-0")
          }
        />
      )}
    </div>
  );
}
