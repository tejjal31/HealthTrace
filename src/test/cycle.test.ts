import { describe, expect, it } from "vitest";
import { predictCycle } from "@/lib/cycle";

describe("predictCycle", () => {
  it("returns null with no logs", () => {
    expect(predictCycle([])).toBeNull();
  });
  it("falls back to 28 days, ±7, low confidence with one log", () => {
    const p = predictCycle(["2026-01-01"])!;
    expect(p.nextStart).toBe("2026-01-29");
    expect(p.windowDays).toBe(7);
    expect(p.confidence).toBe("low");
  });
  it("averages regular 30-day cycles", () => {
    const p = predictCycle(["2026-01-01", "2026-01-31", "2026-03-02"])!;
    expect(p.avgCycle).toBe(30);
    expect(p.nextStart).toBe("2026-04-01");
    expect(p.windowDays).toBe(2);
    expect(p.confidence).toBe("medium");
  });
  it("ignores implausible gaps over 60 days", () => {
    const p = predictCycle(["2026-01-01", "2026-05-01"])!;
    expect(p.cyclesUsed).toBe(0);
  });
});
