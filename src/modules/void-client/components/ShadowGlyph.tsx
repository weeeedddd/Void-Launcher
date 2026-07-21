import { useId, type ReactNode, type SVGProps } from "react";

export const shadowGlyphNames = [
  "dashboard",
  "vault",
  "mods",
  "telemetry",
  "settings",
  "chronicle",
  "play",
  "close",
  "addFriend",
  "download",
  "external",
  "chevronDown",
  "account",
  "check",
  "sliders",
  "shield",
  "server",
  "ram",
  "cpu",
  "spark",
  "music",
  "arrow",
  "info",
  "sync",
  "folder",
  "upload",
  "restart",
  "logs",
  "storage",
  "warning",
  "notification",
  "discord",
  "privacy",
  "repair",
  "language",
  "monitor",
  "trash",
  "cache",
  "minimize",
  "maximize",
] as const;

export type ShadowGlyphName = (typeof shadowGlyphNames)[number];

export interface ShadowGlyphProps
  extends Omit<SVGProps<SVGSVGElement>, "children" | "name"> {
  name: ShadowGlyphName;
  size?: number | string;
  title?: string;
}

const commonStroke = {
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  strokeWidth: 1.65,
  vectorEffect: "non-scaling-stroke",
} as const;

function GlyphPaths({ name, gradientId }: { name: ShadowGlyphName; gradientId: string }): ReactNode {
  switch (name) {
    case "dashboard":
      return (
        <>
          <path {...commonStroke} d="M3 4.5 10.4 2l-1.2 8.1L3 11.4Zm10.1-1.8L21 5.1l-2.4 6.2-6.8-1.2ZM3.5 14l5.8-1.3 1.1 8.6L3 18.8Zm8.9-1.1 7.2 1.2 1.2 5.2-7.3 2.2Z" />
          <path fill={`url(#${gradientId})`} d="m7.8 5.2-3.1 1 .1 3.1 3.6-.7Zm6.6-.5-.7 3.7 4.1.7 1-2.9ZM5.1 15.4l.1 2.2 3 1 .1-3.8Zm8.9-.3.5 4 4-1.1-.3-2.3Z" opacity=".33" />
        </>
      );
    case "vault":
      return (
        <>
          <path {...commonStroke} d="M3.2 5.1 12 2.2l8.8 2.9-.9 14.1-7.9 2.6-7.9-2.6Zm4 2.2h9.6l.7 9.1-5.5 2-5.5-2Zm4.8.3v10.6m-5.1-5.4h10.2" />
          <path {...commonStroke} d="m9.6 10.4 2.4-1.5 2.4 1.5-.3 4-2.1 1.2-2.1-1.2Z" />
          <path fill={`url(#${gradientId})`} d="m5.2 6.4 6.8-2.1 6.8 2.1-.7 11.3-6.1 2-6.1-2Zm3.3 2.4-.5 6.6 4 1.4 4-1.4-.5-6.6Z" opacity=".22" />
        </>
      );
    case "mods":
      return <path {...commonStroke} d="m4 5.4 6.1-3.1 3 3.2 4.1-1.8 3 3.4-2 4.1 2 3.8-3.3 4.3-4.2-1.7-3.4 3.7-5.5-3.4 1.7-4.5-2.4-3.1Zm5.5 4.1 2.8-1.8 2.6 1.7-.4 3.6-3.1 1.8-2.7-2Z" />;
    case "telemetry":
      return (
        <>
          <path {...commonStroke} d="M2.5 18.8h19M4 16.1l3.1-5.4 3 2.5 3.5-8 2.6 7.1 4-3.7" />
          <path fill={`url(#${gradientId})`} d="m4 16.1 3.1-5.4 3 2.5 3.5-8 2.6 7.1 4-3.7v8.5H4Z" opacity=".2" />
          <path {...commonStroke} d="m18.4 7.9 2-.1-.2 2" />
        </>
      );
    case "settings":
      return <path {...commonStroke} d="m12 2 2.1 2.9 3.6-.4.6 3.6 3 2-.9 3.5 2 2.9-2.8 2.4.2 3.1-4-.5-1.8 2.8-2.8-2.5-3.7 1.4-1.1-3.4-3.6-.8.8-3.8L2 10.4l3-2.2-.5-3.5 3.8.2Zm0 6.4-3 2.2.7 3.8 3.8 1.1 2.8-2.8-1.2-3.4Z" />;
    case "chronicle":
      return (
        <>
          <path {...commonStroke} d="M5 3.2h13.8L18 20.8H4.2L5 3.2Zm3.1 3.5h7.8M7.7 10h8.9m-9.1 3.4h6.4m-6.6 3.4h8.2" />
          <path fill={`url(#${gradientId})`} d="m17.1 4.9-.7 14.2 2.1-.1.4-14.1Z" opacity=".4" />
        </>
      );
    case "play":
      return (
        <>
          <path {...commonStroke} d="M5 2.8 20.8 12 5 21.2l1.3-7-3.1-2.3 3.3-2.1Z" />
          <path fill={`url(#${gradientId})`} d="m8 7.2 8.5 4.9-8.9 5.1 1-4.2-2-1.2 2.1-1.3Z" opacity=".52" />
        </>
      );
    case "close":
      return <path {...commonStroke} d="m4.2 3 7.9 6.7L20.2 3l-5.9 9 5.5 8.8-7.8-6.4-8.2 6.4 5.9-8.9Z" />;
    case "addFriend":
      return <path {...commonStroke} d="m8.7 3 3.1 2.2-.7 4.1-3.4 2-3.3-2.4.8-4Zm-5 17.8.8-5.2 4-2.4 4.2 2.4.7 5.2m4.1-10.2v8m-4-4h8" />;
    case "download":
      return <path {...commonStroke} d="m4 15.2.8 5.1h14.7l.7-5.1M12 2.4v12.2m-5-4.1 5 4.5 5-4.5m-7.8 7h5.7" />;
    case "external":
      return <path {...commonStroke} d="M13 3h8v8m0-8-9.4 9.4M18 13.2v6.4l-2.2 2.2H4.4L2.2 19.6V8.2L4.4 6H11" />;
    case "chevronDown":
      return <path {...commonStroke} d="m3.2 7.6 8.9 9 8.7-9-8.8 5.2Z" />;
    case "account":
      return (
        <>
          <path {...commonStroke} d="m12 2.4 4.4 2.8-.9 5.3-3.8 2.4-4.1-2.6-.7-5Zm-8.7 19 .8-5 5.2-3.1 2.6 1.9 2.8-1.9 5.2 3.2.8 4.9Z" />
          <path fill={`url(#${gradientId})`} d="m9 6.1 3-1.5 2.2 1.7-.5 3.1-2.1 1.2-2.4-1.4ZM6.2 17.5l3.4-2 2.3 2 2.6-2 3.4 2 .3 2.1H5.8Z" opacity=".32" />
        </>
      );
    case "check":
      return (
        <>
          <path {...commonStroke} d="m2.9 12.6 5.4 6.1L21.2 4.9l-2.4 8.7-10 8-4.4-4.2Z" />
          <path fill={`url(#${gradientId})`} d="m6.3 13 2.3 2.7 8.8-8.6-1.3 4.7-7.3 6.5-3.4-3.1Z" opacity=".4" />
        </>
      );
    case "sliders":
      return <path {...commonStroke} d="M3 5h5m4 0h9M8 2.6v4.8M3 12h10m4 0h4m-8-2.4v4.8M3 19h3m4 0h11M6 16.6v4.8" />;
    case "shield":
      return (
        <>
          <path {...commonStroke} d="m12 2.2 8 3-1.1 9.2-3 4.5-4 2.9L8 18.9l-3-4.5-1-9.2Z" />
          <path {...commonStroke} d="m8 11.5 2.6 2.7 5.7-6.1" />
          <path fill={`url(#${gradientId})`} d="m12 4.2 5.7 2.1-.8 7.3-2.3 3.5-2.7 2-2.7-2-2.1-3.5-.8-7.3Z" opacity=".18" />
        </>
      );
    case "server":
      return <path {...commonStroke} d="M4 3.1h16l1 5-2 2.2 2 2.2-1 5.2-8 3.2-8-3.2-1-5.2 2-2.2-2-2.2Zm1 7.2h14M5 14h14M7.1 6.7h.1m3 0h6.7M7.1 17.1h.1m3 0h6.7" />;
    case "ram":
      return <path {...commonStroke} d="M4 7.2h16v9.6H4Zm3-3v3m3-3v3m4-3v3m3-3v3M7 16.8v3m3-3v3m4-3v3m3-3v3M7.2 10h3.2v4H7.2Zm6.4 0h3.2v4h-3.2ZM2.1 10h1.8m16.2 0h1.8m-19.8 4h1.8m16.2 0h1.8" />;
    case "cpu":
      return (
        <>
          <path {...commonStroke} d="m7 5 5-2.8L17 5l2.5 4.3-1 7.1-6.5 5.4-6.5-5.4-1-7.1Zm2.1 4 3-1.7 3 1.7v4.1l-3 2-3-2Z" />
          <path {...commonStroke} d="M2.2 8h2.5m14.6 0h2.5M2.2 16h3.5m12.6 0h3.5M8 2.2v2.5m8-2.5v2.5" />
        </>
      );
    case "spark":
      return (
        <>
          <path {...commonStroke} d="m12 1.8 1.8 7.1 7.4 2.4-7 2.4-2.2 8.5-2.2-8.5-7-2.4 7.4-2.4Z" />
          <path fill={`url(#${gradientId})`} d="m12 5.5.9 4.4 4.5 1.4-4.2 1.4-1.2 5.2-1.2-5.2-4.2-1.4 4.5-1.4Z" opacity=".5" />
        </>
      );
    case "music":
      return <path {...commonStroke} d="m9 4.8 11-2.4v13.1m-11-7.7 11-2.4M9 7.8v9.5m0 0c0 2-1.8 3.7-4 3.7s-3.3-1.4-2.2-3.2c1-1.6 4-2.2 6.2-.5Zm11-1.8c0 2-1.8 3.7-4 3.7s-3.3-1.4-2.2-3.2c1-1.6 4-2.2 6.2-.5Z" />;
    case "arrow":
      return <path {...commonStroke} d="M3 11.8 17.6 3l-2.4 6.1 5.8 2.7-5.8 3.1 2.4 6.1Zm4.5 0 7-4.1-1.7 4.2 1.7 4.2Z" />;
    case "info":
      return <path {...commonStroke} d="m12 2.1 7.7 4.4 1.2 8.1-5.4 6.5-8.3-1.5-4.1-7.2 3.3-7.8Zm0 5.1v.1m-.9 3.2 1.8-.8-1.1 6.8 2.1-.6" />;
    case "sync":
      return <path {...commonStroke} d="M4.4 9.1 2.7 6.2l3.5-1.1m-2 3.8A8.3 8.3 0 0 1 18 5.8l2 2.5M19.6 15l1.7 2.9-3.5 1.1m2-3.8A8.3 8.3 0 0 1 6 18.3l-2-2.5" />;
    case "folder":
      return <path {...commonStroke} d="M2.8 6.2 9 4.8l2.2 2.5 9.9-1-1.8 12.3-7.7 2.1-8.4-2.3Zm1.1 3.3h16.4M7.4 13h9.2" />;
    case "upload":
      return <path {...commonStroke} d="m4 15.1.8 5.2h14.7l.7-5.2M12 16V3.2m-5 4.5 5-4.9 5 4.9m-7.8 9.6h5.7" />;
    case "restart":
      return <path {...commonStroke} d="M5.4 7.6 3 5.7l.4 4.2m1.5-2.6A8.5 8.5 0 1 1 4 14.9m8-12v8m0 0-3.1 2.7m3.1-2.7 3.1 2.7" />;
    case "logs":
      return <path {...commonStroke} d="m5 3.2 13.9-1-1 19.2-13.8-2Zm3.3 4.1 7.3-.5m-7.6 4 7.3-.2m-7.6 4.1 5.7.4M4.5 5.8 2.8 7.1l.7 11.1" />;
    case "storage":
      return <path {...commonStroke} d="M3.2 6.1 12 2.5l8.8 3.6-1 12.1-7.8 3.3-7.8-3.3Zm0 0 8.8 4 8.8-4M12 10.1v11.4M6.5 14l3 1.3m5-1.3 3-1.3" />;
    case "warning":
      return (
        <>
          <path {...commonStroke} d="m12 2.1 9.2 17.3-9.5 2.4-8.9-3.1ZM12 8v6.1m0 3v.1" />
          <path fill={`url(#${gradientId})`} d="m12 5.6 6.3 12.1-6.5 1.5-6-1.8Z" opacity=".2" />
        </>
      );
    case "notification":
      return <path {...commonStroke} d="M12 2.3 16.4 5l1.2 6.3 3 4-3.7 2.1-10.2.2-3.4-2.5 3-3.8L7.6 5Zm-2.4 17 2.5 2.4 2.6-2.5" />;
    case "discord":
      return <path {...commonStroke} d="m7 5 4.8-1.4L17 5l3 10.2-3.5 3.4-3-2.6h-3l-3 2.6-3.5-3.4Zm1.8 5.1v3.5m6.4-3.5v3.5m-5.9 2 2.7.8 2.7-.8" />;
    case "privacy":
      return (
        <>
          <path {...commonStroke} d="m12 2.2 7.8 3-1 9.4-2.9 4.3-4 2.9-4-3-2.8-4.2-1-9.4Z" />
          <path {...commonStroke} d="M8.7 11.4h6.6v5.1H8.7Zm1.3 0V9.7a2 2 0 0 1 4 0v1.7" />
        </>
      );
    case "repair":
      return <path {...commonStroke} d="m4.2 3.2 5.2 4.5-2 3.2-4.8-4.2.8 4.9 4.2 2.1 7.9 7.8 4-3.8-7.9-7.9 2.1-4.1 4.7-.9-4.7-4.2-4.6.8Zm9 9 3.9 3.9" />;
    case "language":
      return <path {...commonStroke} d="M3 5h10m-5-3v3m-3 4c1.4 3.7 3.8 6.1 7.3 7.5M11.5 5c-.8 5.1-3.6 8.8-8.5 11.1m11-5.4 3.3 10.8m3.7 0-3.7-10.8-5 10.8m1.5-3.2h5.4" />;
    case "monitor":
      return <path {...commonStroke} d="M2.8 4.2h18.4l-1.1 12.1-8.1 2.2-8.1-2.2Zm9.2 14.3v3m-4.4 0h8.8M6 7.5h12m-8.4 5.3 2.3-2.3 2.5 1.8" />;
    case "trash":
      return <path {...commonStroke} d="m5.2 7.1 1.2 14 11.1-1.6 1.1-12.4M3.2 5.2h17.6M8.3 5l.8-2.2h6.1l.8 2.2M9.4 10l.4 6.8m4.9-7.2-.5 6.5" />;
    case "cache":
      return <path {...commonStroke} d="M4.1 5.2 12 2.4l7.9 2.8-1 5.4 2 3.2-3.4 6.4-6 1.4-7.1-2.5-1.3-6.7 2-2.2Zm1 5 6.6 2.5 7.2-2.1M11.7 12.7l-.2 8.9m-5-15.2 5.5 2 5.5-2" />;
    case "minimize":
      return (
        <>
          <path {...commonStroke} d="M3.2 16.4h17.6l-3.2 3H6.4Z" />
          <path fill={`url(#${gradientId})`} d="M6.5 17.1h11l-1 .9h-9Z" opacity=".48" />
        </>
      );
    case "maximize":
      return (
        <>
          <path {...commonStroke} d="m4 4.2 8-1.1 8 1.1-.8 7.8.8 7.8-8 1.1-8-1.1.8-7.8Zm3.2 3.1h9.6l-.5 4.7.5 4.7H7.2l.5-4.7Z" />
          <path fill={`url(#${gradientId})`} d="m6 5.7 6-.8 6 .8-.2 1.7H6.2Z" opacity=".44" />
        </>
      );
  }
}

