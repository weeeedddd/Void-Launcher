interface IShadowEmblemProps {
  className?: string;
  size?: number;
}

export function ShadowEmblem({ className = "", size = 32 }: IShadowEmblemProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M32 3 55 14 51 43 32 60 13 43 9 14 32 3Z" fill="#1A1A1A" stroke="currentColor" strokeWidth="2" />
      <path d="m17 39 11-24 4 17 15-18-9 24-5-6-5 16-11-9Z" fill="currentColor" />
      <path d="m24 39 8-7 7 7-7 10-8-10Z" fill="#050505" />
      <path d="M18 18 32 9l14 9" stroke="#F1E8FF" strokeOpacity=".72" strokeWidth="1.5" />
    </svg>
  );
}
