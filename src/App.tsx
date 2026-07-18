import { Sidebar } from "@/components/layout/Sidebar";
import { InstancesPage } from "@/components/instances/InstancesPage";
import { ModSearchPage } from "@/components/mods/ModSearchPage";
import { SettingsPage } from "@/components/settings/SettingsPage";
import { useUiStore } from "@/stores/ui";

/**
 * App shell: fixed sidebar on the left, active page on the right.
 * Navigation is plain state (zustand) — a router is overkill for a
 * three-page desktop app, but you can swap in TanStack Router later.
 */
export default function App() {
  const view = useUiStore((s) => s.view);

  return (
    <div className="flex h-screen select-none bg-transparent text-ink-100">
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        {view === "instances" && <InstancesPage />}
        {view === "mods" && <ModSearchPage />}
        {view === "settings" && <SettingsPage />}
      </main>
    </div>
  );
}
