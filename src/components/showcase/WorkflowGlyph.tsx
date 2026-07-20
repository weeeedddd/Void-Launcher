export type WorkflowGlyphName =
  | "api"
  | "arrow-left"
  | "arrow-right"
  | "audio"
  | "check"
  | "cube"
  | "flame"
  | "folder"
  | "friends"
  | "gauge"
  | "home"
  | "instance"
  | "loader"
  | "lock"
  | "logo"
  | "close"
  | "maximize"
  | "minimize"
  | "microsoft"
  | "mods"
  | "music"
  | "party"
  | "pause"
  | "play"
  | "settings"
  | "shadow"
  | "shield"
  | "spark"
  | "spinner";

interface WorkflowGlyphProps {
  name: WorkflowGlyphName;
  className?: string;
  label?: string;
}

/**
 * Bespoke angular glyph language for the workflow mockup. Every mark is
 * authored here as SVG geometry so the poster has no dependency on Lucide or
 * a generic icon library.
 */
export function WorkflowGlyph({ name, className, label }: WorkflowGlyphProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <GlyphPaths name={name} />
    </svg>
  );
}

function GlyphPaths({ name }: { name: WorkflowGlyphName }) {
  switch (name) {
    case "logo":
      return <><path d="M12 1.8 22 7.3 18.7 19 12 22.2 5.3 19 2 7.3Z" stroke="currentColor" strokeWidth="1.2"/><path d="m6.5 7.8 5.5 9 5.5-9-5.5 4.6Z" fill="currentColor"/><circle cx="12" cy="12.4" r="1.25" fill="#050505"/></>;
    case "shadow":
      return <><path d="M5 20.5c.7-5.8 2.2-9 4.8-10.1L8.7 6.9 12 2l3.3 4.9-1.1 3.5c2.6 1.1 4.1 4.3 4.8 10.1Z" fill="currentColor" fillOpacity=".24" stroke="currentColor" strokeWidth="1.1"/><path d="M8.6 10.2 12 12l3.4-1.8-1.5 4.2H10Z" fill="currentColor"/><path d="m10.4 12.1 1.1-.2M12.5 11.9l1.1.2" stroke="#fff" strokeWidth=".7"/></>;
    case "shield":
      return <><path d="m12 2 8 3.2-.7 8.5L12 22l-7.3-8.3L4 5.2Z" stroke="currentColor" strokeWidth="1.4"/><path d="m7.5 11.8 4.5-4 4.5 4-4.5 4Z" fill="currentColor" fillOpacity=".18" stroke="currentColor"/><path d="m9.7 12 1.5 1.5 3.3-3.4" stroke="currentColor" strokeWidth="1.8"/></>;
    case "folder":
      return <><path d="M2.5 7.5h7l2-2h10v12.8l-2.2 2.2H2.5Z" stroke="currentColor" strokeWidth="1.35"/><path d="M3 10h18M7 14h6l2 2h4" stroke="currentColor" strokeWidth="1.15"/><circle cx="7" cy="14" r="1" fill="currentColor"/><circle cx="19" cy="16" r="1" fill="currentColor"/></>;
    case "check":
      return <><path d="M3 12 8.5 18 21 5.5" stroke="currentColor" strokeWidth="2.2"/><path d="M5 5h5M14 20h5" stroke="currentColor" strokeWidth="1" opacity=".4"/></>;
    case "microsoft":
      return <><path d="m2.5 4.5 8-1v8h-8Zm9.5-1.2 9.5-1.2v9.4H12Zm-9.5 9.9h8v8l-8-1Zm9.5 0h9.5v9.1L12 21Z" stroke="currentColor" strokeWidth=".9"/><path d="m4 6 5-.6V10H4Zm9.5-.8 6.4-.8V10h-6.4ZM4 14.7h5v4.6l-5-.6Zm9.5 0h6.4v5.5l-6.4-.8Z" fill="currentColor"/></>;
    case "arrow-right":
      return <><path d="M3 12h15M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.6"/><path d="m17.5 3.5 4 8.5-4 8.5" stroke="currentColor" strokeWidth=".8" opacity=".45"/></>;
    case "arrow-left":
      return <><path d="M21 12H6M11 6l-6 6 6 6" stroke="currentColor" strokeWidth="1.6"/><path d="m6.5 3.5-4 8.5 4 8.5" stroke="currentColor" strokeWidth=".8" opacity=".45"/></>;
    case "spinner":
      return <><path d="M12 2.5a9.5 9.5 0 0 1 8.5 5.2M21.5 12a9.5 9.5 0 0 1-5.2 8.5M12 21.5a9.5 9.5 0 0 1-8.5-5.2M2.5 12a9.5 9.5 0 0 1 5.2-8.5" stroke="currentColor" strokeWidth="1.8"/><path d="m12 6 5.2 6-5.2 6-5.2-6Z" stroke="currentColor" strokeWidth="1"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/></>;
    case "audio":
      return <><path d="M2.5 12h2l1.5-5 2.2 10 2.1-13 2.4 16 2.1-11 1.8 6 1.4-3h3.5" stroke="currentColor" strokeWidth="1.35"/><path d="M12 1.8 22.2 12 12 22.2 1.8 12Z" stroke="currentColor" strokeWidth=".7" opacity=".35"/></>;
    case "lock":
      return <><path d="M6 10V7a6 6 0 0 1 12 0v3M4 10h16v11H4Z" stroke="currentColor" strokeWidth="1.35"/><path d="m12 13 2 2-2 3-2-3Z" fill="currentColor"/><path d="M8.5 10V7a3.5 3.5 0 0 1 7 0v3" stroke="currentColor" strokeWidth="1"/></>;
    case "minimize":
      return <><path d="M4 15.5h16" stroke="currentColor" strokeWidth="1.6"/><path d="m6 12-2 3.5L6 19m12-7 2 3.5-2 3.5" stroke="currentColor" strokeWidth=".8" opacity=".5"/></>;
    case "maximize":
      return <><path d="M5 5h14v14H5Z" stroke="currentColor" strokeWidth="1.4"/><path d="m5 9 4-4m10 10-4 4" stroke="currentColor" strokeWidth=".8" opacity=".5"/><path d="M9 9h6v6H9Z" stroke="currentColor" strokeWidth=".8"/></>;
    case "close":
      return <><path d="m5 5 14 14M19 5 5 19" stroke="currentColor" strokeWidth="1.5"/><path d="M8 3H3v5m13 13h5v-5" stroke="currentColor" strokeWidth=".8" opacity=".5"/></>;
    case "spark":
      return <><path d="m12 1.5 2.2 7.2L21.5 11l-7.3 2.3-2.2 7.2-2.2-7.2L2.5 11l7.3-2.3Z" stroke="currentColor" strokeWidth="1.2"/><path d="m19 2 .7 2.3L22 5l-2.3.7L19 8l-.7-2.3L16 5l2.3-.7Z" fill="currentColor"/></>;
    case "home":
      return <><path d="m3 10 9-7.5 9 7.5v11H3Z" stroke="currentColor" strokeWidth="1.3"/><path d="m8 21 1.2-7h5.6l1.2 7M7 10h10" stroke="currentColor"/><path d="m12 6 2 2-2 2-2-2Z" fill="currentColor"/></>;
    case "mods":
      return <><path d="m3 6 5-3 5 3-5 3Zm8 8 5-3 5 3-5 3ZM3 17l5-3 5 3-5 3Z" stroke="currentColor" strokeWidth="1.15"/><path d="M8 9v5m5-8 3 5m-8 3 8 3" stroke="currentColor" strokeDasharray="1.5 1.5"/></>;
    case "gauge":
      return <><path d="M3 18a9 9 0 1 1 18 0" stroke="currentColor" strokeWidth="1.5"/><path d="m12 17 5-8-3 9Z" fill="currentColor"/><path d="M5 15H2m4-6L4 7m8-2V2m6 7 2-2m-1 8h3" stroke="currentColor" strokeWidth="1"/></>;
    case "settings":
      return <><path d="m12 2 2 3.1 3.6-.8.3 3.7 3.4 1.5-1.5 3.4 2.2 3-3.1 2-.1 3.7-3.7-.3-1.5 3.4-3.4-1.5-3 2.2-2-3.1-3.7-.1.3-3.7L2 12.9l1.5-3.4-2.2-3 3.1-2 3.7.1L9.6 1Z" stroke="currentColor" strokeWidth=".9"/><path d="m12 7 5 5-5 5-5-5Z" stroke="currentColor" strokeWidth="1.3"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></>;
    case "flame":
      return <><path d="M12.5 2.3c.6 4-2.2 5.2-3.4 7.8-.8 1.7-.4 3.2.7 4.1-.1-2.7 1.5-4.1 3.2-5.6.2 3.1 4 4.2 4 8.2 0 3.1-2.2 5.2-5.2 5.2-4.5 0-7-3.2-6.2-7.2.7-3.3 3.4-5.1 4.5-8.8.8.9 1.3 1.9 1.4 3.1 1.8-1.6 2.2-3.9 1-6.8Z" stroke="currentColor" strokeWidth="1.25"/><path d="M12.2 13c2 2 2 4.8-.1 6.3-2.1-1-2.8-3.6.1-6.3Z" fill="currentColor"/></>;
    case "music":
      return <><path d="M8 16.5V5l11-2v11.5M8 8l11-2" stroke="currentColor" strokeWidth="1.4"/><path d="M8 16.5c0 2-1.6 3.5-3.7 3.5S1 18.8 1 17s1.7-3 3.8-3H8Zm11-2c0 2-1.6 3.5-3.7 3.5S12 16.8 12 15s1.7-3 3.8-3H19Z" fill="currentColor"/><path d="M22 8v5" stroke="currentColor" strokeDasharray="1 1"/></>;
    case "pause":
      return <><path d="M5 3h5l-1 18H4Zm9 0h5l1 18h-5Z" fill="currentColor"/><path d="M2 12h2m16 0h2" stroke="currentColor" opacity=".45"/></>;
    case "friends":
      return <><path d="m7 3 3 3-3 3-3-3Zm10 2.5 2.5 2.5-2.5 2.5L14.5 8Z" stroke="currentColor" strokeWidth="1.2"/><path d="M1.5 20c.3-5 2.1-7.5 5.5-7.5s5.2 2.5 5.5 7.5Zm10.5 0c.3-4.1 2-6.2 5-6.2s4.7 2.1 5 6.2Z" stroke="currentColor" strokeWidth="1.2"/><path d="M12 9v3m-2-1.5h4" stroke="currentColor" opacity=".45"/></>;
    case "party":
      return <><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.3"/><path d="M12 2.5 15 6l-3 3-3-3Zm9.5 10L18 15l-3-3 3-3ZM12 21.5 9 18l3-3 3 3ZM2.5 12 6 9l3 3-3 3Z" stroke="currentColor" strokeWidth="1"/><path d="M12 9V6m3 6h3m-6 3v3m-3-6H6" stroke="currentColor" strokeDasharray="1 1"/></>;
    case "instance":
      return <><path d="m3 6 9-4 9 4-9 4Zm0 6 9-4 9 4-9 4Zm0 6 9-4 9 4-9 4Z" stroke="currentColor" strokeWidth="1.1"/><path d="M6 6h3m6 0h3M6 12h3m6 0h3M6 18h3m6 0h3" stroke="currentColor" strokeWidth="1.5"/></>;
    case "api":
      return <><path d="M12 2v6m0 8v6M2 12h6m8 0h6" stroke="currentColor" strokeWidth="1.2"/><path d="m12 8 4 4-4 4-4-4Z" stroke="currentColor" strokeWidth="1.3"/><path d="m12 1 1 1-1 1-1-1Zm0 20 1 1-1 1-1-1ZM1 12l1-1 1 1-1 1Zm20 0 1-1 1 1-1 1Z" fill="currentColor"/></>;
    case "play":
      return <><path d="M4 3.5 20 12 4 20.5Z" stroke="currentColor" strokeWidth="1.5"/><path d="m8 8 8 4-8 4Z" fill="currentColor"/><path d="M1 6h3M1 12h3M1 18h3" stroke="currentColor" opacity=".45"/></>;
    case "cube":
      return <><path d="m12 2 9 5v10l-9 5-9-5V7Z" stroke="currentColor" strokeWidth="1.3"/><path d="m3 7 9 5 9-5M12 12v10" stroke="currentColor" strokeWidth="1.1"/><path d="m7.5 4.5 9 5" stroke="currentColor" opacity=".45"/></>;
    case "loader":
      return <><path d="M3 12a9 9 0 0 1 9-9m9 9a9 9 0 0 1-9 9" stroke="currentColor" strokeWidth="2"/><path d="M12 6.5 17.5 12 12 17.5 6.5 12Z" stroke="currentColor"/><circle cx="12" cy="12" r="2" fill="currentColor"/></>;
  }
}
