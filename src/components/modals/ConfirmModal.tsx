import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel,
  busy,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div className="w-[min(92vw,420px)] rounded-[1.25rem] border border-white/10 bg-zinc-950 p-5 text-white shadow-2xl" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}>
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="mt-2 text-sm text-zinc-400">{description}</p>
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={onClose} disabled={busy} className="rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white">Cancel</Button>
              <Button type="button" onClick={onConfirm} disabled={busy} className="rounded-lg bg-rose-500 text-white hover:bg-rose-400">{busy ? "Working..." : confirmLabel}</Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
