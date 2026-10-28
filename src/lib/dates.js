export const PERIODS = ["daily", "weekly", "monthly"];
export const PERIOD_LABEL = { daily: "Day", weekly: "Week", monthly: "Month" };

export function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
export function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
export function addMonths(d, n) { const x = new Date(d); x.setMonth(x.getMonth() + n); return x; }
export function startOfWeek(d) { const x = startOfDay(d); const day = x.getDay(); const diff = day === 0 ? -6 : 1 - day; return addDays(x, diff); }
export function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
export function dateKey(d) {
  const x = startOfDay(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
}

export function parseLocalDate(value) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(value);
}

export function calendarDaysBetween(from, to) {
  const [fromYear, fromMonth, fromDay] = dateKey(parseLocalDate(from)).split("-").map(Number);
  const [toYear, toMonth, toDay] = dateKey(parseLocalDate(to)).split("-").map(Number);
  return Math.round((Date.UTC(toYear, toMonth - 1, toDay) - Date.UTC(fromYear, fromMonth - 1, fromDay)) / 86400000);
}

export function periodStartFromKey(type, key) {
  if (type === "monthly") {
    const [year, month] = key.split("-").map(Number);
    return new Date(year, month, 1);
  }
  const date = parseLocalDate(key);
  return type === "weekly" ? startOfWeek(date) : startOfDay(date);
}

export function nextPeriodStart(type, start) {
  if (type === "daily") return addDays(start, 1);
  if (type === "weekly") return addDays(start, 7);
  return new Date(start.getFullYear(), start.getMonth() + 1, 1);
}

export function periodId(type, start) {
  if (type === "monthly") {
    return `monthly-${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`;
  }
  return `${type}-${dateKey(start)}`;
}

export function periodRange(type, ref) {
  if (type === "daily") { const s = startOfDay(ref); return [s, addDays(s, 1)]; }
  if (type === "weekly") { const s = startOfWeek(ref); return [s, addDays(s, 7)]; }
  const s = startOfMonth(ref); return [s, addMonths(s, 1)];
}

export function periodKey(type, ref) {
  const [s] = periodRange(type, ref);
  return type === "monthly" ? `${s.getFullYear()}-${s.getMonth()}` : dateKey(s);
}

export function advanceDate(d, freq, customDays) {
  if (freq === "daily") return addDays(d, 1);
  if (freq === "weekly") return addDays(d, 7);
  if (freq === "monthly") return addMonths(d, 1);
  if (freq === "custom") return addDays(d, Math.max(1, customDays || 1));
  return addDays(d, 1);
}

export function fmtDuration(ms) {
  if (ms <= 0) return "ending now";
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${mins}m left`;
  return `${mins}m left`;
}
