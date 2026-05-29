import { useState, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Edit3, Filter, Plus, Target, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { Select } from "@/components/ui/Select";
import { SelectionBar, type SelectionAction } from "@/components/ui/SelectionBar";
import { peso } from "@/utils/formatters";
import { getIcon } from "@/constants/icons";
import type { GoalView } from "@/types/app";

type StatusFilter = "active" | "completed" | "all";

type GoalFilters = {
  query: string;
  sort: "progressHigh" | "progressLow" | "name" | "targetHigh" | "targetLow" | "soonest";
};

const emptyGoalFilters: GoalFilters = { query: "", sort: "progressHigh" };

const sortOptions = [
  { value: "progressHigh", label: "Progress high" },
  { value: "progressLow", label: "Progress low" },
  { value: "name", label: "Name" },
  { value: "targetHigh", label: "Target high" },
  { value: "targetLow", label: "Target low" },
  { value: "soonest", label: "Soonest target date" },
];

function filterGoals(goals: GoalView[], status: StatusFilter, filters: GoalFilters): GoalView[] {
  const query = filters.query.trim().toLowerCase();
  return goals
    .filter((goal) => {
      if (status === "active" && goal.isCompleted) return false;
      if (status === "completed" && !goal.isCompleted) return false;
      if (query && !goal.name.toLowerCase().includes(query)) return false;
      return true;
    })
    .sort((a, b) => {
      if (filters.sort === "progressLow") return a.percent - b.percent;
      if (filters.sort === "name") return a.name.localeCompare(b.name);
      if (filters.sort === "targetHigh") return b.target - a.target;
      if (filters.sort === "targetLow") return a.target - b.target;
      if (filters.sort === "soonest") {
        const aTime = a.targetDate?.getTime() ?? Infinity;
        const bTime = b.targetDate?.getTime() ?? Infinity;
        return aTime - bTime;
      }
      // progressHigh (default)
      return b.percent - a.percent;
    });
}

export function GoalsPage({
  goals,
  onAdd,
  onEdit,
  onDelete,
  onBulkDelete,
}: {
  goals: GoalView[];
  onAdd: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onBulkDelete?: (records: GoalView[]) => void | Promise<void>;
}) {
  const [status, setStatus] = useState<StatusFilter>("active");
  const [filters, setFilters] = useState<GoalFilters>(emptyGoalFilters);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const visibleGoals = useMemo(() => filterGoals(goals, status, filters), [goals, status, filters]);

  const hasAdvancedFilters =
    filters.query !== emptyGoalFilters.query || filters.sort !== emptyGoalFilters.sort;
  const clearAdvancedFilters = () => setFilters(emptyGoalFilters);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  const selectedRecords = visibleGoals.filter((g) => selectedIds.has(g.id));

  const selectionActions: SelectionAction[] = [];
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

  const CHIP_COLOR = "#a1a1aa"; // zinc-400

  return (
    <div className="space-y-4">
      <section className="rounded-[1.25rem] border border-white/10 bg-white/[0.04] text-white">
        {/* Header bar */}
        <div className="flex items-center justify-between gap-3 border-b border-white/10 p-3">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setIsFilterOpen(true)}
              className={`grid h-8 w-8 place-items-center rounded-lg border transition ${hasAdvancedFilters ? "border-white/25 bg-white text-zinc-950" : "border-white/10 bg-black/20 text-zinc-400 hover:bg-white/10 hover:text-white"}`}
              title="Goal filters"
            >
              <Filter className="h-4 w-4" />
            </button>
            <div className="grid grid-cols-3 gap-1 rounded-lg bg-black/20 p-1 text-xs">
              {(["active", "completed", "all"] as const).map((s) => (
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
            <Plus className="h-3.5 w-3.5" /> Goal
          </Button>
        </div>

        {/* Body */}
        {goals.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-semibold text-zinc-200">No goals yet</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-zinc-500">
              Set a target like an emergency fund or a new laptop, then put part
              of each income toward it.
            </p>
            <Button
              type="button"
              onClick={onAdd}
              className="mt-4 rounded-lg bg-white text-zinc-950 hover:bg-zinc-200"
            >
              <Plus className="mr-1 h-4 w-4" /> Add your first goal
            </Button>
          </div>
        ) : visibleGoals.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-semibold text-zinc-200">
              No {status === "all" ? "" : status + " "}goals
              {hasAdvancedFilters ? " match these filters" : ""}
            </p>
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
              {/* Column headers */}
              <div className="grid grid-cols-[minmax(220px,1.5fr)_130px_180px_120px_120px_120px_96px] gap-x-6 border-b border-white/10 px-4 py-2 text-xs uppercase tracking-[0.14em] text-zinc-600">
                <span>Goal</span>
                <span>Due date</span>
                <span>Progress</span>
                <span>Saved</span>
                <span>Target</span>
                <span>Remaining</span>
                <span className="text-right">Manage</span>
              </div>

              {/* Rows */}
              {visibleGoals.map((goal) => {
                const GoalIcon = getIcon(goal.icon) ?? Target;
                const isSelected = selectedIds.has(goal.id);
                const pct = goal.percent;
                return (
                  <div
                    key={goal.id}
                    className={`grid grid-cols-[minmax(220px,1.5fr)_130px_180px_120px_120px_120px_96px] items-center gap-x-6 border-b border-white/10 px-4 py-2.5 text-sm transition last:border-b-0 hover:bg-white/[0.025] ${isSelected ? "bg-white/[0.03]" : ""}`}
                  >
                    {/* Goal name */}
                    <div className="flex min-w-0 items-center gap-3">
                      {/* Icon chip — toggles bulk selection */}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); toggleSelect(goal.id); }}
                        className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg transition ${
                          isSelected
                            ? "bg-white text-zinc-950 ring-2 ring-white"
                            : "bg-black/20 hover:bg-white/10"
                        }`}
                        style={isSelected ? undefined : { border: `1px solid ${CHIP_COLOR}`, color: CHIP_COLOR }}
                        title={isSelected ? "Deselect" : "Select"}
                      >
                        {isSelected ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <GoalIcon className="h-4 w-4" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => onEdit(goal.id)}
                        className="flex min-w-0 items-center text-left"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-zinc-100">
                            {goal.name}
                          </span>
                          {goal.isCompleted && (
                            <span className="block truncate text-xs text-emerald-300">
                              Reached
                            </span>
                          )}
                        </span>
                      </button>
                    </div>

                    {/* Due date */}
                    <p className="text-zinc-400">
                      {goal.targetDate ? (
                        goal.targetDate.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      ) : (
                        <span className="text-zinc-600">No deadline</span>
                      )}
                    </p>

                    {/* Progress — percent LEFT of bar, both inside this grid cell */}
                    <div className="flex items-center gap-2">
                      <span className="w-9 shrink-0 text-right text-xs tabular-nums text-zinc-400">{pct}%</span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full bg-white" style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                    </div>

                    {/* Saved */}
                    <p className="font-semibold text-zinc-100">
                      {peso(goal.current)}
                    </p>

                    {/* Target */}
                    <p className="text-zinc-400">{peso(goal.target)}</p>

                    {/* Remaining */}
                    <p
                      className={
                        goal.isCompleted ? "text-emerald-300" : "text-zinc-400"
                      }
                    >
                      {goal.isCompleted ? "Done" : peso(goal.remaining)}
                    </p>

                    {/* Manage */}
                    <div className="flex justify-end gap-1.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onEdit(goal.id)}
                        title="Edit"
                        className="h-8 w-8 rounded-md text-zinc-400 hover:bg-white/10 hover:text-zinc-200"
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onDelete(goal.id)}
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

      {/* Floating selection bar */}
      <SelectionBar count={selectedIds.size} actions={selectionActions} onClear={clearSelection} />

      {/* Advanced filters modal */}
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
                  <h2 className="mt-1 text-xl font-semibold">Goal filters</h2>
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
                    onChange={(event) =>
                      setFilters((current) => ({ ...current, query: event.target.value }))
                    }
                    placeholder="Goal name"
                    className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-white/25"
                  />
                </div>
                <div className="sm:col-span-2">
                  <FieldLabel>Sort</FieldLabel>
                  <Select
                    value={filters.sort}
                    onChange={(value) =>
                      setFilters((current) => ({ ...current, sort: value as GoalFilters["sort"] }))
                    }
                    options={sortOptions}
                    className="mt-2"
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
