export type WebFood = {
  name: string;
  detail: string;
  source: "usda" | "open-food-facts";
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
};

type Nutrient = {
  nutrientId?: number;
  nutrientNumber?: string;
  value?: number;
};

function nutrient(list: Nutrient[], ids: number[], numbers: string[]): number | null {
  const found = list.find(
    (item) =>
      (item.nutrientId != null && ids.includes(item.nutrientId)) ||
      (item.nutrientNumber != null && numbers.includes(String(item.nutrientNumber))),
  );
  return typeof found?.value === "number" ? found.value : null;
}

async function searchUsda(query: string): Promise<WebFood[]> {
  const key = process.env.USDA_API_KEY?.trim();
  if (!key) return [];
  const url = new URL("https://api.nal.usda.gov/fdc/v1/foods/search");
  url.searchParams.set("api_key", key);
  url.searchParams.set("query", query);
  url.searchParams.set("pageSize", "12");
  url.searchParams.set("dataType", "Foundation,SR Legacy");
  const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`USDA search failed (${response.status})`);
  const body = (await response.json()) as {
    foods?: Array<{
      description?: string;
      dataType?: string;
      foodNutrients?: Nutrient[];
    }>;
  };
  const foods: WebFood[] = [];
  for (const food of body.foods ?? []) {
    const nutrients = food.foodNutrients ?? [];
    const calories = nutrient(nutrients, [1008], ["208"]);
    const protein = nutrient(nutrients, [1003], ["203"]);
    const carbs = nutrient(nutrients, [1005], ["205"]);
    const fat = nutrient(nutrients, [1004], ["204"]);
    if (calories == null || protein == null || carbs == null || fat == null) continue;
    foods.push({
      name: food.description?.trim() || query,
      detail: food.dataType ? `USDA ${food.dataType}, per 100g` : "USDA, per 100g",
      source: "usda",
      caloriesPer100g: calories,
      proteinPer100g: protein,
      carbsPer100g: carbs,
      fatPer100g: fat,
    });
  }
  return foods;
}

async function searchOpenFoodFacts(query: string): Promise<WebFood[]> {
  const url = new URL("https://world.openfoodfacts.org/cgi/search.pl");
  url.searchParams.set("search_terms", query);
  url.searchParams.set("search_simple", "1");
  url.searchParams.set("action", "process");
  url.searchParams.set("json", "1");
  url.searchParams.set("page_size", "12");
  url.searchParams.set("fields", "product_name,brands,nutriments,serving_size");
  const response = await fetch(url, {
    signal: AbortSignal.timeout(8000),
    headers: { "User-Agent": "FitLog/1.0 (personal fitness tracker)" },
  });
  if (!response.ok) throw new Error(`Open Food Facts search failed (${response.status})`);
  const body = (await response.json()) as {
    products?: Array<{
      product_name?: string;
      brands?: string;
      serving_size?: string;
      nutriments?: Record<string, number | string>;
    }>;
  };
  const foods: WebFood[] = [];
  for (const product of body.products ?? []) {
    const nutriments = product.nutriments ?? {};
    const calories = Number(nutriments["energy-kcal_100g"]);
    const protein = Number(nutriments.proteins_100g);
    const carbs = Number(nutriments.carbohydrates_100g);
    const fat = Number(nutriments.fat_100g);
    if (![calories, protein, carbs, fat].every((value) => Number.isFinite(value))) continue;
    const name = product.product_name?.trim();
    if (!name) continue;
    const brand = product.brands?.split(",")[0]?.trim();
    foods.push({
      name: brand ? `${name} (${brand})` : name,
      detail: product.serving_size
        ? `Open Food Facts, per 100g · serving ${product.serving_size}`
        : "Open Food Facts, per 100g",
      source: "open-food-facts",
      caloriesPer100g: calories,
      proteinPer100g: protein,
      carbsPer100g: carbs,
      fatPer100g: fat,
    });
  }
  return foods;
}

export async function searchWebFoods(query: string): Promise<{ foods: WebFood[]; errors: string[] }> {
  const errors: string[] = [];
  const settled = await Promise.allSettled([searchUsda(query), searchOpenFoodFacts(query)]);
  const foods: WebFood[] = [];
  for (const result of settled) {
    if (result.status === "fulfilled") foods.push(...result.value);
    else errors.push(result.reason instanceof Error ? result.reason.message : "Food search failed");
  }
  const usda = foods.filter((food) => food.source === "usda");
  const off = foods.filter((food) => food.source === "open-food-facts");
  const mixed = [...usda.slice(0, 3), ...off.slice(0, 2)];
  const unique = new Map<string, WebFood>();
  for (const food of mixed.length ? mixed : foods) {
    const key = food.name.toLowerCase();
    if (!unique.has(key)) unique.set(key, food);
  }
  return { foods: [...unique.values()].slice(0, 5), errors };
}
