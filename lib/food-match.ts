const STOP = new Set([
  "a",
  "an",
  "of",
  "the",
  "with",
  "and",
  "cooked",
  "boiled",
  "grilled",
  "roasted",
  "baked",
  "fried",
  "plain",
  "fresh",
  "skinless",
]);

export type MatchableFood = {
  id: string;
  name: string;
  aliases: string[];
};

export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function singular(token: string): string {
  if (token.endsWith("oes") && token.length > 4) return token.slice(0, -2);
  if (token.endsWith("s") && !token.endsWith("ss") && token.length > 3) {
    return token.slice(0, -1);
  }
  return token;
}

export function tokens(value: string): string[] {
  return normalizeText(value)
    .split(" ")
    .map(singular)
    .filter((token) => token && !STOP.has(token));
}

export function scoreFood(food: MatchableFood, queryName: string): number {
  const queryNorm = normalizeText(queryName);
  const names = [food.name, ...food.aliases].map(normalizeText);
  if (names.includes(queryNorm)) return 100;

  const queryTokens = tokens(queryName);
  if (queryTokens.length === 0) return 0;

  const foodTokenSet = new Set(tokens([food.name, ...food.aliases].join(" ")));
  const matched = queryTokens.filter((token) => foodTokenSet.has(token)).length;
  const coverage = matched / queryTokens.length;
  if (coverage < 1) return Math.round(coverage * 45);

  const nameTokens = tokens(food.name);
  const querySet = new Set(queryTokens);
  const extra = nameTokens.filter((token) => !querySet.has(token)).length;
  return 92 - Math.min(extra, 8) * 4;
}

export function rankFoods<T extends MatchableFood>(
  foods: T[],
  queryName: string,
  limit = 5,
): Array<T & { score: number }> {
  return foods
    .map((food) => ({ ...food, score: scoreFood(food, queryName) }))
    .filter((food) => food.score >= 50)
    .sort((a, b) => b.score - a.score || a.name.length - b.name.length)
    .slice(0, limit);
}
