import { useState, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Archive, Check, Edit3, Filter, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { Select } from "@/components/ui/Select";
import { SelectionBar, type SelectionAction } from "@/components/ui/SelectionBar";
import type { CategoryRecord } from "@/types/finance";
import type { ExpandedTransaction, ExpandedBudget } from "@/types/app";
import { getCategoryUsage } from "@/utils/helpers";
import { getIcon } from "@/constants/icons";

type CategoryFilters = {
  query: string;
  kind: "all" | "income" | "expense";
  status: "active" | "archived" | "all";
  sort: "name" | "kind" | "mostUsed" | "newest";
};

const emptyCategoryFilters: CategoryFilters = { query: "", kind: "all", status: "active", sort: "name" };

function filterCategoryRecords(categories: CategoryRecord[], filters: CategoryFilters, transactions: ExpandedTransaction[], budgets: ExpandedBudget[]) {
  const query = filters.query.trim().toLowerCase();
  return categories
    .filter((category) => {
      if (filters.kind !== "all" && category.kind !== filters.kind) return false;
      if (filters.status === "active" && category.isArchived) return false;
      if (filters.status === "archived" && !category.isArchived) return false;
      if (!query) return true;
      return [category.name, category.icon].some((value) => (value || "").toLowerCase().includes(query));
    })
    .sort((a, b) => {
      if (filters.sort === "kind") return `${a.kind}-${a.name}`.localeCompare(`${b.kind}-${b.name}`);
      if (filters.sort === "mostUsed") {
        const aUsage = getCategoryUsage(a.id, transactions, budgets);
        const bUsage = getCategoryUsage(b.id, transactions, budgets);
        return bUsage.transactions + bUsage.budgets - (aUsage.transactions + aUsage.budgets);
      }
      if (filters.sort === "newest") return b.created.localeCompare(a.created);
      return a.name.localeCompare(b.name);
    });
}

export function CategoriesPage({
  categories,
  transactions,
  budgets,
  onAdd,
  onEdit,
  onArchive,
  onDelete,
  onBulkArchive,
  onBulkDelete,
}: {
  categories: CategoryRecord[];
  transactions: ExpandedTransaction[];
  budgets: ExpandedBudget[];
  onAdd: () => void;
  onEdit: (category: CategoryRecord) => void;
  onArchive: (category: CategoryRecord) => void;
  onDelete?: (category: CategoryRecord) => void;
  onBulkArchive?: (records: CategoryRecord[]) => void | Promise<void>;
  onBulkDelete?: (records: CategoryRecord[]) => void | Promise<void>;
}) {
  const [filters, setFilters] = useState<CategoryFilters>(emptyCategoryFilters);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const visibleCategories = useMemo(() => filterCategoryRecords(categories, filters, transactions, budgets), [budgets, categories, filters, transactions]);
  const hasAdvancedFilters = filters.query !== emptyCategoryFilters.query || filters.kind !== emptyCategoryFilters.kind || filters.sort !== emptyCategoryFilters.sort;
  const clearAdvancedFilters = () => setFilters((current) => ({ ...emptyCategoryFilters, status: current.status }));

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectedRecords = visibleCategories.filter((c) => selectedIds.has(c.id));
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
  if (onBulkDelete) {
    selectionActions.push({
      label: "Delete",
      icon: Trash2,
      tone: "danger",
      onClick: async () => {
        await onBulkDelete(selectedRecords);
        clearSelection();
      },
    });
  }

  return (
    <div className="space-y-4">
      <section className="rounded-[1.25rem] border border-white/10 bg-white/[0.04] text-white">
        {/* Header bar — always visible */}
        <div className="flex items-center justify-between gap-3 border-b border-white/10 p-3">
          <div className="flex min-w-0 items-center gap-2">
            <button type="button" onClick={() => setIsFilterOpen(true)} className={`grid h-8 w-8 place-items-center rounded-lg border transition ${hasAdvancedFilters ? "border-white/25 bg-white text-zinc-950" : "border-white/10 bg-black/20 text-zinc-400 hover:bg-white/10 hover:text-white"}`} title="Category filters">
              <Filter className="h-4 w-4" />
            </button>
            <div className="grid grid-cols-3 gap-1 rounded-lg bg-black/20 p-1 text-xs">
              {(["active", "archived", "all"] as const).map((status) => (
                <button key={status} type="button" onClick={() => setFilters((current) => ({ ...current, status }))} className={`rounded-md px-4 py-1.5 capitalize transition ${filters.status === status ? "bg-white text-zinc-950" : "text-zinc-400 hover:bg-white/10 hover:text-white"}`}>{status}</button>
              ))}
            </div>
            {hasAdvancedFilters && <button type="button" onClick={clearAdvancedFilters} className="rounded-lg px-2 py-1.5 text-xs text-zinc-500 transition hover:bg-white/10 hover:text-white">Clear filters</button>}
          </div>
          <Button onClick={onAdd} className="h-8 shrink-0 rounded-lg bg-white px-3 text-xs text-zinc-950 hover:bg-zinc-200"><Plus className="h-3.5 w-3.5" /> Category</Button>
        </div>

        {categories.length === 0 ? (
          <div className="p-10 text-center"><p className="text-sm font-semibold text-zinc-200">No categories yet</p></div>
        ) : visibleCategories.length === 0 ? (
          <div className="p-10 text-center"><p className="text-sm font-semibold text-zinc-200">No categories match these filters</p>{hasAdvancedFilters && <Button type="button" variant="ghost" onClick={clearAdvancedFilters} className="mt-3 rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white">Clear filters</Button>}</div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[900px]">
              <div className="grid grid-cols-[minmax(280px,1.4fr)_120px_150px_120px_112px] gap-x-8 border-b border-white/10 px-4 py-2 text-xs uppercase tracking-[0.14em] text-zinc-600">
                <span>Category</span>
                <span>Kind</span>
                <span>Usage</span>
                <span>Status</span>
                <span className="text-right">Manage</span>
              </div>
              {visibleCategories.map((category) => {
                const Icon = getIcon(category.icon);
                const usage = getCategoryUsage(category.id, transactions, budgets);
                const isSelected = selectedIds.has(category.id);
                return (
                  <div key={category.id} className={`grid grid-cols-[minmax(280px,1.4fr)_120px_150px_120px_112px] items-center gap-x-8 border-b border-white/10 px-4 py-2.5 text-sm transition last:border-b-0 hover:bg-white/[0.025] ${isSelected ? "bg-white/[0.03]" : ""}`}>
                    <div className="flex min-w-0 items-center gap-3">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); toggleSelect(category.id); }}
                        className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg transition ${isSelected ? "bg-white text-zinc-950 ring-2 ring-white" : "bg-black/20 hover:bg-white/10"}`}
                        style={isSelected ? undefined : { border: `1px solid ${category.color}`, color: category.color }}
                      >
                        {isSelected ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                      </button>
                      <button type="button" onClick={() => onEdit(category)} className="flex min-w-0 items-center text-left">
                        <span className="min-w-0"><span className="block truncate font-medium text-zinc-100">{category.name}</span></span>
                      </button>
                    </div>
                    <p className={category.kind === "income" ? "capitalize text-emerald-300" : "capitalize text-rose-300"}>{category.kind}</p>
                    <p className="text-zinc-400">{usage.transactions} tx · {usage.budgets} budget</p>
                    <p className={category.isArchived ? "text-zinc-500" : "text-emerald-300"}>{category.isArchived ? "Archived" : "Active"}</p>
                    <div className="flex justify-end gap-1.5">
                      <Button type="button" variant="ghost" size="icon-sm" onClick={() => onEdit(category)} title="Edit" className="h-8 w-8 rounded-md text-zinc-400 hover:bg-white/10 hover:text-zinc-200"><Edit3 className="h-4 w-4" /></Button>
                      <Button type="button" variant="ghost" size="icon-sm" onClick={() => onArchive(category)} title={category.isArchived ? "Restore" : "Archive"} className="h-8 w-8 rounded-md text-amber-300 hover:bg-amber-400/10 hover:text-amber-200"><Archive className="h-4 w-4" /></Button>
                      {onDelete && <Button type="button" variant="ghost" size="icon-sm" onClick={() => onDelete(category)} title="Delete" className="h-8 w-8 rounded-md text-rose-300 hover:bg-rose-400/10 hover:text-rose-200"><Trash2 className="h-4 w-4" /></Button>}
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
            <motion.div className="w-[min(92vw,520px)] overflow-hidden rounded-[1.25rem] border border-white/10 bg-zinc-950 text-white shadow-2xl" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 18 }} onMouseDown={(event) => event.stopPropagation()}>
              <div className="flex items-start justify-between border-b border-white/10 p-5"><div><p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Filters</p><h2 className="mt-1 text-xl font-semibold">Category filters</h2></div><Button type="button" variant="ghost" size="icon" onClick={() => setIsFilterOpen(false)} className="rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></Button></div>
              <div className="grid gap-4 p-5 sm:grid-cols-2">
                <div className="sm:col-span-2"><FieldLabel>Search</FieldLabel><input value={filters.query} onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))} placeholder="Category name" className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-white/25" /></div>
                <div>
                  <FieldLabel>Kind</FieldLabel>
                  <Select
                    className="mt-2"
                    value={filters.kind}
                    onChange={(v) => setFilters((current) => ({ ...current, kind: v as CategoryFilters["kind"] }))}
                    options={[{ value: "all", label: "All kinds" }, { value: "income", label: "Income" }, { value: "expense", label: "Expense" }]}
                  />
                </div>
                <div>
                  <FieldLabel>Sort</FieldLabel>
                  <Select
                    className="mt-2"
                    value={filters.sort}
                    onChange={(v) => setFilters((current) => ({ ...current, sort: v as CategoryFilters["sort"] }))}
                    options={[{ value: "name", label: "Name" }, { value: "kind", label: "Kind" }, { value: "mostUsed", label: "Most used" }, { value: "newest", label: "Newest" }]}
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
