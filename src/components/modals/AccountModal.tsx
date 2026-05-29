import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Power, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { Select } from "@/components/ui/Select";
import { StatusToggle } from "@/components/ui/StatusToggle";
import type { AccountFormValue } from "@/types/app";
import type { AccountRecord, AccountType } from "@/types/finance";
import { accountTypeOptions } from "@/constants/mockData";

const accountTypeSelectOptions = accountTypeOptions.map((type) => ({
  value: type,
  label: type.replace("_", " "),
}));

export function AccountModal({
  open,
  onClose,
  onSave,
  isSaving,
  account,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (value: AccountFormValue) => Promise<void>;
  isSaving: boolean;
  account?: AccountRecord | null;
}) {
  const [form, setForm] = useState<AccountFormValue>({
    id: account?.id,
    name: account?.name || "",
    type: account?.type || "cash",
    startingBalance: account?.startingBalance || 0,
    currentBalance: account?.currentBalance || 0,
    isArchived: Boolean(account?.isArchived),
  });

  const ready = form.name.trim().length > 0 && Number.isFinite(form.startingBalance) && Number.isFinite(form.currentBalance);
  const currentBalanceValue = account ? account.currentBalance || 0 : form.startingBalance;

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
            {/* Header */}
            <div className="flex items-start justify-between border-b border-white/10 p-5">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Account</p>
                <h2 className="mt-1 text-xl font-semibold">{account ? "Edit account" : "Add account"}</h2>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={onClose} className="rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></Button>
            </div>

            {/* Body */}
            <div className="space-y-4 p-5">
              <div>
                <FieldLabel>Name</FieldLabel>
                <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Cash, BPI, Maya..." className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-white/25" />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <FieldLabel>Type</FieldLabel>
                  <div className="mt-2">
                    <Select
                      value={form.type}
                      onChange={(v) => setForm((current) => ({ ...current, type: v as AccountType }))}
                      options={accountTypeSelectOptions}
                    />
                  </div>
                </div>
                <div>
                  <FieldLabel>Starting</FieldLabel>
                  <CurrencyInput
                    className="mt-2"
                    value={form.startingBalance}
                    onChange={(v) => setForm((current) => ({ ...current, startingBalance: v, currentBalance: account ? current.currentBalance : v }))}
                  />
                </div>
                <div>
                  <FieldLabel>Current</FieldLabel>
                  <div className={account ? "mt-2 opacity-60 pointer-events-none" : "mt-2"}>
                    <CurrencyInput
                      value={currentBalanceValue}
                      onChange={(v) => setForm((current) => ({ ...current, currentBalance: v }))}
                    />
                  </div>
                </div>
              </div>
              {account && <p className="rounded-lg border border-amber-400/15 bg-amber-400/10 p-3 text-xs text-amber-200">Current balance is controlled by transactions. Edit the name, type, archive state, or starting balance metadata here.</p>}
            </div>

            {/* Footer */}
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
                <Button type="submit" disabled={!ready || isSaving} className="rounded-lg bg-white text-zinc-950 hover:bg-zinc-200 disabled:opacity-40">{isSaving ? "Saving..." : "Save account"}</Button>
              </div>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