export function ShadowGlyph({
  name,
  size = 24,
  title,
  className,
  ...svgProps
}: ShadowGlyphProps) {
  const reactId = useId();
  const safeId = reactId.replace(/[^a-zA-Z0-9_-]/g, "");
  const titleId = `shadow-glyph-title-${safeId}`;
  const glowId = `shadow-glyph-glow-${safeId}`;
  const gradientId = `shadow-glyph-gradient-${safeId}`;

  return (
    <svg
      {...svgProps}
      aria-hidden={title ? undefined : true}
      aria-labelledby={title ? titleId : undefined}
      className={className}
      fill="none"
      height={size}
      role={title ? "img" : undefined}
      viewBox="0 0 24 24"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      {title ? <title id={titleId}>{title}</title> : null}
      <defs>
        <linearGradient id={gradientId} x1="3" x2="21" y1="3" y2="21" gradientUnits="userSpaceOnUse">
          <stop stopColor="currentColor" stopOpacity=".95" />
          <stop offset=".55" stopColor="currentColor" stopOpacity=".45" />
          <stop offset="1" stopColor="currentColor" stopOpacity=".08" />
        </linearGradient>
        <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%" colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceGraphic" stdDeviation=".55" result="blur" />
          <feColorMatrix
            in="blur"
            result="coloredBlur"
            values="0.45 0 0 0 0.24  0 0.12 0 0 0  0 0 0.9 0 0.45  0 0 0 0.85 0"
          />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g filter={`url(#${glowId})`}>
        <GlyphPaths gradientId={gradientId} name={name} />
      </g>
    </svg>
  );
}

export default ShadowGlyph;
