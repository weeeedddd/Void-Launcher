import { useState } from "react";
import { motion } from "motion/react";
import { Ghost, Play } from "lucide-react";
import { GlassCard, WidgetHeader } from "@/components/dashboard/GlassCard";
import { useInterval } from "@/hooks/useInterval";

/** Seconds → "HH:MM:SS". */
function formatElapsed(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

/**
 * Discord Rich Presence preview — a shadow-themed mock of how the client
 * appears on the user's Discord profile. The elapsed timer ticks live in the
 * browser every second (starts at 02:45:12).
 */
export function DiscordPresenceWidget() {
  const [elapsed, setElapsed] = useState(2 * 3600 + 45 * 60 + 12);
  useInterval(() => setElapsed((e) => e + 1), 1000);

  return (
    <GlassCard className="p-6">
      <WidgetHeader
        icon={Ghost}
        title="Discord Rich Presence"
        right={
          <span className="flex items-center gap-1.5 text-[11px] tracking-wide text-[#46E0A8] uppercase">
            <span className="h-2 w-2 rounded-full bg-[#46E0A8]" /> Broadcasting
          </span>
        }
      />

      {/* Presence card, styled like a Discord "Playing a game" block */}
      <div className="rounded-xl border border-[#7B2CBF]/20 bg-[#0d0a16] p-4">
        <div className="flex gap-4">
          {/* Large art + small art badge */}
          <div className="relative shrink-0">
            <div
              className="grid h-[72px] w-[72px] place-items-center rounded-lg border border-[#9D4EDD]/40"
              style={{ background: "radial-gradient(circle at 40% 30%, #7B2CBF, #050505)" }}
            >
              <motion.div
                animate={{ rotate: [0, 8, -8, 0], scale: [1, 1.06, 1] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              >
                <Ghost className="h-8 w-8 text-[#C77DFF]" />
              </motion.div>
            </div>
            {/* small art: play badge */}
            <div className="absolute -right-2 -bottom-2 grid h-7 w-7 place-items-center rounded-full border-2 border-[#0d0a16] bg-[#7B2CBF]">
              <Play className="h-3 w-3 fill-white text-white" />
            </div>
          </div>

          {/* Details */}
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold tracking-[0.2em] text-[#9D4EDD] uppercase">Playing a game</div>
            <div className="mt-1 truncate font-semibold text-[#EAE4F4]">Step Beyond the Ordinary Client</div>
            <div className="truncate text-[13px] text-[#9A90B2]">In the Void · Atomic SMP</div>
            <div className="mt-1 font-mono text-[12px] text-[#9A90B2]">
              Elapsed Time:{" "}
              <span className="font-semibold text-[#46E0A8] tabular-nums">{formatElapsed(elapsed)}</span>
              <motion.span
                className="ml-0.5 inline-block text-[#46E0A8]"
                animate={{ opacity: [1, 1, 0, 0] }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear", times: [0, 0.5, 0.5, 1] }}
              >
                ▍
              </motion.span>
            </div>
          </div>
        </div>

        {/* Mock RP buttons (non-functional preview) */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="cursor-default rounded-lg border border-[#7B2CBF]/25 bg-[#110D17] py-2 text-center text-xs font-semibold text-[#C77DFF]">
            Join Shadow Garden
          </div>
          <div className="cursor-default rounded-lg border border-[#7B2CBF]/25 bg-[#110D17] py-2 text-center text-xs font-semibold text-[#9A90B2]">
            View Profile
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
