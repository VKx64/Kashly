import { useState, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Archive, ArrowDownLeft, ArrowUpRight, Check, CheckSquare, ChevronDown, Edit3, Filter, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { Select } from "@/components/ui/Select";
import { SelectionBar, type SelectionAction } from "@/components/ui/SelectionBar";
import type { DebtRecord } from "@/types/finance";
import type { DebtAdvancedFilters } from "@/types/app";
import { emptyDebtAdvancedFilters, debtKindOptions } from "@/constants/mockData";
import { getDebtRemaining, getDebtDueDate } from "@/utils/helpers";
import { peso } from "@/utils/formatters";

// ── debt chip colors ───────────────────────────────────────────────────────
const OWE_COLOR = '#fb7185';
const LENT_COLOR = '#38bdf8';

// ─── Types ────────────────────────────────────────────────────────────────────

type DirectionFilter = "all" | "owe" | "lent";

interface DebtGroup {
  /** normalised key: `${direction}::${name.trim().toLowerCase()}` */
  key: string;
  /** display name — first debt's name (preserves original casing) */
  name: string;
  direction: "owe" | "lent";
  debts: DebtRecord[];
  totalRemaining: number;
}

// ─── Helpers (local) ─────────────────────────────────────────────────────────

function buildGroups(debts: DebtRecord[]): DebtGroup[] {
  const map = new Map<string, DebtGroup>();
  for (const debt of debts) {
    const dir = debt.direction ?? "owe";
    const key = `${dir}::${debt.name.trim().toLowerCase()}`;
    if (!map.has(key)) {
      map.set(key, { key, name: debt.name.trim(), direction: dir, debts: [], totalRemaining: 0 });
    }
    const group = map.get(key)!;
    group.debts.push(debt);
    group.totalRemaining += getDebtRemaining(debt);
  }
  return Array.from(map.values());
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DebtsPage({
  debts,
  onAdd,
  onEdit,
  onDelete,
  onPay,
  onArchive,
  onBulkArchive,
  onBulkDelete,
}: {
  debts: DebtRecord[];
  onAdd: () => void;
  onEdit: (debt: DebtRecord) => void;
  onDelete: (debt: DebtRecord) => void;
  onPay: (debt: DebtRecord) => void;
  onArchive?: (debt: DebtRecord) => void;
  onBulkArchive?: (records: DebtRecord[]) => void | Promise<void>;
  onBulkDelete?: (records: DebtRecord[]) => void | Promise<void>;
}) {
  // ── filters ──
  const [dirFilter, setDirFilter] = useState<DirectionFilter>("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<DebtAdvancedFilters>(emptyDebtAdvancedFilters);

  // ── expansion ──
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  // ── bulk selection (individual debt ids) ──
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const hasAdvancedFilters =
    JSON.stringify(advancedFilters) !== JSON.stringify(emptyDebtAdvancedFilters);

  // ── filtered individual debts ──
  const visibleDebts = useMemo(() => {
    return debts
      .filter((debt) => {
        const remaining = getDebtRemaining(debt);
        const due = getDebtDueDate(debt);
        const query = advancedFilters.query.trim().toLowerCase();
        const minLeft = advancedFilters.minLeft ? Number(advancedFilters.minLeft) : null;
        const maxLeft = advancedFilters.maxLeft ? Number(advancedFilters.maxLeft) : null;

        if (debt.isArchived) return false;

        // direction quick filter
        if (dirFilter !== "all" && debt.direction !== dirFilter) return false;

        // advanced filters
        if (advancedFilters.kind !== "all" && debt.kind !== advancedFilters.kind) return false;
        if (advancedFilters.dueFrom && (!due || due.toISOString().slice(0, 10) < advancedFilters.dueFrom)) return false;
        if (advancedFilters.dueTo && (!due || due.toISOString().slice(0, 10) > advancedFilters.dueTo)) return false;
        if (minLeft !== null && remaining < minLeft) return false;
        if (maxLeft !== null && remaining > maxLeft) return false;
        if (query && ![debt.name, debt.notes, debt.kind].some((v) => (v || "").toLowerCase().includes(query))) return false;
        return true;
      })
      .sort(
        (a, b) =>
          (getDebtDueDate(a)?.getTime() ?? Infinity) - (getDebtDueDate(b)?.getTime() ?? Infinity),
      );
  }, [debts, dirFilter, advancedFilters]);

  // ── groups from visible debts ──
  const groups = useMemo(() => buildGroups(visibleDebts), [visibleDebts]);

  // ── helpers ──
  const toggleGroup = (key: string) =>
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const selectedRecords = useMemo(
    () => visibleDebts.filter((d) => selectedIds.has(d.id)),
    [visibleDebts, selectedIds],
  );

  const handleBulkArchive = async () => {
    await onBulkArchive?.(selectedRecords);
    clearSelection();
  };

  const handleBulkDelete = async () => {
    await onBulkDelete?.(selectedRecords);
    clearSelection();
  };

  const selectionActions: SelectionAction[] = [
    ...(onBulkArchive
      ? [{ label: "Archive", icon: Archive, onClick: handleBulkArchive }]
      : []),
    ...(onBulkDelete
      ? [{ label: "Delete", icon: Trash2, tone: "danger" as const, onClick: handleBulkDelete }]
      : []),
  ];

  // ── render ──
  return (
    <div className="space-y-4">
      <section className="rounded-[1.25rem] border border-white/10 bg-white/[0.04] text-white">
        {/* ── Header bar ── */}
        <div className="flex items-center justify-between gap-3 border-b border-white/10 p-3">
          <div className="flex min-w-0 items-center gap-2">
            {/* Advanced filter trigger */}
            <button
              type="button"
              onClick={() => setIsFilterOpen(true)}
              className={`grid h-8 w-8 place-items-center rounded-lg border transition ${
                hasAdvancedFilters
                  ? "border-white/25 bg-white text-zinc-950"
                  : "border-white/10 bg-black/20 text-zinc-400 hover:bg-white/10 hover:text-white"
              }`}
              title="Advanced filters"
            >
              <Filter className="h-4 w-4" />
            </button>

            {/* Direction quick-filter pills */}
            <div className="grid grid-cols-3 gap-1 rounded-lg bg-black/20 p-1 text-xs">
              {(["all", "owe", "lent"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setDirFilter(item)}
                  className={`rounded-md px-4 py-1.5 capitalize transition ${
                    dirFilter === item
                      ? "bg-white text-zinc-950"
                      : "text-zinc-400 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {item === "owe" ? "Debt" : item === "lent" ? "Lent" : "All"}
                </button>
              ))}
            </div>

            {hasAdvancedFilters && (
              <button
                type="button"
                onClick={() => setAdvancedFilters(emptyDebtAdvancedFilters)}
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
            <Plus className="h-3.5 w-3.5" /> Debt
          </Button>
        </div>

        {/* ── Content ── */}
        {debts.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-semibold text-zinc-200">No debts yet</p>
            <p className="mt-1 text-sm text-zinc-500">
              Add Gemuel, a card balance, or an installment.
            </p>
          </div>
        ) : visibleDebts.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-semibold text-zinc-200">Nothing here</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[1040px]">
              {/* Column headers */}
              <div className="grid grid-cols-[minmax(280px,1.4fr)_110px_100px_150px_132px] gap-x-8 border-b border-white/10 px-4 py-2 text-xs uppercase tracking-[0.14em] text-zinc-600">
                <span>Entity / Debt</span>
                <span>Type</span>
                <span>Due</span>
                <span className="text-right">Remaining</span>
                <span className="text-right">Manage</span>
              </div>

              {/* Groups */}
              {groups.map((group) => {
                const isExpanded = expandedKeys.has(group.key);
                const isOwe = group.direction === "owe";
                const groupChipColor = isOwe ? OWE_COLOR : LENT_COLOR;

                return (
                  <div key={group.key} className="border-b border-white/10 last:border-b-0">
                    {/* ── Group summary row ── */}
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.key)}
                      className="grid w-full grid-cols-[minmax(280px,1.4fr)_110px_100px_150px_132px] items-center gap-x-8 px-4 py-2.5 text-left text-sm transition hover:bg-white/[0.025]"
                    >
                      {/* Name + icon chip */}
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-black/20"
                          style={{ border: `1px solid ${groupChipColor}`, color: groupChipColor }}
                          aria-label={isOwe ? "You owe" : "Owed to you"}
                        >
                          {isOwe ? (
                            <ArrowUpRight className="h-4 w-4" />
                          ) : (
                            <ArrowDownLeft className="h-4 w-4" />
                          )}
                        </span>
                        <span className="min-w-0">
                          <p className="truncate font-medium text-zinc-100">{group.name}</p>
                          <p className="text-xs text-zinc-600">
                            {group.debts.length} {group.debts.length === 1 ? "debt" : "debts"}
                          </p>
                        </span>
                      </div>

                      {/* Type — blank for group row */}
                      <span />

                      {/* Due — blank for group row */}
                      <span />

                      {/* Aggregate remaining */}
                      <p
                        className={`text-right font-semibold ${
                          group.totalRemaining <= 0
                            ? "text-emerald-300"
                            : isOwe
                              ? "text-rose-300"
                              : "text-sky-300"
                        }`}
                      >
                        {group.totalRemaining <= 0
                          ? isOwe
                            ? "Paid"
                            : "Collected"
                          : peso(group.totalRemaining)}
                      </p>

                      {/* Chevron */}
                      <div className="flex justify-end">
                        <ChevronDown
                          className={`h-4 w-4 text-zinc-500 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                        />
                      </div>
                    </button>

                    {/* ── Expanded sub-rows ── */}
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          key="sub-rows"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.18, ease: "easeInOut" }}
                          className="overflow-hidden"
                        >
                          {group.debts.map((debt) => {
                            const remaining = getDebtRemaining(debt);
                            const due = getDebtDueDate(debt);
                            const isPaid = remaining <= 0;
                            const isSelected = selectedIds.has(debt.id);
                            const chipColor = isOwe ? OWE_COLOR : LENT_COLOR;

                            return (
                              <div
                                key={debt.id}
                                className="grid grid-cols-[minmax(280px,1.4fr)_110px_100px_150px_132px] items-center gap-x-8 border-t border-white/[0.06] bg-white/[0.012] px-4 py-2.5 text-sm transition hover:bg-white/[0.025]"
                              >
                                {/* Name cell — icon chip is bulk-select toggle */}
                                <div className="flex min-w-0 items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={(e) => toggleSelect(debt.id, e)}
                                    aria-label={isSelected ? "Deselect" : "Select"}
                                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg transition ${
                                      isSelected
                                        ? "bg-white text-zinc-950 ring-2 ring-white"
                                        : "bg-black/20"
                                    }`}
                                    style={isSelected ? undefined : { border: `1px solid ${chipColor}`, color: chipColor }}
                                  >
                                    {isSelected ? (
                                      <Check className="h-4 w-4" />
                                    ) : isOwe ? (
                                      <ArrowUpRight className="h-4 w-4" />
                                    ) : (
                                      <ArrowDownLeft className="h-4 w-4" />
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onEdit(debt)}
                                    className="min-w-0 text-left"
                                  >
                                    <p className="truncate text-zinc-300">
                                      {debt.notes || "No note"}
                                    </p>
                                    <p className="truncate text-xs text-zinc-600">
                                      {peso(debt.amount)}
                                    </p>
                                  </button>
                                </div>

                                {/* Type */}
                                <p className="capitalize text-zinc-400">
                                  {debt.kind.replace("_", " ")}
                                </p>

                                {/* Due */}
                                <p className="text-zinc-500">
                                  {due
                                    ? due.toLocaleDateString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                      })
                                    : "-"}
                                </p>

                                {/* Remaining */}
                                <p
                                  className={`text-right font-semibold ${
                                    isPaid
                                      ? "text-emerald-300"
                                      : isOwe
                                        ? "text-rose-300"
                                        : "text-sky-300"
                                  }`}
                                >
                                  {isPaid
                                    ? isOwe
                                      ? "Paid"
                                      : "Collected"
                                    : peso(remaining)}
                                </p>

                                {/* Actions */}
                                <div className="flex justify-end gap-1.5">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={() => onPay(debt)}
                                    disabled={isPaid}
                                    title={isPaid ? "Settled" : "Record payment"}
                                    className="h-8 w-8 rounded-md text-emerald-300 hover:bg-emerald-400/10 hover:text-emerald-200 disabled:cursor-not-allowed disabled:opacity-25"
                                  >
                                    <CheckSquare className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={() => onEdit(debt)}
                                    title="Edit"
                                    className="h-8 w-8 rounded-md text-zinc-400 hover:bg-white/10 hover:text-zinc-200"
                                  >
                                    <Edit3 className="h-4 w-4" />
                                  </Button>
                                  {onArchive && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon-sm"
                                      onClick={() => onArchive(debt)}
                                      title="Archive"
                                      className="h-8 w-8 rounded-md text-amber-300 hover:bg-amber-400/10 hover:text-amber-200"
                                    >
                                      <Archive className="h-4 w-4" />
                                    </Button>
                                  )}
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={() => onDelete(debt)}
                                    title="Delete"
                                    className="h-8 w-8 rounded-md text-rose-300 hover:bg-rose-400/10 hover:text-rose-200"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* ── floating SelectionBar ── */}
      <SelectionBar count={selectedIds.size} actions={selectionActions} onClear={clearSelection} />

      {/* ── Advanced filter modal ── */}
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
              className="w-[min(92vw,520px)] overflow-hidden rounded-[1.25rem] border border-white/10 bg-zinc-950 text-white shadow-2xl"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 18 }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between border-b border-white/10 p-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Filters</p>
                  <h2 className="mt-1 text-xl font-semibold">Debt filters</h2>
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
                    value={advancedFilters.query}
                    onChange={(e) =>
                      setAdvancedFilters((cur) => ({ ...cur, query: e.target.value }))
                    }
                    placeholder="Name or note"
                    className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-white/25"
                  />
                </div>

                <div>
                  <FieldLabel>Type</FieldLabel>
                  <Select
                    className="mt-2"
                    value={advancedFilters.kind}
                    onChange={(value) =>
                      setAdvancedFilters((cur) => ({ ...cur, kind: value as DebtAdvancedFilters["kind"] }))
                    }
                    options={[{ value: "all", label: "All types" }, ...debtKindOptions.map((kind) => ({ value: kind, label: kind.replace("_", " ") }))]}
                  />
                </div>

                <div>
                  <FieldLabel>Min left</FieldLabel>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={advancedFilters.minLeft}
                    onChange={(e) =>
                      setAdvancedFilters((cur) => ({ ...cur, minLeft: e.target.value }))
                    }
                    className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-white outline-none [color-scheme:dark]"
                  />
                </div>

                <div>
                  <FieldLabel>Due from</FieldLabel>
                  <input
                    type="date"
                    value={advancedFilters.dueFrom}
                    onChange={(e) =>
                      setAdvancedFilters((cur) => ({ ...cur, dueFrom: e.target.value }))
                    }
                    className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-white outline-none [color-scheme:dark]"
                  />
                </div>

                <div>
                  <FieldLabel>Due to</FieldLabel>
                  <input
                    type="date"
                    value={advancedFilters.dueTo}
                    onChange={(e) =>
                      setAdvancedFilters((cur) => ({ ...cur, dueTo: e.target.value }))
                    }
                    className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-white outline-none [color-scheme:dark]"
                  />
                </div>

                <div>
                  <FieldLabel>Max left</FieldLabel>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={advancedFilters.maxLeft}
                    onChange={(e) =>
                      setAdvancedFilters((cur) => ({ ...cur, maxLeft: e.target.value }))
                    }
                    className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-white outline-none [color-scheme:dark]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-white/10 p-5">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setAdvancedFilters(emptyDebtAdvancedFilters)}
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
