import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Download, ExternalLink, Pencil, Save, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { flagClass, reportsQuery, resultsQuery, saveReportDate } from "@/lib/data";
import { downloadPdf } from "@/lib/pdf";
import { friendlyReportError } from "@/lib/reportError";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/StatusBadge";

export const Route = createFileRoute("/_authenticated/reports_/$id")({
  head: () => ({ meta: [{ title: "Report — HealthTrace" }, { name: "description", content: "Review lab values, edit your report date and download your doctor summary." }, { property: "og:title", content: "Report — HealthTrace" }, { property: "og:description", content: "Review lab values, edit your report date and download your doctor summary." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: ReportDetail,
});

function ReportDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: reports = [] } = useQuery(reportsQuery);
  const { data: results = [] } = useQuery(resultsQuery);
  const [lang, setLang] = useState<"en" | "hi">("en");
  const [url, setUrl] = useState<string | null>(null);
  const [editingDate, setEditingDate] = useState(false);
  const [dateDraft, setDateDraft] = useState("");
  const [savingDate, setSavingDate] = useState(false);
  const report = reports.find((r) => r.id === id);
  const rows = results.filter((r) => r.report_id === id);

  useEffect(() => {
    if (!report) return;
    supabase.storage.from("reports").createSignedUrl(report.file_path, 600).then(({ data }) => setUrl(data?.signedUrl ?? null));
  }, [report]);

  if (!report) return <p className="text-muted-foreground">Loading report…</p>;
  const issues = (report.issues as string[]) ?? [];
  const date = report.report_date ?? report.created_at.slice(0, 10);

  async function saveDate() {
    if (!report || !dateDraft || savingDate) return;
    setSavingDate(true);
    try {
      await saveReportDate(report.id, dateDraft);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["reports"] }),
        qc.invalidateQueries({ queryKey: ["lab_results"] }),
      ]);
      setEditingDate(false);
      toast.success("Report date updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update report date");
    } finally {
      setSavingDate(false);
    }
  }

  async function remove() {
    if (!report || !confirm("Delete this report and its values?")) return;
    await supabase.storage.from("reports").remove([report.file_path]);
    await supabase.from("reports").delete().eq("id", report.id);
    qc.invalidateQueries();
    navigate({ to: "/reports" });
  }

  function pdf() {
    if (!report) return;
    downloadPdf("HealthTrace report summary", `${report.title} · ${date}${report.lab_name ? " · " + report.lab_name : ""}`, [
      { heading: "Results", lines: rows.map((r) => `${r.test_name}: ${r.value_text ?? ""} ${r.unit ?? ""}  (ref ${r.ref_text ?? "not printed"})  [${r.flag}]`) },
      { heading: "Plain-language explanation", lines: [report.summary_en ?? "Not available"] },
      { heading: "Data quality notes", lines: issues.length ? issues : ["None detected"] },
    ], `healthtrace-${date}.pdf`);
  }

  return (
    <div className="animate-in-up">
      <Link to="/reports" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="h-4 w-4" /> Reports</Link>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="break-words text-3xl font-semibold">{report.title}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {editingDate ? (
              <form className="flex flex-wrap items-center gap-2" onSubmit={(e) => { e.preventDefault(); void saveDate(); }}>
                <label htmlFor="report-date">Report date</label>
                <Input id="report-date" type="date" required value={dateDraft} onChange={(e) => setDateDraft(e.target.value)} disabled={savingDate} className="w-auto" />
                <Button type="submit" size="sm" disabled={savingDate || !dateDraft}><Save />{savingDate ? "Saving…" : "Save"}</Button>
                <Button type="button" variant="ghost" size="icon" aria-label="Cancel date edit" title="Cancel date edit" disabled={savingDate} onClick={() => setEditingDate(false)}><X /></Button>
              </form>
            ) : (
              <>
                <span>{report.report_date ? `Report date ${report.report_date}` : `No report date · uploaded ${date}`}</span>
                <Button variant="ghost" size="icon" aria-label="Edit report date" title="Edit report date" disabled={report.status === "processing"} onClick={() => { setDateDraft(date); setEditingDate(true); }}><Pencil /></Button>
              </>
            )}
            {report.lab_name && <span>· {report.lab_name}</span>}
          </div>
          <div className="mt-2"><StatusBadge status={report.status} /></div>
        </div>
        <div className="flex gap-2">
          {url && <Button variant="glass" asChild><a href={url} target="_blank" rel="noreferrer"><ExternalLink /> Original</a></Button>}
          <Button variant="hero" onClick={pdf} disabled={report.status !== "done"}><Download /> Doctor PDF</Button>
          <Button variant="ghost" size="icon" onClick={remove} aria-label="Delete report"><Trash2 /></Button>
        </div>
      </div>

      {report.status === "error" && <p className="glass mb-6 p-4 text-destructive">{friendlyReportError(report.error)}</p>}

      {report.summary_en && (
        <section className="glass mb-6 p-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">What this report shows</h2>
            <div className="glass flex rounded-full p-1 text-xs">
              {(["en", "hi"] as const).map((l) => (
                <button key={l} onClick={() => setLang(l)} className={`rounded-full px-3 py-1 ${lang === l ? "bg-gradient-primary text-primary-foreground" : ""}`}>{l === "en" ? "English" : "हिंदी"}</button>
              ))}
            </div>
          </div>
          <p className="leading-relaxed">{lang === "en" ? report.summary_en : report.summary_hi}</p>
          <p className="mt-3 text-xs text-muted-foreground">AI explanation, not a diagnosis. Discuss results with your doctor.</p>
        </section>
      )}

      <section className="glass overflow-x-auto p-2">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground">
            <tr><th className="p-3">Test</th><th className="p-3">Value</th><th className="p-3">Unit</th><th className="p-3">Reference (as printed)</th><th className="p-3">Flag</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="p-3 font-medium">{r.test_name}</td>
                <td className="p-3">{r.value_text}</td>
                <td className="p-3 text-muted-foreground">{r.unit ?? "—"}</td>
                <td className="p-3 text-muted-foreground">{r.ref_text ?? "not printed"}</td>
                <td className={`p-3 capitalize ${flagClass(r.flag)}`}>{r.flag}</td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No values extracted.</td></tr>}
          </tbody>
        </table>
      </section>
    </div>
  );
}
