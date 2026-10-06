export const TIMEZONE = "America/Los_Angeles";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isISODate(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const date = parseISODate(value);
  return formatISO(date) === value;
}

export function todayISO(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function parseISODate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

export function formatISO(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(value: string, days: number): string {
  const date = parseISODate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return formatISO(date);
}

export function startOfWeek(value: string): string {
  const day = parseISODate(value).getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(value, diff);
}

export function endOfWeek(value: string): string {
  return addDays(startOfWeek(value), 6);
}

export function startOfMonth(value: string): string {
  return `${value.slice(0, 7)}-01`;
}

export function endOfMonth(value: string): string {
  const date = parseISODate(startOfMonth(value));
  date.setUTCMonth(date.getUTCMonth() + 1);
  date.setUTCDate(0);
  return formatISO(date);
}

export function addMonths(value: string, months: number): string {
  const date = parseISODate(startOfMonth(value));
  date.setUTCMonth(date.getUTCMonth() + months);
  return formatISO(date);
}

export function eachDay(from: string, to: string): string[] {
  const days: string[] = [];
  let cursor = from;
  while (cursor <= to) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return days;
}

export function formatPretty(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(parseISODate(value));
}

export function formatMonth(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  }).format(parseISODate(startOfMonth(value)));
}

export function formatShort(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
  }).format(parseISODate(value));
}

export function weekdayShort(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "short",
  }).format(parseISODate(value));
}
