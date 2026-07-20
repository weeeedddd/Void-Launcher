import { useEffect, useState } from "react";
import { UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

interface MinecraftAvatarProps {
  username: string;
  size?: number;
  className?: string;
}

/** Public Minecraft face render with a local fallback for missing skins/network. */
export function MinecraftAvatar({ username, size = 64, className }: MinecraftAvatarProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [username]);

  if (failed) {
    return (
      <span className={cn("grid shrink-0 place-items-center bg-gradient-to-br from-accent-500/35 to-midnight-500/25 text-accent-200", className)} aria-label={`${username} avatar fallback`}>
        <UserRound size={Math.max(14, Math.round(size * 0.42))} />
      </span>
    );
  }

  return (
    <img
      src={`https://mc-heads.net/avatar/${encodeURIComponent(username)}/${size}`}
      alt={`${username} Minecraft avatar`}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={cn("shrink-0 bg-void-800 object-cover [image-rendering:pixelated]", className)}
    />
  );
}

export function OfflineShadowAvatar({ size = 64, className }: Omit<MinecraftAvatarProps, "username">) {
  return (
    <img
      src="/offline-shadow-avatar.png"
      alt="Offline shadow profile"
      width={size}
      height={size}
      decoding="async"
      className={cn("shrink-0 bg-void-900 object-cover", className)}
    />
  );
}
