import { describe, expect, it } from "vitest";
import { estimateBodyFat } from "../lib/body-fat";

describe("estimateBodyFat", () => {
  it("uses the male Navy formula and rounds to one decimal", () => {
    expect(
      estimateBodyFat({
        sex: "male",
        heightInches: 70,
        waistInches: 36,
        neckInches: 16,
        hipInches: null,
      }),
    ).toBe(19.4);
  });

  it("uses the female Navy formula when hip is present", () => {
    expect(
      estimateBodyFat({
        sex: "female",
        heightInches: 64,
        waistInches: 30,
        neckInches: 13,
        hipInches: 38,
      }),
    ).toBe(29.2);
  });

  it("returns null when a required measurement is missing", () => {
    expect(
      estimateBodyFat({
        sex: "female",
        heightInches: 64,
        waistInches: 30,
        neckInches: 13,
        hipInches: null,
      }),
    ).toBeNull();
    expect(
      estimateBodyFat({
        sex: "male",
        heightInches: 70,
        waistInches: null,
        neckInches: 16,
        hipInches: null,
      }),
    ).toBeNull();
    expect(
      estimateBodyFat({
        sex: null,
        heightInches: 70,
        waistInches: 36,
        neckInches: 16,
        hipInches: null,
      }),
    ).toBeNull();
  });

  it("returns null when the male waist is not larger than the neck", () => {
    expect(
      estimateBodyFat({
        sex: "male",
        heightInches: 70,
        waistInches: 16,
        neckInches: 16,
        hipInches: null,
      }),
    ).toBeNull();
  });
});
