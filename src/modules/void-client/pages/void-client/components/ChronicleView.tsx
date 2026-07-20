import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useReducedMotion,
} from "motion/react";
import { NEWS_ENTRIES } from "../../../constants";
import type { INewsEntry } from "../../../types";
import { ShadowGlyph } from "../../../components/ShadowGlyph";
import { voidClientStyles } from "../void-client.styles";

const CARD_ACCENTS = [
  {
    aura: "from-[#7B2CBF]/35 via-[#4f1a75]/10 to-transparent",
    border: "group-hover:border-[#a855f7]/42",
    ink: "text-[#d8b4fe]",
    line: "bg-[#a855f7]",
    sigil: "border-[#a855f7]/25 bg-[#7B2CBF]/10 text-[#d8b4fe]",
  },
  {
    aura: "from-[#3159c8]/30 via-[#23366c]/10 to-transparent",
    border: "group-hover:border-[#6d8cff]/38",
    ink: "text-[#9db0ff]",
    line: "bg-[#6d8cff]",
    sigil: "border-[#6d8cff]/23 bg-[#3159c8]/10 text-[#9db0ff]",
  },
  {
    aura: "from-[#8b2455]/28 via-[#4e1835]/10 to-transparent",
    border: "group-hover:border-[#d9468d]/34",
    ink: "text-[#f0a0c5]",
    line: "bg-[#d9468d]",
    sigil: "border-[#d9468d]/22 bg-[#8b2455]/10 text-[#f0a0c5]",
  },
  {
    aura: "from-[#755114]/28 via-[#46310e]/10 to-transparent",
    border: "group-hover:border-[#e2a638]/34",
    ink: "text-[#f2c46f]",
    line: "bg-[#e2a638]",
    sigil: "border-[#e2a638]/22 bg-[#755114]/10 text-[#f2c46f]",
  },
] as const;

export function ChronicleView() {
  const [selectedEntry, setSelectedEntry] = useState<INewsEntry | null>(null);
  const reducedMotion = useReducedMotion();

  const openEntry = useCallback((entry: INewsEntry) => {
    setSelectedEntry(entry);
  }, []);

  const closeEntry = useCallback(() => {
    setSelectedEntry(null);
  }, []);

  return (
    <LayoutGroup id="cult-of-diablos-chronicle">
      <div className={voidClientStyles.page}>
        <header className="relative mb-7 overflow-hidden rounded-[26px] border border-white/[0.065] bg-[radial-gradient(circle_at_84%_8%,rgba(123,44,191,0.19),transparent_28%),linear-gradient(130deg,rgba(17,13,23,0.88),rgba(5,5,5,0.74))] px-6 py-7 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_26px_90px_rgba(0,0,0,0.38)] sm:px-8 sm:py-9">
          <div className="pointer-events-none absolute top-[-90px] right-[-42px] size-72 rotate-12 rounded-full border border-[#7B2CBF]/12 shadow-[inset_0_0_72px_rgba(123,44,191,0.09),0_0_90px_rgba(123,44,191,0.08)]" />
          <div className="pointer-events-none absolute top-1/2 right-12 hidden h-px w-64 bg-[linear-gradient(90deg,transparent,rgba(168,85,247,0.38),transparent)] xl:block" />
          <div className="relative z-10 max-w-3xl">
            <div className="mb-4 flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl border border-[#a855f7]/22 bg-[#7B2CBF]/10 text-[#d8b4fe] shadow-[0_0_24px_rgba(123,44,191,0.16)]">
                <ShadowGlyph
                  name="chronicle"
                  size={19}
                  className="filter drop-shadow-[0_0_8px_currentColor]"
                />
              </span>
              <div>
                <p className={voidClientStyles.sectionKicker}>Encrypted intelligence // archive live</p>
                <p className="mt-1 text-[10px] font-bold tracking-[0.12em] text-[#655a70] uppercase">
                  Shadow Garden relay 04
                </p>
              </div>
            </div>
            <h1 className={voidClientStyles.pageTitle}>The Cult of Diablos Chronicle</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#94879f]">
              Enter the classified record of client releases, native-engine doctrine and signals moving beneath the network.
            </p>
          </div>
        </header>

        <section aria-labelledby="chronicle-feed-heading">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className={voidClientStyles.sectionKicker}>Field reports</p>
              <h2 id="chronicle-feed-heading" className="mt-1 font-display text-lg font-black tracking-[-0.025em] text-white">
                Latest transmissions
              </h2>
            </div>
            <span className={voidClientStyles.tag}>{NEWS_ENTRIES.length} decrypted entries</span>
          </div>

          <div className="grid auto-rows-fr gap-5 md:grid-cols-2 2xl:grid-cols-4">
            {NEWS_ENTRIES.map((entry, index) => (
              <ChronicleCard
                key={entry.id}
                entry={entry}
                index={index}
                onOpen={openEntry}
                reducedMotion={Boolean(reducedMotion)}
              />
            ))}
          </div>
        </section>
      </div>

      <AnimatePresence>
        {selectedEntry ? (
          <ChronicleDialog
            key={selectedEntry.id}
            entry={selectedEntry}
            onClose={closeEntry}
            reducedMotion={Boolean(reducedMotion)}
          />
        ) : null}
      </AnimatePresence>
    </LayoutGroup>
  );
}

