import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { FileText, NotebookPen, Search, Droplet } from "lucide-react";
import { periodsQuery, reportsQuery, resultsQuery, symptomsQuery } from "@/lib/data";
import { PageHeader } from "@/components/AppShell";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/timeline")({
  head: () => ({ meta: [{ title: "Medical timeline — HealthTrace" }, { name: "description", content: "Search everything in your health history." }, { property: "og:title", content: "Medical timeline — HealthTrace" }, { property: "og:description", content: "Search everything in your health history." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Timeline,
});

type Item = { id: string; date: string; kind: "report" | "symptom" | "period"; title: string; detail: string; reportId?: string };

function Timeline() {
  const { data: reports = [] } = useQuery(reportsQuery);
  const { data: results = [] } = useQuery(resultsQuery);
  const { data: symptoms = [] } = useQuery(symptomsQuery);
  const { data: periods = [] } = useQuery(periodsQuery);
  const [q, setQ] = useState("");

  const items = useMemo(() => {
    const all: Item[] = [
      ...reports.map((r) => ({
        id: r.id, kind: "report" as const, reportId: r.id, date: r.report_date ?? r.created_at.slice(0, 10), title: r.title,
        detail: results.filter((x) => x.report_id === r.id).map((x) => `${x.test_name} ${x.value_text ?? ""}${x.unit ? " " + x.unit : ""}`).join(" · "),
      })),
      ...symptoms.map((s) => ({ id: s.id, kind: "symptom" as const, date: s.occurred_on, title: `${s.name} (severity ${s.severity}/5)`, detail: s.notes ?? "" })),
      ...periods.map((p) => ({ id: p.id, kind: "period" as const, date: p.start_date, title: `Period started (${p.flow} flow)`, detail: p.notes ?? "" })),
    ];
    const t = q.toLowerCase().trim();
    return all.filter((i) => !t || `${i.title} ${i.detail} ${i.date}`.toLowerCase().includes(t)).sort((a, b) => b.date.localeCompare(a.date));
  }, [reports, results, symptoms, periods, q]);

  const Icon = { report: FileText, symptom: NotebookPen, period: Droplet };

  return (
    <>
      <PageHeader title="Timeline" subtitle="Reports, test values, symptoms and cycles in one searchable history." />
      <div className="relative mb-8 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search e.g. hemoglobin, headache, 2026-03" className="pl-9" />
      </div>
      {!items.length && <p className="text-muted-foreground">Nothing found.</p>}
      <ol className="relative space-y-4 border-l border-primary/30 pl-6">
        {items.map((i) => {
          const I = Icon[i.kind];
          const body = (
            <div className="glass glass-hover p-4">
              <p className="text-xs text-muted-foreground">{i.date}</p>
              <p className="font-medium">{i.title}</p>
              {i.detail && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{i.detail}</p>}
            </div>
          );
          return (
            <li key={i.kind + i.id} className="relative">
              <span className="absolute -left-[37px] top-4 grid h-6 w-6 place-items-center rounded-full bg-gradient-primary shadow-glow"><I className="h-3 w-3 text-primary-foreground" /></span>
              {i.reportId ? <Link to="/reports/$id" params={{ id: i.reportId }}>{body}</Link> : body}
            </li>
          );
        })}
      </ol>
    </>
  );
}
