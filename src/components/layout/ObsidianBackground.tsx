import { motion, useReducedMotion } from "motion/react";

/**
 * The shared "void" backdrop that sits behind every stage: textured obsidian
 * (#050505) with two slowly drifting arcane auroras, a fine noise grain and a
 * top-down vignette. Mounted once in RootApp so it never re-animates on
 * stage transitions.
 */
export function ObsidianBackground() {
  const reduce = useReducedMotion();

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden bg-[#050505]">
      {/* Drifting aurora — deep midnight purple */}
      <motion.div
        className="absolute -top-1/3 -left-1/4 h-[70vh] w-[70vw] rounded-full blur-[130px]"
        style={{ background: "radial-gradient(circle, rgba(60,9,108,0.45), transparent 70%)" }}
        animate={reduce ? undefined : { x: [0, 60, 0], y: [0, 40, 0], opacity: [0.45, 0.8, 0.45] }}
        transition={{ duration: 19, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Drifting aurora — arcane violet */}
      <motion.div
        className="absolute top-1/4 -right-1/4 h-[60vh] w-[60vw] rounded-full blur-[130px]"
        style={{ background: "radial-gradient(circle, rgba(123,44,191,0.35), transparent 70%)" }}
        animate={reduce ? undefined : { x: [0, -50, 0], y: [0, 30, 0], opacity: [0.35, 0.7, 0.35] }}
        transition={{ duration: 23, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Procedural noise grain (self-contained SVG turbulence) */}
      <div
        className="absolute inset-0 opacity-[0.045] mix-blend-soft-light"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
      {/* Vignette for depth */}
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(120% 80% at 50% 0%, transparent 42%, rgba(0,0,0,0.78))" }}
      />
    </div>
  );
}
