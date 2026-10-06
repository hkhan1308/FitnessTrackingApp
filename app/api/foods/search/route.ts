import { NextResponse } from "next/server";
import { searchWebFoods } from "@/lib/food-web";
import { macrosForGrams, resolvePortion } from "@/lib/food-portion";
import { searchLocalFoods } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { query?: string } | null;
  const query = body?.query?.trim() ?? "";
  if (!query) return NextResponse.json({ error: "Type a food first." }, { status: 400 });

  try {
    const local = await searchLocalFoods(query);
    if (local.matches.length > 0) {
      return NextResponse.json({
        parsed: local.parsed,
        matches: local.matches,
        searchedWeb: false,
        errors: [],
      });
    }

    const web = await searchWebFoods(local.parsed.name || query);
    const matches = web.foods.map((food) => {
      const record = { ...food, aliases: [] as string[], units: {} as Record<string, number> };
      const portion = resolvePortion(record, local.parsed);
      const macros = macrosForGrams(record, portion.grams);
      return {
        foodId: null,
        name: food.name,
        detail: food.detail,
        score: 0,
        quantity: portion.quantity,
        unit: portion.unit,
        grams: portion.grams,
        assumed: portion.assumed,
        ...macros,
        caloriesPer100g: food.caloriesPer100g,
        proteinPer100g: food.proteinPer100g,
        carbsPer100g: food.carbsPer100g,
        fatPer100g: food.fatPer100g,
        source: food.source,
      };
    });

    return NextResponse.json({
      parsed: local.parsed,
      matches,
      searchedWeb: true,
      errors: web.errors,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Search failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
