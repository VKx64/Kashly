import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Power, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { DatePicker } from "@/components/ui/DatePicker";
import { Select } from "@/components/ui/Select";
import { StatusToggle } from "@/components/ui/StatusToggle";
import type { DebtFormValue } from "@/types/app";
import type { DebtKind, DebtRecord } from "@/types/finance";
import { debtKindOptions } from "@/constants/mockData";

const debtKindSelectOptions = debtKindOptions.map((kind) => ({
  value: kind,
  label: kind.replace("_", " "),
}));

export function DebtModal({
  open,
  onClose,
  onSave,
  isSaving,
  debt,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (value: DebtFormValue) => Promise<void>;
  isSaving: boolean;
  debt?: DebtRecord | null;
}) {
  const [form, setForm] = useState<DebtFormValue>({
    id: debt?.id,
    name: debt?.name || "",
    kind: debt?.kind || "personal",
    direction: debt?.direction || "owe",
    amount: debt?.amount || 0,
    paidAmount: debt?.paidAmount || 0,
    dueDate: debt?.dueDate ? debt.dueDate.slice(0, 10) : "",
    notes: debt?.notes || "",
    isArchived: Boolean(debt?.isArchived),
  });
  const ready = form.name.trim().length > 0 && form.amount > 0 && form.paidAmount >= 0;

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
          <motion.form
            onSubmit={(event) => {
              event.preventDefault();
              if (ready) void onSave({ ...form, name: form.name.trim(), paidAmount: Math.min(form.paidAmount, form.amount) });
            }}
            onMouseDown={(event) => event.stopPropagation()}
            className="flex max-h-[calc(100vh-2rem)] w-[min(94vw,560px)] flex-col overflow-hidden rounded-[1.25rem] border border-white/10 bg-zinc-950 text-white shadow-2xl"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 18 }}
          >
            <div className="flex items-start justify-between border-b border-white/10 p-5">
              <div><p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Debt</p><h2 className="mt-1 text-xl font-semibold">{debt ? "Edit" : "Add debt"}</h2></div>
              <Button type="button" variant="ghost" size="icon" onClick={onClose} className="rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></Button>
            </div>
            <div className="grid flex-1 gap-4 overflow-auto p-5 sm:grid-cols-2">
              <div className="sm:col-span-2"><FieldLabel>Direction</FieldLabel><div className="mt-2 grid grid-cols-2 gap-1 rounded-lg bg-black/20 p-1 text-xs">{([ { value: "owe", label: "I owe" }, { value: "lent", label: "Owed to me" } ] as const).map(({ value, label }) => (<button key={value} type="button" onClick={() => setForm((current) => ({ ...current, direction: value }))} className={`rounded-md px-4 py-2 transition ${form.direction === value ? "bg-white text-zinc-950 font-medium" : "text-zinc-400 hover:bg-white/10 hover:text-white"}`}>{label}</button>))}</div></div>
              <div><FieldLabel>Who / what</FieldLabel><input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Gemuel, BPI card, Phone installment..." className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-white/25" /></div>
              <div>
                <FieldLabel>Type</FieldLabel>
                <div className="mt-2">
                  <Select
                    value={form.kind}
                    onChange={(v) => setForm((current) => ({ ...current, kind: v as DebtKind }))}
                    options={debtKindSelectOptions}
                  />
                </div>
              </div>
              <div>
                <FieldLabel>{form.direction === "lent" ? "Amount lent" : "Amount owed"}</FieldLabel>
                <CurrencyInput className="mt-2" value={form.amount} onChange={(v) => setForm((current) => ({ ...current, amount: v }))} />
              </div>
              <div>
                <FieldLabel>{form.direction === "lent" ? "Already collected" : "Already paid"}</FieldLabel>
                <CurrencyInput className="mt-2" value={form.paidAmount} onChange={(v) => setForm((current) => ({ ...current, paidAmount: v }))} />
              </div>
              <div>
                <FieldLabel>Due date</FieldLabel>
                <DatePicker className="mt-2" value={form.dueDate} onChange={(v) => setForm((current) => ({ ...current, dueDate: v }))} placeholder="No due date" />
              </div>
              <div className="sm:col-span-2"><FieldLabel>Note</FieldLabel><textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} rows={3} placeholder="711 food last night" className="mt-2 w-full resize-none rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-white/25" /></div>
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
                <Button type="submit" disabled={!ready || isSaving} className="rounded-lg bg-white text-zinc-950 hover:bg-zinc-200 disabled:opacity-40">{isSaving ? "Saving..." : "Save debt"}</Button>
              </div>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
