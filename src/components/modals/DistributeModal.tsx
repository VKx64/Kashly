import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { getIcon } from "@/constants/icons";
import { peso } from "@/utils/formatters";
import { suggestProportional } from "@/utils/helpers";
import type { AllocationValue, DistributeTarget } from "@/types/app";

export function DistributeModal({
  open,
  amount,
  targets,
  isSaving,
  onClose,
  onConfirm,
}: {
  open: boolean;
  amount: number;
  targets: DistributeTarget[];
  isSaving: boolean;
  onClose: () => void;
  onConfirm: (lines: AllocationValue[]) => void;
}) {
  const [amounts, setAmounts] = useState<number[]>(() => suggestProportional(amount, targets));

  const assigned = Math.round(amounts.reduce((sum, value) => sum + (value || 0), 0) * 100) / 100;
  const remaining = Math.round((amount - assigned) * 100) / 100;

  const setLine = (index: number, value: number) =>
    setAmounts((current) => current.map((existing, i) => (i === index ? value : existing)));

  const buildLines = (): AllocationValue[] =>
    targets
      .map((target, index) => ({
        budgetId: target.kind === "budget" ? target.id : undefined,
        goalId: target.kind === "goal" ? target.id : undefined,
        debtId: target.kind === "debt" ? target.id : undefined,
        amount: amounts[index] || 0,
      }))
      .filter((line) => line.amount > 0);

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
          <motion.div
            onMouseDown={(event) => event.stopPropagation()}
            className="flex max-h-[90vh] w-[min(94vw,620px)] flex-col overflow-hidden rounded-[1.25rem] border border-white/10 bg-zinc-950 text-white shadow-2xl"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 18 }}
          >
            <div className="flex items-start justify-between border-b border-white/10 p-5">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Distribute</p>
                <h2 className="mt-1 text-xl font-semibold">Assign {peso(amount)}</h2>
                <p className="mt-1 text-sm text-zinc-500">Spread it across your needs, debts, and goals.</p>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={onClose} className="rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></Button>
            </div>

            <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-black/20 px-5 py-3">
              <div className="text-sm"><span className="text-zinc-500">Remaining to assign </span><span className={remaining < 0 ? "font-semibold text-rose-300" : "font-semibold text-emerald-300"}>{peso(remaining)}</span></div>
              <Button type="button" variant="ghost" onClick={() => setAmounts(suggestProportional(amount, targets))} className="h-8 rounded-lg text-xs text-zinc-300 hover:bg-white/10 hover:text-white"><Sparkles className="mr-1 h-3.5 w-3.5" /> Auto split</Button>
            </div>

            <div className="flex-1 space-y-2 overflow-auto p-5">
              {targets.length === 0 ? (
                <p className="py-8 text-center text-sm text-zinc-500">Nothing to fund right now — every need, debt, and goal is already covered for this month.</p>
              ) : (
                targets.map((target, index) => {
                  const Icon = getIcon(target.icon);
                  const kindLabel = target.kind === "budget" ? "Need" : target.kind === "debt" ? "Debt" : "Goal";
                  return (
                    <div key={`${target.kind}-${target.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg" style={{ color: target.color, backgroundColor: `${target.color}1a` }}><Icon className="h-4 w-4" /></div>
                        <div className="min-w-0"><p className="truncate text-sm font-semibold text-zinc-100">{target.name}</p><p className="truncate text-xs text-zinc-500">{kindLabel} · needs {peso(target.toFund)}</p></div>
                      </div>
                      <div className="w-36 shrink-0">
                        <CurrencyInput
                          value={amounts[index] ?? 0}
                          onChange={(v) => setLine(index, v)}
                          placeholder="0"
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-white/10 p-5">
              <Button type="button" variant="ghost" onClick={onClose} className="rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white">Cancel</Button>
              <Button type="button" disabled={isSaving || assigned <= 0} onClick={() => onConfirm(buildLines())} className="rounded-lg bg-white text-zinc-950 hover:bg-zinc-200 disabled:opacity-40">{isSaving ? "Saving..." : `Distribute ${peso(assigned)}`}</Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
