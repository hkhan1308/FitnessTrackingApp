import { describe, expect, it } from "vitest";
import { addDays, endOfMonth, endOfWeek, startOfMonth, startOfWeek } from "../lib/dates";

describe("calendar bounds", () => {
  it("starts the week on Monday and ends it on Sunday", () => {
    expect(startOfWeek("2026-10-05")).toBe("2026-10-05");
    expect(startOfWeek("2026-10-08")).toBe("2026-10-05");
    expect(startOfWeek("2026-10-11")).toBe("2026-10-05");
    expect(endOfWeek("2026-10-08")).toBe("2026-10-11");
  });

  it("uses the first and last calendar day of the month", () => {
    expect(startOfMonth("2026-01-31")).toBe("2026-01-01");
    expect(endOfMonth("2026-01-31")).toBe("2026-01-31");
    expect(endOfMonth("2026-02-01")).toBe("2026-02-28");
  });

  it("crosses a month boundary in either direction", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
});
