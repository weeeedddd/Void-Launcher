import { useState } from "react";
import { motion } from "motion/react";
import { Check, FolderOpen, ShieldCheck } from "lucide-react";
import { ActionButton } from "@/components/ui/ActionButton";
import { useStageStore } from "@/stores/stage";
import { cn } from "@/lib/utils";

/**
 * VIEW 1 — Installer / Setup.
 *
 * This is the *starter shell* for the full installer (item 2 in the spec):
 * a two-pane glass panel with the character render slot, the Anti-Cheat badge,
 * install path, the three mandatory agreements, the Microsoft sign-in button
 * and — the star — the premium "PREPARE & DOWNLOAD CLIENT" ActionButton.
 *
 * Wiring is intentionally light so the AAA button can be seen in context;
 * flesh out the account/download flow when we build the real installer.
 */
export function InstallerStage() {
  const completeInstall = useStageStore((s) => s.completeInstall);

  const [checks, setChecks] = useState({ tos: false, privacy: false, adult: false });
  const [renderMissing, setRenderMissing] = useState(false);
  const allAgreed = checks.tos && checks.privacy && checks.adult;

  const toggle = (key: keyof typeof checks) => setChecks((c) => ({ ...c, [key]: !c[key] }));

  return (
    <div className="flex h-full w-full items-center justify-center overflow-auto p-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="grid w-full max-w-4xl overflow-hidden rounded-2xl border border-[#7B2CBF]/25 bg-[#110D17]/70 backdrop-blur-xl md:grid-cols-[1.05fr_1fr]"
        style={{ boxShadow: "0 40px 100px -30px #000" }}
      >
        {/* ── Character render side ── */}
        <div className="relative min-h-[280px] border-b border-[#7B2CBF]/20 md:border-r md:border-b-0">
          {/* Drop a licensed render at public/renders/shadow.png to fill this. */}
          {!renderMissing && (
            <img
              src="/renders/shadow.png"
              alt="Cid Kagenou — Shadow"
              onError={() => setRenderMissing(true)}
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}
          <div
            className="absolute inset-0"
            style={{ background: "radial-gradient(80% 70% at 30% 20%, rgba(60,9,108,0.5), transparent 60%), linear-gradient(180deg,#0b0812,#050505)" }}
          />
          {renderMissing && (
            <div className="absolute inset-6 grid place-items-center rounded-xl border border-dashed border-[#9D4EDD]/50 text-center">
              <div className="px-4">
                <div className="font-serif text-[15px] tracking-wide text-[#C77DFF]">Character Render Slot</div>
                <div className="mt-2 text-[12px] text-[#5f5878]">
                  Drop your licensed <span className="text-[#EAE4F4]">Cid Kagenou (Shadow)</span> art at{" "}
                  <code className="bg-[#7B2CBF]/15 px-1.5 py-0.5 text-[#C77DFF]">public/renders/shadow.png</code>
                </div>
              </div>
            </div>
          )}
          <div className="absolute bottom-6 left-6 z-10">
            <div
              className="font-serif text-3xl leading-none font-black"
              style={{ background: "linear-gradient(180deg,#fff,#C77DFF)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}
            >
              I AM ATOMIC.
            </div>
            <div className="mt-2 text-[11px] tracking-[0.3em] text-[#9A90B2] uppercase">— The Eminence in Shadow</div>
          </div>
        </div>

        {/* ── Setup form side ── */}
        <div className="flex flex-col gap-4 p-7">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-serif text-xl font-bold text-[#EAE4F4]">Prepare the Ritual</h2>
            {/* Anti-Cheat badge */}
            <motion.span
              className="inline-flex items-center gap-2 border border-[#46E0A8]/40 bg-[#46E0A8]/10 px-3 py-1.5 text-[11px] font-semibold tracking-[0.12em] text-[#46E0A8] uppercase"
              animate={{ boxShadow: ["0 0 0 rgba(70,224,168,0)", "0 0 20px -4px rgba(70,224,168,0.6)", "0 0 0 rgba(70,224,168,0)"] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
            >
              <ShieldCheck className="h-4 w-4" /> Anti-Cheat: Active
            </motion.span>
          </div>

          {/* Install path */}
          <label className="block">
            <span className="mb-2 block text-[11px] tracking-[0.2em] text-[#5f5878] uppercase">Installation Path</span>
            <div className="flex items-center gap-2 border border-[#7B2CBF]/25 bg-[#050505]/60 px-3 py-2.5">
              <FolderOpen className="h-4 w-4 text-[#5f5878]" />
              <input
                defaultValue="C:\Games\VoidLauncher"
                className="w-full bg-transparent text-[13px] text-[#EAE4F4] outline-none"
              />
            </div>
          </label>

          {/* Mandatory agreements */}
          <div>
            <span className="mb-1 block text-[11px] tracking-[0.2em] text-[#5f5878] uppercase">Required Agreements</span>
            <Agreement checked={checks.tos} onToggle={() => toggle("tos")}>
              I accept the <b className="font-semibold text-[#EAE4F4]">Terms of Service</b>
            </Agreement>
            <Agreement checked={checks.privacy} onToggle={() => toggle("privacy")}>
              I accept the <b className="font-semibold text-[#EAE4F4]">Privacy Policy</b>
            </Agreement>
            <Agreement checked={checks.adult} onToggle={() => toggle("adult")}>
              I confirm I am <b className="font-semibold text-[#EAE4F4]">18 years or older</b>
            </Agreement>
          </div>

          {/* Microsoft sign-in */}
          <button className="flex cursor-pointer items-center gap-3 border border-[#7B2CBF]/25 bg-[#0b0810] px-4 py-3 text-[14px] text-[#EAE4F4] transition-colors hover:border-[#9D4EDD]/60 hover:bg-[#120c1c]">
            <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" aria-hidden>
              <rect x="2" y="2" width="9.2" height="9.2" fill="#F25022" />
              <rect x="12.8" y="2" width="9.2" height="9.2" fill="#7FBA00" />
              <rect x="2" y="12.8" width="9.2" height="9.2" fill="#00A4EF" />
              <rect x="12.8" y="12.8" width="9.2" height="9.2" fill="#FFB900" />
            </svg>
            Sign in with Microsoft
            <span className="ml-auto text-[11px] text-[#5f5878]">Xbox · Java Edition</span>
          </button>

          {/* THE AAA action button */}
          <ActionButton
            variant="prepare"
            fullWidth
            disabled={!allAgreed}
            onClick={completeInstall}
            className="mt-1"
          />
          {!allAgreed && (
            <p className="text-center text-[11px] text-[#5f5878]">Accept all three agreements to continue.</p>
          )}
        </div>
      </motion.div>
    </div>
  );
}

/** A single mandatory-agreement row with a custom beveled checkbox. */
function Agreement({
  checked,
  onToggle,
  children,
}: {
  checked: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full cursor-pointer items-start gap-3 py-2 text-left"
    >
      <span
        className={cn(
          "mt-0.5 grid h-5 w-5 flex-none place-items-center border transition-colors",
          checked ? "border-[#C77DFF] bg-gradient-to-b from-[#7B2CBF] to-[#3C096C]" : "border-[#7B2CBF]/40 bg-[#050505]/60",
        )}
      >
        {checked && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
      </span>
      <span className="text-[13px] text-[#9A90B2]">{children}</span>
    </button>
  );
}
