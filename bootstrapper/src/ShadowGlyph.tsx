import type { SVGProps } from "react";

export type ShadowGlyphName =
  | "arrow"
  | "check"
  | "close"
  | "download"
  | "folder"
  | "globe"
  | "launch"
  | "mark"
  | "minimize"
  | "shield";

export interface IShadowGlyphProps extends Omit<SVGProps<SVGSVGElement>, "name"> {
  name: ShadowGlyphName;
  size?: number;
}

export function ShadowGlyph({ name, size = 20, ...props }: IShadowGlyphProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {name === "mark" ? (
        <>
          <path d="M12 1.8 20.6 6 18 17.9 12 22.2 4.1 17 3.4 7.2 12 1.8Z" />
          <path d="m7.1 8.3 4.7 10.1 5.4-11.6-5.4 3.4-4.7-1.9Z" />
          <path d="m4.5 14.8 7.3 3.6 6.7-4.8" />
        </>
      ) : null}
      {name === "arrow" ? (
        <>
          <path d="M3 12h14.5" />
          <path d="m13.5 5.5 6.8 6.5-6.8 6.5 1.6-6.5-1.6-6.5Z" />
        </>
      ) : null}
      {name === "check" ? (
        <>
          <path d="m3.2 12.8 4.4 4.5L20.9 4.8l-3.3 8.8-9.9 7.2-4.5-8Z" />
          <path d="m7.6 17.3 1.8-4.4" />
        </>
      ) : null}
      {name === "close" ? (
        <>
          <path d="m4 4 6.2 7.8L3.9 20" />
          <path d="m20 4-6.2 7.8 6.3 8.2" />
          <path d="M9.9 11.8h4" />
        </>
      ) : null}
      {name === "minimize" ? (
        <>
          <path d="M4 16.5h16" />
          <path d="m7 14.5-3 2 3 2" />
        </>
      ) : null}
      {name === "globe" ? (
        <>
          <path d="M12 2 4.1 5.7 2 13.8l5.8 7.1 9.2-.7 5-7.9-3.7-7.5L12 2Z" />
          <path d="M3.2 10h17.6M4.6 16.7h14.8M12 2c2.8 3.1 3.8 6.5 3.1 10.2-.6 3.2-1.7 6-3.1 9.8M12 2C9.1 5.4 8 8.8 8.9 12.2c.7 3.1 1.7 6 3.1 9.8" />
        </>
      ) : null}
      {name === "folder" ? (
        <>
          <path d="M2.5 6.8h7l2-2.3h9.9l-1.8 14.8H4.2L2.5 6.8Z" />
          <path d="m4.2 19.3 2.2-9.4h15.1l-1.9 9.4" />
        </>
      ) : null}
      {name === "download" ? (
        <>
          <path d="M12 2.6v12.1" />
          <path d="m6.6 10.6 5.4 5.7 5.4-5.7-1.5 5.7H8.1l-1.5-5.7Z" />
          <path d="M3.2 20.8h17.6" />
        </>
      ) : null}
      {name === "launch" ? (
        <>
          <path d="m5 3.2 14.7 8.7L5 20.8l2.4-8.9L5 3.2Z" />
          <path d="m7.4 11.9 8.7.1-8.7-.1Z" />
        </>
      ) : null}
      {name === "shield" ? (
        <>
          <path d="M12 2.1 20 5v6.4c0 5-3.1 8.6-8 10.5-4.9-1.9-8-5.5-8-10.5V5l8-2.9Z" />
          <path d="m7.9 12.1 2.5 2.6 5.9-6.2-1.4 5.4-4.5 3.4-2.5-5.2Z" />
        </>
      ) : null}
    </svg>
  );
}
