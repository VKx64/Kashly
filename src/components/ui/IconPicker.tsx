import { useState } from "react";
import { ICON_REGISTRY, getIcon } from "@/constants/icons";

export function IconPicker({
  value,
  color,
  onChange,
}: {
  value: string;
  color?: string;
  onChange: (key: string) => void;
}) {
  const [query, setQuery] = useState("");
  const Selected = getIcon(value);
  const term = query.trim().toLowerCase();

  const icons = Object.entries(ICON_REGISTRY).filter(
    ([key]) => !term || key.includes(term),
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/10"
          style={{ color: color || "#ffffff", backgroundColor: color ? `${color}1a` : "rgba(255,255,255,0.05)" }}
        >
          <Selected className="h-4 w-4" />
        </div>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search icons"
          className="h-9 flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-sm text-white outline-none transition focus:border-emerald-400/40"
        />
      </div>
      <div className="max-h-52 overflow-auto rounded-lg border border-white/10 bg-black/20 p-1.5">
        <div className="grid grid-cols-10 gap-1">
          {icons.map(([key, Icon]) => (
            <button
              key={key}
              type="button"
              title={key}
              onClick={() => onChange(key)}
              className={`aspect-square w-full grid place-items-center rounded-lg border transition ${
                value === key
                  ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-300"
                  : "border-transparent text-zinc-400 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
