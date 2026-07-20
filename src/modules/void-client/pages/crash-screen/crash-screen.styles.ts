export const crashScreenStyles = {
  root: "relative isolate min-h-dvh w-full overflow-x-hidden overflow-y-auto bg-[#050505] text-white selection:bg-[#d92f60]/45 selection:text-white",
  ambient: "pointer-events-none fixed inset-0 -z-20 overflow-hidden",
  ambientRed:
    "absolute -left-[16rem] top-[-18rem] h-[42rem] w-[42rem] rounded-full bg-[#b70f36]/16 blur-[150px]",
  ambientPurple:
    "absolute -right-[18rem] bottom-[-20rem] h-[48rem] w-[48rem] rounded-full bg-[#7B2CBF]/20 blur-[170px]",
  grid:
    "absolute inset-0 opacity-[0.17] [background-image:linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] [background-size:42px_42px] [mask-image:linear-gradient(to_bottom,black,transparent_86%)]",
  hazardRail:
    "pointer-events-none fixed inset-x-0 top-0 z-10 h-2 bg-[repeating-linear-gradient(115deg,#d31d50_0_18px,#2b0715_18px_36px,#7B2CBF_36px_54px,#0a0710_54px_72px)] shadow-[0_0_24px_rgba(211,29,80,0.38)]",
  shell: "mx-auto flex min-h-dvh w-full max-w-[1540px] flex-col px-4 py-8 sm:px-6 lg:px-9 lg:py-10",
  header:
    "relative overflow-hidden border border-[#ff416d]/22 bg-[linear-gradient(118deg,rgba(35,7,17,0.94),rgba(14,9,20,0.93)_48%,rgba(30,10,46,0.91))] px-5 py-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_28px_90px_rgba(0,0,0,0.48),0_0_54px_rgba(185,20,66,0.11)] backdrop-blur-2xl [clip-path:polygon(0_0,96%_0,100%_28%,100%_100%,3%_100%,0_76%)] sm:px-7 sm:py-8 lg:px-10",
  headerSlash:
    "pointer-events-none absolute -right-8 top-0 h-full w-40 -skew-x-12 border-l border-[#d942ff]/20 bg-[linear-gradient(90deg,transparent,rgba(123,44,191,0.12))]",
  headerContent:
    "relative z-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.42fr)] lg:items-end",
  alertIdentity: "flex min-w-0 items-start gap-4 sm:gap-5",
  alertIcon:
    "flex h-14 w-14 shrink-0 items-center justify-center border border-[#ff4f75]/40 bg-[#380916]/78 text-[#ff5378] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_30px_rgba(239,35,79,0.25)] [clip-path:polygon(18%_0,100%_0,100%_75%,78%_100%,0_100%,0_22%)] sm:h-16 sm:w-16",
  eyebrow: "mb-2 text-[10px] font-black uppercase tracking-[0.28em] text-[#ff6b88]",
  title:
    "font-display text-[clamp(1.9rem,5vw,4.25rem)] font-black leading-[0.93] tracking-[-0.055em] text-white outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-[#ff5378]",
  subtitle: "mt-3 max-w-3xl text-sm leading-6 text-[#c3b5c7] sm:text-base",
  incidentPanel:
    "border-l-2 border-[#7B2CBF]/55 bg-black/25 px-4 py-3 sm:px-5 sm:py-4 [clip-path:polygon(0_0,93%_0,100%_28%,100%_100%,7%_100%,0_72%)]",
  incidentLabel: "text-[9px] font-black uppercase tracking-[0.24em] text-[#9f90aa]",
  incidentValue: "mt-1 font-mono text-sm font-bold tracking-[0.08em] text-[#e7c9ff]",
  incidentStatus: "mt-3 flex items-center gap-2 text-xs font-bold text-[#ff7994]",
  statusDiamond:
    "h-2.5 w-2.5 rotate-45 border border-[#ff6b88] bg-[#a70c32] shadow-[0_0_12px_rgba(255,55,99,0.7)]",
  contentGrid: "mt-5 grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]",
  panel:
    "relative min-w-0 overflow-hidden border border-white/[0.085] bg-[radial-gradient(circle_at_90%_0%,rgba(123,44,191,0.13),transparent_34%),linear-gradient(145deg,rgba(21,14,27,0.94),rgba(8,6,11,0.9))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.045),0_24px_70px_rgba(0,0,0,0.36)] backdrop-blur-2xl [clip-path:polygon(0_0,97%_0,100%_5%,100%_100%,2%_100%,0_95%)] sm:p-6",
  panelHeadingRow: "mb-4 flex flex-wrap items-start justify-between gap-3",
  panelKicker: "text-[9px] font-black uppercase tracking-[0.24em] text-[#bd8af1]",
  panelTitle: "mt-1 font-display text-lg font-black tracking-[-0.025em] text-white sm:text-xl",
  panelBadge:
    "inline-flex min-h-8 items-center gap-2 border border-[#ff496f]/24 bg-[#3b0918]/50 px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-[#ff829b] [clip-path:polygon(8px_0,100%_0,calc(100%_-_8px)_100%,0_100%)]",
  errorMessage:
    "mb-4 border-l-2 border-[#ff416d] bg-[#2b0713]/72 px-4 py-3 font-mono text-sm leading-6 text-[#ffd2dc] shadow-[inset_10px_0_24px_rgba(211,29,80,0.08)]",
  trace:
    "max-h-[360px] min-h-56 w-full select-text overflow-auto whitespace-pre-wrap break-words border border-[#ff426c]/18 bg-[#030204]/88 p-4 font-mono text-[11px] leading-[1.75] text-[#d7ccd9] outline-none scrollbar-thin focus-visible:border-[#d959ff]/55 focus-visible:ring-2 focus-visible:ring-[#7B2CBF]/35 sm:p-5 sm:text-xs",
  traceCritical: "block text-[#ff7994] [text-shadow:0_0_14px_rgba(255,65,109,0.24)]",
  traceFrame: "block text-[#a99cad]",
  traceNeutral: "block text-[#d7ccd9]",
  traceHint: "mt-3 flex items-center gap-2 text-[10px] leading-5 text-[#8f8194]",
  diagnosisGrid: "grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2",
  diagnosisCard:
    "border border-white/[0.075] bg-black/25 p-4 [clip-path:polygon(0_0,93%_0,100%_18%,100%_100%,0_100%)]",
  diagnosisLabel: "flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-[#c593f3]",
  diagnosisText: "mt-3 text-sm leading-6 text-[#c9bdcd]",
  preferenceStrip:
    "mt-4 grid gap-3 border-y border-white/[0.07] bg-white/[0.018] py-4 sm:grid-cols-2",
  preferenceItem: "flex min-w-0 items-start gap-3 px-1",
  preferenceIcon:
    "flex h-9 w-9 shrink-0 items-center justify-center border border-[#7B2CBF]/30 bg-[#7B2CBF]/10 text-[#cb8cff] [clip-path:polygon(18%_0,100%_0,82%_100%,0_100%)]",
  preferenceLabel: "text-[9px] font-black uppercase tracking-[0.16em] text-[#84778b]",
  preferenceValue: "mt-1 break-words text-xs font-bold text-[#e5dce8]",
  preferenceDisclosure: "mt-2 text-[10px] leading-5 text-[#887c8e] sm:col-span-2",
  repairPanel:
    "mt-5 border border-[#7B2CBF]/22 bg-[linear-gradient(125deg,rgba(123,44,191,0.11),rgba(0,0,0,0.24)_45%,rgba(156,20,61,0.1))] p-4 sm:p-5 [clip-path:polygon(0_0,96%_0,100%_18%,100%_100%,4%_100%,0_82%)]",
  repairHeader: "flex flex-wrap items-start justify-between gap-3",
  repairMode:
    "inline-flex min-h-7 items-center border border-[#d598ff]/22 bg-[#7B2CBF]/10 px-2.5 text-[9px] font-bold uppercase tracking-[0.13em] text-[#d8adff]",
  repairDisclosure: "mt-3 text-xs leading-5 text-[#a99dad]",
  progressTrack:
    "relative mt-5 h-2.5 overflow-hidden border border-white/[0.08] bg-black/55 [clip-path:polygon(0_0,100%_0,calc(100%_-_8px)_100%,8px_100%)]",
  progressFill:
    "absolute inset-0 origin-left bg-[linear-gradient(90deg,#9b123a,#7B2CBF_52%,#dc74ff)] shadow-[0_0_24px_rgba(123,44,191,0.72)]",
  progressMeta: "mt-2 flex items-center justify-between gap-4 font-mono text-[10px] uppercase tracking-[0.12em]",
  phaseList: "mt-4 grid gap-2 sm:grid-cols-2",
  phase:
    "flex min-h-10 items-center justify-between gap-2 border px-3 text-[10px] font-bold uppercase tracking-[0.1em] transition-colors duration-200",
  phasePending: "border-white/[0.065] bg-black/20 text-[#716678]",
  phaseActive:
    "border-[#c85cff]/42 bg-[#7B2CBF]/14 text-[#efd9ff] shadow-[inset_3px_0_0_#ad55e6,0_0_18px_rgba(123,44,191,0.12)]",
  phaseComplete: "border-[#52d99c]/24 bg-[#0c3125]/25 text-[#7de6b8]",
  phaseFailed: "border-[#ff416d]/32 bg-[#3b0918]/36 text-[#ff8ba1]",
  actionRow: "mt-auto flex flex-col gap-3 pt-5 sm:flex-row sm:flex-wrap",
  primaryButton:
    "inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 border border-[#ec63ff]/42 bg-[linear-gradient(108deg,#521371,#7B2CBF_52%,#a71d4a)] px-5 text-xs font-black uppercase tracking-[0.1em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_0_30px_rgba(123,44,191,0.3)] transition-[filter,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_12px_32px_rgba(0,0,0,0.35),0_0_38px_rgba(123,44,191,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d681ff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 motion-reduce:transform-none motion-reduce:transition-none [clip-path:polygon(10px_0,100%_0,calc(100%_-_10px)_100%,0_100%)]",
  secondaryButton:
    "inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 border border-white/[0.11] bg-white/[0.035] px-5 text-xs font-bold uppercase tracking-[0.08em] text-[#d2c6d5] transition-[border-color,background-color,color,transform] duration-200 hover:-translate-y-0.5 hover:border-[#9d58d2]/50 hover:bg-[#7B2CBF]/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ad68de] focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 motion-reduce:transform-none motion-reduce:transition-none [clip-path:polygon(8px_0,100%_0,calc(100%_-_8px)_100%,0_100%)]",
  dangerButton:
    "inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 border border-[#ff496f]/30 bg-[#2b0713]/48 px-5 text-xs font-bold uppercase tracking-[0.08em] text-[#ff9caf] transition-[border-color,background-color,color,transform] duration-200 hover:-translate-y-0.5 hover:border-[#ff6685]/55 hover:bg-[#521021]/52 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6685] focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 motion-reduce:transform-none motion-reduce:transition-none [clip-path:polygon(8px_0,100%_0,calc(100%_-_8px)_100%,0_100%)]",
  actionFeedback:
    "mt-3 border-l-2 border-[#ff496f]/55 bg-[#300813]/36 px-3 py-2 text-xs leading-5 text-[#f1c4ce]",
  liveRegion: "sr-only",
} as const;
