import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatTransactionDate } from "@/utils/formatters";

type DatePickerProps = {
  value: string;           // "YYYY-MM-DD" or ""
  onChange: (value: string) => void; // emits "YYYY-MM-DD"
  placeholder?: string;
  className?: string;
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const DAY_HEADERS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

// Width of the calendar popover in px — must match the w-72 (288px) class below.
const POPOVER_W = 288;
// Approximate height — used for flip decision; actual height may vary.
const POPOVER_H = 320;
const TRIGGER_GAP = 6;

type ViewMode = "day" | "month" | "year";

interface PopoverPos {
  top: number;
  left: number;
}

function toYMD(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getCalendarCells(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
}

function parseValue(value: string): { year: number; month: number; day: number } | null {
  if (!value) return null;
  const parts = value.split("-");
  if (parts.length !== 3) return null;
  const year = Number(parts[0]);
  const month = Number(parts[1]) - 1;
  const day = Number(parts[2]);
  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) return null;
  return { year, month, day };
}

function computePosition(trigger: HTMLElement): PopoverPos {
  const rect = trigger.getBoundingClientRect();
  const spaceBelow = window.innerHeight - rect.bottom;
  const spaceAbove = rect.top;

  // Flip above when insufficient space below (and there's more room above).
  const top =
    spaceBelow >= POPOVER_H || spaceBelow >= spaceAbove
      ? rect.bottom + TRIGGER_GAP
      : rect.top - POPOVER_H - TRIGGER_GAP;

  // Clamp horizontally so the popover stays within the viewport.
  const rawLeft = rect.left;
  const left = Math.min(rawLeft, window.innerWidth - POPOVER_W - 8);

  return { top, left: Math.max(left, 8) };
}

function buildYearRange(centerYear: number): number[] {
  const start = centerYear - 12;
  const years: number[] = [];
  for (let y = start; y <= centerYear + 12; y++) years.push(y);
  return years;
}

export function DatePicker({ value, onChange, placeholder = "Select date", className }: DatePickerProps) {
  const parsed = parseValue(value);
  const now = new Date();
  const todayYear = now.getFullYear();
  const todayMonth = now.getMonth();
  const todayDay = now.getDate();

  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(parsed?.year ?? todayYear);
  const [viewMonth, setViewMonth] = useState(parsed?.month ?? todayMonth);
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [pos, setPos] = useState<PopoverPos>({ top: 0, left: 0 });

  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Sync view when value changes externally.
  useEffect(() => {
    if (parsed) {
      setViewYear(parsed.year);
      setViewMonth(parsed.month);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const openPopover = useCallback(() => {
    if (triggerRef.current) {
      setPos(computePosition(triggerRef.current));
    }
    setViewMode("day");
    setOpen(true);
  }, []);

  const closePopover = useCallback(() => setOpen(false), []);

  // Close on outside mousedown and Escape.
  useEffect(() => {
    if (!open) return;

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current && triggerRef.current.contains(target)
      ) return; // let trigger toggle handle it
      if (popoverRef.current && !popoverRef.current.contains(target)) {
        closePopover();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePopover();
    };

    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, closePopover]);

  const moveMonth = (direction: number) => {
    const next = new Date(viewYear, viewMonth + direction, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  const selectDay = (day: number) => {
    onChange(toYMD(viewYear, viewMonth, day));
    closePopover();
  };

  const selectMonth = (monthIndex: number) => {
    setViewMonth(monthIndex);
    setViewMode("day");
  };

  const selectYear = (year: number) => {
    setViewYear(year);
    setViewMode("month");
  };

  const toggleHeaderMode = () => {
    setViewMode((current) => {
      if (current === "day") return "month";
      if (current === "month") return "year";
      return "day";
    });
  };

  const cells = getCalendarCells(viewYear, viewMonth);
  const displayText = value ? formatTransactionDate(value) : "";
  const years = buildYearRange(viewYear);

  const popoverContent = open
    ? createPortal(
        <div
          ref={popoverRef}
          style={{ top: pos.top, left: pos.left, width: POPOVER_W }}
          className="fixed z-[9999] rounded-lg border border-white/10 bg-zinc-950 p-3 shadow-2xl shadow-black/60"
        >
          {/* Header: prev chevron | month+year (clickable) | next chevron */}
          <div className="mb-3 flex items-center justify-between gap-2">
            {viewMode !== "year" && (
              <button
                type="button"
                onClick={() => viewMode === "day" ? moveMonth(-1) : setViewYear((y) => y - 1)}
                className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-white/10 hover:text-white"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}

            <button
              type="button"
              onClick={toggleHeaderMode}
              className="flex-1 rounded-md py-1 text-sm font-semibold text-zinc-100 transition hover:bg-white/10"
            >
              {viewMode === "year"
                ? `${years[0]} – ${years[years.length - 1]}`
                : `${MONTH_NAMES[viewMonth]} ${viewYear}`}
            </button>

            {viewMode !== "year" && (
              <button
                type="button"
                onClick={() => viewMode === "day" ? moveMonth(1) : setViewYear((y) => y + 1)}
                className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-white/10 hover:text-white"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* DAY grid */}
          {viewMode === "day" && (
            <>
              <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] font-medium uppercase text-zinc-600">
                {DAY_HEADERS.map((d) => (
                  <span key={d}>{d}</span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {cells.map((day, index) => {
                  const isSelected =
                    day !== null &&
                    parsed !== null &&
                    day === parsed.day &&
                    viewMonth === parsed.month &&
                    viewYear === parsed.year;
                  const isToday =
                    day !== null &&
                    day === todayDay &&
                    viewMonth === todayMonth &&
                    viewYear === todayYear;
                  return (
                    <button
                      key={`${day ?? "e"}-${index}`}
                      type="button"
                      disabled={day === null}
                      onClick={() => day !== null && selectDay(day)}
                      className={`relative h-8 rounded-md text-xs transition ${
                        isSelected
                          ? "bg-white font-semibold text-zinc-950"
                          : day !== null
                            ? "text-zinc-300 hover:bg-white/10 hover:text-white"
                            : "cursor-default text-transparent"
                      }`}
                    >
                      {day ?? ""}
                      {isToday && !isSelected && (
                        <span className="absolute bottom-1 left-1/2 h-0.5 w-3 -translate-x-1/2 rounded-full bg-zinc-500" />
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* MONTH picker */}
          {viewMode === "month" && (
            <div className="grid grid-cols-3 gap-1.5">
              {MONTH_SHORT.map((name, idx) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => selectMonth(idx)}
                  className={`rounded-md py-2 text-xs font-medium transition ${
                    idx === viewMonth
                      ? "bg-white text-zinc-950"
                      : "text-zinc-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          )}

          {/* YEAR picker */}
          {viewMode === "year" && (
            <div className="grid max-h-52 grid-cols-3 gap-1.5 overflow-y-auto">
              {years.map((year) => (
                <button
                  key={year}
                  type="button"
                  onClick={() => selectYear(year)}
                  className={`rounded-md py-2 text-xs font-medium transition ${
                    year === viewYear
                      ? "bg-white text-zinc-950"
                      : "text-zinc-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {year}
                </button>
              ))}
            </div>
          )}
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? closePopover() : openPopover())}
        className={`h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-left text-sm text-white outline-none transition focus:border-white/25 hover:border-white/20${className ? ` ${className}` : ""}`}
      >
        {displayText || <span className="text-zinc-600">{placeholder}</span>}
      </button>

      {popoverContent}
    </>
  );
}
