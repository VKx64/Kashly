import type { LucideIcon } from "lucide-react";

type StatusToggleProps = {
  active: boolean;
  onToggle: () => void;
  activeLabel: string;
  inactiveLabel: string;
  icon?: LucideIcon;
  className?: string;
  /** When true, "active" means an archived/completed state and uses amber styling instead of emerald */
  warningActive?: boolean;
};

export function StatusToggle({
  active,
  onToggle,
  activeLabel,
  inactiveLabel,
  icon: Icon,
  className,
  warningActive = false,
}: StatusToggleProps) {
  const activeStyle = warningActive
    ? "border-amber-400/40 bg-amber-400/10 text-amber-200"
    : "border-emerald-400/40 bg-emerald-400/10 text-emerald-200";

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`inline-flex h-11 items-center gap-2 rounded-lg border px-4 text-sm transition ${
        active ? activeStyle : "border-white/10 bg-black/20 text-zinc-400 hover:bg-white/10 hover:text-white"
      } ${className ?? ""}`}
    >
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {active ? activeLabel : inactiveLabel}
    </button>
  );
}
