import { NextResponse } from "next/server";
import { num } from "@/lib/format";
import { deleteFoodLog, updateFoodLog } from "@/lib/store";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body.name !== "string") {
    return NextResponse.json({ error: "Missing meal." }, { status: 400 });
  }
  try {
    await updateFoodLog(id, {
      name: body.name,
      quantity: num(body.quantity),
      unit: typeof body.unit === "string" ? body.unit : null,
      calories: num(body.calories),
      protein: num(body.protein),
      carbs: num(body.carbs),
      fat: num(body.fat),
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update that meal.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  await deleteFoodLog(id);
  return NextResponse.json({ ok: true });
}
