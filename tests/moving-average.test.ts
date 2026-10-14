import { describe, expect, it } from "vitest";
import { rollingAverages } from "../lib/moving-average";

describe("rollingAverages", () => {
  it("averages the last non-null array values, not calendar days", () => {
    // Phase 8 will change this to a calendar window. Today a null is skipped
    // and does not occupy a slot in the window.
    expect(rollingAverages([10, null, 12], 7)).toEqual([10, null, 11]);
    expect(rollingAverages([1, 2, 3, 4, 5, 6, 7, 8], 7)).toEqual([
      1, 1.5, 2, 2.5, 3, 3.5, 4, 5,
    ]);
  });
});
