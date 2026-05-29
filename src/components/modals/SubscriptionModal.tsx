import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Power, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { IconPicker } from "@/components/ui/IconPicker";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { DatePicker } from "@/components/ui/DatePicker";
import { Select } from "@/components/ui/Select";
import { ColorPicker } from "@/components/ui/ColorPicker";
import { StatusToggle } from "@/components/ui/StatusToggle";
import type { SubscriptionFormValue } from "@/types/app";
import type { AccountRecord, CategoryRecord, SubscriptionRecord } from "@/types/finance";

const frequencyOptions = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

export function SubscriptionModal({
  open,
  onClose,
  onSave,
  isSaving,
  subscription,
  accounts,
  categories,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (value: SubscriptionFormValue) => Promise<void>;
  isSaving: boolean;
  subscription?: SubscriptionRecord | null;
  accounts: AccountRecord[];
  categories: CategoryRecord[];
}) {
  const activeAccounts = accounts.filter((a) => !a.isArchived);
  const expenseCategories = categories.filter((c) => c.kind === "expense" && !c.isArchived);

  const accountOptions = activeAccounts.map((a) => ({ value: a.id, label: a.name }));
  const categoryOptions = [
    { value: "", label: "None" },
    ...expenseCategories.map((c) => ({ value: c.id, label: c.name })),
  ];

  const [form, setForm] = useState<SubscriptionFormValue>({
    id: subscription?.id,
    name: subscription?.name ?? "",
    amount: subscription?.amount ?? 0,
    accountId: subscription?.account ?? activeAccounts[0]?.id ?? "",
    categoryId: subscription?.category ?? "",
    frequency: subscription?.frequency ?? "monthly",
    nextBillingDate: subscription?.nextBillingDate?.slice(0, 10) ?? "",
    icon: subscription?.icon ?? "receipt",
    color: subscription?.color ?? "#818cf8",
    isActive: subscription?.isActive !== false,
    notes: subscription?.notes ?? "",
  });

  const ready = form.name.trim().length > 0 && form.amount > 0 && Boolean(form.accountId);

  function set<K extends keyof SubscriptionFormValue>(key: K, value: SubscriptionFormValue[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={onClose}
        >
          <motion.form
            onSubmit={(event) => {
              event.preventDefault();
              if (ready) void onSave({ ...form, name: form.name.trim(), notes: form.notes.trim() });
            }}
            onMouseDown={(event) => event.stopPropagation()}
            className="w-[min(92vw,560px)] overflow-hidden rounded-[1.25rem] border border-white/10 bg-zinc-950 text-white shadow-2xl"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 18 }}
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-white/10 p-5">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Subscription</p>
                <h2 className="mt-1 text-xl font-semibold">{subscription ? "Edit subscription" : "Add subscription"}</h2>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={onClose} className="rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white">
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Body */}
            <div className="space-y-4 p-5">
              {/* Name + Amount */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel>Name</FieldLabel>
                  <input
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                    placeholder="Netflix, Spotify..."
                    className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-white/25"
                  />
                </div>
                <div>
                  <FieldLabel>Amount</FieldLabel>
                  <CurrencyInput
                    value={form.amount}
                    onChange={(value) => set("amount", value)}
                    placeholder="0.00"
                    className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-white/25"
                  />
                </div>
              </div>

              {/* Wallet + Frequency */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel>Wallet (billed from)</FieldLabel>
                  <div className="mt-2">
                    {activeAccounts.length === 0
                      ? <Select value="" onChange={() => undefined} options={[{ value: "", label: "No accounts" }]} />
                      : <Select value={form.accountId} onChange={(v) => set("accountId", v)} options={accountOptions} />
                    }
                  </div>
                </div>
                <div>
                  <FieldLabel>Frequency</FieldLabel>
                  <div className="mt-2">
                    <Select
                      value={form.frequency}
                      onChange={(v) => set("frequency", v as SubscriptionFormValue["frequency"])}
                      options={frequencyOptions}
                    />
                  </div>
                </div>
              </div>

              {/* Category + Next billing date */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel>Category (optional)</FieldLabel>
                  <div className="mt-2">
                    <Select value={form.categoryId} onChange={(v) => set("categoryId", v)} options={categoryOptions} />
                  </div>
                </div>
                <div>
                  <FieldLabel>Next billing date</FieldLabel>
                  <DatePicker
                    value={form.nextBillingDate}
                    onChange={(value) => set("nextBillingDate", value)}
                    placeholder="YYYY-MM-DD"
                    className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-white outline-none [color-scheme:dark]"
                  />
                </div>
              </div>

              {/* Color */}
              <div>
                <FieldLabel>Color</FieldLabel>
                <div className="mt-2">
                  <ColorPicker value={form.color} onChange={(c) => set("color", c)} />
                </div>
              </div>

              {/* Icon */}
              <div className="space-y-2">
                <FieldLabel>Icon</FieldLabel>
                <IconPicker value={form.icon} color={form.color} onChange={(key) => set("icon", key)} />
              </div>

              {/* Notes */}
              <div>
                <FieldLabel>Notes (optional)</FieldLabel>
                <textarea
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  placeholder="Plan details, account info..."
                  rows={2}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-white/25 resize-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-2 border-t border-white/10 p-5">
              <StatusToggle
                active={form.isActive}
                onToggle={() => set("isActive", !form.isActive)}
                activeLabel="Active"
                inactiveLabel="Inactive"
                icon={Power}
              />
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={onClose} className="rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white">
                  Cancel
                </Button>
                <Button type="submit" disabled={!ready || isSaving} className="rounded-lg bg-white text-zinc-950 hover:bg-zinc-200 disabled:opacity-40">
                  {isSaving ? "Saving..." : "Save subscription"}
                </Button>
              </div>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
