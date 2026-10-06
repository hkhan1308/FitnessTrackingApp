export type PortionFood = {
  name: string;
  aliases: string[];
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  units: Record<string, number>;
};

const GENERIC: Record<string, number> = {
  cup: 240,
  tbsp: 15,
  tsp: 5,
  serving: 100,
  bowl: 250,
  plate: 300,
  ml: 1,
};

function haystack(food: PortionFood, name: string): string {
  return [name, food.name, ...food.aliases].join(" ").toLowerCase();
}

function inferUnit(food: PortionFood, name: string): string | null {
  const text = haystack(food, name);
  if (food.units.egg && /\begg/.test(text)) return "egg";
  if (food.units.roti && /\b(roti|chapati)/.test(text)) return "roti";
  if (food.units.scoop && /\b(scoop|whey|protein powder)/.test(text)) return "scoop";
  if (food.units.slice && /\b(slice|bread|toast)/.test(text)) return "slice";
  if (food.units.can && /\bcan\b/.test(text)) return "can";
  if (
    food.units.piece &&
    /\b(kebab|kabab|samosa|falafel|banana|apple|orange|bar|naan|pita|date|paratha)\b/.test(
      text,
    )
  ) {
    return "piece";
  }
  return null;
}

export function resolvePortion(
  food: PortionFood,
  parsed: { quantity: number; unit: string | null; name: string; hasQuantity: boolean },
): { quantity: number; unit: string; grams: number; assumed: boolean } {
  let unit = parsed.unit;
  let quantity = parsed.quantity;
  let assumed = false;

  if (!unit) {
    const inferred = inferUnit(food, parsed.name);
    if (inferred) {
      unit = inferred;
      if (!parsed.hasQuantity) quantity = 1;
    } else {
      unit = "g";
      quantity = parsed.hasQuantity ? parsed.quantity * 100 : 100;
      assumed = true;
    }
  }

  let grams: number;
  if (unit === "g") grams = quantity;
  else if (unit === "kg") grams = quantity * 1000;
  else if (unit === "oz") grams = quantity * 28.3495;
  else if (unit === "lb") grams = quantity * 453.592;
  else if (unit === "ml") grams = quantity;
  else if (food.units[unit]) grams = quantity * food.units[unit];
  else if (GENERIC[unit]) {
    grams = quantity * GENERIC[unit];
    assumed = true;
  } else {
    grams = quantity * 100;
    assumed = true;
  }

  return {
    quantity,
    unit,
    grams: Math.round(grams * 10) / 10,
    assumed,
  };
}

export function macrosForGrams(food: PortionFood, grams: number) {
  const factor = grams / 100;
  const round = (value: number) => Math.round(value * 10) / 10;
  return {
    calories: Math.round(food.caloriesPer100g * factor),
    protein: round(food.proteinPer100g * factor),
    carbs: round(food.carbsPer100g * factor),
    fat: round(food.fatPer100g * factor),
  };
}
