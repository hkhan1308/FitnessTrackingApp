export type Sex = "male" | "female";

export type BodyFatInput = {
  sex: Sex | null;
  heightInches: number | null;
  waistInches: number | null;
  neckInches: number | null;
  hipInches: number | null;
};

export function estimateBodyFat(input: BodyFatInput): number | null {
  const { sex, heightInches, waistInches, neckInches, hipInches } = input;
  if (!sex || !heightInches || heightInches <= 0 || !waistInches || !neckInches) {
    return null;
  }

  let value: number;
  if (sex === "male") {
    const base = waistInches - neckInches;
    if (base <= 0) return null;
    value =
      86.01 * Math.log10(base) - 70.041 * Math.log10(heightInches) + 36.76;
  } else {
    if (!hipInches) return null;
    const base = waistInches + hipInches - neckInches;
    if (base <= 0) return null;
    value =
      163.205 * Math.log10(base) -
      97.684 * Math.log10(heightInches) -
      78.387;
  }

  if (!Number.isFinite(value) || value < 2 || value > 70) return null;
  return Math.round(value * 10) / 10;
}

export function bodyFatHint(sex: Sex | null): string {
  if (sex === "female") {
    return "Women’s Navy estimate uses waist, hip, neck, and height.";
  }
  if (sex === "male") {
    return "Men’s Navy estimate uses waist, neck, and height.";
  }
  return "Set sex and height in Settings to estimate body fat.";
}
