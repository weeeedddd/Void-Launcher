import { memo, useCallback } from "react";
import { Activity, Boxes, House, Newspaper, PackageSearch, Settings } from "lucide-react";
import { translatedViewLabel } from "../../../i18n";
import { useVoidClientStore } from "../../../stores/voidClient.store";
import type { VoidView } from "../../../types";
import { LanguageControl } from "./LanguageControl";
import { voidClientStyles } from "../void-client.styles";

export const VoidSidebar = memo(function VoidSidebar() {
  const activeView = useVoidClientStore((state) => state.activeView);
  const language = useVoidClientStore((state) => state.language);
  const setActiveView = useVoidClientStore((state) => state.setActiveView);

  const navigate = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    setActiveView(event.currentTarget.value as VoidView);
  }, [setActiveView]);

  const navigation: VoidView[] = ["dashboard", "deployments", "mods", "telemetry", "chronicle"];

  const iconFor = (view: VoidView) => {
    if (view === "dashboard") return <House size={18} strokeWidth={1.7} />;
    if (view === "deployments") return <Boxes size={18} strokeWidth={1.7} />;
    if (view === "mods") return <PackageSearch size={18} strokeWidth={1.7} />;
    if (view === "telemetry") return <Activity size={18} strokeWidth={1.7} />;
    if (view === "chronicle") return <Newspaper size={18} strokeWidth={1.7} />;
    return <Settings size={18} strokeWidth={1.7} />;
  };

  return (
    <aside className={voidClientStyles.sidebar} aria-label="Main navigation">
      <div className="grid h-14 shrink-0 place-items-center border-b border-[#202025]" aria-label="Void Launcher">
        <img src="/void-v-eclipse-icon.png" alt="" className="size-8 object-cover" />
      </div>

      <nav className="flex flex-1 flex-col items-stretch pt-3" aria-label="Launcher sections">
        {navigation.map((view) => {
          const active = view === activeView;

          return (
            <button
              key={view}
              type="button"
              value={view}
              onClick={navigate}
              aria-label={translatedViewLabel(language, view)}
              title={translatedViewLabel(language, view)}
              aria-current={active ? "page" : undefined}
              className={`relative grid h-12 w-full cursor-pointer place-items-center rounded-none border-0 border-l-2 transition-colors duration-150 ${voidClientStyles.focusRing} ${active ? "border-l-[#8B5CF6] bg-[#15111D] text-[#A78BFA]" : "border-l-transparent bg-black text-[#666666] hover:bg-[#111111] hover:text-white"}`}
            >
              {iconFor(view)}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-[#222222]">
        <LanguageControl compact />
        <button
          type="button"
          value="settings"
          onClick={navigate}
          aria-label={translatedViewLabel(language, "settings")}
          title={translatedViewLabel(language, "settings")}
          aria-current={activeView === "settings" ? "page" : undefined}
          className={`relative grid h-12 w-full cursor-pointer place-items-center rounded-none border-0 border-l-2 transition-colors duration-150 ${voidClientStyles.focusRing} ${activeView === "settings" ? "border-l-[#8B5CF6] bg-[#15111D] text-[#A78BFA]" : "border-l-transparent bg-black text-[#666666] hover:bg-[#111111] hover:text-white"}`}
        >
          <Settings size={18} strokeWidth={1.7} />
        </button>
      </div>
    </aside>
  );
});
