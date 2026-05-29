import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { DatePicker } from "@/components/ui/DatePicker";
import { Select } from "@/components/ui/Select";
import type { DebtPaymentValue } from "@/types/app";
import type { AccountRecord, CategoryRecord, DebtRecord } from "@/types/finance";
import { getDebtRemaining, getTodayInputValue } from "@/utils/helpers";
import { peso } from "@/utils/formatters";

export function DebtPaymentModal({
  debt,
  accounts,
  categories,
  isSaving,
  onClose,
  onSave,
}: {
  debt: DebtRecord | null;
  accounts: AccountRecord[];
  categories: CategoryRecord[];
  isSaving: boolean;
  onClose: () => void;
  onSave: (value: DebtPaymentValue) => Promise<void>;
}) {
  const isLent = debt?.direction === "lent";
  const activeAccounts = accounts.filter((account) => !account.isArchived);
  const relevantCategories = categories.filter((category) => !category.isArchived && category.kind === (isLent ? "income" : "expense"));
  const [amount, setAmount] = useState<number>(() => (debt ? getDebtRemaining(debt) : 0));
  const [accountId, setAccountId] = useState(activeAccounts[0]?.id || "");
  const [categoryId, setCategoryId] = useState(relevantCategories[0]?.id || "");
  const [date, setDate] = useState(getTodayInputValue());
  const [notes, setNotes] = useState("");
  const [createTransaction, setCreateTransaction] = useState(true);
  const ready = Boolean(debt && amount > 0 && (!createTransaction || (accountId && categoryId)));

  const accountOptions = activeAccounts.map((account) => ({
    value: account.id,
    label: `${account.name} · ${peso(account.currentBalance || 0)}`,
  }));
  const categoryOptions = relevantCategories.map((category) => ({
    value: category.id,
    label: category.name,
  }));

  return (
    <AnimatePresence>
      {debt && (
        <motion.div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
          <motion.form
            onSubmit={(event) => {
              event.preventDefault();
              if (ready) void onSave({ debt, accountId, categoryId, amount, date, notes: notes.trim(), createTransaction });
            }}
            onMouseDown={(event) => event.stopPropagation()}
            className="w-[min(92vw,520px)] overflow-hidden rounded-[1.25rem] border border-white/10 bg-zinc-950 text-white shadow-2xl"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 18 }}
          >
            <div className="flex items-start justify-between border-b border-white/10 p-5"><div><p className="text-xs uppercase tracking-[0.24em] text-zinc-500">{isLent ? "Repayment received" : "Debt payment"}</p><h2 className="mt-1 text-xl font-semibold">{isLent ? `Collect from ${debt.name}` : `Pay ${debt.name}`}</h2><p className="mt-1 text-sm text-zinc-400">{isLent ? "Log a partial or full repayment from the borrower." : "Log a partial or full payment."}</p></div><Button type="button" variant="ghost" size="icon" onClick={onClose} className="rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></Button></div>
            <div className="space-y-4 p-5">
              <div>
                <FieldLabel>Amount</FieldLabel>
                <CurrencyInput className="mt-2" value={amount} onChange={setAmount} placeholder="0.00" />
              </div>
              <label className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.035] p-3 text-sm"><span><span className="block font-medium text-zinc-200">{isLent ? "Create income transaction" : "Create expense transaction"}</span><span className="text-xs text-zinc-500">{isLent ? "Also increase selected wallet/account." : "Also decrease selected wallet/account."}</span></span><input type="checkbox" checked={createTransaction} onChange={(event) => setCreateTransaction(event.target.checked)} /></label>
              {createTransaction && (
                <div>
                  <FieldLabel>{isLent ? "Receiving account" : "Funding account"}</FieldLabel>
                  <div className="mt-2">
                    <Select value={accountId} onChange={setAccountId} options={accountOptions} />
                  </div>
                </div>
              )}
              {createTransaction && (
                <div>
                  <FieldLabel>Category</FieldLabel>
                  <div className="mt-2">
                    <Select value={categoryId} onChange={setCategoryId} options={categoryOptions} />
                  </div>
                </div>
              )}
              <div>
                <FieldLabel>Date</FieldLabel>
                <DatePicker className="mt-2" value={date} onChange={setDate} />
              </div>
              <div><FieldLabel>Notes</FieldLabel><textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} placeholder="Confirmation number or detail" className="mt-2 w-full resize-none rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-600" /></div>
            </div>
            <div className="flex justify-end gap-2 border-t border-white/10 p-5"><Button type="button" variant="ghost" onClick={onClose} className="rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white">Cancel</Button><Button type="submit" disabled={!ready || isSaving} className="rounded-lg bg-white text-zinc-950 hover:bg-zinc-200 disabled:opacity-40">{isSaving ? "Recording..." : "Record payment"}</Button></div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
