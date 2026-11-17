import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { glossaryAnswer } from "./testGlossary";
import type { AskAnswer } from "./ai/ask.server";

type MatchedRow = { test_name: string; value_text: string | null; unit: string | null; ref_text: string | null; flag: string | null; measured_on: string | null };

/** When a test isn't in the library but appears in the user's reports, explain using their own values. */
export function reportOnlyAnswer(matched: MatchedRow[], summary: string | null): AskAnswer | undefined {
  const latest = matched[0];
  if (!latest) return undefined;
  const status = latest.flag === "high" ? "above" : latest.flag === "low" ? "below" : latest.flag === "normal" ? "within" : null;
  return {
    is_health_question: true,
    title: latest.test_name,
    simple_explanation: `${latest.test_name} is one of the tests in your reports.${status ? ` Your latest value is ${status} the range printed on your report.` : ""} Your report's own range is the best guide, because normal ranges differ between labs.`,
    normal_range: latest.ref_text,
    high_reasons: [],
    low_reasons: [],
    your_results: summary,
    when_to_see_doctor: "Ask your doctor what this result means for you, especially if it is outside the range or changing over time.",
  };
}

export const askQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { question: string }) => {
    const q = String(input?.question ?? "").trim();
    if (!q || q.length > 500) throw new Error("Please ask a question under 500 characters.");
    return { question: q };
  })
  .handler(async ({ data, context }) => {
    const { data: rows } = await context.supabase
      .from("lab_results")
      .select("test_name,value_text,unit,ref_text,flag,measured_on")
      .order("measured_on", { ascending: false })
      .limit(150);
    const words = data.question.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2);
    const relevant = (rows ?? []).filter((r) => words.some((w) => r.test_name.toLowerCase().includes(w)));
    const matched = relevant.slice(0, 20);
    const ctx = matched
      .map((r) => `${r.measured_on ?? "undated"}: ${r.test_name} = ${r.value_text} ${r.unit ?? ""} (range ${r.ref_text ?? "n/a"}, ${r.flag})`)
      .join("\n");
    const { askAboutTest } = await import("./ai/ask.server");
    try {
      const answer = await askAboutTest(data.question, ctx);
      return { answer, matched, source: "ai" as const, notice: null as string | null };
    } catch (e) {
      // Keep the technical reason in server logs only; users get a friendly answer.
      console.error("Ask About Tests AI unavailable:", e instanceof Error ? e.message : e);
      const latest = matched[0];
      const summary = latest
        ? `Your latest ${latest.test_name} was ${latest.value_text} ${latest.unit ?? ""} on ${latest.measured_on ?? "an undated report"}${latest.ref_text ? ` (report range ${latest.ref_text})` : ""}.`
        : null;
      const answer = glossaryAnswer(data.question, summary) ?? reportOnlyAnswer(matched, summary);
      if (!answer) {
        throw new Error("We don't have an explanation for this yet. Try the test's full name or short form, like \"FSH\", \"Hemoglobin\", \"TSH\", \"HbA1c\" or \"Vitamin D\".");
      }
      return { answer, matched, source: "library" as const, notice: null };
    }
  });
