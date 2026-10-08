export type MealSlot = "breakfast" | "lunch" | "dinner" | "snack";

export const MEAL_SLOTS: { id: MealSlot; label: string }[] = [
  { id: "breakfast", label: "Breakfast" },
  { id: "lunch", label: "Lunch" },
  { id: "dinner", label: "Dinner" },
  { id: "snack", label: "Snack" },
];

export function parseMeal(value: unknown): MealSlot | null {
  if (typeof value !== "string") return null;
  const base = value.split(":")[0];
  if (base === "breakfast" || base === "lunch" || base === "dinner" || base === "snack") return base;
  return null;
}

export function snackOccasion(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value) && value >= 1) return Math.floor(value);
  if (typeof value !== "string") return 1;
  const match = /^snack:(\d+)$/.exec(value);
  if (!match) return 1;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : 1;
}

export function encodeMeal(meal: MealSlot | null, occasion: number | null): string | null {
  if (meal == null) return null;
  if (meal !== "snack") return meal;
  const index = snackOccasion(occasion);
  return index > 1 ? `snack:${index}` : "snack";
}

export function snackTitle(occasion: number): string {
  return occasion <= 1 ? "Snack" : `Snack ${occasion}`;
}

export function mealLabel(meal: MealSlot | null, occasion?: number | null): string {
  if (meal == null) return "Earlier entries";
  if (meal === "snack") return snackTitle(snackOccasion(occasion ?? 1));
  return MEAL_SLOTS.find((slot) => slot.id === meal)?.label ?? "Earlier entries";
}
