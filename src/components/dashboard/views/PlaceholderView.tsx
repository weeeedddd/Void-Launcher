import { motion } from "motion/react";
import type { LucideIcon } from "lucide-react";

/** Themed "coming soon" screen for dashboard sections not built yet. */
export function PlaceholderView({ icon: Icon, title, message }: { icon: LucideIcon; title: string; message: string }) {
  return (
    <div className="grid h-full place-items-center p-8 text-center">
      <div>
        <motion.div
          className="mx-auto grid h-20 w-20 place-items-center rounded-2xl border border-[#7B2CBF]/30 bg-[#110D17]/70"
          animate={{ boxShadow: ["0 0 24px -8px rgba(123,44,191,0.5)", "0 0 40px -8px rgba(123,44,191,0.8)", "0 0 24px -8px rgba(123,44,191,0.5)"] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          <Icon className="h-9 w-9 text-[#C77DFF]" />
        </motion.div>
        <h2 className="mt-5 font-serif text-2xl font-bold text-[#EAE4F4]">{title}</h2>
        <p className="mt-2 max-w-sm text-sm text-[#9A90B2]">{message}</p>
      </div>
    </div>
  );
}
