import { useState } from "react";
import { motion } from "motion/react";
import { Coins, Flame, ShieldCheck } from "lucide-react";
import { DashboardSidebar, type DashNav } from "@/components/dashboard/DashboardSidebar";
import { PlayHeroWidget } from "@/components/dashboard/widgets/PlayHeroWidget";
import { StreakCoinsWidget } from "@/components/dashboard/widgets/StreakCoinsWidget";
import { ServerStatusWidget } from "@/components/dashboard/widgets/ServerStatusWidget";
import { DiscordPresenceWidget } from "@/components/dashboard/widgets/DiscordPresenceWidget";
import { usePlayerStore } from "@/stores/player";

/**
 * VIEW 2 — Main Dashboard (browser-only).
 *
 * Layout: dockable sidebar + scrollable content. The sidebar sets its own CSS
 * `order`; content is `order-1`, so the whole thing mirrors when the rail
 * docks right. Everything below the sidebar is the widgets grid.
 */
export default function DashboardView() {
  const [nav, setNav] = useState<DashNav>("home");
  const coins = usePlayerStore((s) => s.coins);
  const streak = usePlayerStore((s) => s.streak);

  return (
    <div className="flex h-full w-full overflow-hidden">
      <DashboardSidebar active={nav} onNavigate={setNav} />

      {/* Content (order-1 keeps it between the two possible sidebar positions) */}
      <motion.main layout className="order-1 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-8 py-7">
          {/* Top bar */}
          <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-[11px] tracking-[0.25em] text-[#5f5878] uppercase">Welcome back, operative</div>
              <h1 className="font-serif text-3xl font-black">
                Lord{" "}
                <span className="bg-gradient-to-b from-white to-[#C77DFF] bg-clip-text text-transparent">Shadow</span>
              </h1>
            </div>

            <div className="flex items-center gap-3">
              {/* Coins pill (synced with the gacha) */}
              <div className="flex items-center gap-2 rounded-lg border border-[#7B2CBF]/25 bg-[#110D17]/70 px-3 py-2 backdrop-blur-xl">
                <Coins className="h-4 w-4 text-[#C77DFF]" />
                <motion.span key={coins} initial={{ opacity: 0.5 }} animate={{ opacity: 1 }} className="text-sm font-semibold text-[#EAE4F4] tabular-nums">
                  {coins.toLocaleString()}
                </motion.span>
              </div>
              {/* Streak pill */}
              <div className="flex items-center gap-2 rounded-lg border border-[#7B2CBF]/25 bg-[#110D17]/70 px-3 py-2 backdrop-blur-xl">
                <Flame className="h-4 w-4 text-[#E0B646]" />
                <span className="text-sm font-semibold text-[#EAE4F4]">{streak}</span>
              </div>
              {/* Anti-cheat */}
              <motion.span
                className="inline-flex items-center gap-2 rounded-lg border border-[#46E0A8]/40 bg-[#46E0A8]/10 px-3 py-2 text-[11px] font-semibold tracking-[0.1em] text-[#46E0A8] uppercase"
                animate={{ boxShadow: ["0 0 0 rgba(70,224,168,0)", "0 0 18px -4px rgba(70,224,168,0.55)", "0 0 0 rgba(70,224,168,0)"] }}
                transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
              >
                <ShieldCheck className="h-4 w-4" />
                Anti-Cheat
              </motion.span>
            </div>
          </div>

          {/* Widgets grid */}
          <div className="grid grid-cols-12 gap-5">
            <div className="col-span-12">
              <PlayHeroWidget />
            </div>
            <div className="col-span-12 lg:col-span-5">
              <StreakCoinsWidget />
            </div>
            <div className="col-span-12 lg:col-span-7">
              <DiscordPresenceWidget />
            </div>
            <div className="col-span-12">
              <ServerStatusWidget />
            </div>
          </div>

          <p className="mt-6 text-center text-[11px] text-[#5f5878]">
            Browser-only preview · live data is simulated · “{nav}” section
          </p>
        </div>
      </motion.main>
    </div>
  );
}
