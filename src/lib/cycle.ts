export type Prediction = {
  nextStart: string;
  windowDays: number;
  avgCycle: number;
  cyclesUsed: number;
  confidence: "low" | "medium" | "high";
  fertileStart: string;
  fertileEnd: string;
};

const DAY = 86400000;
const toDate = (s: string) => new Date(s + "T00:00:00Z");
export const addDays = (s: string, n: number) => new Date(toDate(s).getTime() + n * DAY).toISOString().slice(0, 10);
export const diffDays = (a: string, b: string) => Math.round((toDate(b).getTime() - toDate(a).getTime()) / DAY);

/** Predicts the next period from logged start dates. Cycles outside 15–60 days are ignored.
 * With fewer than 2 valid cycles we fall back to a typical 28-day cycle with low confidence and ±7 days. */
export function predictCycle(startDates: string[]): Prediction | null {
  const starts = [...new Set(startDates)].sort();
  if (!starts.length) return null;
  const cycles: number[] = [];
  for (let i = 1; i < starts.length; i++) {
    const d = diffDays(starts[i - 1]!, starts[i]!);
    if (d >= 15 && d <= 60) cycles.push(d);
  }
  const last = starts[starts.length - 1]!;
  let avg = 28, window = 7, confidence: Prediction["confidence"] = "low";
  if (cycles.length >= 2) {
    avg = cycles.reduce((a, b) => a + b, 0) / cycles.length;
    const sd = Math.sqrt(cycles.reduce((a, b) => a + (b - avg) ** 2, 0) / cycles.length);
    window = Math.max(2, Math.round(sd * 1.5));
    confidence = cycles.length >= 5 && sd <= 3 ? "high" : "medium";
  } else if (cycles.length === 1) {
    avg = cycles[0]!;
    window = 5;
  }
  const rounded = Math.round(avg);
  const nextStart = addDays(last, rounded);
  const ovulation = addDays(nextStart, -14);
  return {
    nextStart,
    windowDays: window,
    avgCycle: Math.round(avg * 10) / 10,
    cyclesUsed: cycles.length,
    confidence,
    fertileStart: addDays(ovulation, -5),
    fertileEnd: addDays(ovulation, 1),
  };
}
