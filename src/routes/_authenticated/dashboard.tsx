import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FileText, FlaskConical, HeartPulse, NotebookPen, UploadCloud } from "lucide-react";
import { flagClass, groupByTest, profileQuery, reportsQuery, resultsQuery, symptomsQuery } from "@/lib/data";
import { PageHeader } from "@/components/AppShell";
import { ProofLink } from "@/components/ProofLink";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — HealthTrace" }, { name: "description", content: "Your health overview." }, { property: "og:title", content: "Dashboard — HealthTrace" }, { property: "og:description", content: "Your health overview." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { data: profile } = useQuery(profileQuery);
  const { data: reports = [] } = useQuery(reportsQuery);
  const { data: results = [] } = useQuery(resultsQuery);
  const { data: symptoms = [] } = useQuery(symptomsQuery);
  const groups = groupByTest(results, reports);
  const flagged = groups
    .map((g) => ({ g, last: g.points[g.points.length - 1]! }))
    .filter(({ last }) => last.flag === "high" || last.flag === "low");

  const stats = [
    { icon: FileText, label: "Reports", v: reports.length },
    { icon: FlaskConical, label: "Tests tracked", v: groups.length },
    { icon: HeartPulse, label: "Out of range (latest)", v: flagged.length },
    { icon: NotebookPen, label: "Symptoms logged", v: symptoms.length },
  ];

  return (
    <>
      <PageHeader
        title={`Hello${profile?.full_name ? ", " + profile.full_name.split(" ")[0] : ""}`}
        subtitle="Here's what your reports say — with proof for every point."
        action={<Button variant="hero" asChild><Link to="/reports"><UploadCloud /> Upload report</Link></Button>}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ icon: Icon, label, v }, i) => (
          <div key={label} className="glass glass-hover animate-in-up p-5" style={{ animationDelay: `${i * 60}ms` }}>
            <Icon className="h-5 w-5 text-primary" />
            <p className="mt-3 text-3xl font-semibold text-gradient-ice">{v}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="glass p-6">
          <h2 className="mb-4 font-semibold">Needs attention</h2>
          {!flagged.length && <p className="text-sm text-muted-foreground">No latest values are outside their printed reference range.</p>}
          <ul className="space-y-3">
            {flagged.slice(0, 8).map(({ g, last }) => (
              <li key={g.name} className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  <span className="font-medium">{g.name}</span>{" "}
                  <span className={`text-sm capitalize ${flagClass(last.flag)}`}>{last.flag}</span>
                  <span className="block text-xs text-muted-foreground">Reference: {last.ref_text ?? "not printed"}</span>
                </span>
                <ProofLink reportId={last.report_id} date={last.date} value={`${last.value_text} ${last.unit ?? ""}`} />
              </li>
            ))}
          </ul>
        </section>
        <section className="glass p-6">
          <h2 className="mb-4 font-semibold">Recent reports</h2>
          {!reports.length && <p className="text-sm text-muted-foreground">Upload a report to get started.</p>}
          <ul className="space-y-2">
            {reports.slice(0, 6).map((r) => (
              <li key={r.id}>
                <Link to="/reports/$id" params={{ id: r.id }} className="flex justify-between rounded-lg p-2 hover:bg-accent/50">
                  <span className="truncate">{r.title}</span>
                  <span className="text-xs text-muted-foreground">{r.report_date ?? r.created_at.slice(0, 10)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
