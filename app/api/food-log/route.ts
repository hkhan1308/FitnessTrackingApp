import { NextResponse } from "next/server";
import { num } from "@/lib/format";
import { addFoodLog, getFoodLog, rememberFood, requireDate, totalsFor } from "@/lib/store";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const date = new URL(request.url).searchParams.get("date");
  try {
    const items = await getFoodLog(requireDate(date));
    return NextResponse.json({ items, totals: totalsFor(items) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load meals.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Missing meal." }, { status: 400 });
  try {
    const date = requireDate(typeof body.date === "string" ? body.date : null);
    let foodId = typeof body.foodId === "string" ? body.foodId : null;
    const source = typeof body.source === "string" ? body.source : "manual";
    if (body.saveToLibrary && typeof body.name === "string") {
      foodId = await rememberFood({
        name: body.name,
        aliases: Array.isArray(body.aliases) ? body.aliases.filter((item) => typeof item === "string") : [],
        caloriesPer100g: num(body.caloriesPer100g) ?? num(body.calories) ?? 0,
        proteinPer100g: num(body.proteinPer100g) ?? num(body.protein) ?? 0,
        carbsPer100g: num(body.carbsPer100g) ?? num(body.carbs) ?? 0,
        fatPer100g: num(body.fatPer100g) ?? num(body.fat) ?? 0,
        units: { serving: 100 },
        source,
      });
    }
    const item = await addFoodLog({
      date,
      name: typeof body.name === "string" ? body.name : "",
      quantity: num(body.quantity),
      unit: typeof body.unit === "string" ? body.unit : null,
      grams: num(body.grams),
      calories: num(body.calories),
      protein: num(body.protein),
      carbs: num(body.carbs),
      fat: num(body.fat),
      source,
      foodId,
    });
    return NextResponse.json(item);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not add that meal.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
