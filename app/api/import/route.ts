import { NextResponse } from "next/server";
import { importData } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    await importData(payload);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Import failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
