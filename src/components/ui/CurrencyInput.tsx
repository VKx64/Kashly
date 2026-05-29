import { useState, useEffect } from "react";
import { formatThousands, sanitizeAmount } from "@/utils/formatters";

type CurrencyInputProps = {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  className?: string;
  id?: string;
};

export function CurrencyInput({ value, onChange, placeholder = "0.00", className, id }: CurrencyInputProps) {
  const [display, setDisplay] = useState<string>(() => (value ? formatThousands(String(value)) : ""));

  // Sync display when value changes externally (e.g. reset)
  useEffect(() => {
    // Only sync if the parsed numeric value differs from what we hold,
    // to avoid disrupting mid-typing (trailing dot).
    const currentParsed = Number(sanitizeAmount(display));
    if (currentParsed !== value) {
      setDisplay(value ? formatThousands(String(value)) : "");
    }
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value;
    // Strip commas first so sanitizeAmount works cleanly
    const stripped = sanitizeAmount(raw.replace(/,/g, ""));
    const formatted = formatThousands(stripped);
    setDisplay(formatted);
    const parsed = Number(stripped);
    onChange(Number.isFinite(parsed) ? parsed : 0);
  };

  return (
    <div className={`flex h-11 items-center rounded-lg border border-white/10 bg-black/20 px-3 focus-within:border-white/25${className ? ` ${className}` : ""}`}>
      <span className="mr-2 text-zinc-500">₱</span>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        value={display}
        onChange={handleChange}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-zinc-600"
      />
    </div>
  );
}
