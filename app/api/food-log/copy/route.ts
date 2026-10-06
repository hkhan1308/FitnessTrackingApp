import { NextResponse } from "next/server";
import { copyFoodLog, requireDate } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { id?: string; date?: string } | null;
  if (!body?.id) return NextResponse.json({ error: "Missing meal." }, { status: 400 });
  try {
    const item = await copyFoodLog(body.id, requireDate(body.date));
    return NextResponse.json(item);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not log that meal again.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
