import { useState, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Edit3, Filter, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { Select } from "@/components/ui/Select";
import { SelectionBar, type SelectionAction } from "@/components/ui/SelectionBar";
import { Card, CardContent } from "@/components/ui/card";
import type { CategoryView, Entry, WalletView } from "@/types/app";
import { peso } from "@/utils/formatters";
import { dataTimestampFromEntry } from "@/utils/helpers";

// ── transaction chip colors (no color field on Entry) ─────────────────────
const INCOME_COLOR = '#34d399';
const EXPENSE_COLOR = '#fb7185';

type TransactionFilters = {
  query: string;
  type: "all" | "income" | "expense";
  accountId: string;
  categoryId: string;
  from: string;
  to: string;
  sort: "newest" | "oldest" | "amountHigh" | "amountLow";
};

const emptyFilters: TransactionFilters = {
  query: "",
  type: "all",
  accountId: "all",
  categoryId: "all",
  from: "",
  to: "",
  sort: "newest",
};

function filterTransactions(entries: Entry[], filters: TransactionFilters) {
  const query = filters.query.trim().toLowerCase();
  return entries
    .filter((entry) => {
      if (filters.type !== "all" && entry.type !== filters.type) return false;
      if (filters.accountId !== "all" && entry.walletId !== filters.accountId) return false;
      if (filters.categoryId !== "all" && entry.categoryId !== filters.categoryId) return false;
      if (filters.from && dataTimestampFromEntry(entry).slice(0, 10) < filters.from) return false;
      if (filters.to && dataTimestampFromEntry(entry).slice(0, 10) > filters.to) return false;
      if (!query) return true;
      return [entry.title, entry.note, entry.wallet, entry.category].some((value) => (value || "").toLowerCase().includes(query));
    })
    .sort((a, b) => {
      if (filters.sort === "oldest") return dataTimestampFromEntry(a).localeCompare(dataTimestampFromEntry(b));
      if (filters.sort === "amountHigh") return Math.abs(b.amount) - Math.abs(a.amount);
      if (filters.sort === "amountLow") return Math.abs(a.amount) - Math.abs(b.amount);
      return dataTimestampFromEntry(b).localeCompare(dataTimestampFromEntry(a));
    });
}

export function TransactionsPage({
  entries,
  wallets,
  categories,
  onAdd,
  onEdit,
  onDelete,
  onBulkDelete,
}: {
  entries: Entry[];
  wallets: WalletView[];
  categories: CategoryView[];
  onAdd: () => void;
  onEdit: (entry: Entry) => void;
  onDelete: (entry: Entry) => void;
  onBulkDelete?: (records: Entry[]) => void | Promise<void>;
}) {
  const [filters, setFilters] = useState<TransactionFilters>(emptyFilters);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filteredEntries = useMemo(() => filterTransactions(entries, filters), [entries, filters]);
  const hasAdvancedFilters = filters.query !== emptyFilters.query || filters.accountId !== emptyFilters.accountId || filters.categoryId !== emptyFilters.categoryId || filters.from !== emptyFilters.from || filters.to !== emptyFilters.to || filters.sort !== emptyFilters.sort;
  const clearAdvancedFilters = () => setFilters((current) => ({ ...emptyFilters, type: current.type }));

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectedRecords = filteredEntries.filter((e) => e.id && selectedIds.has(e.id));
  const clearSelection = () => setSelectedIds(new Set());

  const handleBulkDelete = async () => {
    if (onBulkDelete) await onBulkDelete(selectedRecords);
    clearSelection();
  };

  const selectionActions: SelectionAction[] = [
    ...(onBulkDelete
      ? [{ label: "Delete", icon: Trash2, tone: "danger" as const, onClick: handleBulkDelete }]
      : []),
  ];

  return (
    <div className="space-y-4">
      <Card className="rounded-[1.25rem] border-white/10 bg-white/[0.04] text-white">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 p-3">
          <div className="flex min-w-0 items-center gap-2">
            <button type="button" onClick={() => setIsFilterOpen(true)} className={`grid h-8 w-8 place-items-center rounded-lg border transition ${hasAdvancedFilters ? "border-white/25 bg-white text-zinc-950" : "border-white/10 bg-black/20 text-zinc-400 hover:bg-white/10 hover:text-white"}`} title="Transaction filters"><Filter className="h-4 w-4" /></button>
            <div className="grid grid-cols-3 gap-1 rounded-lg bg-black/20 p-1 text-xs">
              {(["all", "income", "expense"] as const).map((type) => <button key={type} type="button" onClick={() => setFilters((current) => ({ ...current, type, categoryId: "all" }))} className={`rounded-md px-4 py-1.5 capitalize transition ${filters.type === type ? "bg-white text-zinc-950" : "text-zinc-400 hover:bg-white/10 hover:text-white"}`}>{type}</button>)}
            </div>
            {hasAdvancedFilters && <button type="button" onClick={clearAdvancedFilters} className="rounded-lg px-2 py-1.5 text-xs text-zinc-500 transition hover:bg-white/10 hover:text-white">Clear filters</button>}
          </div>
          <div className="flex shrink-0 gap-2">
            <Button onClick={onAdd} className="h-8 rounded-lg bg-white px-3 text-xs text-zinc-950 hover:bg-zinc-200"><Plus className="h-3.5 w-3.5" /> Transaction</Button>
          </div>
        </div>
        <CardContent className="p-0">
          {entries.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm font-semibold text-zinc-200">No transactions yet</p>
              <p className="mt-1 text-sm text-zinc-500">Add one manually to start tracking activity.</p>
              <div className="mt-4 flex justify-center gap-2"><Button onClick={onAdd} className="rounded-lg bg-white text-zinc-950 hover:bg-zinc-200"><Plus className="h-4 w-4" /> Add transaction</Button></div>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm font-semibold text-zinc-200">No transactions match these filters</p>
              {hasAdvancedFilters && <Button type="button" variant="ghost" onClick={clearAdvancedFilters} className="mt-3 rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white">Clear filters</Button>}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[1060px]">
                <div className="grid grid-cols-[minmax(320px,1.15fr)_minmax(280px,1.1fr)_150px_170px_130px_84px] gap-x-4 border-b border-white/10 px-4 py-2 text-xs uppercase tracking-[0.14em] text-zinc-600">
                  <span>Transaction</span>
                  <span>Wallet</span>
                  <span>Category</span>
                  <span>Date</span>
                  <span className="text-right">Amount</span>
                  <span className="text-right">Manage</span>
                </div>
                {filteredEntries.map((entry) => {
                  const Icon = entry.icon;
                  const isIncome = entry.amount > 0;
                  const chipColor = isIncome ? INCOME_COLOR : EXPENSE_COLOR;
                  const entryId = entry.id ?? `${entry.title}-${entry.createdAt}`;
                  const isSelected = entry.id ? selectedIds.has(entry.id) : false;
                  return (
                    <div key={entryId} className={`grid grid-cols-[minmax(320px,1.15fr)_minmax(280px,1.1fr)_150px_170px_130px_84px] items-center gap-x-4 border-b border-white/10 px-4 py-2.5 text-sm transition last:border-b-0 hover:bg-white/[0.025] ${isSelected ? "bg-white/[0.03]" : ""}`}>
                      <div className="flex min-w-0 items-center gap-3">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); if (entry.id) toggleSelect(entry.id); }}
                          className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg transition ${isSelected ? "bg-white text-zinc-950 ring-2 ring-white" : "bg-black/20"}`}
                          style={isSelected ? undefined : { border: `1px solid ${chipColor}`, color: chipColor }}
                          disabled={!entry.id}
                        >
                          {isSelected ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                        </button>
                        <button type="button" onClick={() => !entry.debtId && onEdit(entry)} className="flex min-w-0 items-center text-left" title={entry.debtId ? "Edit from Debts to keep balances in sync" : undefined}>
                          <span className="min-w-0"><span className="block truncate font-medium text-zinc-100">{entry.title}</span><span className="block truncate text-xs text-zinc-600">{entry.note || "No note"}</span></span>
                        </button>
                      </div>
                      <p className="truncate text-zinc-400" title={entry.wallet}>{entry.wallet}</p>
                      <p className={isIncome ? "truncate text-emerald-300" : "truncate text-rose-300"}>{entry.category}</p>
                      <p className="text-zinc-500">{entry.createdAt || "Logged"}</p>
                      <p className={`text-right font-semibold ${isIncome ? "text-emerald-300" : "text-rose-300"}`}>{peso(entry.amount)}</p>
                      <div className="flex justify-end gap-1">
                        <Button type="button" variant="ghost" size="icon-sm" disabled={Boolean(entry.debtId)} onClick={() => onEdit(entry)} title="Edit" className="h-8 w-8 rounded-md text-zinc-400 hover:bg-white/10 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-30"><Edit3 className="h-4 w-4" /></Button>
                        <Button type="button" variant="ghost" size="icon-sm" disabled={Boolean(entry.debtId)} onClick={() => onDelete(entry)} title="Delete" className="h-8 w-8 rounded-md text-rose-300 hover:bg-rose-400/10 hover:text-rose-200 disabled:cursor-not-allowed disabled:opacity-30"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── floating SelectionBar ── */}
      <SelectionBar count={selectedIds.size} actions={selectionActions} onClear={clearSelection} />

      <AnimatePresence>
        {isFilterOpen && (
          <motion.div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={() => setIsFilterOpen(false)}>
            <motion.div className="w-[min(92vw,680px)] overflow-hidden rounded-[1.25rem] border border-white/10 bg-zinc-950 text-white shadow-2xl" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 18 }} onMouseDown={(event) => event.stopPropagation()}>
              <div className="flex items-start justify-between border-b border-white/10 p-5"><div><p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Filters</p><h2 className="mt-1 text-xl font-semibold">Transaction filters</h2></div><Button type="button" variant="ghost" size="icon" onClick={() => setIsFilterOpen(false)} className="rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></Button></div>
              <div className="grid gap-4 p-5 sm:grid-cols-2">
                <div className="sm:col-span-2"><FieldLabel>Search</FieldLabel><input value={filters.query} onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))} placeholder="Merchant, notes, account" className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-white/25" /></div>
                <div>
                  <FieldLabel>Wallet</FieldLabel>
                  <Select
                    className="mt-2"
                    value={filters.accountId}
                    onChange={(v) => setFilters((current) => ({ ...current, accountId: v }))}
                    options={[{ value: "all", label: "All wallets" }, ...wallets.map((w) => ({ value: w.id, label: w.name }))]}
                  />
                </div>
                <div>
                  <FieldLabel>Category</FieldLabel>
                  <Select
                    className="mt-2"
                    value={filters.categoryId}
                    onChange={(v) => setFilters((current) => ({ ...current, categoryId: v }))}
                    options={[{ value: "all", label: "All categories" }, ...categories.filter((c) => filters.type === "all" || c.kind === filters.type).map((c) => ({ value: c.id || c.name, label: c.name }))]}
                  />
                </div>
                <div><FieldLabel>From</FieldLabel><input type="date" value={filters.from} onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))} className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-white outline-none [color-scheme:dark]" /></div>
                <div><FieldLabel>To</FieldLabel><input type="date" value={filters.to} onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))} className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-white outline-none [color-scheme:dark]" /></div>
                <div>
                  <FieldLabel>Sort</FieldLabel>
                  <Select
                    className="mt-2"
                    value={filters.sort}
                    onChange={(v) => setFilters((current) => ({ ...current, sort: v as TransactionFilters["sort"] }))}
                    options={[{ value: "newest", label: "Newest" }, { value: "oldest", label: "Oldest" }, { value: "amountHigh", label: "Highest amount" }, { value: "amountLow", label: "Lowest amount" }]}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t border-white/10 p-5"><Button type="button" variant="ghost" onClick={clearAdvancedFilters} className="rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white">Clear</Button><Button type="button" onClick={() => setIsFilterOpen(false)} className="rounded-lg bg-white text-zinc-950 hover:bg-zinc-200">Apply</Button></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
