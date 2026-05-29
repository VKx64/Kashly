import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Power, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { IconPicker } from "@/components/ui/IconPicker";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { Select } from "@/components/ui/Select";
import { ColorPicker } from "@/components/ui/ColorPicker";
import { StatusToggle } from "@/components/ui/StatusToggle";
import type { BudgetFormValue } from "@/types/app";
import type { BudgetRecord, CategoryRecord } from "@/types/finance";

export function BudgetModal({
  open,
  onClose,
  onSave,
  isSaving,
  budget,
  categories,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (value: BudgetFormValue) => Promise<void>;
  isSaving: boolean;
  budget?: BudgetRecord | null;
  categories: CategoryRecord[];
}) {
  const expenseCategories = categories.filter((category) => category.kind === "expense" && !category.isArchived);
  const categoryOptions = expenseCategories.map((category) => ({ value: category.id, label: category.name }));

  const [form, setForm] = useState<BudgetFormValue>({
    id: budget?.id,
    category: budget?.category || expenseCategories[0]?.id || "",
    name: budget?.name || "",
    amount: budget?.amount || 0,
    priority: budget?.priority ?? 1,
    icon: budget?.icon || "home",
    color: budget?.color || "#34d399",
    isActive: budget?.isActive !== false,
  });

  const ready = Boolean(form.category) && form.amount > 0;

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
                <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Need</p>
                <h2 className="mt-1 text-xl font-semibold">{budget ? "Edit need" : "Add need"}</h2>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={onClose} className="rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></Button>
            </div>
            <div className="space-y-4 p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel>Category</FieldLabel>
                  <div className="mt-2">
                    {expenseCategories.length === 0
                      ? <Select value="" onChange={() => undefined} options={[{ value: "", label: "No expense categories" }]} />
                      : <Select value={form.category} onChange={(v) => setForm((current) => ({ ...current, category: v }))} options={categoryOptions} />
                    }
                  </div>
                </div>
                <div>
                  <FieldLabel>Monthly target</FieldLabel>
                  <CurrencyInput
                    className="mt-2"
                    value={form.amount}
                    onChange={(v) => setForm((current) => ({ ...current, amount: v }))}
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel>Label (optional)</FieldLabel>
                  <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Rent, Groceries..." className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-white/25" />
                </div>
                <div>
                  <FieldLabel>Priority</FieldLabel>
                  <input type="number" min={1} value={form.priority} onChange={(event) => setForm((current) => ({ ...current, priority: Number(event.target.value) || 1 }))} className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-white outline-none [color-scheme:dark]" />
                  <p className="mt-1 text-xs text-zinc-600">Lower funds first.</p>
                </div>
              </div>
              <div>
                <FieldLabel>Color</FieldLabel>
                <div className="mt-2">
                  <ColorPicker value={form.color} onChange={(c) => setForm((current) => ({ ...current, color: c }))} />
                </div>
              </div>
              <div className="space-y-2">
                <FieldLabel>Icon</FieldLabel>
                <IconPicker value={form.icon} color={form.color} onChange={(key) => setForm((current) => ({ ...current, icon: key }))} />
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-white/10 p-5">
              <StatusToggle
                active={form.isActive}
                onToggle={() => setForm((current) => ({ ...current, isActive: !current.isActive }))}
                activeLabel="Active"
                inactiveLabel="Inactive"
                icon={Power}
              />
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={onClose} className="rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white">Cancel</Button>
                <Button type="submit" disabled={!ready || isSaving} className="rounded-lg bg-white text-zinc-950 hover:bg-zinc-200 disabled:opacity-40">{isSaving ? "Saving..." : "Save need"}</Button>
              </div>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
