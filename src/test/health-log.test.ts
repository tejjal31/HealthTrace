import { describe, expect, it } from "vitest";
import { formatReading, groupByDay, issueDetails } from "@/lib/healthLog";

describe("health journal", () => {
  it("retains a custom issue name separately from its notes", () => {
    expect(issueDetails("other", "Headache — After lunch")).toEqual({ label: "Headache", notes: "After lunch" });
  });
  it("supports an optional reading and user-entered unit for other issues", () => {
    expect(formatReading("other", 7, null, "hours")).toBe("7 hours");
    expect(formatReading("other", null, null, null)).toBeNull();
  });
  it("formats blood pressure as systolic/diastolic", () => {
    expect(formatReading("blood_pressure", 120, 80, "mmHg")).toBe("120/80 mmHg");
  });
  it("groups entries per day, newest first", () => {
    const g = groupByDay([
      { logged_at: new Date(2026, 0, 1, 9).toISOString() },
      { logged_at: new Date(2026, 0, 2, 9).toISOString() },
      { logged_at: new Date(2026, 0, 1, 20).toISOString() },
    ]);
    expect(g.map(([d, l]) => [d, l.length])).toEqual([["2026-01-02", 1], ["2026-01-01", 2]]);
  });
});
