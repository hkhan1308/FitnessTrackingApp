import { NextResponse } from "next/server";
import type { Sex } from "@/lib/body-fat";
import { num } from "@/lib/format";
import { getProfile, saveProfile } from "@/lib/store";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(await getProfile());
}

export async function PUT(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Missing profile." }, { status: 400 });
  const sex = body.sex === "male" || body.sex === "female" ? (body.sex as Sex) : null;
  try {
    const profile = await saveProfile({
      sex,
      currentWeightLbs: num(body.currentWeightLbs),
      goalWeightLbs: num(body.goalWeightLbs),
      startingBodyFat: num(body.startingBodyFat),
      goalBodyFat: num(body.goalBodyFat),
      heightInches: num(body.heightInches),
      calorieGoal: num(body.calorieGoal),
      proteinGoal: num(body.proteinGoal),
      carbGoal: num(body.carbGoal),
      fatGoal: num(body.fatGoal),
    });
    return NextResponse.json(profile);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save profile.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
