import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Power, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { IconPicker } from "@/components/ui/IconPicker";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { DatePicker } from "@/components/ui/DatePicker";
import { StatusToggle } from "@/components/ui/StatusToggle";
import type { GoalFormValue } from "@/types/app";
import type { GoalRecord } from "@/types/finance";

export function GoalModal({
  open,
  onClose,
  onSave,
  isSaving,
  goal,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (value: GoalFormValue) => Promise<void>;
  isSaving: boolean;
  goal?: GoalRecord | null;
}) {
  const [form, setForm] = useState<GoalFormValue>({
    id: goal?.id,
    name: goal?.name || "",
    targetAmount: goal?.targetAmount || 0,
    currentAmount: goal?.currentAmount || 0,
    monthlyTarget: goal?.monthlyTarget || 0,
    targetDate: goal?.targetDate ? goal.targetDate.slice(0, 10) : "",
    icon: goal?.icon || "target",
    priority: goal?.priority ?? 100,
    isCompleted: Boolean(goal?.isCompleted),
  });

  const ready = form.name.trim().length > 0 && form.targetAmount > 0;

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
          <motion.form
            onSubmit={(event) => {
              event.preventDefault();
              if (ready) void onSave({ ...form, name: form.name.trim() });
            }}
            onMouseDown={(event) => event.stopPropagation()}
            className="w-[min(92vw,560px)] overflow-hidden rounded-[1.25rem] border border-white/10 bg-zinc-950 text-white shadow-2xl"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 18 }}
          >
            <div className="flex items-start justify-between border-b border-white/10 p-5">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Goal</p>
                <h2 className="mt-1 text-xl font-semibold">{goal ? "Edit goal" : "Add goal"}</h2>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={onClose} className="rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></Button>
            </div>
            <div className="space-y-4 p-5">
              <div>
                <FieldLabel>Name</FieldLabel>
                <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Emergency fund, New laptop..." className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-white/25" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel>Target amount</FieldLabel>
                  <CurrencyInput className="mt-2" value={form.targetAmount} onChange={(v) => setForm((current) => ({ ...current, targetAmount: v }))} placeholder="0.00" />
                </div>
                <div>
                  <FieldLabel>Starting balance</FieldLabel>
                  <CurrencyInput className="mt-2" value={form.currentAmount} onChange={(v) => setForm((current) => ({ ...current, currentAmount: v }))} placeholder="0.00" />
                  <p className="mt-1 text-xs text-zinc-600">Distributions add on top of this.</p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel>Monthly target (optional)</FieldLabel>
                  <CurrencyInput className="mt-2" value={form.monthlyTarget} onChange={(v) => setForm((current) => ({ ...current, monthlyTarget: v }))} placeholder="0.00" />
                  <p className="mt-1 text-xs text-zinc-600">How much to fund per month.</p>
                </div>
                <div>
                  <FieldLabel>Target date (optional)</FieldLabel>
                  <DatePicker className="mt-2" value={form.targetDate} onChange={(v) => setForm((current) => ({ ...current, targetDate: v }))} placeholder="No target date" />
                </div>
              </div>
              <div>
                <FieldLabel>Priority</FieldLabel>
                <input type="number" min={1} value={form.priority} onChange={(event) => setForm((current) => ({ ...current, priority: Number(event.target.value) || 1 }))} className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-white outline-none [color-scheme:dark]" />
              </div>
              <div className="space-y-2">
                <FieldLabel>Icon</FieldLabel>
                <IconPicker value={form.icon} color="#38bdf8" onChange={(key) => setForm((current) => ({ ...current, icon: key }))} />
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-white/10 p-5">
              <StatusToggle
                active={!form.isCompleted}
                onToggle={() => setForm((current) => ({ ...current, isCompleted: !current.isCompleted }))}
                activeLabel="Active"
                inactiveLabel="Inactive"
                icon={Power}
              />
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={onClose} className="rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white">Cancel</Button>
                <Button type="submit" disabled={!ready || isSaving} className="rounded-lg bg-white text-zinc-950 hover:bg-zinc-200 disabled:opacity-40">{isSaving ? "Saving..." : "Save goal"}</Button>
              </div>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
