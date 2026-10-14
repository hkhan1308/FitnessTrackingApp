import { describe, expect, it } from "vitest";
import { parseFoodQuery } from "../lib/food-parse";
import { macrosForGrams, resolvePortion, type PortionFood } from "../lib/food-portion";

const roti: PortionFood = {
  name: "Roti",
  aliases: ["chapati"],
  caloriesPer100g: 297,
  proteinPer100g: 9,
  carbsPer100g: 49,
  fatPer100g: 7,
  units: { roti: 40 },
};

const biryani: PortionFood = {
  name: "Chicken biryani",
  aliases: ["biryani chicken"],
  caloriesPer100g: 175,
  proteinPer100g: 10,
  carbsPer100g: 22,
  fatPer100g: 6,
  units: { plate: 350 },
};

const chicken: PortionFood = {
  name: "Chicken breast",
  aliases: ["grilled chicken breast"],
  caloriesPer100g: 165,
  proteinPer100g: 31,
  carbsPer100g: 0,
  fatPer100g: 3.6,
  units: { piece: 170 },
};

describe("parseFoodQuery", () => {
  it("reads household units and gram weights", () => {
    expect(parseFoodQuery("2 roti")).toEqual({
      quantity: 2,
      unit: "roti",
      name: "roti",
      raw: "2 roti",
      hasQuantity: true,
    });
    expect(parseFoodQuery("1 plate biryani")).toEqual({
      quantity: 1,
      unit: "plate",
      name: "biryani",
      raw: "1 plate biryani",
      hasQuantity: true,
    });
    expect(parseFoodQuery("150g chicken breast")).toEqual({
      quantity: 150,
      unit: "g",
      name: "chicken breast",
      raw: "150g chicken breast",
      hasQuantity: true,
    });
  });

  it("treats a bare food name as one unnamed portion", () => {
    expect(parseFoodQuery("daal")).toEqual({
      quantity: 1,
      unit: null,
      name: "daal",
      raw: "daal",
      hasQuantity: false,
    });
  });
});

describe("resolvePortion and macrosForGrams", () => {
  it("uses the food's roti and plate weights", () => {
    expect(resolvePortion(roti, parseFoodQuery("2 roti"))).toEqual({
      quantity: 2,
      unit: "roti",
      grams: 80,
      assumed: false,
    });
    expect(macrosForGrams(roti, 80)).toEqual({
      calories: 238,
      protein: 7.2,
      carbs: 39.2,
      fat: 5.6,
    });

    expect(resolvePortion(biryani, parseFoodQuery("1 plate biryani"))).toEqual({
      quantity: 1,
      unit: "plate",
      grams: 350,
      assumed: false,
    });
    expect(macrosForGrams(biryani, 350)).toEqual({
      calories: 613,
      protein: 35,
      carbs: 77,
      fat: 21,
    });
  });

  it("treats a gram quantity as that many grams", () => {
    expect(resolvePortion(chicken, parseFoodQuery("150g chicken breast"))).toEqual({
      quantity: 150,
      unit: "g",
      grams: 150,
      assumed: false,
    });
    expect(macrosForGrams(chicken, 150)).toEqual({
      calories: 248,
      protein: 46.5,
      carbs: 0,
      fat: 5.4,
    });
  });
});
