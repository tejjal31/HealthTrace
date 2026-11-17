import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { flagClass, groupByTest, normalizeTest, reportsQuery, resultsQuery } from "@/lib/data";
import { PageHeader } from "@/components/AppShell";
import { TrendChart } from "@/components/TrendChart";
import { ProofLink } from "@/components/ProofLink";

export const Route = createFileRoute("/_authenticated/trends")({
  head: () => ({ meta: [{ title: "Trends & compare — HealthTrace" }, { name: "description", content: "Track markers over time and compare reports." }, { property: "og:title", content: "Trends & compare — HealthTrace" }, { property: "og:description", content: "Track markers over time and compare reports." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Trends,
});

function Trends() {
  const { data: reports = [] } = useQuery(reportsQuery);
  const { data: results = [] } = useQuery(resultsQuery);
  const groups = useMemo(() => groupByTest(results, reports), [results, reports]);
  const [sel, setSel] = useState<string | null>(null);
  const g = groups.find((x) => x.name === sel) ?? groups[0];
  const done = reports.filter((r) => r.status === "done");
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const ra = a || done[1]?.id || "";
  const rb = b || done[0]?.id || "";

  const compare = useMemo(() => {
    const A = results.filter((r) => r.report_id === ra);
    const B = results.filter((r) => r.report_id === rb);
    const keys = [...new Set([...A, ...B].map((r) => normalizeTest(r.test_name)))];
    return keys.map((k) => ({ k, a: A.find((r) => normalizeTest(r.test_name) === k), b: B.find((r) => normalizeTest(r.test_name) === k) }));
  }, [results, ra, rb]);

  if (!groups.length) return <><PageHeader title="Trends" /><p className="text-muted-foreground">Upload reports to see trends.</p></>;

  return (
    <>
      <PageHeader title="Trends" subtitle="Each point links back to the report it came from." />
      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <div className="glass max-h-[460px] space-y-1 overflow-y-auto p-2">
          {groups.map((x) => (
            <button key={x.name} onClick={() => setSel(x.name)} className={`flex w-full justify-between rounded-lg px-3 py-2 text-left text-sm ${g?.name === x.name ? "bg-accent shadow-glow" : "hover:bg-accent/50"}`}>
              <span className="truncate">{x.name}</span><span className="text-xs text-muted-foreground">{x.points.length}</span>
            </button>
          ))}
        </div>
        {g && (
          <section className="glass p-6">
            <h2 className="font-semibold">{g.name} <span className="text-sm font-normal text-muted-foreground">{g.unit}</span></h2>
            <p className="mb-4 text-xs text-muted-foreground">Green band = printed reference range (from the first report that printed one).</p>
            <TrendChart points={g.points} />
            <div className="mt-4 flex flex-wrap gap-2">
              {g.points.map((p) => <ProofLink key={p.id} reportId={p.report_id} date={p.date} value={`${p.value_text} ${p.unit ?? ""}`} />)}
            </div>
            {new Set(g.points.map((p) => p.unit)).size > 1 && (
              <p className="mt-3 text-xs text-warning">Units differ between reports — values may not be directly comparable.</p>
            )}
          </section>
        )}
      </div>

      <h2 className="mb-4 mt-12 text-2xl font-semibold">Compare reports</h2>
      {done.length < 2 ? <p className="text-muted-foreground">You need at least two read reports to compare.</p> : (
        <section className="glass overflow-x-auto p-4">
          <div className="mb-4 flex flex-wrap gap-3">
            {[{ v: ra, set: setA }, { v: rb, set: setB }].map((s, i) => (
              <select key={i} value={s.v} onChange={(e) => s.set(e.target.value)} className="rounded-lg border border-input bg-background px-3 py-2 text-sm">
                {done.map((r) => <option key={r.id} value={r.id}>{(r.report_date ?? r.created_at.slice(0, 10)) + " · " + r.title}</option>)}
              </select>
            ))}
          </div>
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground"><tr><th className="p-2">Test</th><th className="p-2">Report A</th><th className="p-2">Report B</th><th className="p-2">Change</th></tr></thead>
            <tbody>
              {compare.map(({ k, a, b }) => {
                const d = a?.value_num != null && b?.value_num != null && a.unit === b.unit ? b.value_num - a.value_num : null;
                return (
                  <tr key={k} className="border-t border-border">
                    <td className="p-2 font-medium">{(a ?? b)!.test_name}</td>
                    <td className={`p-2 ${flagClass(a?.flag ?? null)}`}>{a ? `${a.value_text} ${a.unit ?? ""}` : "missing"}</td>
                    <td className={`p-2 ${flagClass(b?.flag ?? null)}`}>{b ? `${b.value_text} ${b.unit ?? ""}` : "missing"}</td>
                    <td className="p-2 text-muted-foreground">{d == null ? (a && b && a.unit !== b.unit ? "units differ" : "—") : `${d > 0 ? "+" : ""}${Math.round(d * 100) / 100}`}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}
    </>
  );
}
