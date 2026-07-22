import { useEffect, useRef, type ReactNode } from "react";
import { ShadowGlyph, type ShadowGlyphName } from "../../../../components/ShadowGlyph";
import { voidClientStyles } from "../../void-client.styles";

export function SettingsHeading({ eyebrow, title, description, icon }: {
  eyebrow: string;
  title: string;
  description: string;
  icon: ShadowGlyphName;
}) {
  return (
    <header className="flex items-start gap-4">
      <span className="grid size-11 shrink-0 place-items-center rounded-lg border border-[#382248] bg-[#21152B] text-[#B455E7]">
        <ShadowGlyph name={icon} size={19} />
      </span>
      <div>
        <p className={voidClientStyles.sectionKicker}>{eyebrow}</p>
        <h2 className="mt-1 text-xl font-semibold tracking-[-0.02em] text-[#F4F4F5]">{title}</h2>
        <p className="mt-1.5 max-w-3xl text-sm leading-6 text-[#92929B]">{description}</p>
      </div>
    </header>
  );
}

export function MatrixPanel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`${voidClientStyles.flatPanel} p-5 ${className}`}>{children}</section>;
}

export function ShadowToggle({ title, description, enabled, onToggle, warning = false, disabled = false }: {
  title: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
  warning?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className={`flex min-h-[76px] items-center gap-3 rounded-xl border bg-[#111114] p-3.5 ${warning ? "border-[#59411F]" : "border-[#29292F]"}`}>
      <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${warning ? "bg-[#2B2113] text-[#FBBF24]" : "bg-[#21152B] text-[#B455E7]"}`}>
        <ShadowGlyph name={warning ? "warning" : "sliders"} size={16} />
      </span>
      <span className="min-w-0 flex-1">
        <strong className="block text-sm font-medium text-[#F4F4F5]">{title}</strong>
        <small className="mt-1 block text-xs leading-5 text-[#85858E]">{description}</small>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={title}
        disabled={disabled}
        onClick={onToggle}
        className={`relative h-7 w-12 shrink-0 cursor-pointer rounded-full border transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8B5CF6] disabled:cursor-not-allowed disabled:opacity-50 ${enabled ? warning ? "border-[#B45309] bg-[#B45309]" : "border-[#9333EA] bg-[#7E22CE]" : "border-[#3F3F46] bg-[#242429]"}`}
      >
        <span className={`absolute top-1 size-[18px] rounded-full bg-white transition-transform duration-150 ${enabled ? "translate-x-6" : "translate-x-1"}`} aria-hidden="true" />
        <span className="sr-only">{enabled ? "On" : "Off"}</span>
      </button>
    </div>
  );
}

export function SelectField({ id, label, value, onChange, children, description }: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  description?: string;
}) {
  return (
    <label htmlFor={id} className="block">
      <span className="text-xs font-semibold text-[#D4D4D8]">{label}</span>
      {description ? <span className="mt-1 block text-xs leading-5 text-[#85858E]">{description}</span> : null}
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)} className={`${voidClientStyles.input} mt-2 cursor-pointer`}>
        {children}
      </select>
    </label>
  );
}

export function ConfirmDialog({ open, title, description, confirmLabel, onConfirm, onClose, danger = true }: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
  danger?: boolean;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    cancelRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div role="presentation" className="fixed inset-0 z-[150] grid place-items-center bg-black/80 p-4" onMouseDown={onClose}>
      <section role="alertdialog" aria-modal="true" aria-labelledby="settings-confirm-title" aria-describedby="settings-confirm-description" onMouseDown={(event) => event.stopPropagation()} className="w-full max-w-md rounded-xl border border-[#34343A] bg-[#151518] p-5 shadow-2xl shadow-black/40">
        <h2 id="settings-confirm-title" className="text-lg font-semibold text-[#F4F4F5]">{title}</h2>
        <p id="settings-confirm-description" className="mt-2 text-sm leading-6 text-[#92929B]">{description}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button ref={cancelRef} type="button" onClick={onClose} className={voidClientStyles.secondaryButton}>Cancel</button>
          <button type="button" onClick={onConfirm} className={danger ? "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-[#991B1B] bg-[#7F1D1D] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#991B1B]" : voidClientStyles.primaryButton}>
            <ShadowGlyph name={danger ? "warning" : "check"} size={15} />{confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
