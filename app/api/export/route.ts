import { NextResponse } from "next/server";
import { csvCell } from "@/lib/format";
import { exportData } from "@/lib/store";

export const runtime = "nodejs";

function row(values: unknown[]): string {
  return values.map(csvCell).join(",");
}

export async function GET(request: Request) {
  const format = new URL(request.url).searchParams.get("format") === "csv" ? "csv" : "json";
  const data = await exportData();
  if (format === "json") {
    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": "attachment; filename=fit-log-backup.json",
      },
    });
  }

  const lines = [
    row([
      "section",
      "date",
      "name",
      "quantity",
      "unit",
      "grams",
      "calories",
      "protein_g",
      "carbs_g",
      "fat_g",
      "weight_lbs",
      "waist_in",
      "neck_in",
      "hip_in",
      "body_fat_pct",
      "sex",
      "height_in",
      "current_weight_lbs",
      "goal_weight_lbs",
      "starting_body_fat",
      "goal_body_fat",
      "calorie_goal",
      "protein_goal",
      "carb_goal",
      "fat_goal",
      "source",
      "notes",
    ]),
    row([
      "profile",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      data.profile.sex,
      data.profile.heightInches,
      data.profile.currentWeightLbs,
      data.profile.goalWeightLbs,
      data.profile.startingBodyFat,
      data.profile.goalBodyFat,
      data.profile.calorieGoal,
      data.profile.proteinGoal,
      data.profile.carbGoal,
      data.profile.fatGoal,
      "",
      "",
    ]),
  ];

  for (const metric of data.metrics) {
    lines.push(
      row([
        "metrics",
        metric.date,
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        metric.weightLbs,
        metric.waistIn,
        metric.neckIn,
        metric.hipIn,
        metric.bodyFatPct,
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        metric.notes,
      ]),
    );
  }

  for (const item of data.foodLog) {
    lines.push(
      row([
        "food_log",
        item.date,
        item.name,
        item.quantity,
        item.unit,
        item.grams,
        item.calories,
        item.protein,
        item.carbs,
        item.fat,
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        item.source,
        "",
      ]),
    );
  }

  for (const food of data.foods) {
    lines.push(
      row([
        "food_library",
        "",
        food.name,
        "",
        "",
        100,
        food.caloriesPer100g,
        food.proteinPer100g,
        food.carbsPer100g,
        food.fatPer100g,
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        food.source,
        food.category,
      ]),
    );
  }

  return new NextResponse(lines.join("\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": "attachment; filename=fit-log.csv",
    },
  });
}
