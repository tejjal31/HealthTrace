import { diffDays } from "./cycle";

/** Commonly documented symptom links for out-of-range markers. Educational only, not diagnosis. */
export const MARKER_SYMPTOMS: { match: RegExp; label: string; low: string[]; high: string[] }[] = [
  { match: /h(a)?emoglobin|\bhb\b/i, label: "Hemoglobin", low: ["fatigue", "dizziness", "shortness of breath", "headache", "pale"], high: ["headache", "dizziness"] },
  { match: /ferritin|\biron\b/i, label: "Iron / Ferritin", low: ["fatigue", "hair loss", "dizziness", "brittle nails", "headache"], high: ["joint pain", "fatigue"] },
  { match: /\btsh\b|thyroid/i, label: "TSH", low: ["anxiety", "palpitations", "weight loss", "irregular periods"], high: ["fatigue", "weight gain", "hair loss", "cold", "irregular periods", "constipation"] },
  { match: /vitamin\s*d|25.?oh/i, label: "Vitamin D", low: ["fatigue", "joint pain", "muscle pain", "low mood"], high: ["nausea"] },
  { match: /b\s*12|cobalamin/i, label: "Vitamin B12", low: ["fatigue", "tingling", "numbness", "dizziness", "low mood"], high: [] },
  { match: /glucose|hba1c|sugar/i, label: "Blood sugar", low: ["dizziness", "shakiness", "headache"], high: ["thirst", "frequent urination", "fatigue", "blurred vision"] },
  { match: /testosterone|androgen|dheas/i, label: "Androgens", low: ["fatigue", "low libido"], high: ["acne", "hair loss", "excess hair", "irregular periods"] },
  { match: /prolactin/i, label: "Prolactin", low: [], high: ["irregular periods", "headache", "breast discharge"] },
  { match: /\bfsh\b|\blh\b/i, label: "LH / FSH", low: ["irregular periods"], high: ["irregular periods", "hot flashes"] },
];

export type Clue = { symptom: string; date: string; severity: number; daysApart: number };

/** Finds logged symptoms matching a marker's known links, within `windowDays` of the result date. */
export function findClues(testName: string, flag: string | null, resultDate: string, symptoms: { name: string; occurred_on: string; severity: number }[], windowDays = 45): { label: string; expected: string[]; clues: Clue[] } | null {
  if (flag !== "high" && flag !== "low") return null;
  const m = MARKER_SYMPTOMS.find((x) => x.match.test(testName));
  if (!m) return null;
  const expected = flag === "high" ? m.high : m.low;
  const clues = symptoms
    .filter((s) => expected.some((e) => s.name.toLowerCase().includes(e) || e.includes(s.name.toLowerCase())))
    .map((s) => ({ symptom: s.name, date: s.occurred_on, severity: s.severity, daysApart: Math.abs(diffDays(resultDate, s.occurred_on)) }))
    .filter((c) => c.daysApart <= windowDays)
    .sort((a, b) => a.daysApart - b.daysApart);
  return { label: m.label, expected, clues };
}