interface ChronicleCardProps {
  entry: INewsEntry;
  index: number;
  onOpen: (entry: INewsEntry) => void;
  reducedMotion: boolean;
}

function ChronicleCard({ entry, index, onOpen, reducedMotion }: ChronicleCardProps) {
  const accent = CARD_ACCENTS[index % CARD_ACCENTS.length];

  return (
    <motion.button
      type="button"
      layoutId={`chronicle-entry-${entry.id}`}
      onClick={() => onOpen(entry)}
      aria-label={`Open ${entry.title}`}
      className={`${voidClientStyles.focusRing} group relative min-h-[330px] cursor-pointer overflow-hidden rounded-[24px] border border-white/[0.075] bg-[linear-gradient(150deg,rgba(20,15,27,0.94),rgba(7,5,9,0.9))] p-0 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.045),0_22px_56px_rgba(0,0,0,0.38)] outline-none transition-colors duration-500 ${accent.border}`}
      style={{ transformStyle: "preserve-3d" }}
      whileHover={
        reducedMotion
          ? undefined
          : {
              y: -8,
              rotateX: 2.3,
              rotateY: index % 2 === 0 ? -2.6 : 2.6,
              scale: 1.012,
            }
      }
      whileTap={reducedMotion ? undefined : { scale: 0.985 }}
      transition={{ type: "spring", stiffness: 250, damping: 24, mass: 0.75 }}
    >
      <motion.span
        layoutId={`chronicle-aura-${entry.id}`}
        className={`pointer-events-none absolute inset-x-0 top-0 h-52 bg-gradient-to-b ${accent.aura}`}
      />
      <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(117deg,transparent_23%,rgba(255,255,255,0.026)_48%,transparent_62%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      <span className="pointer-events-none absolute top-4 right-4 h-28 w-28 rotate-45 border border-white/[0.035] transition-transform duration-700 group-hover:rotate-[54deg] group-hover:scale-110" />
      <span className="relative flex h-full min-h-[330px] flex-col p-5 sm:p-6">
        <span className="flex items-start justify-between gap-3">
          <span className={`grid size-11 place-items-center rounded-[14px] border ${accent.sigil} shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]`}>
            <ShadowGlyph
              name={index % 2 === 0 ? "chronicle" : "spark"}
              size={20}
              className="filter drop-shadow-[0_0_9px_currentColor]"
            />
          </span>
          <span className="text-right">
            <span className={`block text-[8px] font-black tracking-[0.19em] uppercase ${accent.ink}`}>
              {entry.chapter}
            </span>
            <span className="mt-1 block text-[9px] text-[#665b70]">{entry.date}</span>
          </span>
        </span>

        <span className="mt-8 block">
          <span className={`text-[9px] font-black tracking-[0.17em] uppercase ${accent.ink}`}>
            {entry.category}
          </span>
          <motion.span
            layoutId={`chronicle-title-${entry.id}`}
            className="mt-2 block font-display text-[1.12rem] leading-[1.16] font-black tracking-[-0.035em] text-white"
          >
            {entry.title}
          </motion.span>
          <span className="mt-3 block text-[12px] leading-5 text-[#91849c]">{entry.summary}</span>
        </span>

        <span className="mt-auto flex items-center justify-between gap-3 pt-7">
          <span className="text-[9px] font-bold tracking-[0.09em] text-[#665b70] uppercase">
            {entry.readTime}
          </span>
          <span className={`flex items-center gap-2 text-[9px] font-black tracking-[0.11em] uppercase ${accent.ink}`}>
            Decrypt
            <span className="relative block h-px w-8 overflow-hidden bg-white/10">
              <span className={`absolute inset-y-0 left-0 w-3 ${accent.line} shadow-[0_0_9px_currentColor] transition-all duration-500 group-hover:w-full`} />
            </span>
          </span>
        </span>
      </span>
    </motion.button>
  );
}

interface ChronicleDialogProps {
  entry: INewsEntry;
  onClose: () => void;
  reducedMotion: boolean;
}

function ChronicleDialog({ entry, onClose, reducedMotion }: ChronicleDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key === "Tab") {
        event.preventDefault();
        closeButtonRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      window.requestAnimationFrame(() => triggerRef.current?.focus());
    };
  }, [onClose]);

  const keepFocusInside = useCallback((event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key === "Tab") {
      event.preventDefault();
      closeButtonRef.current?.focus();
    }
  }, []);

  const dialog = (
    <motion.div
      className="fixed inset-0 z-[120] grid place-items-center overflow-y-auto bg-[#020203]/86 p-3 backdrop-blur-2xl sm:p-6 lg:p-10"
      initial={reducedMotion ? { opacity: 1 } : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reducedMotion ? 0 : 0.22 }}
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <motion.article
        layoutId={`chronicle-entry-${entry.id}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onKeyDown={keepFocusInside}
        className="relative my-auto w-full max-w-5xl overflow-hidden rounded-[30px] border border-[#a855f7]/22 bg-[radial-gradient(circle_at_80%_0%,rgba(123,44,191,0.25),transparent_33%),linear-gradient(145deg,rgba(21,15,29,0.98),rgba(5,5,6,0.98))] shadow-[inset_0_1px_0_rgba(255,255,255,0.075),0_48px_140px_rgba(0,0,0,0.78),0_0_80px_rgba(123,44,191,0.13)]"
        transition={{ type: "spring", stiffness: 220, damping: 27, mass: 0.82 }}
      >
        <motion.div
          layoutId={`chronicle-aura-${entry.id}`}
          className="pointer-events-none absolute inset-x-0 top-0 h-[460px] bg-[radial-gradient(ellipse_at_70%_0%,rgba(123,44,191,0.31),transparent_48%)]"
        />
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute top-[-195px] right-[-110px] size-[520px] rotate-12 rounded-full border border-[#b56cff]/12 shadow-[inset_0_0_120px_rgba(123,44,191,0.06)]" />
          <div className="absolute top-[-135px] right-[-48px] size-[390px] -rotate-12 border border-[#6d8cff]/[0.055]" />
          <div className="absolute bottom-12 left-0 h-px w-1/2 bg-[linear-gradient(90deg,rgba(168,85,247,0.5),transparent)]" />
        </div>

        <header className="relative border-b border-white/[0.065] px-6 pt-7 pb-8 sm:px-10 sm:pt-10 lg:px-14 lg:pt-12">
          <div className="flex items-start justify-between gap-6">
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-[14px] border border-[#a855f7]/25 bg-[#7B2CBF]/11 text-[#d8b4fe] shadow-[0_0_25px_rgba(123,44,191,0.18)]">
                <ShadowGlyph name="chronicle" size={20} className="filter drop-shadow-[0_0_10px_currentColor]" />
              </span>
              <div>
                <p className={voidClientStyles.sectionKicker}>{entry.chapter}</p>
                <p className="mt-1 text-[9px] font-bold tracking-[0.12em] text-[#655a70] uppercase">
                  Decrypted intelligence
                </p>
              </div>
            </div>
            <motion.button
              ref={closeButtonRef}
              type="button"
              aria-label="Close chronicle entry"
              onClick={onClose}
              whileHover={reducedMotion ? undefined : { scale: 1.08, rotate: 3 }}
              whileTap={reducedMotion ? undefined : { scale: 0.92 }}
              className={`${voidClientStyles.focusRing} group grid size-11 shrink-0 cursor-pointer place-items-center rounded-[14px] border border-white/[0.09] bg-black/35 text-[#91849d] transition hover:border-red-400/35 hover:bg-red-400/[0.06] hover:text-red-200`}
            >
              <ShadowGlyph name="close" size={18} className="transition filter group-hover:drop-shadow-[0_0_9px_currentColor]" />
            </motion.button>
          </div>

          <div className="mt-10 max-w-4xl">
            <p className="text-[9px] font-black tracking-[0.18em] text-[#bd80f3] uppercase">
              {entry.category} <span aria-hidden="true" className="mx-2 text-[#4d4357]">//</span> {entry.date}
            </p>
            <motion.h2
              layoutId={`chronicle-title-${entry.id}`}
              id={titleId}
              className="font-display mt-3 text-[clamp(2rem,5vw,4.35rem)] leading-[0.96] font-black tracking-[-0.062em] text-white"
            >
              {entry.title}
            </motion.h2>
            <p id={descriptionId} className="mt-5 max-w-3xl text-sm leading-7 text-[#a093ab] sm:text-[15px]">
              {entry.summary}
            </p>
          </div>
        </header>

        <div className="relative grid gap-10 px-6 py-8 sm:px-10 sm:py-10 lg:grid-cols-[minmax(0,1fr)_220px] lg:px-14 lg:py-12">
          <div className="space-y-6">
            {entry.body.map((paragraph, paragraphIndex) => (
              <motion.p
                key={`${entry.id}-paragraph-${paragraphIndex}`}
                initial={reducedMotion ? undefined : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: reducedMotion ? 0 : 0.12 + paragraphIndex * 0.07, duration: 0.34 }}
                className="text-[14px] leading-7 text-[#b1a5bc] sm:text-[15px]"
              >
                {paragraphIndex === 0 ? (
                  <span className="float-left mr-2 font-display text-[2.9rem] leading-[0.82] font-black text-[#c084fc] drop-shadow-[0_0_18px_rgba(168,85,247,0.32)]">
                    {paragraph.charAt(0)}
                  </span>
                ) : null}
                {paragraphIndex === 0 ? paragraph.slice(1) : paragraph}
              </motion.p>
            ))}
          </div>

          <aside className="h-fit rounded-[20px] border border-white/[0.07] bg-black/25 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
            <div className="flex items-center gap-2 text-[#b98af1]">
              <ShadowGlyph name="spark" size={15} className="filter drop-shadow-[0_0_8px_currentColor]" />
              <span className="text-[9px] font-black tracking-[0.15em] uppercase">Archive record</span>
            </div>
            <dl className="mt-5 space-y-4">
              <MetaRow label="Classification" value={entry.category} />
              <MetaRow label="Published" value={entry.date} />
              <MetaRow label="Read time" value={entry.readTime} />
              <MetaRow label="Integrity" value="Verified" success />
            </dl>
          </aside>
        </div>
      </motion.article>
    </motion.div>
  );

  return createPortal(dialog, document.body);
}

function MetaRow({
  label,
  value,
  success = false,
}: {
  label: string;
  value: string;
  success?: boolean;
}) {
  return (
    <div className="border-b border-white/[0.055] pb-3 last:border-0 last:pb-0">
      <dt className="text-[8px] font-black tracking-[0.14em] text-[#5f5469] uppercase">{label}</dt>
      <dd className={`mt-1.5 text-[11px] font-bold ${success ? "text-[#4cff9a]" : "text-[#b7acc1]"}`}>
        {value}
      </dd>
    </div>
  );
}

export default ChronicleView;
