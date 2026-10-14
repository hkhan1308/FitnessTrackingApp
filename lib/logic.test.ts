import { expect, test } from "vitest";
import { estimateBodyFat } from "./body-fat";
import { addDays, endOfWeek, startOfWeek, todayISO } from "./dates";
import { rankFoods } from "./food-match";
import { parseFoodQuery } from "./food-parse";
import { macrosForGrams, resolvePortion } from "./food-portion";
import { goalProgress, remainingLabel } from "./goals";
import { rollingAverages } from "./moving-average";
import { calculateTargets, goalBodyFatPercent, macroGoalScore } from "./targets";
import { fromDisplayLength, fromDisplayWeight, round1, toDisplayLength, toDisplayWeight } from "./units";
import { encodeMeal, parseMeal, snackOccasion, snackTitle } from "./meals";

test("week starts Monday and ends Sunday", () => {
  expect(startOfWeek("2026-10-06")).toBe("2026-10-05");
  expect(endOfWeek("2026-10-06")).toBe("2026-10-11");
  expect(startOfWeek("2026-10-11")).toBe("2026-10-05");
  expect(addDays("2026-10-06", 1)).toBe("2026-10-07");
});

test("today is a Los Angeles calendar date", () => {
  expect(todayISO(new Date("2026-10-07T06:30:00Z"))).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect(todayISO(new Date("2026-10-07T06:30:00Z"))).toBe("2026-10-06");
});

test("navy body fat formulas", () => {
  const male = estimateBodyFat({
    sex: "male",
    heightInches: 70,
    waistInches: 36,
    neckInches: 16,
    hipInches: null,
  });
  expect(male != null && Math.abs(male - 19.4) < 0.2).toBe(true);

  const female = estimateBodyFat({
    sex: "female",
    heightInches: 64,
    waistInches: 30,
    neckInches: 13,
    hipInches: 38,
  });
  expect(female != null && female > 20 && female < 40).toBe(true);
  expect(
    estimateBodyFat({
      sex: "female",
      heightInches: 64,
      waistInches: 30,
      neckInches: 13,
      hipInches: null,
    }),
  ).toBe(null);
});

test("moving average uses however many days exist", () => {
  expect(rollingAverages([10, null, 12], 7)).toEqual([10, null, 11]);
  const series = [1, 2, 3, 4, 5, 6, 7, 8];
  const averages = rollingAverages(series, 7);
  expect(averages[6]).toBe(4);
  expect(averages[7]).toBe(5);
});

test("goal remaining works for loss and gain", () => {
  const loss = goalProgress(200, 190, 180);
  expect(loss?.percent).toBe(50);
  expect(remainingLabel(loss!.remaining, "lb")).toBe("10.0 lb to go");
  const gain = goalProgress(150, 160, 170);
  expect(gain?.percent).toBe(50);
  expect(remainingLabel(-4.2, "lb")).toBe("4.2 lb to go");
});

test("unit switch keeps a stored pound value readable", () => {
  const stored = 188.4;
  const shown = round1(toDisplayWeight(stored, "metric") ?? 0);
  const back = fromDisplayWeight(shown, "metric");
  expect(back != null && Math.abs(back - stored) < 0.15).toBe(true);
  expect(fromDisplayWeight(180, "us")).toBe(180);
  const waist = fromDisplayLength(round1(toDisplayLength(36, "metric") ?? 0), "metric");
  expect(waist != null && Math.abs(waist - 36) < 0.05).toBe(true);
});

test("goal body fat holds lean mass for loss and gain", () => {
  const loss = goalBodyFatPercent(180, 20, 165);
  expect(loss).toBe(12.7);
  const gain = goalBodyFatPercent(180, 20, 200);
  expect(gain).toBe(28);
  expect(goalBodyFatPercent(180, 20, 140)).toBe(null);
});

