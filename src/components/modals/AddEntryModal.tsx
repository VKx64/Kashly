import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { DatePicker } from "@/components/ui/DatePicker";
import type { CategoryView, Entry, TransactionFormEntry, WalletView } from "@/types/app";
import { fallbackWallets, transactionTypeOptions } from "@/constants/mockData";
import { formatTransactionDateTime, peso } from "@/utils/formatters";
import { dataTimestampFromEntry, getCategoryMeta, getCurrentTimeInputValue, getGridLimitLabel, getTodayInputValue, getVisibleCategories, toDateTimeParts } from "@/utils/helpers";

export function AddEntryModal({
  open,
  onClose,
  onAdd,
  wallets,
  categories,
  isSaving,
  editEntry,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (entry: TransactionFormEntry) => Promise<void>;
  wallets: WalletView[];
  categories: CategoryView[];
  isSaving: boolean;
  editEntry?: Entry | null;
}) {
  const nowDate = getTodayInputValue();
  const initialParts = editEntry ? toDateTimeParts(dataTimestampFromEntry(editEntry)) : { date: nowDate, time: getCurrentTimeInputValue() };
  const initialForm = {
    type: editEntry?.type === "income" ? "income" : "expense",
    title: editEntry?.title || "",
    amount: editEntry ? Math.abs(editEntry.amount) : 0,
    date: initialParts.date,
    time: initialParts.time,
    category: editEntry?.category || categories.find((category) => category.kind === "expense")?.name || "Dining",
    wallet: editEntry?.wallet || wallets[0]?.name || "",
    note: editEntry?.note || "",
  };
  const [form, setForm] = useState(initialForm);

  const visibleCategories = getVisibleCategories(form.type, categories);
  const isReady = form.title.trim().length > 0 && form.amount > 0 && wallets.length > 0;
  const selectedWallet = wallets.find((wallet) => wallet.name === form.wallet) || wallets[0] || { ...fallbackWallets[0], id: "fallback-empty" };
  const SelectedWalletIcon = selectedWallet.icon;

  const update = (key: string, value: string) => {
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (key === "type" && value === "income") {
        next.category = categories.find((category) => category.kind === "income")?.name || "Income";
        next.wallet = wallets[0]?.name || "";
      }
      if (key === "type" && value === "expense" && current.category === "Income") {
        next.category = categories.find((category) => category.kind === "expense")?.name || "Dining";
        next.wallet = wallets[0]?.name || "";
      }
      return next;
    });
  };

  const submitEntry = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isReady) return;
    const signedAmount = form.type === "expense" ? -Math.abs(form.amount) : Math.abs(form.amount);
    await onAdd({
      id: editEntry?.id,
      title: form.title.trim(),
      amount: signedAmount,
      type: form.type as "income" | "expense",
      category: form.category,
      wallet: form.wallet,
      date: form.date,
      time: form.time,
      note: form.note.trim(),
    });
    setForm({
      type: "expense",
      title: "",
      amount: 0,
      date: getTodayInputValue(),
      time: getCurrentTimeInputValue(),
      category: categories.find((category) => category.kind === "expense")?.name || "Dining",
      wallet: wallets[0]?.name || "",
      note: "",
    });
    onClose();
  };

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
            onSubmit={submitEntry}
            onMouseDown={(event) => event.stopPropagation()}
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            className="flex max-h-[calc(100vh-2rem)] w-[min(94vw,860px)] flex-col overflow-hidden rounded-[1.25rem] border border-white/10 bg-zinc-950 text-white shadow-2xl shadow-black/60"
          >
            {/* Header */}
            <div className="flex shrink-0 items-start justify-between border-b border-white/10 bg-white/[0.025] p-5">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Transaction</p>
                <h2 className="mt-1 text-xl font-semibold tracking-tight">{editEntry ? "Edit transaction" : "Add transaction"}</h2>
                <p className="mt-1 text-sm text-zinc-400">{editEntry ? "Changes will update the matching wallet balance." : "Date stays as now unless you choose to change it."}</p>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={onClose} className="rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white">
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-x-hidden overflow-y-auto p-5">
              {/* Income / Expense toggle */}
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-white/[0.06] p-1.5">
                {transactionTypeOptions.map(([value, label, Icon]) => (
                  <button
                    key={value as string}
                    type="button"
                    onClick={() => update("type", value as string)}
                    className={`flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition ${form.type === value ? "bg-white text-zinc-950" : "text-zinc-400 hover:bg-white/10 hover:text-white"}`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>

              {/* Core fields */}
              <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.04] p-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <FieldLabel>Amount</FieldLabel>
                    <CurrencyInput
                      className="mt-2 h-12"
                      value={form.amount}
                      onChange={(v) => setForm((current) => ({ ...current, amount: v }))}
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <FieldLabel>Description</FieldLabel>
                    <input
                      value={form.title}
                      onChange={(event) => update("title", event.target.value)}
                      placeholder={form.type === "income" ? "Client payment, allowance, refund..." : "Food, bill, groceries..."}
                      className="mt-2 h-12 w-full rounded-lg border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-white/25 focus:bg-black/30"
                    />
                  </div>

                  <div>
                    <FieldLabel>Note</FieldLabel>
                    <textarea
                      value={form.note}
                      onChange={(event) => update("note", event.target.value)}
                      placeholder="Optional detail, reference, or reminder"
                      rows={5}
                      className="mt-2 h-[170px] w-full resize-none rounded-lg border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-white/25 focus:bg-black/30"
                    />
                  </div>

                  <div className="grid gap-4">
                    <div>
                      <FieldLabel>Date</FieldLabel>
                      <DatePicker
                        value={form.date}
                        onChange={(v) => update("date", v)}
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <FieldLabel>Time</FieldLabel>
                      <input
                        type="time"
                        value={form.time}
                        onChange={(event) => update("time", event.target.value)}
                        className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-white outline-none transition [color-scheme:dark] focus:border-white/25 focus:bg-black/30"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Category + Wallet pickers */}
              <div className="mt-4 grid min-w-0 gap-4 md:grid-cols-[0.9fr_1.1fr]">
                <div className="min-w-0 overflow-hidden rounded-xl border border-white/10 bg-white/[0.035] p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <FieldLabel>Category</FieldLabel>
                    <span className="text-[11px] text-zinc-600">{getGridLimitLabel(visibleCategories.length, "category")}</span>
                  </div>
                  <div className="min-w-0 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    <div className="flex w-max snap-x snap-mandatory gap-2">
                      {visibleCategories.map((category) => {
                        const meta = getCategoryMeta(category);
                        const Icon = meta.icon;
                        const isSelected = form.category === category.name;
                        return (
                          <button
                            key={category.id || category.name}
                            type="button"
                            onClick={() => update("category", category.name)}
                            className={`w-[132px] shrink-0 snap-start rounded-lg border p-3 text-left transition ${isSelected ? "border-white/30 bg-white/[0.09]" : "border-white/10 bg-white/[0.035] hover:border-white/20 hover:bg-white/[0.06]"}`}
                          >
                            <span className={`grid h-8 w-8 place-items-center rounded-lg bg-black/20 ${meta.text}`}>
                              <Icon className="h-4 w-4" />
                            </span>
                            <span className="mt-2 block truncate text-xs font-medium text-zinc-200">{category.name}</span>
                            <span className="mt-1 block truncate text-xs text-zinc-600">{meta.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="min-w-0 overflow-hidden rounded-xl border border-white/10 bg-white/[0.035] p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <FieldLabel>Wallet</FieldLabel>
                    <span className="text-[11px] text-zinc-600">{getGridLimitLabel(wallets.length, "wallet")}</span>
                  </div>
                  <div className="min-w-0 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    <div className="flex w-max snap-x snap-mandatory gap-2">
                      {wallets.map((wallet) => {
                        const Icon = wallet.icon;
                        const isSelected = form.wallet === wallet.name;
                        return (
                          <button
                            key={wallet.name}
                            type="button"
                            onClick={() => update("wallet", wallet.name)}
                            className={`w-[132px] shrink-0 snap-start rounded-lg border p-3 text-left transition ${isSelected ? "border-white/30 bg-white/[0.09]" : "border-white/10 bg-white/[0.035] hover:border-white/20 hover:bg-white/[0.06]"}`}
                          >
                            <span className={`grid h-8 w-8 place-items-center rounded-lg bg-black/20 ${wallet.text}`}>
                              <Icon className="h-4 w-4" />
                            </span>
                            <span className="mt-2 block truncate text-xs font-medium text-zinc-200">{wallet.name}</span>
                            <span className={wallet.balance < 0 ? "mt-1 block truncate text-xs font-semibold text-rose-300" : "mt-1 block truncate text-xs font-semibold text-zinc-500"}>
                              {peso(wallet.balance)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex shrink-0 items-center justify-between gap-3 border-t border-white/10 bg-zinc-950/95 p-5 backdrop-blur">
              <div className="flex min-w-0 items-center gap-3 text-xs text-zinc-500">
                <SelectedWalletIcon className={`h-4 w-4 ${selectedWallet.text}`} />
                <span className="truncate">Saving to {form.wallet} · {formatTransactionDateTime(form.date, form.time)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" onClick={onClose} className="rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white">
                  Cancel
                </Button>
                <Button type="submit" disabled={!isReady || isSaving} className="rounded-lg bg-white text-zinc-950 hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40">
                  {isSaving ? "Saving..." : editEntry ? "Save changes" : "Save transaction"}
                </Button>
              </div>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
