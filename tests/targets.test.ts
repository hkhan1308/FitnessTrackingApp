import { describe, expect, it } from "vitest";
import { calculateTargets, goalBodyFatPercent, macroGoalScore } from "../lib/targets";

const lossInput = {
  currentWeightLbs: 180,
  currentBodyFat: 20,
  goalWeightLbs: 165,
  activity: "light" as const,
};

describe("goal targets", () => {
  it("holds lean mass for a lighter goal and returns no target at or below lean mass", () => {
    expect(goalBodyFatPercent(180, 20, 165)).toBe(12.7);
    expect(goalBodyFatPercent(180, 20, 144)).toBeNull();
    expect(goalBodyFatPercent(180, 20, 140)).toBeNull();
    expect(calculateTargets({ ...lossInput, goalWeightLbs: 144 })).toBeNull();
  });

  it("uses Katch-McArdle, a 15% deficit, and the macro split for a lighter goal", () => {
    const loss = calculateTargets(lossInput);
    expect(loss).toEqual({
      leanLbs: 144,
      goalBodyFat: 12.7,
      direction: "loss",
      bmr: 1781,
      tdee: 2449,
      calories: 2081,
      protein: 135,
      fat: 64,
      carbs: 241,
      adjustment: "15% below TDEE for weight loss.",
    });
    expect(loss!.calories).toBeGreaterThanOrEqual(loss!.bmr);
  });

  it("uses a 10% surplus when the goal is heavier and treats the extra weight as fat", () => {
    expect(calculateTargets({ ...lossInput, goalWeightLbs: 200 })).toEqual({
      leanLbs: 144,
      goalBodyFat: 28,
      direction: "gain",
      bmr: 1781,
      tdee: 2449,
      calories: 2694,
      protein: 163,
      fat: 82,
      carbs: 326,
      adjustment: "10% above TDEE for weight gain.",
    });
  });

  it("keeps a sedentary deficit above BMR instead of raising it to the floor", () => {
    // Every published activity factor times 0.85 stays above 1, so this
    // branch does not move the rounded calorie target today.
    const sedentary = calculateTargets({ ...lossInput, activity: "sedentary" });
    expect(sedentary).toMatchObject({
      bmr: 1781,
      tdee: 2137,
      calories: 1816,
      direction: "loss",
    });
    expect(sedentary!.calories).toBeGreaterThan(sedentary!.bmr);
  });
});

describe("macroGoalScore", () => {
  const goals = { calorieGoal: 1000, proteinGoal: 100, carbGoal: 200, fatGoal: 50 };
  const onTarget = { calories: 1000, protein: 100, carbs: 200, fat: 50 };

  it("counts a hit exactly at each boundary", () => {
    expect(macroGoalScore({ ...onTarget, calories: 1100 }, goals)).toEqual({ hit: 4, checked: 4 });
    expect(macroGoalScore({ ...onTarget, calories: 900 }, goals)).toEqual({ hit: 4, checked: 4 });
    expect(macroGoalScore({ ...onTarget, protein: 90 }, goals)).toEqual({ hit: 4, checked: 4 });
    expect(macroGoalScore({ ...onTarget, carbs: 220 }, goals)).toEqual({ hit: 4, checked: 4 });
    expect(macroGoalScore({ ...onTarget, carbs: 180 }, goals)).toEqual({ hit: 4, checked: 4 });
    expect(macroGoalScore({ ...onTarget, fat: 55 }, goals)).toEqual({ hit: 4, checked: 4 });
    expect(macroGoalScore({ ...onTarget, fat: 45 }, goals)).toEqual({ hit: 4, checked: 4 });
  });

  it("misses just outside each boundary", () => {
    expect(macroGoalScore({ ...onTarget, calories: 1101 }, goals)?.hit).toBe(3);
    expect(macroGoalScore({ ...onTarget, calories: 899 }, goals)?.hit).toBe(3);
    expect(macroGoalScore({ ...onTarget, protein: 89 }, goals)?.hit).toBe(3);
    expect(macroGoalScore({ ...onTarget, carbs: 221 }, goals)?.hit).toBe(3);
    expect(macroGoalScore({ ...onTarget, carbs: 179 }, goals)?.hit).toBe(3);
    expect(macroGoalScore({ ...onTarget, fat: 56 }, goals)?.hit).toBe(3);
    expect(macroGoalScore({ ...onTarget, fat: 44 }, goals)?.hit).toBe(3);
  });

  it("returns null when no goal is set", () => {
    expect(
      macroGoalScore(onTarget, {
        calorieGoal: null,
        proteinGoal: null,
        carbGoal: null,
        fatGoal: null,
      }),
    ).toBeNull();
  });
});
