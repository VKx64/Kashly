import { useState, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Archive, Check, Edit3, Filter, Plus, QrCode, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { Select } from "@/components/ui/Select";
import { SelectionBar, type SelectionAction } from "@/components/ui/SelectionBar";
import type { AccountType, AccountRecord } from "@/types/finance";
import type { ExpandedTransaction } from "@/types/app";
import { getAccountUsage, mapAccountToWallet } from "@/utils/helpers";
import { peso } from "@/utils/formatters";
import { accountTypeOptions } from "@/constants/mockData";

type AccountFilters = {
  query: string;
  type: "all" | AccountType;
  status: "active" | "archived" | "all";
  balance: "all" | "positive" | "zero" | "negative";
  sort: "balanceHigh" | "balanceLow" | "name" | "type" | "newest";
};

const emptyAccountFilters: AccountFilters = { query: "", type: "all", status: "active", balance: "all", sort: "balanceHigh" };

function filterAccountRecords(accounts: AccountRecord[], filters: AccountFilters) {
  const query = filters.query.trim().toLowerCase();
  return accounts
    .filter((account) => {
      const balance = account.currentBalance || 0;
      if (filters.type !== "all" && account.type !== filters.type) return false;
      if (filters.status === "active" && account.isArchived) return false;
      if (filters.status === "archived" && !account.isArchived) return false;
      if (filters.balance === "positive" && balance <= 0) return false;
      if (filters.balance === "zero" && balance !== 0) return false;
      if (filters.balance === "negative" && balance >= 0) return false;
      if (!query) return true;
      return [account.name, account.type].some((value) => (value || "").toLowerCase().includes(query));
    })
    .sort((a, b) => {
      if (filters.sort === "balanceLow") return (a.currentBalance || 0) - (b.currentBalance || 0);
      if (filters.sort === "name") return a.name.localeCompare(b.name);
      if (filters.sort === "type") return `${a.type}-${a.name}`.localeCompare(`${b.type}-${b.name}`);
      if (filters.sort === "newest") return b.created.localeCompare(a.created);
      return (b.currentBalance || 0) - (a.currentBalance || 0);
    });
}

export function AccountsPage({
  accounts,
  transactions,
  onAdd,
  onEdit,
  onArchive,
  onBulkArchive,
  onShowQr,
}: {
  accounts: AccountRecord[];
  transactions: ExpandedTransaction[];
  onAdd: () => void;
  onEdit: (account: AccountRecord) => void;
  onArchive: (account: AccountRecord) => void;
  onBulkArchive?: (records: AccountRecord[]) => void | Promise<void>;
  onShowQr?: (account: AccountRecord) => void;
}) {
  const [filters, setFilters] = useState<AccountFilters>(emptyAccountFilters);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const visibleAccounts = useMemo(() => filterAccountRecords(accounts, filters), [accounts, filters]);
  const hasAdvancedFilters = filters.query !== emptyAccountFilters.query || filters.type !== emptyAccountFilters.type || filters.balance !== emptyAccountFilters.balance || filters.sort !== emptyAccountFilters.sort;
  const clearAdvancedFilters = () => setFilters((current) => ({ ...emptyAccountFilters, status: current.status }));

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectedRecords = visibleAccounts.filter((a) => selectedIds.has(a.id));
  const clearSelection = () => setSelectedIds(new Set());

  const selectionActions: SelectionAction[] = [];
  if (onBulkArchive) {
    selectionActions.push({
      label: "Archive",
      icon: Archive,
      tone: "default",
      onClick: async () => {
        await onBulkArchive(selectedRecords);
        clearSelection();
      },
    });
  }

  const CHIP_COLOR = "#a1a1aa"; // zinc-400

  return (
    <div className="space-y-4">
      <section className="rounded-[1.25rem] border border-white/10 bg-white/[0.04] text-white">
        {/* Header bar — always visible */}
        <div className="flex items-center justify-between gap-3 border-b border-white/10 p-3">
          <div className="flex min-w-0 items-center gap-2">
            <button type="button" onClick={() => setIsFilterOpen(true)} className={`grid h-8 w-8 place-items-center rounded-lg border transition ${hasAdvancedFilters ? "border-white/25 bg-white text-zinc-950" : "border-white/10 bg-black/20 text-zinc-400 hover:bg-white/10 hover:text-white"}`} title="Account filters"><Filter className="h-4 w-4" /></button>
            <div className="grid grid-cols-3 gap-1 rounded-lg bg-black/20 p-1 text-xs">
              {(["active", "archived", "all"] as const).map((status) => <button key={status} type="button" onClick={() => setFilters((current) => ({ ...current, status }))} className={`rounded-md px-4 py-1.5 capitalize transition ${filters.status === status ? "bg-white text-zinc-950" : "text-zinc-400 hover:bg-white/10 hover:text-white"}`}>{status}</button>)}
            </div>
            {hasAdvancedFilters && <button type="button" onClick={clearAdvancedFilters} className="rounded-lg px-2 py-1.5 text-xs text-zinc-500 transition hover:bg-white/10 hover:text-white">Clear filters</button>}
          </div>
          <Button onClick={onAdd} className="h-8 shrink-0 rounded-lg bg-white px-3 text-xs text-zinc-950 hover:bg-zinc-200"><Plus className="h-3.5 w-3.5" /> Account</Button>
        </div>

        {accounts.length === 0 ? (
          <div className="p-10 text-center"><p className="text-sm font-semibold text-zinc-200">No accounts yet</p></div>
        ) : visibleAccounts.length === 0 ? (
          <div className="p-10 text-center"><p className="text-sm font-semibold text-zinc-200">No accounts match these filters</p>{hasAdvancedFilters && <Button type="button" variant="ghost" onClick={clearAdvancedFilters} className="mt-3 rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white">Clear filters</Button>}</div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[980px]">
              <div className="grid grid-cols-[minmax(260px,1.4fr)_120px_140px_140px_110px_112px] gap-x-8 border-b border-white/10 px-4 py-2 text-xs uppercase tracking-[0.14em] text-zinc-600"><span>Account</span><span>Type</span><span>Starting</span><span>Current</span><span>Usage</span><span className="text-right">Manage</span></div>
              {visibleAccounts.map((account) => {
                const wallet = mapAccountToWallet(account);
                const Icon = wallet.icon;
                const usage = getAccountUsage(account.id, transactions);
                const isSelected = selectedIds.has(account.id);
                return (
                  <div key={account.id} className={`grid grid-cols-[minmax(260px,1.4fr)_120px_140px_140px_110px_112px] items-center gap-x-8 border-b border-white/10 px-4 py-2.5 text-sm transition last:border-b-0 hover:bg-white/[0.025] ${isSelected ? "bg-white/[0.03]" : ""}`}>
                    <div className="flex min-w-0 items-center gap-3">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); toggleSelect(account.id); }}
                        className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg transition ${isSelected ? "bg-white text-zinc-950 ring-2 ring-white" : "bg-black/20 hover:bg-white/10"}`}
                        style={isSelected ? undefined : { border: `1px solid ${CHIP_COLOR}`, color: CHIP_COLOR }}
                        title={isSelected ? "Deselect" : "Select"}
                      >
                        {isSelected ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                      </button>
                      <button type="button" onClick={() => onEdit(account)} className="flex min-w-0 items-center text-left">
                        <span className="min-w-0"><span className="block truncate font-medium text-zinc-100">{account.name}</span><span className={account.isArchived ? "block truncate text-xs text-zinc-500" : "block truncate text-xs text-emerald-300"}>{account.isArchived ? "Archived" : "Active"}</span></span>
                      </button>
                    </div>
                    <p className="capitalize text-zinc-400">{account.type.replace("_", " ")}</p>
                    <p className="text-zinc-400">{peso(account.startingBalance || 0)}</p>
                    <p className={(account.currentBalance || 0) < 0 ? "font-semibold text-rose-300" : "font-semibold text-zinc-100"}>{peso(account.currentBalance || 0)}</p>
                    <p className="text-zinc-400">{usage} tx</p>
                    <div className="flex justify-end gap-1.5">
                      {onShowQr && (
                        <Button type="button" variant="ghost" size="icon-sm" onClick={() => onShowQr(account)} title="Manage QR" className="h-8 w-8 rounded-md text-zinc-400 hover:bg-white/10 hover:text-zinc-200"><QrCode className="h-4 w-4" /></Button>
                      )}
                      <Button type="button" variant="ghost" size="icon-sm" onClick={() => onEdit(account)} title="Edit" className="h-8 w-8 rounded-md text-zinc-400 hover:bg-white/10 hover:text-zinc-200"><Edit3 className="h-4 w-4" /></Button>
                      <Button type="button" variant="ghost" size="icon-sm" onClick={() => onArchive(account)} title={account.isArchived ? "Restore" : "Archive"} className="h-8 w-8 rounded-md text-amber-300 hover:bg-amber-400/10 hover:text-amber-200"><Archive className="h-4 w-4" /></Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Floating selection bar */}
      <SelectionBar count={selectedIds.size} actions={selectionActions} onClear={clearSelection} />

      <AnimatePresence>
        {isFilterOpen && (
          <motion.div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={() => setIsFilterOpen(false)}>
            <motion.div className="w-[min(92vw,560px)] overflow-hidden rounded-[1.25rem] border border-white/10 bg-zinc-950 text-white shadow-2xl" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 18 }} onMouseDown={(event) => event.stopPropagation()}>
              <div className="flex items-start justify-between border-b border-white/10 p-5"><div><p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Filters</p><h2 className="mt-1 text-xl font-semibold">Account filters</h2></div><Button type="button" variant="ghost" size="icon" onClick={() => setIsFilterOpen(false)} className="rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></Button></div>
              <div className="grid gap-4 p-5 sm:grid-cols-2">
                <div className="sm:col-span-2"><FieldLabel>Search</FieldLabel><input value={filters.query} onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))} placeholder="Account name" className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-white/25" /></div>
                <div>
                  <FieldLabel>Type</FieldLabel>
                  <Select
                    className="mt-2"
                    value={filters.type}
                    onChange={(v) => setFilters((current) => ({ ...current, type: v as AccountFilters["type"] }))}
                    options={[{ value: "all", label: "All types" }, ...accountTypeOptions.map((t) => ({ value: t, label: t.replace("_", " ") }))]}
                  />
                </div>
                <div>
                  <FieldLabel>Balance</FieldLabel>
                  <Select
                    className="mt-2"
                    value={filters.balance}
                    onChange={(v) => setFilters((current) => ({ ...current, balance: v as AccountFilters["balance"] }))}
                    options={[{ value: "all", label: "All balances" }, { value: "positive", label: "Positive" }, { value: "zero", label: "Zero" }, { value: "negative", label: "Negative" }]}
                  />
                </div>
                <div>
                  <FieldLabel>Sort</FieldLabel>
                  <Select
                    className="mt-2"
                    value={filters.sort}
                    onChange={(v) => setFilters((current) => ({ ...current, sort: v as AccountFilters["sort"] }))}
                    options={[{ value: "balanceHigh", label: "Balance high" }, { value: "balanceLow", label: "Balance low" }, { value: "name", label: "Name" }, { value: "type", label: "Type" }, { value: "newest", label: "Newest" }]}
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
