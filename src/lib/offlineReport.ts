/**
 * Reads lab results from the text layer of a PDF without AI.
 * Only values literally printed on the page are used — nothing is guessed.
 */
export type TextItem = { page: number; str: string; x: number; y: number };

export type OfflineTest = {
  test_name: string;
  value_text: string;
  value_num: number | null;
  unit: string | null;
  ref_low: number | null;
  ref_high: number | null;
  ref_text: string | null;
  flag: "low" | "normal" | "high" | "unknown";
};

export type OfflineReport = {
  report_date: string | null;
  lab_name: string | null;
  tests: OfflineTest[];
  summary_en: string;
  summary_hi: string;
};

const ROW_TOL = 6;
const NUM = /^[<>≤≥]?\s*-?\d+(?:[.,]\d+)?$/;
const SKIP_NAME = /^(note|page|comment|interpretation|method|sample|specimen|test name|investigation|remarks?|clinical|\*|-{3,}|\||\(|:)/i;

export function parseRange(ref: string | null): { low: number | null; high: number | null } {
  if (!ref) return { low: null, high: null };
  const t = ref.replace(/,/g, "").trim();
  const between = t.match(/(-?\d+(?:\.\d+)?)\s*(?:-|–|to)\s*(-?\d+(?:\.\d+)?)/i);
  if (between) return { low: Number(between[1]), high: Number(between[2]) };
  const lt = t.match(/^(?:<|≤|<=|upto|up to|less than)\s*(\d+(?:\.\d+)?)/i);
  if (lt) return { low: null, high: Number(lt[1]) };
  const gt = t.match(/^(?:>|≥|>=|more than|greater than)\s*(\d+(?:\.\d+)?)/i);
  if (gt) return { low: Number(gt[1]), high: null };
  return { low: null, high: null };
}

export function flagFor(value: number | null, low: number | null, high: number | null): OfflineTest["flag"] {
  if (value === null || (low === null && high === null)) return "unknown";
  if (low !== null && value < low) return "low";
  if (high !== null && value > high) return "high";
  return "normal";
}

function toNum(s: string): number | null {
  const m = s.replace(/,/g, "").match(/^[<>≤≥]?\s*(-?\d+(?:\.\d+)?)$/);
  return m ? Number(m[1]) : null;
}

function buildTest(name: string, value: string, unit: string | null, ref: string | null): OfflineTest {
  const value_num = toNum(value);
  const { low, high } = parseRange(ref);
  return {
    test_name: name.replace(/\s+/g, " ").trim(),
    value_text: value.trim(),
    value_num,
    unit: unit?.trim() || null,
    ref_low: low,
    ref_high: high,
    ref_text: ref?.trim() || null,
    flag: flagFor(value_num, low, high),
  };
}

type Cols = { result: number; unit: number | null; ref: number | null; headerY: number };

function findHeader(items: TextItem[]): Cols | null {
  const name = items.find((i) => /^(test name|test description|investigation|parameter|test)$/i.test(i.str.trim()));
  if (!name) return null;
  const row = items.filter((i) => Math.abs(i.y - name.y) <= ROW_TOL && i.x > name.x);
  const result = row.find((i) => /^(results?|values?|observed value|observation)$/i.test(i.str.trim()));
  if (!result) return null;
  const unit = row.find((i) => /^units?$/i.test(i.str.trim()));
  const ref = row.find((i) => /(ref|range|interval|normal)/i.test(i.str));
  return { result: result.x, unit: unit?.x ?? null, ref: ref?.x ?? null, headerY: name.y };
}

/** Column-based reading: works for lab PDFs with a "Test | Result | Unit | Range" table. */
function parseTable(items: TextItem[], cols: Cols): OfflineTest[] {
  const body = items.filter((i) => i.y < cols.headerY - 3);
  const names = body.filter((i) => i.x < cols.result - 8 && !SKIP_NAME.test(i.str.trim()) && /[a-z]/i.test(i.str) && i.str.trim().length <= 70);
  const out: OfflineTest[] = [];
  for (const n of names) {
    const row = body.filter((i) => i !== n && Math.abs(i.y - n.y) <= ROW_TOL && i.x >= cols.result - 8);
    const colOf = (x: number) =>
      cols.ref !== null && x >= cols.ref - 8 ? "ref" : cols.unit !== null && x >= cols.unit - 8 ? "unit" : "result";
    const result = row.filter((i) => colOf(i.x) === "result").map((i) => i.str.trim()).join(" ").trim();
    if (!result || result.length > 25) continue;
    if (!NUM.test(result) && !/^[a-z0-9+\-/ ]{1,20}$/i.test(result)) continue;
    const unit = row.filter((i) => colOf(i.x) === "unit").map((i) => i.str.trim()).join(" ") || null;
    const ref = row.filter((i) => colOf(i.x) === "ref").map((i) => i.str.trim()).join(" ") || null;
    out.push(buildTest(n.str, result, unit, ref));
  }
  return out;
}

const LINE = /^([A-Za-z][A-Za-z0-9 ,()/%.:;'\-]{1,60}?)\s+([<>]?\d+(?:\.\d+)?)\s+([A-Za-zµ%/^0-9.*]+(?:\/[A-Za-z0-9.^]+)?)?\s*((?:-?\d+(?:\.\d+)?\s*(?:-|–|to)\s*\d+(?:\.\d+)?)|(?:[<>≤≥]\s*\d+(?:\.\d+)?))$/;

/** Line-based reading for PDFs without a recognisable table header. Requires a printed range. */
function parseLines(items: TextItem[]): OfflineTest[] {
  const rows = new Map<number, TextItem[]>();
  for (const i of items) {
    const key = [...rows.keys()].find((k) => Math.abs(k - i.y) <= 3) ?? i.y;
    rows.set(key, [...(rows.get(key) ?? []), i]);
  }
  const out: OfflineTest[] = [];
  for (const r of rows.values()) {
    const line = r.sort((a, b) => a.x - b.x).map((i) => i.str.trim()).join(" ").replace(/\s+/g, " ").trim();
    const m = line.match(LINE);
    if (m && !SKIP_NAME.test(m[1])) out.push(buildTest(m[1], m[2], m[3] ?? null, m[4]));
  }
  return out;
}

export function findReportDate(text: string): string | null {
  const iso = text.match(/(?:collected|reported|report date|sample date|registered)[^0-9]{0,20}(\d{4})-(\d{2})-(\d{2})/i);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const m = text.match(/(?:collected|reported|report date|sample date|registered|date)[^0-9]{0,20}(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/i);
  if (!m) return null;
  const d = Number(m[1]), mo = Number(m[2]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return `${m[3]}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

const LABS: [RegExp, string][] = [
  [/lal\s?path\s?labs|lalpathlabs/i, "Dr Lal PathLabs"],
  [/thyrocare/i, "Thyrocare"],
  [/metropolis/i, "Metropolis Healthcare"],
  [/\bsrl\b/i, "SRL Diagnostics"],
  [/apollo/i, "Apollo Diagnostics"],
  [/redcliffe/i, "Redcliffe Labs"],
  [/neuberg/i, "Neuberg Diagnostics"],
  [/healthians/i, "Healthians"],
  [/tata\s?1mg/i, "Tata 1mg Labs"],
  [/max\s?lab/i, "Max Lab"],
];

function summarize(tests: OfflineTest[]) {
  const out = tests.filter((t) => t.flag === "high" || t.flag === "low");
  const list = out.slice(0, 8).map((t) => `${t.test_name} ${t.value_text}${t.unit ? ` ${t.unit}` : ""} (${t.flag})`).join(", ");
  const listHi = out.slice(0, 8).map((t) => `${t.test_name} ${t.value_text}${t.unit ? ` ${t.unit}` : ""} (${t.flag === "high" ? "अधिक" : "कम"})`).join(", ");
  const summary_en = out.length
    ? `We read ${tests.length} test results from this report. ${out.length} ${out.length === 1 ? "is" : "are"} outside the range printed on the report: ${list}. The rest are within range. This is not a diagnosis — please discuss these results with your doctor.`
    : `We read ${tests.length} test results from this report. All values with a printed range are within that range. This is not a diagnosis — please discuss your results with your doctor.`;
  const summary_hi = out.length
    ? `इस रिपोर्ट से ${tests.length} जाँच परिणाम पढ़े गए। इनमें से ${out.length} रिपोर्ट में दी गई सामान्य सीमा से बाहर हैं: ${listHi}। बाकी सीमा के अंदर हैं। यह निदान नहीं है — कृपया अपने डॉक्टर से इन परिणामों पर बात करें।`
    : `इस रिपोर्ट से ${tests.length} जाँच परिणाम पढ़े गए। जिन मानों की सीमा दी गई है, वे सभी सीमा के अंदर हैं। यह निदान नहीं है — कृपया अपने डॉक्टर से बात करें।`;
  return { summary_en, summary_hi };
}

export function parseReportText(items: TextItem[]): OfflineReport {
  const pages = [...new Set(items.map((i) => i.page))];
  let tests: OfflineTest[] = [];
  for (const p of pages) {
    const pageItems = items.filter((i) => i.page === p);
    const cols = findHeader(pageItems);
    const found = cols ? parseTable(pageItems, cols) : [];
    tests.push(...(found.length ? found : parseLines(pageItems)));
  }
  // Drop exact duplicates (same name and value printed twice).
  const seen = new Set<string>();
  tests = tests.filter((t) => {
    const k = `${t.test_name.toLowerCase()}|${t.value_text}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  const text = items.map((i) => i.str).join(" ");
  const lab = LABS.find(([re]) => re.test(text));
  return { report_date: findReportDate(text), lab_name: lab ? lab[1] : null, tests, ...summarize(tests) };
}
