import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Power, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { IconPicker } from "@/components/ui/IconPicker";
import { Select } from "@/components/ui/Select";
import { ColorPicker } from "@/components/ui/ColorPicker";
import { StatusToggle } from "@/components/ui/StatusToggle";
import type { CategoryFormValue } from "@/types/app";
import type { CategoryRecord } from "@/types/finance";

const kindOptions = [
  { value: "income", label: "Income" },
  { value: "expense", label: "Expense" },
];

export function CategoryModal({
  open,
  onClose,
  onSave,
  isSaving,
  category,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (value: CategoryFormValue) => Promise<void>;
  isSaving: boolean;
  category?: CategoryRecord | null;
}) {
  const [form, setForm] = useState<CategoryFormValue>({
    id: category?.id,
    name: category?.name || "",
    kind: category?.kind || "expense",
    color: category?.color || "#8b5cf6",
    icon: category?.icon || "other",
    isArchived: Boolean(category?.isArchived),
  });

  const ready = form.name.trim().length > 0 && /^#[0-9a-fA-F]{6}$/.test(form.color);

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
            className="w-[min(92vw,520px)] overflow-hidden rounded-[1.25rem] border border-white/10 bg-zinc-950 text-white shadow-2xl"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 18 }}
          >
            <div className="flex items-start justify-between border-b border-white/10 p-5">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Category</p>
                <h2 className="mt-1 text-xl font-semibold">{category ? "Edit category" : "Add category"}</h2>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={onClose} className="rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></Button>
            </div>
            <div className="space-y-4 p-5">
              <div>
                <FieldLabel>Name</FieldLabel>
                <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Food, Salary, Utilities..." className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-white/25" />
              </div>
              <div>
                <FieldLabel>Kind</FieldLabel>
                <div className="mt-2">
                  <Select
                    value={form.kind}
                    onChange={(v) => setForm((current) => ({ ...current, kind: v as "income" | "expense" }))}
                    options={kindOptions}
                  />
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
                active={!form.isArchived}
                onToggle={() => setForm((current) => ({ ...current, isArchived: !current.isArchived }))}
                activeLabel="Active"
                inactiveLabel="Inactive"
                icon={Power}
              />
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={onClose} className="rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white">Cancel</Button>
                <Button type="submit" disabled={!ready || isSaving} className="rounded-lg bg-white text-zinc-950 hover:bg-zinc-200 disabled:opacity-40">{isSaving ? "Saving..." : "Save category"}</Button>
              </div>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
