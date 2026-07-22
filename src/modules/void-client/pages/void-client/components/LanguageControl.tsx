import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Languages } from "lucide-react";
import { CLIENT_COPY, CLIENT_LANGUAGES } from "../../../i18n";
import { ShadowGlyph } from "../../../components/ShadowGlyph";
import { useVoidClientStore } from "../../../stores/voidClient.store";
import { voidClientStyles } from "../void-client.styles";

export function LanguageControl({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const language = useVoidClientStore((state) => state.language);
  const setLanguage = useVoidClientStore((state) => state.setLanguage);
  const reducedMotion = Boolean(useReducedMotion());
  const copy = CLIENT_COPY[language];

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      window.requestAnimationFrame(() => triggerRef.current?.focus());
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label={copy.language}
        title={copy.language}
        className={compact
          ? `grid h-12 w-full cursor-pointer place-items-center rounded-none border-0 border-l-2 border-l-transparent bg-black text-[#666666] transition-colors duration-150 hover:bg-[#111111] hover:text-white ${voidClientStyles.focusRing}`
          : `flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-none border border-[#333333] bg-[#1A1A1A] px-3 text-left text-sm font-medium text-[#A3A3A3] transition-colors duration-150 hover:bg-[#242424] hover:text-white ${voidClientStyles.focusRing}`}
      >
        {compact ? <Languages size={18} strokeWidth={1.7} /> : <FlagGlyph />}
        {!compact && <span className="min-w-0 flex-1 truncate">{copy.language}</span>}
        {!compact && <span className="text-xs font-semibold uppercase text-[#D4D4D4]">{language}</span>}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[420] grid place-items-center bg-[#111111] p-5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.15 }}
            onMouseDown={() => setOpen(false)}
          >
            <motion.section
              role="dialog"
              aria-modal="true"
              aria-labelledby="language-title"
              onMouseDown={(event) => event.stopPropagation()}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reducedMotion ? 0 : 0.15 }}
              className="w-full max-w-lg rounded-none border border-[#333333] bg-[#1A1A1A] p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 id="language-title" lang={language} className="text-xl font-semibold text-[#F5F5F5]">{copy.language}</h2>
                    <span className={`border border-[#333333] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${language === "en" ? "bg-[#242424] text-[#D4D4D4]" : "bg-[#2A2112] text-[#FCD34D]"}`}>
                      {language === "en" ? "Primary language" : "Partial localization"}
                    </span>
                  </div>
                  <p lang={language} className="mt-1 text-sm leading-5 text-[#A3A3A3]">{copy.languageDescription}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label={copy.close}
                  className={`grid size-11 cursor-pointer place-items-center rounded-none border border-[#333333] bg-[#111111] text-[#A3A3A3] transition-colors duration-150 hover:bg-[#242424] hover:text-white ${voidClientStyles.focusRing}`}
                >
                  <ShadowGlyph name="close" size={15} />
                </button>
              </div>

              <div role="note" lang="en" className="mt-5 border border-[#333333] bg-[#111111] p-4 text-xs leading-5 text-[#A3A3A3]">
                <p className="font-semibold text-[#F5F5F5]">Translation coverage</p>
                <dl className="mt-2 grid gap-2 sm:grid-cols-[88px_1fr]">
                  <dt className="font-semibold text-[#D4D4D4]">Translated</dt>
                  <dd>Navigation, section names, the language control, and selected launch-console actions.</dd>
                  <dt className="font-semibold text-[#D4D4D4]">English</dt>
                  <dd>Content pages, account sign-in, settings forms, window controls, and native error messages.</dd>
                </dl>
              </div>

              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                {CLIENT_LANGUAGES.map((item) => (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => {
                      setLanguage(item.code);
                      setOpen(false);
                    }}
                    aria-pressed={language === item.code}
                    className={`flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-none border border-[#333333] px-4 text-left text-sm font-medium transition-colors duration-150 ${language === item.code ? "bg-[#7B2CBF] text-white" : "bg-[#111111] text-[#D4D4D4] hover:bg-[#242424] hover:text-white"} ${voidClientStyles.focusRing}`}
                  >
                    <span lang={item.code}>{item.label}</span>
                    <span lang="en" className={`text-[10px] font-semibold uppercase tracking-[0.08em] ${language === item.code ? "text-white" : item.coverage === "complete" ? "text-[#A3A3A3]" : "text-[#FCD34D]"}`}>
                      {item.coverage === "complete" ? "Complete" : "Partial"}
                    </span>
                  </button>
                ))}
              </div>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function FlagGlyph() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M5 3v18M6 4h11l-2.2 4L19 12H6" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="miter" />
      <path d="m7 5 7.5 1.4L13 9l2.8 2H7V5Z" fill="currentColor" />
    </svg>
  );
}
