import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { NEWS_ENTRIES } from "../../../constants";
import type { INewsEntry } from "../../../types";
import { ShadowGlyph } from "../../../components/ShadowGlyph";
import { voidClientStyles } from "../void-client.styles";

const NEWS_ART = [
  "/void-obsidian-rift-header.png",
  "/shadow-key-art.png",
  "/void-obsidian-rift-header.png",
] as const;

export function ChronicleView() {
  const [selected, setSelected] = useState<INewsEntry | null>(null);

  return (
    <div className={voidClientStyles.page}>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className={voidClientStyles.sectionKicker}>Launcher news</p>
          <h1 className={`${voidClientStyles.pageTitle} mt-1`}>Latest updates</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#92929B]">
            Release notes included with this launcher build. Nothing here is presented as a live feed unless a remote news service is connected.
          </p>
        </div>
        <span className={voidClientStyles.tag}>{NEWS_ENTRIES.length} release notes</span>
      </header>

      <section aria-labelledby="news-list-heading">
        <h2 id="news-list-heading" className="sr-only">Release notes</h2>
        <div className="grid max-h-[calc(100vh-240px)] gap-4 overflow-y-auto pr-1 md:grid-cols-2 xl:grid-cols-3">
          {NEWS_ENTRIES.map((entry, index) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => setSelected(entry)}
              className="group min-h-[310px] cursor-pointer overflow-hidden rounded-xl border border-[#29292F] bg-[#151518] text-left transition-[border-color,background-color,transform] duration-200 hover:-translate-y-0.5 hover:border-[#46464F] hover:bg-[#18181C] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8B5CF6]"
            >
              <span className="relative block h-36 overflow-hidden bg-[#111114]">
                <img
                  src={NEWS_ART[index % NEWS_ART.length]}
                  alt=""
                  loading="lazy"
                  className="size-full object-cover opacity-70 transition-transform duration-500 group-hover:scale-[1.03]"
                />
                <span className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#151518] to-transparent" aria-hidden="true" />
                <span className="absolute left-4 top-4 rounded-md border border-[#5B267D] bg-[#21152B]/95 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[#D8B4FE]">
                  {entry.category}
                </span>
              </span>
              <span className="block p-5 pt-4">
                <span className="flex items-center justify-between gap-3 text-[11px] text-[#777780]">
                  <span>{entry.chapter}</span>
                  <time>{entry.date}</time>
                </span>
                <strong className="mt-3 block text-lg font-semibold leading-6 text-[#F4F4F5]">{entry.title}</strong>
                <span className="mt-2 line-clamp-2 block text-sm leading-6 text-[#92929B]">{entry.summary}</span>
                <span className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-[#C4B5FD]">
                  <ShadowGlyph name="chronicle" size={14} />Read {entry.readTime}
                </span>
              </span>
            </button>
          ))}
        </div>
      </section>

      {selected ? <NewsDialog entry={selected} onClose={() => setSelected(null)} /> : null}
    </div>
  );
}

function NewsDialog({ entry, onClose }: { entry: INewsEntry; onClose: () => void }) {
  const titleId = useId();
  const descriptionId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const entryIndex = Math.max(0, NEWS_ENTRIES.findIndex((candidate) => candidate.id === entry.id));

  useEffect(() => {
    closeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return createPortal(
    <div role="presentation" onMouseDown={onClose} className="fixed inset-0 z-[160] grid place-items-center bg-black/80 p-4">
      <article
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onMouseDown={(event) => event.stopPropagation()}
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-[#34343A] bg-[#151518] shadow-2xl shadow-black/50"
      >
        <div className="relative h-52 overflow-hidden border-b border-[#29292F]">
          <img src={NEWS_ART[entryIndex % NEWS_ART.length]} alt="" className="size-full object-cover opacity-65" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#151518] via-transparent to-black/20" aria-hidden="true" />
          <button ref={closeRef} type="button" aria-label="Close news article" onClick={onClose} className={`${voidClientStyles.iconButton} absolute right-4 top-4 bg-[#111114]/95`}>
            <ShadowGlyph name="close" size={16} />
          </button>
        </div>
        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#A855F7]">
            <span>{entry.category}</span><span className="text-[#52525B]">•</span><span>{entry.chapter}</span>
          </div>
          <h2 id={titleId} className="mt-3 text-2xl font-bold tracking-[-0.025em] text-[#F4F4F5] sm:text-3xl">{entry.title}</h2>
          <p className="mt-2 text-xs text-[#777780]">{entry.date} • {entry.readTime}</p>
          <p id={descriptionId} className="mt-6 border-l-2 border-[#7E22CE] pl-4 text-base leading-7 text-[#D4D4D8]">{entry.summary}</p>
          <div className="mt-6 space-y-4">
            {entry.body.map((paragraph, index) => <p key={`${entry.id}-${index}`} className="text-sm leading-7 text-[#A1A1AA]">{paragraph}</p>)}
          </div>
        </div>
      </article>
    </div>,
    document.body,
  );
}

export default ChronicleView;
