import { describe, expect, it } from "vitest";
import { findClues } from "@/lib/detective";

const sym = [
  { name: "Fatigue", occurred_on: "2026-03-10", severity: 4 },
  { name: "Fatigue", occurred_on: "2026-08-01", severity: 2 },
  { name: "Acne", occurred_on: "2026-03-05", severity: 3 },
];

describe("findClues", () => {
  it("ignores normal results", () => {
    expect(findClues("Ferritin", "normal", "2026-03-01", sym)).toBeNull();
  });
  it("links low ferritin to fatigue within 45 days only", () => {
    const r = findClues("Serum Ferritin", "low", "2026-03-01", sym)!;
    expect(r.clues.map((c) => c.date)).toEqual(["2026-03-10"]);
  });
  it("does not link acne to low ferritin", () => {
    const r = findClues("Ferritin", "low", "2026-03-01", sym)!;
    expect(r.clues.some((c) => c.symptom === "Acne")).toBe(false);
  });
});
