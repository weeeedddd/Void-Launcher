import { useEffect, useRef, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ShadowGlyph, type ShadowGlyphName } from "../../../../components/ShadowGlyph";
import { voidClientStyles } from "../../void-client.styles";

export function SettingsHeading({ eyebrow, title, description, icon }: { eyebrow: string; title: string; description: string; icon: ShadowGlyphName }) {
  return (
    <header className="flex items-start gap-4">
      <span className="grid size-12 shrink-0 place-items-center border border-[#a855f7]/28 bg-[#7B2CBF]/12 text-[#d8b4fe] shadow-[0_0_26px_rgba(123,44,191,0.15)] [clip-path:polygon(12%_0,100%_0,88%_100%,0_82%)]">
        <ShadowGlyph name={icon} size={22} className="filter drop-shadow-[0_0_9px_currentColor]" />
      </span>
      <span>
        <span className={voidClientStyles.sectionKicker}>{eyebrow}</span>
        <h2 className="font-display mt-1 text-2xl font-black tracking-[-0.04em] text-white">{title}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#94879f]">{description}</p>
      </span>
    </header>
  );
}

export function MatrixPanel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`relative overflow-hidden border border-white/[0.075] bg-[radial-gradient(circle_at_86%_0%,rgba(123,44,191,0.13),transparent_33%),linear-gradient(145deg,rgba(20,15,27,0.92),rgba(7,5,10,0.88))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.055),0_24px_70px_rgba(0,0,0,0.34)] backdrop-blur-2xl [clip-path:polygon(0_0,97%_0,100%_10%,100%_100%,3%_100%,0_90%)] sm:p-6 ${className}`}>{children}</section>;
}

export function ShadowToggle({ title, description, enabled, onToggle, warning = false, disabled = false }: { title: string; description: string; enabled: boolean; onToggle: () => void; warning?: boolean; disabled?: boolean }) {
  return (
    <div className={`flex min-h-20 items-center gap-4 border p-4 transition ${warning ? "border-red-400/18 bg-red-500/[0.035]" : "border-white/[0.065] bg-black/20 hover:border-[#7B2CBF]/24"} [clip-path:polygon(0_0,97%_0,100%_22%,100%_100%,3%_100%,0_76%)]`}>
      <span className={`grid size-10 shrink-0 place-items-center border ${warning ? "border-red-400/25 bg-red-500/[0.07] text-red-300" : "border-[#7B2CBF]/20 bg-[#7B2CBF]/10 text-[#c796ff]"} [clip-path:polygon(14%_0,100%_0,86%_100%,0_84%)]`}>
        <ShadowGlyph name={warning ? "warning" : "sliders"} size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <strong className="block text-xs text-white">{title}</strong>
        <small className="mt-1 block text-[10px] leading-4 text-[#807487]">{description}</small>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={title}
        disabled={disabled}
        onClick={onToggle}
        className={`relative h-8 w-14 shrink-0 cursor-pointer rounded-full border transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a855f7] disabled:cursor-not-allowed disabled:opacity-40 ${enabled ? warning ? "border-red-300/50 bg-red-500/35" : "border-[#a855f7]/55 bg-[#7B2CBF]/45 shadow-[0_0_18px_rgba(123,44,191,0.24)]" : "border-white/[0.11] bg-black/45"}`}
      >
        <motion.span animate={{ x: enabled ? 27 : 4 }} transition={{ type: "spring", stiffness: 520, damping: 32 }} className={`absolute top-[4px] left-0 size-[22px] rounded-full ${enabled ? warning ? "bg-red-200 shadow-[0_0_10px_rgba(248,113,113,0.65)]" : "bg-[#d8b4fe] shadow-[0_0_10px_rgba(216,180,254,0.65)]" : "bg-[#655a70]"}`} />
      </button>
    </div>
  );
}

export function SelectField({ id, label, value, onChange, children, description }: { id: string; label: string; value: string; onChange: (value: string) => void; children: ReactNode; description?: string }) {
  return (
    <label htmlFor={id} className="block">
      <span className="text-[9px] font-black tracking-[0.15em] text-[#c796ff] uppercase">{label}</span>
      {description && <span className="mt-1 block text-[10px] leading-4 text-[#776c82]">{description}</span>}
      <span className="relative mt-2 block">
        <select id={id} value={value} onChange={(event) => onChange(event.target.value)} className={`${voidClientStyles.input} cursor-pointer appearance-none pr-11`}>
          {children}
        </select>
        <ShadowGlyph name="chevronDown" size={14} className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-[#9b7eb2]" />
      </span>
    </label>
  );
}

export function ConfirmDialog({ open, title, description, confirmLabel, onConfirm, onClose, danger = true }: { open: boolean; title: string; description: string; confirmLabel: string; onConfirm: () => void; onClose: () => void; danger?: boolean }) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div role="presentation" className="fixed inset-0 z-[150] grid place-items-center bg-black/78 p-5 backdrop-blur-xl" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
          <motion.section role="alertdialog" aria-modal="true" aria-labelledby="settings-confirm-title" aria-describedby="settings-confirm-description" onMouseDown={(event) => event.stopPropagation()} initial={{ opacity: 0, scale: 0.94, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 8 }} className="relative w-full max-w-md overflow-hidden border border-red-400/25 bg-[radial-gradient(circle_at_84%_0%,rgba(190,24,93,0.22),transparent_36%),rgba(10,6,12,0.98)] p-6 shadow-[0_38px_120px_rgba(0,0,0,0.85),0_0_55px_rgba(190,24,93,0.13)] [clip-path:polygon(0_0,94%_0,100%_12%,100%_100%,6%_100%,0_88%)]">
            <span className="grid size-12 place-items-center border border-red-400/30 bg-red-500/[0.09] text-red-300 [clip-path:polygon(14%_0,100%_0,86%_100%,0_84%)]"><ShadowGlyph name="warning" size={23} /></span>
            <h2 id="settings-confirm-title" className="font-display mt-5 text-xl font-black text-white">{title}</h2>
            <p id="settings-confirm-description" className="mt-2 text-xs leading-5 text-[#a99cac]">{description}</p>
            <div className="mt-6 flex justify-end gap-2">
              <button ref={cancelRef} type="button" onClick={onClose} className={voidClientStyles.secondaryButton}>Cancel</button>
              <button type="button" onClick={onConfirm} className={danger ? "inline-flex cursor-pointer items-center gap-2 rounded-xl border border-red-400/35 bg-[linear-gradient(110deg,#310912,#671235,#3b0d57)] px-4 py-2.5 text-xs font-black text-red-100 shadow-[0_0_22px_rgba(190,24,93,0.18)] transition hover:border-red-300/55 hover:brightness-125 focus-visible:outline-2 focus-visible:outline-red-300" : voidClientStyles.primaryButton}><ShadowGlyph name={danger ? "warning" : "check"} size={15} />{confirmLabel}</button>
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
