import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { FileText, Loader2, UploadCloud } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { analyzeReport } from "@/lib/reports.functions";
import { reportsQuery } from "@/lib/data";
import { friendlyReportError } from "@/lib/reportError";
import { PageHeader } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "Reports — HealthTrace" }, { name: "description", content: "Upload and read your lab reports with AI." }, { property: "og:title", content: "Reports — HealthTrace" }, { property: "og:description", content: "Upload and read your lab reports with AI." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: ReportsPage,
});

const ACCEPT = ["application/pdf", "image/png", "image/jpeg", "image/webp"];

function ReportsPage() {
  const qc = useQueryClient();
  const { data: reports = [], isLoading } = useQuery(reportsQuery);
  const analyze = useServerFn(analyzeReport);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const run = useCallback(async (id: string) => {
    setBusy(id);
    qc.invalidateQueries({ queryKey: ["reports"] });
    try {
      const r = await analyze({ data: { reportId: id } });
      if (r.ok) toast.success(`Found ${r.count} test results`);
      else toast.error("This doesn't look like a lab report");
    } catch (e) {
      toast.error(friendlyReportError(e instanceof Error ? e.message : null));
    } finally {
      setBusy(null);
      qc.invalidateQueries();
    }
  }, [analyze, qc]);

  async function upload(files: FileList | File[]) {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    for (const f of Array.from(files)) {
      if (!ACCEPT.includes(f.type)) { toast.error(`${f.name}: use PDF, PNG, JPG or WEBP`); continue; }
      if (f.size > 15 * 1024 * 1024) { toast.error(`${f.name}: file is over 15 MB`); continue; }
      const path = `${u.user.id}/${crypto.randomUUID()}-${f.name.replace(/[^\w.-]/g, "_")}`;
      const { error: upErr } = await supabase.storage.from("reports").upload(path, f, { contentType: f.type });
      if (upErr) { toast.error(upErr.message); continue; }
      const { data: rep, error } = await supabase
        .from("reports")
        .insert({ user_id: u.user.id, title: f.name, file_path: path, mime_type: f.type })
        .select()
        .single();
      if (error || !rep) { toast.error(error?.message ?? "Could not save"); continue; }
      await run(rep.id);
    }
  }

  return (
    <>
      <PageHeader title="Reports" subtitle="Drop a lab report PDF or photo. AI extracts every test, value, unit, range and date." />
      <label
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); upload(e.dataTransfer.files); }}
        className={`glass glass-hover flex cursor-pointer flex-col items-center justify-center gap-3 border-dashed p-12 text-center ${drag || busy ? "scan-line shadow-glow" : ""}`}
      >
        {busy ? <Loader2 className="h-10 w-10 animate-spin text-primary" /> : <UploadCloud className="h-10 w-10 text-primary" />}
        <p className="font-medium">{busy ? "Scanning your report…" : "Drag & drop reports here, or click to choose"}</p>
        <p className="text-xs text-muted-foreground">PDF, PNG, JPG, WEBP · up to 15 MB · stored privately</p>
        <input type="file" multiple accept={ACCEPT.join(",")} className="sr-only" disabled={!!busy} onChange={(e) => e.target.files && upload(e.target.files)} />
      </label>

      <div className="mt-8 space-y-3">
        {isLoading && <p className="text-muted-foreground">Loading…</p>}
        {!isLoading && !reports.length && <p className="text-muted-foreground">No reports yet. Upload your first one above.</p>}
        {reports.map((r) => (
          <div key={r.id} className={`glass glass-hover flex flex-wrap items-center gap-4 p-4 ${r.status === "processing" || busy === r.id ? "scan-line" : ""}`}>
            <FileText className="h-5 w-5 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <Link to="/reports/$id" params={{ id: r.id }} className="block truncate font-medium hover:text-primary">{r.title}</Link>
              <p className="text-xs text-muted-foreground">
                {r.report_date ? `Report date ${r.report_date}` : `Uploaded ${r.created_at.slice(0, 10)}`}
                {r.lab_name ? ` · ${r.lab_name}` : ""}
              </p>
              {r.status === "error" && busy !== r.id && <p className="mt-1 text-xs text-destructive">{friendlyReportError(r.error)}</p>}
            </div>
            <StatusBadge status={busy === r.id ? "processing" : r.status} />
            {r.status === "error" && busy !== r.id && (
              <button onClick={() => run(r.id)} className="text-xs text-primary hover:underline">Retry</button>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
