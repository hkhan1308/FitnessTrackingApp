export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very";

const LB_PER_KG = 2.2046226218;

export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very: 1.9,
};

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: "Sedentary (×1.2)",
  light: "Lightly active (×1.375)",
  moderate: "Moderate (×1.55)",
  active: "Active (×1.725)",
  very: "Very active (×1.9)",
};

export function isActivity(value: unknown): value is ActivityLevel {
  return value === "sedentary" || value === "light" || value === "moderate" || value === "active" || value === "very";
}

export type TargetInput = {
  currentWeightLbs: number | null;
  currentBodyFat: number | null;
  goalWeightLbs: number | null;
  activity: ActivityLevel;
};

export type CalculatedTargets = {
  leanLbs: number;
  goalBodyFat: number;
  direction: "loss" | "gain" | "maintain";
  bmr: number;
  tdee: number;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  adjustment: string;
};

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function goalBodyFatPercent(
  currentWeightLbs: number,
  currentBodyFat: number,
  goalWeightLbs: number,
): number | null {
  if (currentWeightLbs <= 0 || goalWeightLbs <= 0) return null;
  if (currentBodyFat <= 0 || currentBodyFat >= 80) return null;
  const lean = currentWeightLbs * (1 - currentBodyFat / 100);
  if (goalWeightLbs <= lean) return null;
  return round1((1 - lean / goalWeightLbs) * 100);
}

export function calculateTargets(input: TargetInput): CalculatedTargets | null {
  const { currentWeightLbs, currentBodyFat, goalWeightLbs, activity } = input;
  if (currentWeightLbs == null || currentBodyFat == null || goalWeightLbs == null) return null;
  const goalBodyFat = goalBodyFatPercent(currentWeightLbs, currentBodyFat, goalWeightLbs);
  if (goalBodyFat == null) return null;

  const leanLbs = currentWeightLbs * (1 - currentBodyFat / 100);
  const leanKg = leanLbs / LB_PER_KG;
  const bmr = 370 + 21.6 * leanKg;
  const factor = ACTIVITY_FACTORS[activity] ?? ACTIVITY_FACTORS.light;
  const tdee = bmr * factor;

  let calories = tdee;
  let adjustment = "Maintenance, because goal weight matches current weight.";
  if (goalWeightLbs < currentWeightLbs - 0.2) {
    calories = tdee * 0.85;
    adjustment = "15% below TDEE for weight loss.";
  } else if (goalWeightLbs > currentWeightLbs + 0.2) {
    calories = tdee * 1.1;
    adjustment = "10% above TDEE for weight gain.";
  }
  if (calories < bmr) calories = bmr;
  const calorieGoal = Math.round(calories);

  const protein = Math.round((goalWeightLbs / LB_PER_KG) * 1.8);
  let fat = Math.round((calorieGoal * 0.275) / 9);
  let carbCalories = calorieGoal - protein * 4 - fat * 9;
  if (carbCalories < 0) {
    fat = Math.max(0, Math.floor((calorieGoal - protein * 4) / 9));
    carbCalories = calorieGoal - protein * 4 - fat * 9;
  }
  const carbs = Math.max(0, Math.round(carbCalories / 4));

  const direction =
    goalWeightLbs < currentWeightLbs - 0.2 ? "loss" : goalWeightLbs > currentWeightLbs + 0.2 ? "gain" : "maintain";

  return {
    leanLbs: round1(leanLbs),
    goalBodyFat,
    direction,
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    calories: calorieGoal,
    protein,
    fat,
    carbs,
    adjustment,
  };
}

export const TARGET_ASSUMPTIONS = [
  "BMR is Katch-McArdle: 370 + 21.6 × lean mass in kilograms. Lean mass is current weight × (1 − current body fat). Age is not required.",
  "TDEE multiplies BMR by activity. The default is lightly active (×1.375).",
  "A lighter goal uses a 15% calorie deficit. A heavier goal uses a 10% surplus. Targets never drop below BMR.",
  "Goal body fat holds lean mass constant. Losing weight is treated as fat loss. Gaining weight is treated as added fat mass.",
  "Protein is 1.8 g per kilogram of goal weight (within 1.6–2.2). Fat is 27.5% of calories (within 25–30%). Carbs fill the remaining calories.",
];

export type MacroGoals = {
  calorieGoal: number | null;
  proteinGoal: number | null;
  carbGoal: number | null;
  fatGoal: number | null;
};

export type MacroTotalsLike = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export function macroGoalScore(
  totals: MacroTotalsLike,
  goals: MacroGoals,
): { hit: number; checked: number } | null {
  const checks: boolean[] = [];
  if (goals.calorieGoal != null && goals.calorieGoal > 0) {
    checks.push(Math.abs(totals.calories - goals.calorieGoal) / goals.calorieGoal <= 0.1);
  }
  if (goals.proteinGoal != null && goals.proteinGoal > 0) {
    checks.push(totals.protein >= goals.proteinGoal * 0.9);
  }
  if (goals.carbGoal != null && goals.carbGoal > 0) {
    checks.push(Math.abs(totals.carbs - goals.carbGoal) / goals.carbGoal <= 0.1);
  }
  if (goals.fatGoal != null && goals.fatGoal > 0) {
    checks.push(Math.abs(totals.fat - goals.fatGoal) / goals.fatGoal <= 0.1);
  }
  if (checks.length === 0) return null;
  return { hit: checks.filter(Boolean).length, checked: checks.length };
}