test("calorie targets use lean mass, a modest adjustment, and the macro split", () => {
  const loss = calculateTargets({
    currentWeightLbs: 180,
    currentBodyFat: 20,
    goalWeightLbs: 165,
    activity: "light",
  });
  expect(loss).toBeTruthy();
  expect(loss?.goalBodyFat).toBe(12.7);
  expect((loss?.calories ?? 0) < (loss?.tdee ?? 0)).toBe(true);
  expect((loss?.calories ?? 0) >= (loss?.bmr ?? 0)).toBe(true);
  expect(loss?.protein).toBe(Math.round((165 / 2.2046226218) * 1.8));
  const proteinKcal = (loss?.protein ?? 0) * 4;
  const fatKcal = (loss?.fat ?? 0) * 9;
  const carbKcal = (loss?.carbs ?? 0) * 4;
  expect(Math.abs(fatKcal / (loss?.calories ?? 1) - 0.275) < 0.05).toBe(true);
  expect(Math.abs(proteinKcal + fatKcal + carbKcal - (loss?.calories ?? 0)) <= 4).toBe(true);

  const gain = calculateTargets({
    currentWeightLbs: 180,
    currentBodyFat: 20,
    goalWeightLbs: 200,
    activity: "light",
  });
  expect((gain?.calories ?? 0) > (gain?.tdee ?? 0)).toBe(true);
  expect(parseMeal("snack")).toBe("snack");
  expect(parseMeal("snack:2")).toBe("snack");
  expect(parseMeal("brunch")).toBe(null);
  expect(encodeMeal("snack", 1)).toBe("snack");
  expect(encodeMeal("snack", 2)).toBe("snack:2");
  expect(encodeMeal("lunch", 4)).toBe("lunch");
  expect(snackOccasion("snack:3")).toBe(3);
  expect(snackTitle(1)).toBe("Snack");
  expect(snackTitle(2)).toBe("Snack 2");
});

test("macro goals count a close day and miss a low-protein day", () => {
  const goals = { calorieGoal: 2000, proteinGoal: 150, carbGoal: 200, fatGoal: 60 };
  expect(macroGoalScore({ calories: 2000, protein: 150, carbs: 200, fat: 60 }, goals)).toEqual({
    hit: 4,
    checked: 4,
  });
  expect(macroGoalScore({ calories: 2000, protein: 100, carbs: 200, fat: 60 }, goals)?.hit).toBe(3);
  expect(macroGoalScore({ calories: 0, protein: 0, carbs: 0, fat: 0 }, { calorieGoal: null, proteinGoal: null, carbGoal: null, fatGoal: null })).toBe(null);
});

test("food phrases parse quantity and cooked name", () => {
  expect(parseFoodQuery("100g chicken mince")).toEqual({
    quantity: 100,
    unit: "g",
    name: "chicken mince",
    raw: "100g chicken mince",
    hasQuantity: true,
  });
  expect(parseFoodQuery("1.5 scoops whey protein")).toEqual({
    quantity: 1.5,
    unit: "scoop",
    name: "whey protein",
    raw: "1.5 scoops whey protein",
    hasQuantity: true,
  });
  const eggs = parseFoodQuery("2 boiled eggs");
  expect(eggs.quantity).toBe(2);
  expect(eggs.unit).toBe(null);
  expect(eggs.name).toBe("boiled eggs");
  const rice = parseFoodQuery("1 cup white rice");
  expect(rice.unit).toBe("cup");
  expect(rice.name).toBe("white rice");
});

test("local match prefers the full dish and skips a weak overlap", () => {
  const foods = [
    { id: "breast", name: "Chicken breast", aliases: ["grilled chicken"] },
    { id: "biryani", name: "Chicken biryani", aliases: ["biryani chicken"] },
    { id: "egg", name: "Egg", aliases: ["boiled egg", "boiled eggs", "eggs"] },
    { id: "rice", name: "White rice", aliases: ["steamed rice"] },
  ];
  const biryani = rankFoods(foods, "chicken biryani");
  expect(biryani[0]?.id).toBe("biryani");
  expect(rankFoods(foods, "boiled eggs")[0]?.id).toBe("egg");
  expect(rankFoods(foods, "white rice")[0]?.id).toBe("rice");
  expect(rankFoods(foods, "zebra cakes").length).toBe(0);
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
  expect(portion.grams).toBe(158);
  expect(macrosForGrams(rice, portion.grams).calories).toBe(205);

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
  expect(eggPortion.unit).toBe("egg");
  expect(eggPortion.grams).toBe(100);
});
