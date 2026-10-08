export type MealSlot = "breakfast" | "lunch" | "dinner" | "snack";

export const MEAL_SLOTS: { id: MealSlot; label: string }[] = [
  { id: "breakfast", label: "Breakfast" },
  { id: "lunch", label: "Lunch" },
  { id: "dinner", label: "Dinner" },
  { id: "snack", label: "Snacks" },
];

export function parseMeal(value: unknown): MealSlot | null {
  if (value === "breakfast" || value === "lunch" || value === "dinner" || value === "snack") return value;
  return null;
}

export function mealLabel(meal: MealSlot | null): string {
  if (meal == null) return "Earlier entries";
  return MEAL_SLOTS.find((slot) => slot.id === meal)?.label ?? "Earlier entries";
}
