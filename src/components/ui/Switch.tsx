import { useCallback } from "react";

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}

export function Switch({ checked, onCheckedChange, label, disabled = false }: SwitchProps) {
  const toggle = useCallback(() => onCheckedChange(!checked), [checked, onCheckedChange]);

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={toggle}
      className={`relative h-7 w-12 shrink-0 cursor-pointer rounded-full border transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-400 disabled:cursor-not-allowed disabled:opacity-45 ${
        checked
          ? "border-accent-400/55 bg-accent-500 shadow-[0_0_16px_rgb(123_44_191_/_0.28)]"
          : "border-white/10 bg-void-700"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 size-5.5 rounded-full bg-white shadow-md transition-transform duration-200 ${checked ? "translate-x-5" : ""}`}
      />
    </button>
  );
}
