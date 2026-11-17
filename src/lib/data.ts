import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Report = Tables<"reports">;
export type LabResult = Tables<"lab_results">;
export type Symptom = Tables<"symptoms">;
export type Profile = Tables<"profiles">;

/** Keep trend and timeline dates aligned with the edited report date. */
export async function saveReportDate(reportId: string, date: string) {
  const parsed = new Date(`${date}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
    throw new Error("Choose a valid report date");
  }
  const { data, error } = await supabase.from("reports").update({ report_date: date }).eq("id", reportId).select("id").single();
  if (error || !data) throw new Error(error?.message ?? "Could not update report date");
  const { error: resultsError } = await supabase.from("lab_results").update({ measured_on: date }).eq("report_id", reportId);
  if (resultsError) throw new Error("Report date saved, but result dates could not be updated. Please save again.");
}

const must = <T,>(r: { data: T | null; error: { message: string } | null }) => {
  if (r.error) throw new Error(r.error.message);
  return r.data as T;
};

export const reportsQuery = queryOptions({
  queryKey: ["reports"],
  queryFn: async () =>
    must(await supabase.from("reports").select("*").order("created_at", { ascending: false })) as Report[],
});

export const resultsQuery = queryOptions({
  queryKey: ["lab_results"],
  queryFn: async () =>
    must(await supabase.from("lab_results").select("*").order("measured_on", { ascending: true })) as LabResult[],
});

export const symptomsQuery = queryOptions({
  queryKey: ["symptoms"],
  queryFn: async () =>
    must(await supabase.from("symptoms").select("*").order("occurred_on", { ascending: false })) as Symptom[],
});

export const profileQuery = queryOptions({
  queryKey: ["profile"],
  queryFn: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return null;
    return must(await supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle()) as Profile | null;
  },
});

/** Effective date of a result: printed report date, else upload date. */
export function resultDate(r: LabResult, reports: Report[]) {
  if (r.measured_on) return r.measured_on;
  const rep = reports.find((x) => x.id === r.report_id);
  return (rep?.created_at ?? r.created_at).slice(0, 10);
}

export function normalizeTest(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/** Group results by normalized test name, sorted oldest first. */
export function groupByTest(results: LabResult[], reports: Report[]) {
  const map = new Map<string, { name: string; unit: string | null; points: (LabResult & { date: string })[] }>();
  for (const r of results) {
    const k = normalizeTest(r.test_name);
    if (!map.has(k)) map.set(k, { name: r.test_name, unit: r.unit, points: [] });
    map.get(k)!.points.push({ ...r, date: resultDate(r, reports) });
  }
  for (const g of map.values()) g.points.sort((a, b) => a.date.localeCompare(b.date));
  return [...map.values()].sort((a, b) => b.points.length - a.points.length || a.name.localeCompare(b.name));
}

export type PeriodLog = Tables<"period_logs">;
export const periodsQuery = queryOptions({
  queryKey: ["period_logs"],
  queryFn: async () =>
    must(await supabase.from("period_logs").select("*").order("start_date", { ascending: false })) as PeriodLog[],
});

export const flagClass = (f: string | null) =>
  f === "high" ? "text-destructive" : f === "low" ? "text-warning" : f === "normal" ? "text-success" : "text-muted-foreground";
