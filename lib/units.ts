export type UnitSystem = "us" | "metric";

export const LB_PER_KG = 2.2046226218;
export const CM_PER_IN = 2.54;

export function weightUnit(units: UnitSystem): "lb" | "kg" {
  return units === "metric" ? "kg" : "lb";
}

export function lengthUnit(units: UnitSystem): "in" | "cm" {
  return units === "metric" ? "cm" : "in";
}

export function toDisplayWeight(pounds: number | null, units: UnitSystem): number | null {
  if (pounds == null) return null;
  return units === "metric" ? pounds / LB_PER_KG : pounds;
}

export function fromDisplayWeight(value: number | null, units: UnitSystem): number | null {
  if (value == null) return null;
  const pounds = units === "metric" ? value * LB_PER_KG : value;
  return Math.round(pounds * 100) / 100;
}

export function toDisplayLength(inches: number | null, units: UnitSystem): number | null {
  if (inches == null) return null;
  return units === "metric" ? inches * CM_PER_IN : inches;
}

export function fromDisplayLength(value: number | null, units: UnitSystem): number | null {
  if (value == null) return null;
  const inches = units === "metric" ? value / CM_PER_IN : value;
  return Math.round(inches * 100) / 100;
}

export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function displayText(value: number | null): string {
  if (value == null) return "";
  return String(round1(value));
}
