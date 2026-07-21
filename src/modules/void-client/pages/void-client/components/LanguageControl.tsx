import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CLIENT_COPY, CLIENT_LANGUAGES } from "../../../i18n";
import { ShadowGlyph } from "../../../components/ShadowGlyph";
import { useVoidClientStore } from "../../../stores/voidClient.store";
import { voidClientStyles } from "../void-client.styles";

export function LanguageControl() {
  const [open, setOpen] = useState(false);
  const language = useVoidClientStore((state) => state.language);
  const setLanguage = useVoidClientStore((state) => state.setLanguage);
  const reducedMotion = Boolean(useReducedMotion());
  const copy = CLIENT_COPY[language];

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={copy.language} title={copy.language} className={`fixed bottom-5 left-5 z-[160] grid size-12 cursor-pointer place-items-center rounded-xl border border-[#9d5ce0]/28 bg-[#0F0B15]/94 text-[#d8b4fe] shadow-[0_14px_45px_rgba(0,0,0,.62),0_0_28px_rgba(123,44,191,.16)] backdrop-blur-2xl transition duration-200 hover:border-[#c084fc]/58 hover:bg-[#7B2CBF]/16 ${voidClientStyles.focusRing}`}><FlagGlyph /></button>
      <AnimatePresence>
        {open && <motion.div className="fixed inset-0 z-[420] grid place-items-center bg-black/70 p-5 backdrop-blur-xl" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={() => setOpen(false)}><motion.section role="dialog" aria-modal="true" aria-labelledby="language-title" onMouseDown={(event) => event.stopPropagation()} initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: .98 }} transition={{ duration: reducedMotion ? .01 : .22, ease: [0.22, 1, 0.36, 1] }} className="w-full max-w-md border border-[#9d5ce0]/32 bg-[#0F0B15]/98 p-6 shadow-[0_34px_110px_rgba(0,0,0,.86),0_0_60px_rgba(123,44,191,.18)] [clip-path:polygon(0_0,94%_0,100%_10%,100%_100%,6%_100%,0_90%)]"><div className="flex items-start justify-between gap-4"><span className="grid size-12 place-items-center border border-[#9d5ce0]/28 bg-[#7B2CBF]/12 text-[#d8b4fe]"><FlagGlyph /></span><button type="button" onClick={() => setOpen(false)} aria-label={copy.close} className={`grid size-11 cursor-pointer place-items-center text-[#93879c] transition hover:bg-white/[0.05] hover:text-white ${voidClientStyles.focusRing}`}><ShadowGlyph name="close" size={15} /></button></div><h2 id="language-title" className="font-display mt-5 text-xl font-black">{copy.language}</h2><p className="mt-2 text-xs leading-5 text-[#a79bad]">{copy.languageDescription}</p><div className="mt-5 grid gap-2 sm:grid-cols-2">{CLIENT_LANGUAGES.map((item) => <button key={item.code} type="button" onClick={() => { setLanguage(item.code); setOpen(false); }} aria-pressed={language === item.code} className={`min-h-12 cursor-pointer border px-4 text-left text-xs font-bold transition duration-200 ${language === item.code ? "border-[#c084fc]/55 bg-[#7B2CBF]/18 text-white shadow-[0_0_22px_rgba(123,44,191,.15)]" : "border-white/[0.075] bg-black/20 text-[#aaa0b1] hover:border-white/[0.16] hover:text-white"} ${voidClientStyles.focusRing}`}>{item.label}</button>)}</div></motion.section></motion.div>}
      </AnimatePresence>
    </>
  );
}

function FlagGlyph() {
  return <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M5 3v18M6 4h11l-2.2 4L19 12H6" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="miter" /><path d="m7 5 7.5 1.4L13 9l2.8 2H7V5Z" fill="currentColor" opacity=".28" /></svg>;
}
