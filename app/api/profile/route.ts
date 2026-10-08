import { NextResponse } from "next/server";
import type { Sex } from "@/lib/body-fat";
import { num } from "@/lib/format";
import { getProfile, saveProfile } from "@/lib/store";
import { isActivity } from "@/lib/targets";

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
      units: body.units === "metric" ? "metric" : "us",
      currentWeightLbs: num(body.currentWeightLbs),
      startingWeightLbs: num(body.startingWeightLbs),
      goalWeightLbs: num(body.goalWeightLbs),
      startingBodyFat: num(body.startingBodyFat),
      currentBodyFat: num(body.currentBodyFat),
      goalBodyFat: num(body.goalBodyFat),
      heightInches: num(body.heightInches),
      calorieGoal: num(body.calorieGoal),
      proteinGoal: num(body.proteinGoal),
      carbGoal: num(body.carbGoal),
      fatGoal: num(body.fatGoal),
      activity: isActivity(body.activity) ? body.activity : "light",
    });
    return NextResponse.json(profile);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save profile.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
