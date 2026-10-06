import { NextResponse } from "next/server";
import { num } from "@/lib/format";
import { deleteMetric, getMetric, requireDate, saveMetric } from "@/lib/store";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const date = new URL(request.url).searchParams.get("date");
  try {
    return NextResponse.json(await getMetric(requireDate(date)));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load metrics.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Missing measurements." }, { status: 400 });
  try {
    const metric = await saveMetric({
      date: requireDate(typeof body.date === "string" ? body.date : null),
      weightLbs: num(body.weightLbs),
      waistIn: num(body.waistIn),
      neckIn: num(body.neckIn),
      hipIn: num(body.hipIn),
      notes: typeof body.notes === "string" ? body.notes.trim() || null : null,
    });
    return NextResponse.json(metric);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save measurements.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const date = new URL(request.url).searchParams.get("date");
  try {
    await deleteMetric(requireDate(date));
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not delete that day.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
