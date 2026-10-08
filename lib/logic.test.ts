import assert from "node:assert/strict";
import test from "node:test";
import { estimateBodyFat } from "./body-fat.ts";
import { addDays, endOfWeek, startOfWeek, todayISO } from "./dates.ts";
import { rankFoods } from "./food-match.ts";
import { parseFoodQuery } from "./food-parse.ts";
import { macrosForGrams, resolvePortion } from "./food-portion.ts";
import { goalProgress, remainingLabel } from "./goals.ts";
import { rollingAverages } from "./moving-average.ts";
import { calculateTargets, goalBodyFatPercent, macroGoalScore } from "./targets.ts";
import { fromDisplayLength, fromDisplayWeight, round1, toDisplayLength, toDisplayWeight } from "./units.ts";
import { parseMeal } from "./meals.ts";

test("week starts Monday and ends Sunday", () => {
  assert.equal(startOfWeek("2026-10-06"), "2026-10-05");
  assert.equal(endOfWeek("2026-10-06"), "2026-10-11");
  assert.equal(startOfWeek("2026-10-11"), "2026-10-05");
  assert.equal(addDays("2026-10-06", 1), "2026-10-07");
});

test("today is a Los Angeles calendar date", () => {
  assert.match(todayISO(new Date("2026-10-07T06:30:00Z")), /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(todayISO(new Date("2026-10-07T06:30:00Z")), "2026-10-06");
});

test("navy body fat formulas", () => {
  const male = estimateBodyFat({
    sex: "male",
    heightInches: 70,
    waistInches: 36,
    neckInches: 16,
    hipInches: null,
  });
  assert.ok(male != null && Math.abs(male - 19.4) < 0.2);

  const female = estimateBodyFat({
    sex: "female",
    heightInches: 64,
    waistInches: 30,
    neckInches: 13,
    hipInches: 38,
  });
  assert.ok(female != null && female > 20 && female < 40);
  assert.equal(
    estimateBodyFat({
      sex: "female",
      heightInches: 64,
      waistInches: 30,
      neckInches: 13,
      hipInches: null,
    }),
    null,
  );
});

test("moving average uses however many days exist", () => {
  assert.deepEqual(rollingAverages([10, null, 12], 7), [10, null, 11]);
  const series = [1, 2, 3, 4, 5, 6, 7, 8];
  const averages = rollingAverages(series, 7);
  assert.equal(averages[6], 4);
  assert.equal(averages[7], 5);
});

test("goal remaining works for loss and gain", () => {
  const loss = goalProgress(200, 190, 180);
  assert.equal(loss?.percent, 50);
  assert.equal(remainingLabel(loss!.remaining, "lb"), "10.0 lb to go");
  const gain = goalProgress(150, 160, 170);
  assert.equal(gain?.percent, 50);
  assert.equal(remainingLabel(-4.2, "lb"), "4.2 lb to go");
});

test("unit switch keeps a stored pound value readable", () => {
  const stored = 188.4;
  const shown = round1(toDisplayWeight(stored, "metric") ?? 0);
  const back = fromDisplayWeight(shown, "metric");
  assert.ok(back != null && Math.abs(back - stored) < 0.15);
  assert.equal(fromDisplayWeight(180, "us"), 180);
  const waist = fromDisplayLength(round1(toDisplayLength(36, "metric") ?? 0), "metric");
  assert.ok(waist != null && Math.abs(waist - 36) < 0.05);
});

test("goal body fat holds lean mass for loss and gain", () => {
  const loss = goalBodyFatPercent(180, 20, 165);
  assert.equal(loss, 12.7);
  const gain = goalBodyFatPercent(180, 20, 200);
  assert.equal(gain, 28);
  assert.equal(goalBodyFatPercent(180, 20, 140), null);
});

test("calorie targets use lean mass, a modest adjustment, and the macro split", () => {
  const loss = calculateTargets({
    currentWeightLbs: 180,
    currentBodyFat: 20,
    goalWeightLbs: 165,
    activity: "light",
  });
  assert.ok(loss);
  assert.equal(loss?.goalBodyFat, 12.7);
  assert.ok((loss?.calories ?? 0) < (loss?.tdee ?? 0));
  assert.ok((loss?.calories ?? 0) >= (loss?.bmr ?? 0));
  assert.equal(loss?.protein, Math.round((165 / 2.2046226218) * 1.8));
  const proteinKcal = (loss?.protein ?? 0) * 4;
  const fatKcal = (loss?.fat ?? 0) * 9;
  const carbKcal = (loss?.carbs ?? 0) * 4;
  assert.ok(Math.abs(fatKcal / (loss?.calories ?? 1) - 0.275) < 0.05);
  assert.ok(Math.abs(proteinKcal + fatKcal + carbKcal - (loss?.calories ?? 0)) <= 4);

  const gain = calculateTargets({
    currentWeightLbs: 180,
    currentBodyFat: 20,
    goalWeightLbs: 200,
    activity: "light",
  });
  assert.ok((gain?.calories ?? 0) > (gain?.tdee ?? 0));
  assert.equal(parseMeal("snack"), "snack");
  assert.equal(parseMeal("brunch"), null);
});

test("macro goals count a close day and miss a low-protein day", () => {
  const goals = { calorieGoal: 2000, proteinGoal: 150, carbGoal: 200, fatGoal: 60 };
  assert.deepEqual(macroGoalScore({ calories: 2000, protein: 150, carbs: 200, fat: 60 }, goals), {
    hit: 4,
    checked: 4,
  });
  assert.equal(macroGoalScore({ calories: 2000, protein: 100, carbs: 200, fat: 60 }, goals)?.hit, 3);
  assert.equal(macroGoalScore({ calories: 0, protein: 0, carbs: 0, fat: 0 }, { calorieGoal: null, proteinGoal: null, carbGoal: null, fatGoal: null }), null);
});

test("food phrases parse quantity and cooked name", () => {
  assert.deepEqual(parseFoodQuery("100g chicken mince"), {
    quantity: 100,
    unit: "g",
    name: "chicken mince",
    raw: "100g chicken mince",
    hasQuantity: true,
  });
  assert.deepEqual(parseFoodQuery("1.5 scoops whey protein"), {
    quantity: 1.5,
    unit: "scoop",
    name: "whey protein",
    raw: "1.5 scoops whey protein",
    hasQuantity: true,
  });
  const eggs = parseFoodQuery("2 boiled eggs");
  assert.equal(eggs.quantity, 2);
  assert.equal(eggs.unit, null);
  assert.equal(eggs.name, "boiled eggs");
  const rice = parseFoodQuery("1 cup white rice");
  assert.equal(rice.unit, "cup");
  assert.equal(rice.name, "white rice");
});

test("local match prefers the full dish and skips a weak overlap", () => {
  const foods = [
    { id: "breast", name: "Chicken breast", aliases: ["grilled chicken"] },
    { id: "biryani", name: "Chicken biryani", aliases: ["biryani chicken"] },
    { id: "egg", name: "Egg", aliases: ["boiled egg", "boiled eggs", "eggs"] },
    { id: "rice", name: "White rice", aliases: ["steamed rice"] },
  ];
  const biryani = rankFoods(foods, "chicken biryani");
  assert.equal(biryani[0]?.id, "biryani");
  assert.equal(rankFoods(foods, "boiled eggs")[0]?.id, "egg");
  assert.equal(rankFoods(foods, "white rice")[0]?.id, "rice");
  assert.equal(rankFoods(foods, "zebra cakes").length, 0);
});

test("portions use cooked unit sizes", () => {
  const rice = {
    name: "White rice",
    aliases: ["white rice"],
    caloriesPer100g: 130,
    proteinPer100g: 2.7,
    carbsPer100g: 28,
    fatPer100g: 0.3,
    units: { cup: 158 },
  };
  const parsed = parseFoodQuery("1 cup white rice");
  const portion = resolvePortion(rice, parsed);
  assert.equal(portion.grams, 158);
  assert.equal(macrosForGrams(rice, portion.grams).calories, 205);

  const eggs = {
    name: "Egg",
    aliases: ["boiled eggs", "eggs"],
    caloriesPer100g: 155,
    proteinPer100g: 13,
    carbsPer100g: 1.1,
    fatPer100g: 11,
    units: { egg: 50 },
  };
  const eggPortion = resolvePortion(eggs, parseFoodQuery("2 boiled eggs"));
  assert.equal(eggPortion.unit, "egg");
  assert.equal(eggPortion.grams, 100);
});
