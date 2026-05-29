export function peso(value: number) {
  const sign = value < 0 ? "-" : "";
  return `${sign}₱${Math.abs(value).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function sanitizeAmount(value: string) {
  return value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");
}

export function formatThousands(value: string): string {
  const sanitized = sanitizeAmount(value);
  if (!sanitized) return "";
  const dotIndex = sanitized.indexOf(".");
  const hasDecimal = dotIndex !== -1;
  const integerPart = hasDecimal ? sanitized.slice(0, dotIndex) : sanitized;
  const decimalPart = hasDecimal ? sanitized.slice(dotIndex) : "";
  const formatted = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return formatted + decimalPart;
}

export function formatTransactionDate(value: string) {
  if (!value) return "Today";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "Today";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatTransactionDateTime(dateValue: string, timeValue: string) {
  const date = formatTransactionDate(dateValue);
  if (!timeValue) return date;
  const [hoursRaw, minutesRaw] = timeValue.split(":");
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return date;
  const meridiem = hours >= 12 ? "PM" : "AM";
  const twelveHour = hours % 12 || 12;
  return `${date}, ${twelveHour}:${String(minutes).padStart(2, "0")} ${meridiem}`;
}
