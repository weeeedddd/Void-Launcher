import { useEffect } from "react";
import { motion } from "motion/react";
import { useStageStore } from "@/stores/stage";

/**
 * VIEW 0 — Startup pop-up.
 * A tiny obsidian modal with a layered magic-circle spinner and the signature
 * voice line. Auto-advances to the next stage after the line "plays"; a subtle
 * Skip is offered for the impatient.
 */
export function StartupScreen() {
  const completeStartup = useStageStore((s) => s.completeStartup);

  useEffect(() => {
    const timer = setTimeout(completeStartup, 2800);
    return () => clearTimeout(timer);
  }, [completeStartup]);

  return (
    <div className="flex h-full w-full items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-[300px] rounded-2xl border border-[#7B2CBF]/40 bg-[#110D17]/80 p-8 text-center backdrop-blur-xl"
        style={{ boxShadow: "0 30px 80px -20px #000, 0 0 60px -22px rgba(123,44,191,0.6)" }}
      >
        <div className="mb-6 text-[11px] tracking-[0.4em] text-[#9D4EDD] uppercase">◆ Void Launcher ◆</div>

        {/* Layered magic-circle spinner */}
        <div className="relative mx-auto h-28 w-28">
          <motion.span
            className="absolute inset-0 rounded-full border border-dashed border-[#9D4EDD]/60"
            animate={{ rotate: 360 }}
            transition={{ duration: 9, repeat: Infinity, ease: "linear" }}
          />
          <motion.span
            className="absolute inset-3 rounded-full border-2 border-transparent border-t-[#C77DFF] border-r-[#7B2CBF]"
            animate={{ rotate: -360 }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          />
          <motion.span
            className="absolute inset-8 rounded-full border border-[#7B2CBF]/50"
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          />
          {/* pulsing rune core */}
          <motion.span
            className="absolute inset-0 grid place-items-center"
            animate={{ opacity: [0.55, 1, 0.55], scale: [0.9, 1.08, 0.9] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          >
            <span
              className="h-6 w-6 rotate-45"
              style={{
                background: "linear-gradient(135deg,#C77DFF,#7B2CBF)",
                boxShadow: "0 0 22px rgba(123,44,191,0.9)",
              }}
            />
          </motion.span>
        </div>

        <div className="mt-6 text-[12px] text-[#9A90B2]">Summoning the shadows…</div>
        <div
          className="mt-2 font-serif text-[15px] italic"
          style={{ color: "#C77DFF", textShadow: "0 0 18px rgba(123,44,191,0.6)" }}
        >
          [Voice Audio: “I… am… Atomic.”]
        </div>

        <button
          onClick={completeStartup}
          className="mt-6 cursor-pointer text-[11px] tracking-widest text-[#5f5878] uppercase transition-colors hover:text-[#C77DFF]"
        >
          Skip →
        </button>
      </motion.div>
    </div>
  );
}
