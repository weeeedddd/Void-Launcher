import { useMutation } from "@tanstack/react-query";
import { Check, Download, ExternalLink, LoaderCircle, Package } from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { Button } from "@/components/ui/Button";
import type { ModSummary } from "@/types";

const compact = new Intl.NumberFormat("en", { notation: "compact" });

interface ModCardProps {
  mod: ModSummary;
  /** Installs the mod into the selected instance; undefined ⇒ no instance yet. */
  onInstall?: () => Promise<unknown>;
}

/** One search result: icon, meta, categories and a one-click install button. */
export function ModCard({ mod, onInstall }: ModCardProps) {
  const install = useMutation({ mutationFn: onInstall ?? (() => Promise.resolve()) });

  return (
    <article
      className="group flex flex-col gap-3 rounded-xl border border-void-700 bg-void-800/70 p-4
                 transition-all duration-150 hover:border-accent-700 hover:bg-void-800
                 hover:shadow-[0_0_24px_rgb(124_58_237_/_0.12)]"
    >
      <div className="flex items-start gap-3">
        {/* Project icon (fallback: package glyph on a purple gradient) */}
        {mod.iconUrl ? (
          <img src={mod.iconUrl} alt="" className="h-12 w-12 rounded-lg bg-void-700 object-cover" />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-accent-800 to-void-700">
            <Package size={20} className="text-accent-300" />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-ink-100">{mod.name}</h3>
          <p className="truncate text-xs text-ink-500">
            by {mod.author || "unknown"} · {compact.format(mod.downloads)} downloads
          </p>
        </div>

        {/* Open the mod's page on modrinth.com / curseforge.com */}
        <button
          title={`Open on ${mod.platform}`}
          onClick={() => void openUrl(mod.pageUrl)}
          className="cursor-pointer text-ink-500 opacity-0 transition-opacity group-hover:opacity-100 hover:text-accent-400"
        >
          <ExternalLink size={16} />
        </button>
      </div>

      <p className="line-clamp-2 min-h-8 text-sm leading-relaxed text-ink-300">{mod.summary}</p>

      <div className="mt-auto flex items-center justify-between gap-2">
        {/* First few category tags */}
        <div className="flex min-w-0 gap-1.5">
          {mod.categories.slice(0, 3).map((c) => (
            <span
              key={c}
              className="truncate rounded-md bg-void-700/70 px-2 py-0.5 text-[11px] font-medium text-ink-300"
            >
              {c}
            </span>
          ))}
        </div>

        <Button
          className="px-3 py-1.5"
          disabled={!onInstall || install.isPending || install.isSuccess}
          title={onInstall ? undefined : "Create an instance first"}
          onClick={() => install.mutate()}
        >
          {install.isPending ? (
            <LoaderCircle size={14} className="animate-spin" />
          ) : install.isSuccess ? (
            <Check size={14} />
          ) : (
            <Download size={14} />
          )}
          {install.isSuccess ? "Installed" : "Install"}
        </Button>
      </div>

      {install.isError && <p className="text-xs text-red-400">{String(install.error)}</p>}
    </article>
  );
}
