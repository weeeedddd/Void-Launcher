import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { api } from "@/lib/api";
import { CreateInstanceDialog } from "./CreateInstanceDialog";
import { InstanceCard } from "./InstanceCard";

/** Home page: all instances (modpacks) as a card grid + "new instance" tile. */
export function InstancesPage() {
  const [creating, setCreating] = useState(false);
  const { data: instances } = useQuery({ queryKey: ["instances"], queryFn: api.listInstances });

  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Instances</h2>
        <p className="mt-1 text-sm text-ink-500">
          Each instance is its own Minecraft installation with its own mods and settings.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {instances?.map((instance) => <InstanceCard key={instance.id} instance={instance} />)}

        {/* New-instance tile */}
        <button
          onClick={() => setCreating(true)}
          className="flex min-h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl
                     border-2 border-dashed border-void-600 text-ink-500 transition-colors
                     hover:border-accent-600 hover:text-accent-400"
        >
          <Plus size={28} />
          <span className="text-sm font-medium">New Instance</span>
        </button>
      </div>

      {creating && <CreateInstanceDialog onClose={() => setCreating(false)} />}
    </div>
  );
}
