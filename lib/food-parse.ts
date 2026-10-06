const UNIT_ALIASES: Record<string, string> = {
  g: "g",
  gram: "g",
  grams: "g",
  kg: "kg",
  oz: "oz",
  ounce: "oz",
  ounces: "oz",
  lb: "lb",
  lbs: "lb",
  pound: "lb",
  pounds: "lb",
  cup: "cup",
  cups: "cup",
  tbsp: "tbsp",
  tablespoon: "tbsp",
  tablespoons: "tbsp",
  tsp: "tsp",
  teaspoon: "tsp",
  teaspoons: "tsp",
  scoop: "scoop",
  scoops: "scoop",
  piece: "piece",
  pieces: "piece",
  slice: "slice",
  slices: "slice",
  egg: "egg",
  eggs: "egg",
  roti: "roti",
  rotis: "roti",
  bowl: "bowl",
  bowls: "bowl",
  plate: "plate",
  plates: "plate",
  serving: "serving",
  servings: "serving",
  ml: "ml",
  can: "can",
  cans: "can",
};

export type ParsedFoodQuery = {
  quantity: number;
  unit: string | null;
  name: string;
  raw: string;
  hasQuantity: boolean;
};

function parseQuantity(token: string): number | null {
  if (/^\d+\s+\d+\/\d+$/.test(token)) {
    const [whole, fraction] = token.split(/\s+/);
    const [numerator, denominator] = fraction.split("/").map(Number);
    if (!denominator) return null;
    return Number(whole) + numerator / denominator;
  }
  if (/^\d+\/\d+$/.test(token)) {
    const [numerator, denominator] = token.split("/").map(Number);
    if (!denominator) return null;
    return numerator / denominator;
  }
  if (/^\d+(\.\d+)?$/.test(token)) return Number(token);
  return null;
}

export function parseFoodQuery(input: string): ParsedFoodQuery {
  const raw = input.trim().replace(/\s+/g, " ");
  const match = raw.match(
    /^(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?)(?:\s*([a-zA-Z]+))?(?:\s+(.+))?$/,
  );
  if (!match) {
    return { quantity: 1, unit: null, name: raw, raw, hasQuantity: false };
  }

  const quantity = parseQuantity(match[1]) ?? 1;
  const unitWord = match[2]?.toLowerCase() ?? null;
  const rest = match[3]?.trim() ?? "";
  const unit = unitWord ? UNIT_ALIASES[unitWord] ?? null : null;

  if (unit) {
    return {
      quantity,
      unit,
      name: rest || unitWord || raw,
      raw,
      hasQuantity: true,
    };
  }

  const name = [unitWord, rest].filter(Boolean).join(" ").trim() || raw;
  return { quantity, unit: null, name, raw, hasQuantity: true };
}
