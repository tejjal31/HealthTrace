import { describe, expect, it } from "vitest";
import { reportOnlyAnswer } from "@/lib/ask.functions";

describe("Ask About Tests report-only fallback", () => {
  it("explains a test from the user's own report when it isn't in the library", () => {
    const a = reportOnlyAnswer([{ test_name: "Lipase", value_text: "80", unit: "U/L", ref_text: "13-60", flag: "high", measured_on: "2026-10-01" }], "Your latest Lipase was 80 U/L");
    expect(a?.title).toBe("Lipase");
    expect(a?.normal_range).toBe("13-60");
    expect(a?.simple_explanation).toContain("above");
    expect(a?.simple_explanation.toLowerCase()).not.toContain("credit");
  });
  it("returns nothing when no report matches", () => {
    expect(reportOnlyAnswer([], null)).toBeUndefined();
  });
});
