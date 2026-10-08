import { NextResponse } from "next/server";
import { parseMeal, snackOccasion } from "@/lib/meals";
import { copyFoodLog, requireDate, updateFoodLog } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { id?: string; date?: string; meal?: string; occasion?: number } | null;
  if (!body?.id) return NextResponse.json({ error: "Missing meal." }, { status: 400 });
  try {
    const item = await copyFoodLog(body.id, requireDate(body.date));
    const meal = parseMeal(body.meal);
    const occasion = meal === "snack" ? snackOccasion(body.occasion) : null;
    if (meal) await updateFoodLog(item.id, { ...item, meal, occasion });
    return NextResponse.json(meal ? { ...item, meal, occasion } : item);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not log that meal again.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
