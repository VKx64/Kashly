import { useState, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Edit3, Filter, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { Select } from "@/components/ui/Select";
import { SelectionBar, type SelectionAction } from "@/components/ui/SelectionBar";
import { getIcon } from "@/constants/icons";
import { peso } from "@/utils/formatters";
import type { ExpandedSubscription } from "@/types/app";

// ── local filter types ─────────────────────────────────────────────────────

type SubStatus = "active" | "inactive" | "all";
type SubFrequencyFilter = "all" | "weekly" | "monthly" | "yearly";
type SubSort = "name" | "amountHigh" | "amountLow" | "nextBilling";

type SubFilters = {
  query: string;
  frequency: SubFrequencyFilter;
  sort: SubSort;
};

const emptySubFilters: SubFilters = {
  query: "",
  frequency: "all",
  sort: "name",
};

// ── helpers ────────────────────────────────────────────────────────────────

function formatFrequency(frequency: ExpandedSubscription["frequency"]) {
  if (frequency === "weekly") return "Weekly";
  if (frequency === "yearly") return "Yearly";
  return "Monthly";
}

function formatBillingDate(dateStr?: string) {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function filterSubscriptions(
  subs: ExpandedSubscription[],
  subStatus: SubStatus,
  filters: SubFilters,
): ExpandedSubscription[] {
  const query = filters.query.trim().toLowerCase();
  return subs
    .filter((sub) => {
      if (subStatus === "active" && !sub.isActive) return false;
      if (subStatus === "inactive" && sub.isActive) return false;
      if (filters.frequency !== "all" && sub.frequency !== filters.frequency) return false;
      if (!query) return true;
      return sub.name.toLowerCase().includes(query);
    })
    .sort((a, b) => {
      if (filters.sort === "amountHigh") return (b.amount || 0) - (a.amount || 0);
      if (filters.sort === "amountLow") return (a.amount || 0) - (b.amount || 0);
      if (filters.sort === "nextBilling") {
        const aDate = a.nextBillingDate ? new Date(a.nextBillingDate).getTime() : Infinity;
        const bDate = b.nextBillingDate ? new Date(b.nextBillingDate).getTime() : Infinity;
        return aDate - bDate;
      }
      return a.name.localeCompare(b.name);
    });
}

// ── component ──────────────────────────────────────────────────────────────

export function SubscriptionsPage({
  subscriptions,
  onAdd,
  onEdit,
  onDelete,
  onBulkDelete,
}: {
  subscriptions: ExpandedSubscription[];
  onAdd: () => void;
  onEdit: (subscription: ExpandedSubscription) => void;
  onDelete: (subscription: ExpandedSubscription) => void;
  onBulkDelete?: (records: ExpandedSubscription[]) => void | Promise<void>;
}) {
  const [subStatus, setSubStatus] = useState<SubStatus>("active");
  const [filters, setFilters] = useState<SubFilters>(emptySubFilters);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const visibleSubs = useMemo(
    () => filterSubscriptions(subscriptions, subStatus, filters),
    [subscriptions, subStatus, filters],
  );

  const hasAdvancedFilters =
    filters.query !== emptySubFilters.query ||
    filters.frequency !== emptySubFilters.frequency ||
    filters.sort !== emptySubFilters.sort;

  const clearAdvancedFilters = () => setFilters(emptySubFilters);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectedRecords = visibleSubs.filter((s) => selectedIds.has(s.id));
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
      <section className="rounded-[1.25rem] border border-white/10 bg-white/[0.04] text-white">
        {/* ── header bar ── */}
        <div className="flex items-center justify-between gap-3 border-b border-white/10 p-3">
          <div className="flex min-w-0 items-center gap-2">
            {/* advanced filter trigger */}
            <button
              type="button"
              onClick={() => setIsFilterOpen(true)}
              className={`grid h-8 w-8 place-items-center rounded-lg border transition ${
                hasAdvancedFilters
                  ? "border-white/25 bg-white text-zinc-950"
                  : "border-white/10 bg-black/20 text-zinc-400 hover:bg-white/10 hover:text-white"
              }`}
              title="Subscription filters"
            >
              <Filter className="h-4 w-4" />
            </button>

            {/* quick-filter pills: active | inactive | all */}
            <div className="grid grid-cols-3 gap-1 rounded-lg bg-black/20 p-1 text-xs">
              {(["active", "inactive", "all"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSubStatus(s)}
                  className={`rounded-md px-4 py-1.5 capitalize transition ${
                    subStatus === s
                      ? "bg-white text-zinc-950"
                      : "text-zinc-400 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            {hasAdvancedFilters && (
              <button
                type="button"
                onClick={clearAdvancedFilters}
                className="rounded-lg px-2 py-1.5 text-xs text-zinc-500 transition hover:bg-white/10 hover:text-white"
              >
                Clear filters
              </button>
            )}
          </div>

          <Button
            onClick={onAdd}
            className="h-8 shrink-0 rounded-lg bg-white px-3 text-xs text-zinc-950 hover:bg-zinc-200"
          >
            <Plus className="h-3.5 w-3.5" /> Subscription
          </Button>
        </div>

        {/* ── body ── */}
        {subscriptions.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-semibold text-zinc-200">No subscriptions yet</p>
            <p className="mt-1 text-xs text-zinc-500">Add subscriptions to track recurring services and which wallet they charge.</p>
          </div>
        ) : visibleSubs.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-semibold text-zinc-200">No subscriptions match these filters</p>
            {hasAdvancedFilters && (
              <Button
                type="button"
                variant="ghost"
                onClick={clearAdvancedFilters}
                className="mt-3 rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white"
              >
                Clear filters
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[860px]">
              <div className="grid grid-cols-[minmax(220px,1.6fr)_160px_120px_120px_140px_112px] gap-x-6 border-b border-white/10 px-4 py-2 text-xs uppercase tracking-[0.14em] text-zinc-600">
                <span>Subscription</span>
                <span>Wallet</span>
                <span>Amount</span>
                <span>Frequency</span>
                <span>Next billing</span>
                <span className="text-right">Manage</span>
              </div>
              {visibleSubs.map((sub) => {
                const Icon = getIcon(sub.icon);
                const isSelected = selectedIds.has(sub.id);
                const chipColor = sub.color || '#a1a1aa';
                return (
                  <div
                    key={sub.id}
                    className={`grid grid-cols-[minmax(220px,1.6fr)_160px_120px_120px_140px_112px] items-center gap-x-6 border-b border-white/10 px-4 py-2.5 text-sm transition last:border-b-0 hover:bg-white/[0.025] ${isSelected ? "bg-white/[0.03]" : ""}`}
                  >
                    {/* Subscription name + icon */}
                    <div className="flex min-w-0 items-center gap-3">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); toggleSelect(sub.id); }}
                        className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg transition ${isSelected ? "bg-white text-zinc-950 ring-2 ring-white" : "bg-black/20"}`}
                        style={isSelected ? undefined : { border: `1px solid ${chipColor}`, color: chipColor }}
                      >
                        {isSelected ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => onEdit(sub)}
                        className="flex min-w-0 items-center text-left"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-zinc-100">{sub.name}</span>
                          {!sub.isActive && <span className="block truncate text-xs text-zinc-500">Paused</span>}
                        </span>
                      </button>
                    </div>

                    {/* Wallet */}
                    <p className="truncate text-zinc-400">{sub.expand?.account?.name ?? "—"}</p>

                    {/* Amount */}
                    <p className="font-semibold text-zinc-100">{peso(sub.amount || 0)}</p>

                    {/* Frequency */}
                    <p className="text-zinc-400">{formatFrequency(sub.frequency)}</p>

                    {/* Next billing */}
                    <p className="text-zinc-400">{formatBillingDate(sub.nextBillingDate)}</p>

                    {/* Actions */}
                    <div className="flex justify-end gap-1.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onEdit(sub)}
                        title="Edit"
                        className="h-8 w-8 rounded-md text-zinc-400 hover:bg-white/10 hover:text-zinc-200"
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onDelete(sub)}
                        title="Delete"
                        className="h-8 w-8 rounded-md text-rose-300 hover:bg-rose-400/10 hover:text-rose-200"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* ── floating SelectionBar ── */}
      <SelectionBar count={selectedIds.size} actions={selectionActions} onClear={clearSelection} />

      {/* ── advanced-filters modal ── */}
      <AnimatePresence>
        {isFilterOpen && (
          <motion.div
            className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={() => setIsFilterOpen(false)}
          >
            <motion.div
              className="w-[min(92vw,560px)] overflow-hidden rounded-[1.25rem] border border-white/10 bg-zinc-950 text-white shadow-2xl"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 18 }}
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between border-b border-white/10 p-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Filters</p>
                  <h2 className="mt-1 text-xl font-semibold">Subscription filters</h2>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsFilterOpen(false)}
                  className="rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid gap-4 p-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <FieldLabel>Search</FieldLabel>
                  <input
                    value={filters.query}
                    onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
                    placeholder="Subscription name"
                    className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-white/25"
                  />
                </div>

                <div>
                  <FieldLabel>Frequency</FieldLabel>
                  <Select
                    className="mt-2"
                    value={filters.frequency}
                    onChange={(v) => setFilters((current) => ({ ...current, frequency: v as SubFrequencyFilter }))}
                    options={[
                      { value: "all", label: "All frequencies" },
                      { value: "weekly", label: "Weekly" },
                      { value: "monthly", label: "Monthly" },
                      { value: "yearly", label: "Yearly" },
                    ]}
                  />
                </div>

                <div>
                  <FieldLabel>Sort</FieldLabel>
                  <Select
                    className="mt-2"
                    value={filters.sort}
                    onChange={(v) => setFilters((current) => ({ ...current, sort: v as SubSort }))}
                    options={[
                      { value: "name", label: "Name" },
                      { value: "amountHigh", label: "Amount high" },
                      { value: "amountLow", label: "Amount low" },
                      { value: "nextBilling", label: "Next billing soonest" },
                    ]}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-white/10 p-5">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={clearAdvancedFilters}
                  className="rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white"
                >
                  Clear
                </Button>
                <Button
                  type="button"
                  onClick={() => setIsFilterOpen(false)}
                  className="rounded-lg bg-white text-zinc-950 hover:bg-zinc-200"
                >
                  Apply
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
