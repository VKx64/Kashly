import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type SelectionAction = {
  label: string;
  icon?: LucideIcon;
  tone?: "default" | "danger";
  onClick: () => void | Promise<void>;
};

export function SelectionBar({
  count,
  actions,
  onClear,
}: {
  count: number;
  actions: SelectionAction[];
  onClear: () => void;
}): React.ReactElement | null {
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 flex items-center gap-2 rounded-full border border-white/10 bg-zinc-900/95 px-3 py-2 shadow-2xl backdrop-blur"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          <span className="px-2 text-sm text-zinc-300">{count} selected</span>

          <div className="h-5 w-px bg-white/10" />

          {actions.map((action) => {
            const ActionIcon = action.icon;
            const isDanger = action.tone === "danger";
            return (
              <button
                key={action.label}
                type="button"
                onClick={action.onClick}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 h-8 text-xs transition ${
                  isDanger
                    ? "text-rose-300 hover:bg-rose-400/10 hover:text-rose-200"
                    : "text-zinc-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                {ActionIcon && <ActionIcon className="h-3.5 w-3.5" />}
                {action.label}
              </button>
            );
          })}

          <div className="h-5 w-px bg-white/10" />

          <button
            type="button"
            onClick={onClear}
            aria-label="Clear selection"
            className="inline-flex items-center justify-center rounded-full h-8 w-8 text-zinc-400 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
