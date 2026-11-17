export type LogKind = { key: string; label: string; unit: string | null; reading: "none" | "one" | "two"; hint?: string };

export const LOG_KINDS: LogKind[] = [
  { key: "blood_pressure", label: "Blood pressure", unit: "mmHg", reading: "two", hint: "Systolic / Diastolic" },
  { key: "blood_sugar", label: "Blood sugar", unit: "mg/dL", reading: "one" },
  { key: "temperature", label: "Fever / Temperature", unit: "°F", reading: "one" },
  { key: "heart_rate", label: "Heart rate", unit: "bpm", reading: "one" },
  { key: "weight", label: "Weight", unit: "kg", reading: "one" },
  { key: "oxygen", label: "Oxygen (SpO₂)", unit: "%", reading: "one" },
  { key: "pain", label: "Pain", unit: null, reading: "none" },
  { key: "other", label: "Other issue", unit: null, reading: "none" },
];

export const kindOf = (k: string): LogKind => LOG_KINDS.find((x) => x.key === k) ?? { key: "other", label: "Other issue", unit: null, reading: "none" };

export function issueDetails(kind: string, notes: string | null) {
  if (kind !== "other" || !notes) return { label: kindOf(kind).label, notes };
  const [label, ...rest] = notes.split(" — ");
  return { label: label || "Other issue", notes: rest.join(" — ") || null };
}

/** Format a reading, e.g. "120/80 mmHg". */
export function formatReading(kind: string, v1: number | null, v2: number | null, unit: string | null) {
  if (v1 == null) return null;
  const k = kindOf(kind);
  const val = k.reading === "two" && v2 != null ? `${v1}/${v2}` : `${v1}`;
  return unit ? `${val} ${unit}` : val;
}

/** Group logs by local day (YYYY-MM-DD), newest day first. */
export function groupByDay<T extends { logged_at: string }>(logs: T[]) {
  const m = new Map<string, T[]>();
  for (const l of [...logs].sort((a, b) => b.logged_at.localeCompare(a.logged_at))) {
    const d = new Date(l.logged_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const entries = m.get(key) ?? [];
    entries.push(l);
    m.set(key, entries);
  }
  return [...m.entries()];
}
