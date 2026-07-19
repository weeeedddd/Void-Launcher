import { useState } from "react";
import { motion } from "motion/react";
import { Server, Users } from "lucide-react";
import { GlassCard, WidgetHeader } from "@/components/dashboard/GlassCard";
import { SERVERS } from "@/lib/mockData";
import { useInterval } from "@/hooks/useInterval";
import { cn } from "@/lib/utils";

interface LiveServer {
  name: string;
  host: string;
  region: string;
  ping: number;
  players: number;
}

/** Ping → quality bucket (color + how many signal bars light up). */
function quality(ping: number) {
  if (ping < 45) return { color: "#46E0A8", bars: 4 };
  if (ping < 85) return { color: "#E0B646", bars: 3 };
  return { color: "#FF4D6D", bars: 2 };
}

/**
 * Live server status — a browser-only simulation. Every 2s the ping does a
 * small random walk around each server's base value and the player counts
 * jitter, so the panel feels "live" without any network.
 */
export function ServerStatusWidget() {
  const [servers, setServers] = useState<LiveServer[]>(() =>
    SERVERS.map((s) => ({ name: s.name, host: s.host, region: s.region, ping: s.basePing, players: s.players })),
  );

  useInterval(() => {
    setServers((list) =>
      list.map((s, idx) => {
        const base = SERVERS[idx].basePing;
        // Random walk that stays near the base ping.
        const drift = (Math.random() - 0.5) * 10;
        const ping = Math.max(6, Math.round(s.ping * 0.6 + (base + drift) * 0.4));
        const players = Math.max(1, s.players + Math.round((Math.random() - 0.5) * 40));
        return { ...s, ping, players };
      }),
    );
  }, 2000);

  return (
    <GlassCard className="p-6">
      <WidgetHeader
        icon={Server}
        title="Live Server Status"
        right={
          <span className="flex items-center gap-1.5 text-[11px] tracking-wide text-[#46E0A8] uppercase">
            <motion.span
              className="h-2 w-2 rounded-full bg-[#46E0A8]"
              animate={{ opacity: [1, 0.3, 1], scale: [1, 0.8, 1] }}
              transition={{ duration: 1.6, repeat: Infinity }}
            />
            Live
          </span>
        }
      />

      <div className="flex flex-col">
        {servers.map((s, idx) => {
          const q = quality(s.ping);
          return (
            <div
              key={s.host}
              className={cn(
                "flex items-center gap-3 py-3",
                idx !== servers.length - 1 && "border-b border-[#7B2CBF]/10",
              )}
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: q.color, boxShadow: `0 0 10px ${q.color}` }} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-[#EAE4F4]">{s.name}</div>
                <div className="flex items-center gap-2 text-[11px] text-[#5f5878]">
                  <span className="truncate">{s.host}</span>
                  <span className="rounded border border-[#7B2CBF]/20 px-1">{s.region}</span>
                </div>
              </div>

              {/* players */}
              <div className="hidden items-center gap-1.5 text-xs text-[#9A90B2] sm:flex">
                <Users className="h-3.5 w-3.5" />
                <motion.span key={s.players} initial={{ opacity: 0.4 }} animate={{ opacity: 1 }} className="tabular-nums">
                  {s.players.toLocaleString()}
                </motion.span>
              </div>

              {/* signal bars */}
              <div className="flex items-end gap-0.5" style={{ height: 16 }}>
                {[5, 9, 13, 16].map((h, i) => (
                  <span
                    key={i}
                    className="w-1 rounded-sm transition-colors"
                    style={{ height: h, background: i < q.bars ? q.color : "#2a2438" }}
                  />
                ))}
              </div>

              {/* ping */}
              <div className="w-16 text-right">
                <motion.div
                  key={s.ping}
                  initial={{ opacity: 0.4, y: -2 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="font-serif text-lg font-bold tabular-nums"
                  style={{ color: q.color }}
                >
                  {s.ping}
                  <span className="ml-0.5 text-[10px] font-normal text-[#5f5878]">ms</span>
                </motion.div>
              </div>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}
