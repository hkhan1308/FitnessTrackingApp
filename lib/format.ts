export function fmt(value: number | null | undefined, digits = 1): string {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function fmtQty(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toLocaleString("en-US", { maximumFractionDigits: 1 });
}

export function fmtInt(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return Math.round(value).toLocaleString("en-US");
}

export function num(value: unknown): number | null {
  if (value == null || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

export function csvCell(value: unknown): string {
  if (value == null) return "";
  const text = String(value);
  const guarded = /^[=+\-@]/.test(text) ? `'${text}` : text;
  if (/[",\n]/.test(guarded)) return `"${guarded.replaceAll('"', '""')}"`;
  return guarded;
}
