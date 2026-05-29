import { useRef } from "react";
import { Check } from "lucide-react";

type ColorPickerProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

const PRESETS = [
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#eab308",
  "#84cc16",
  "#22c55e",
  "#10b981",
  "#14b8a6",
  "#06b6d4",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#d946ef",
  "#ec4899",
  "#f43f5e",
  "#64748b",
];

export function ColorPicker({ value, onChange, className }: ColorPickerProps) {
  const customInputRef = useRef<HTMLInputElement>(null);

  const normalizedValue = value.toLowerCase();
  const isPreset = PRESETS.some((color) => color === normalizedValue);

  return (
    <div className={`space-y-3 ${className ?? ""}`}>
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((color) => {
          const isSelected = normalizedValue === color;
          return (
            <button
              key={color}
              type="button"
              aria-label={color}
              onClick={() => onChange(color)}
              className="relative h-7 w-7 shrink-0 rounded-md transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
              style={{ backgroundColor: color }}
            >
              {isSelected && (
                <span className="absolute inset-0 flex items-center justify-center rounded-md ring-2 ring-white ring-offset-1 ring-offset-zinc-950">
                  <Check className="h-3.5 w-3.5 text-white drop-shadow" />
                </span>
              )}
            </button>
          );
        })}

        {/* Custom color swatch — clicking opens the native color picker */}
        <button
          type="button"
          aria-label="Custom color"
          onClick={() => customInputRef.current?.click()}
          title="Custom color"
          className={`relative h-7 w-7 shrink-0 rounded-md border border-white/20 bg-white/5 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${!isPreset ? "ring-2 ring-white ring-offset-1 ring-offset-zinc-950" : ""}`}
          style={!isPreset ? { backgroundColor: value } : undefined}
        >
          {!isPreset && (
            <span className="absolute inset-0 flex items-center justify-center rounded-md">
              <Check className="h-3.5 w-3.5 text-white drop-shadow" />
            </span>
          )}
          {isPreset && (
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-zinc-400">+</span>
          )}
          <input
            ref={customInputRef}
            type="color"
            value={value.startsWith("#") && value.length === 7 ? value : "#8b5cf6"}
            onChange={(event) => onChange(event.target.value)}
            className="sr-only absolute inset-0 h-full w-full cursor-pointer opacity-0"
            tabIndex={-1}
            aria-hidden="true"
          />
        </button>
      </div>

    </div>
  );
}
