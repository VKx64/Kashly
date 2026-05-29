import { useState, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Edit3, Filter, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { Select } from "@/components/ui/Select";
import { SelectionBar, type SelectionAction } from "@/components/ui/SelectionBar";
import { getIcon } from "@/constants/icons";
import { peso } from "@/utils/formatters";
import type { NeedEnvelope } from "@/types/app";

// ── local filter types (not exported to src/types/app.ts) ──────────────────

type NeedStatus = "active" | "inactive" | "all";
type NeedPriorityFilter = "all" | "high" | "normal";
type NeedSort = "priority" | "name" | "targetHigh" | "targetLow" | "mostUnderfunded";

type NeedFilters = {
  query: string;
  priority: NeedPriorityFilter;
  sort: NeedSort;
};

const emptyNeedFilters: NeedFilters = {
  query: "",
  priority: "all",
  sort: "priority",
};

// ── pure filter + sort helper ──────────────────────────────────────────────

function filterNeeds(needs: NeedEnvelope[], status: NeedStatus, filters: NeedFilters): NeedEnvelope[] {
  const query = filters.query.trim().toLowerCase();
  return needs
    .filter((need) => {
      if (status === "active" && !need.isActive) return false;
      if (status === "inactive" && need.isActive) return false;
      if (filters.priority === "high" && need.priority !== 1) return false;
      if (filters.priority === "normal" && need.priority === 1) return false;
      if (!query) return true;
      return need.name.toLowerCase().includes(query);
    })
    .sort((a, b) => {
      if (filters.sort === "name") return a.name.localeCompare(b.name);
      if (filters.sort === "targetHigh") return b.target - a.target;
      if (filters.sort === "targetLow") return a.target - b.target;
      if (filters.sort === "mostUnderfunded") return a.percentFunded - b.percentFunded;
      // default: priority ascending (1 = high first), then name
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.name.localeCompare(b.name);
    });
}

// ── component ──────────────────────────────────────────────────────────────

export function BudgetsPage({
  needs,
  onAdd,
  onEdit,
  onDelete,
  onBulkDelete,
}: {
  needs: NeedEnvelope[];
  onAdd: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onBulkDelete?: (records: NeedEnvelope[]) => void | Promise<void>;
}) {
  const [status, setStatus] = useState<NeedStatus>("active");
  const [filters, setFilters] = useState<NeedFilters>(emptyNeedFilters);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const visibleNeeds = useMemo(() => filterNeeds(needs, status, filters), [needs, status, filters]);

  const hasAdvancedFilters =
    filters.query !== emptyNeedFilters.query ||
    filters.priority !== emptyNeedFilters.priority ||
    filters.sort !== emptyNeedFilters.sort;

  const clearAdvancedFilters = () => setFilters(emptyNeedFilters);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectedRecords = visibleNeeds.filter((n) => selectedIds.has(n.id));
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
            {/* filter icon-button */}
            <button
              type="button"
              onClick={() => setIsFilterOpen(true)}
              className={`grid h-8 w-8 place-items-center rounded-lg border transition ${
                hasAdvancedFilters
                  ? "border-white/25 bg-white text-zinc-950"
                  : "border-white/10 bg-black/20 text-zinc-400 hover:bg-white/10 hover:text-white"
              }`}
              title="Need filters"
            >
              <Filter className="h-4 w-4" />
            </button>

            {/* quick-filter pills */}
            <div className="grid grid-cols-3 gap-1 rounded-lg bg-black/20 p-1 text-xs">
              {(["active", "inactive", "all"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={`rounded-md px-4 py-1.5 capitalize transition ${
                    status === s
                      ? "bg-white text-zinc-950"
                      : "text-zinc-400 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            {/* inline clear link */}
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
            <Plus className="h-3.5 w-3.5" /> Need
          </Button>
        </div>

        {/* ── body ── */}
        {needs.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-semibold text-zinc-200">No needs yet</p>
            <Button
              type="button"
              onClick={onAdd}
              className="mt-4 rounded-lg bg-white text-zinc-950 hover:bg-zinc-200"
            >
              <Plus className="mr-1 h-4 w-4" /> Add your first need
            </Button>
          </div>
        ) : visibleNeeds.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-semibold text-zinc-200">No needs match these filters</p>
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
            <div className="min-w-[1000px]">
              {/* column headers */}
              <div className="grid grid-cols-[minmax(240px,1.4fr)_100px_120px_120px_140px_minmax(160px,1fr)_112px] gap-x-6 border-b border-white/10 px-4 py-2 text-xs uppercase tracking-[0.14em] text-zinc-600">
                <span>Need</span>
                <span>Priority</span>
                <span>Target</span>
                <span>Funded</span>
                <span>Available</span>
                <span>Progress</span>
                <span className="text-right">Manage</span>
              </div>

              {/* rows */}
              {visibleNeeds.map((need) => {
                const Icon = getIcon(need.icon);
                const overspent = need.available < 0;
                const isSelected = selectedIds.has(need.id);
                const chipColor = need.color || '#a1a1aa';
                const pct = need.percentFunded;
                return (
                  <div
                    key={need.id}
                    className={`grid grid-cols-[minmax(240px,1.4fr)_100px_120px_120px_140px_minmax(160px,1fr)_112px] items-center gap-x-6 border-b border-white/10 px-4 py-2.5 text-sm transition last:border-b-0 hover:bg-white/[0.025] ${isSelected ? "bg-white/[0.03]" : ""}`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); toggleSelect(need.id); }}
                        className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg transition ${isSelected ? "bg-white text-zinc-950 ring-2 ring-white" : "bg-black/20"}`}
                        style={isSelected ? undefined : { border: `1px solid ${chipColor}`, color: chipColor }}
                      >
                        {isSelected ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                      </button>
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-zinc-100">{need.name}</span>
                        {!need.isActive && <span className="block truncate text-xs text-zinc-500">Inactive</span>}
                      </span>
                    </div>
                    <p className="capitalize text-zinc-400">{need.priority === 1 ? "High" : "Normal"}</p>
                    <p className="text-zinc-400">{peso(need.target)}</p>
                    <p className="text-zinc-400">{peso(need.funded)}</p>
                    <p className={overspent ? "font-semibold text-rose-300" : "font-semibold text-zinc-100"}>
                      {peso(need.available)}
                    </p>
                    {/* Progress cell — matches GoalsPage exactly */}
                    <div className="flex items-center gap-2">
                      <span className="w-9 shrink-0 text-right text-xs tabular-nums text-zinc-400">{pct}%</span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full bg-white" style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                    </div>
                    <div className="flex justify-end gap-1.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onEdit(need.id)}
                        title="Edit"
                        className="h-8 w-8 rounded-md text-zinc-400 hover:bg-white/10 hover:text-zinc-200"
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onDelete(need.id)}
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
              {/* modal header */}
              <div className="flex items-start justify-between border-b border-white/10 p-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Filters</p>
                  <h2 className="mt-1 text-xl font-semibold">Need filters</h2>
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

              {/* modal fields */}
              <div className="grid gap-4 p-5 sm:grid-cols-2">
                {/* search */}
                <div className="sm:col-span-2">
                  <FieldLabel>Search</FieldLabel>
                  <input
                    value={filters.query}
                    onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
                    placeholder="Need name"
                    className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-white/25"
                  />
                </div>

                {/* priority filter */}
                <div>
                  <FieldLabel>Priority</FieldLabel>
                  <Select
                    className="mt-2"
                    value={filters.priority}
                    onChange={(v) => setFilters((current) => ({ ...current, priority: v as NeedPriorityFilter }))}
                    options={[{ value: "all", label: "All priorities" }, { value: "high", label: "High" }, { value: "normal", label: "Normal" }]}
                  />
                </div>

                {/* sort */}
                <div>
                  <FieldLabel>Sort</FieldLabel>
                  <Select
                    className="mt-2"
                    value={filters.sort}
                    onChange={(v) => setFilters((current) => ({ ...current, sort: v as NeedSort }))}
                    options={[
                      { value: "priority", label: "Priority" },
                      { value: "name", label: "Name" },
                      { value: "targetHigh", label: "Target high" },
                      { value: "targetLow", label: "Target low" },
                      { value: "mostUnderfunded", label: "Most underfunded" },
                    ]}
                  />
                </div>
              </div>

              {/* modal footer */}
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
