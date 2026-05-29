import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";

export type SelectOption = { value: string; label: string };

type SelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  id?: string;
};

export function Select({ value, onChange, options, placeholder, className, id }: SelectProps) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selected = options.find((option) => option.value === value);

  const openDropdown = () => {
    if (triggerRef.current) {
      setRect(triggerRef.current.getBoundingClientRect());
    }
    setOpen(true);
  };

  const closeDropdown = () => setOpen(false);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    closeDropdown();
  };

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeDropdown();
    };

    const handleMouseDown = (event: MouseEvent) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node) &&
        listRef.current &&
        !listRef.current.contains(event.target as Node)
      ) {
        closeDropdown();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleMouseDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, [open]);

  const flipUp = rect ? rect.bottom + 8 + Math.min(options.length * 40, 240) > window.innerHeight : false;

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        onClick={openDropdown}
        className={`inline-flex h-11 w-full items-center justify-between rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-white outline-none transition hover:border-white/20 focus-visible:border-white/25 ${className ?? ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={selected ? "text-white" : "text-zinc-600"}>
          {selected ? selected.label : (placeholder ?? "Select...")}
        </span>
        <ChevronDown
          className={`ml-2 h-4 w-4 shrink-0 text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open &&
        rect &&
        createPortal(
          <div
            ref={listRef}
            role="listbox"
            className="fixed z-[200] min-w-[8rem] overflow-hidden rounded-lg border border-white/10 bg-zinc-950 py-1 shadow-xl"
            style={
              flipUp
                ? {
                    left: rect.left,
                    bottom: window.innerHeight - rect.top + 4,
                    width: rect.width,
                    maxHeight: 240,
                    overflowY: "auto",
                  }
                : {
                    left: rect.left,
                    top: rect.bottom + 4,
                    width: rect.width,
                    maxHeight: 240,
                    overflowY: "auto",
                  }
            }
          >
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={option.value === value}
                onClick={() => handleSelect(option.value)}
                className={`flex w-full items-center px-3 py-2 text-left text-sm transition ${
                  option.value === value
                    ? "bg-white/10 text-white"
                    : "text-zinc-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}
