import { memo, useCallback } from "react";
import { motion } from "motion/react";
import { NAVIGATION_ITEMS } from "../../../constants";
import { useVoidClientStore } from "../../../stores/voidClient.store";
import type { VoidView } from "../../../types";
import { ShadowGlyph } from "../../../components/ShadowGlyph";
import { voidClientStyles } from "../void-client.styles";

export const VoidSidebar = memo(function VoidSidebar() {
  const activeView = useVoidClientStore((state) => state.activeView);
  const setActiveView = useVoidClientStore((state) => state.setActiveView);

  const navigate = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    setActiveView(event.currentTarget.value as VoidView);
  }, [setActiveView]);

  return (
    <aside className={voidClientStyles.sidebar} aria-label="Void Client navigation">
      <div className="mb-6 px-3">
        <p className={voidClientStyles.sectionKicker}>Shadow Garden</p>
        <p className="font-display mt-1 text-sm font-black tracking-[0.17em]">VOID LAUNCHER</p>
      </div>

      <nav className="space-y-1.5">
        {NAVIGATION_ITEMS.map((item) => {
          const active = item.id === activeView;
          return (
            <motion.button
              key={item.id}
              type="button"
              value={item.id}
              onClick={navigate}
              whileHover={{ x: 3 }}
              whileTap={{ scale: 0.985 }}
              className={`group relative flex w-full cursor-pointer items-center gap-3 overflow-hidden rounded-2xl border px-3 py-3 text-left transition ${voidClientStyles.focusRing} ${active ? "border-[#8f48cf]/40 bg-[linear-gradient(110deg,rgba(123,44,191,0.22),rgba(29,17,42,0.5))] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_0_24px_rgba(123,44,191,0.12)]" : "border-transparent text-[#776c82] hover:border-white/[0.06] hover:bg-white/[0.03] hover:text-white"}`}
            >
              {active && <motion.span layoutId="void-nav-active" className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-[#bd7aff] shadow-[0_0_14px_rgba(189,122,255,0.9)]" />}
              <span className={`grid size-9 shrink-0 place-items-center rounded-xl border transition ${active ? "border-[#a855f7]/35 bg-[#7B2CBF]/15 text-[#d8b4fe]" : "border-white/[0.055] bg-black/20 text-[#655a70] group-hover:text-[#c796ff]"}`}>
                <ShadowGlyph name={item.icon} size={18} className="filter drop-shadow-[0_0_6px_currentColor]" />
              </span>
              <span className="min-w-0">
                <span className="block text-[10px] font-semibold tracking-[0.08em] text-[#817488] uppercase">{item.eyebrow}</span>
                <span className="mt-0.5 block truncate text-xs font-bold">{item.label}</span>
              </span>
            </motion.button>
          );
        })}
      </nav>

      <div className="mt-auto rounded-2xl border border-[#7B2CBF]/20 bg-[radial-gradient(circle_at_80%_0%,rgba(123,44,191,0.2),transparent_48%),rgba(0,0,0,0.24)] p-3.5">
        <div className="flex items-center gap-2 text-[#4cff9a]">
          <ShadowGlyph name="shield" size={15} className="filter drop-shadow-[0_0_7px_currentColor]" />
          <span className="text-[10px] font-semibold tracking-[0.1em] uppercase">Launcher protected</span>
        </div>
        <p className="mt-2 text-[10px] leading-4 text-[#776c82]">Tokens remain sealed inside the Rust runtime.</p>
      </div>
    </aside>
  );
});
