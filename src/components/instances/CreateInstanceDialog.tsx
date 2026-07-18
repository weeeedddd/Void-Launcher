import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import type { InstanceLoader } from "@/types";

const GAME_VERSIONS = ["1.21.4", "1.21.1", "1.20.6", "1.20.1", "1.19.2", "1.18.2"];
const LOADERS: InstanceLoader[] = ["fabric", "neoforge", "forge", "quilt", "vanilla"];

/** Modal for the modpack builder: pick a name, Minecraft version and loader. */
export function CreateInstanceDialog({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [gameVersion, setGameVersion] = useState("1.21.1");
  const [loader, setLoader] = useState<InstanceLoader>("fabric");

  const queryClient = useQueryClient();
  const create = useMutation({
    mutationFn: () => api.createInstance({ name: name.trim(), gameVersion, loader }),
    onSuccess: () => {
      // Refresh every instance list in the app, then close.
      void queryClient.invalidateQueries({ queryKey: ["instances"] });
      onClose();
    },
  });

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Panel (clicks inside must not close the dialog) */}
      <div
        className="w-96 rounded-xl border border-void-700 bg-void-850 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 text-lg font-semibold">Create Instance</h3>

        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm text-ink-300">
            Name
            <input
              autoFocus
              className="control select-text"
              placeholder="My Modpack"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5 text-sm text-ink-300">
              Minecraft
              <select
                className="control"
                value={gameVersion}
                onChange={(e) => setGameVersion(e.target.value)}
              >
                {GAME_VERSIONS.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5 text-sm text-ink-300">
              Loader
              <select
                className="control capitalize"
                value={loader}
                onChange={(e) => setLoader(e.target.value as InstanceLoader)}
              >
                {LOADERS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {create.isError && <p className="text-xs text-red-400">{String(create.error)}</p>}

          <div className="mt-2 flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              disabled={name.trim().length === 0 || create.isPending}
              onClick={() => create.mutate()}
            >
              Create
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
