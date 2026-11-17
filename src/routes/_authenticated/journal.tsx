import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LOG_KINDS, formatReading, groupByDay, kindOf, issueDetails } from "@/lib/healthLog";

type Log = Tables<"health_logs">;

const logsQuery = queryOptions({
  queryKey: ["health_logs"],
  queryFn: async () => {
    const { data, error } = await supabase.from("health_logs").select("*").order("logged_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data as Log[];
  },
});

export const Route = createFileRoute("/_authenticated/journal")({
  head: () => ({ meta: [{ title: "Health Journal — HealthTrace" }, { name: "description", content: "Record blood pressure, sugar, fever, pain and more, and track changes over time." }, { property: "og:title", content: "Health Journal — HealthTrace" }, { property: "og:description", content: "Record blood pressure, sugar, fever, pain and more, and track changes over time." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Journal,
});

const pad = (n: number) => String(n).padStart(2, "0");
const nowLocal = () => { const d = new Date(); return { date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, time: `${pad(d.getHours())}:${pad(d.getMinutes())}` }; };

function Journal() {
  const qc = useQueryClient();
  const { data: logs = [] } = useQuery(logsQuery);
  const [kind, setKind] = useState("blood_pressure");
  const [title, setTitle] = useState("");
  const [{ date, time }, setDT] = useState(nowLocal);
  const [v1, setV1] = useState("");
  const [v2, setV2] = useState("");
  const [customUnit, setCustomUnit] = useState("");
  const [severity, setSeverity] = useState(3);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [chartKind, setChartKind] = useState("blood_pressure");
  const [filter, setFilter] = useState("all");
  const k = kindOf(kind);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (k.reading !== "none" && !v1) { toast.error("Enter a reading"); return; }
    if (kind === "other" && !title.trim()) { toast.error("Describe the issue"); return; }
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setBusy(false); toast.error("Please sign in again"); return; }
    const { error } = await supabase.from("health_logs").insert({
      user_id: u.user.id,
      kind,
      logged_at: new Date(`${date}T${time}`).toISOString(),
      value_num: (k.reading !== "none" || kind === "other") && v1 ? Number(v1) : null,
      value2_num: k.reading === "two" && v2 ? Number(v2) : null,
      unit: kind === "other" ? customUnit.trim() || null : k.unit,
      severity,
      notes: [kind === "other" ? title.trim() : "", notes.trim()].filter(Boolean).join(" — ") || null,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setV1(""); setV2(""); setCustomUnit(""); setNotes(""); setTitle(""); setDT(nowLocal());
    toast.success("Entry saved");
    setChartKind(kind);
    qc.invalidateQueries({ queryKey: ["health_logs"] });
  }
  async function del(id: string) {
    const { error } = await supabase.from("health_logs").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["health_logs"] });
  }

  const ck = kindOf(chartKind);
  const chartData = useMemo(
    () => logs.filter((l) => l.kind === chartKind).sort((a, b) => a.logged_at.localeCompare(b.logged_at)).map((l) => ({
      t: new Date(l.logged_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
      v: ck.reading === "none" ? l.severity : l.value_num != null ? Number(l.value_num) : null,
      v2: l.value2_num != null ? Number(l.value2_num) : null,
    })),
    [logs, chartKind, ck.reading],
  );
  const days = groupByDay(filter === "all" ? logs : logs.filter((l) => l.kind === filter));

  return (
    <>
      <PageHeader title="Health Journal" subtitle="Record readings and health issues, then watch how they change over time." />
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <form onSubmit={add} className="glass h-fit space-y-3 p-6">
          <h2 className="font-semibold">New entry</h2>
          <select aria-label="Entry type" value={kind} onChange={(e) => { setKind(e.target.value); setV1(""); setV2(""); setCustomUnit(""); }} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
            {LOG_KINDS.map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}
          </select>
          {kind === "other" && <>
            <label className="block text-sm">Issue name<Input aria-label="Issue name" placeholder="e.g. Headache or cough" value={title} onChange={(e) => setTitle(e.target.value)} required /></label>
            <div className="grid grid-cols-2 gap-2">
              <Input aria-label="Optional reading" type="number" step="any" inputMode="decimal" placeholder="Reading (optional)" value={v1} onChange={(e) => setV1(e.target.value)} />
              <Input aria-label="Reading unit" placeholder="Unit (optional)" value={customUnit} onChange={(e) => setCustomUnit(e.target.value)} />
            </div>
          </>}
          <div className="grid grid-cols-2 gap-2">
            <Input type="date" value={date} onChange={(e) => setDT({ date: e.target.value, time })} required />
            <Input type="time" value={time} onChange={(e) => setDT({ date, time: e.target.value })} required />
          </div>
          {k.reading !== "none" && (
            <div className="flex items-center gap-2">
              <Input type="number" step="any" inputMode="decimal" placeholder={k.reading === "two" ? "Systolic" : "Reading"} value={v1} onChange={(e) => setV1(e.target.value)} />
              {k.reading === "two" && <><span>/</span><Input type="number" step="any" inputMode="decimal" placeholder="Diastolic" value={v2} onChange={(e) => setV2(e.target.value)} /></>}
              <span className="shrink-0 text-sm text-muted-foreground">{k.unit}</span>
            </div>
          )}
          <label className="block text-sm">Severity: {severity}/5
            <input type="range" min={1} max={5} value={severity} onChange={(e) => setSeverity(+e.target.value)} className="w-full accent-primary" />
          </label>
          <Textarea placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <Button variant="hero" className="w-full" disabled={busy}>{busy ? "Saving…" : "Save entry"}</Button>
        </form>

        <div className="min-w-0 space-y-6">
          <section className="glass p-4 sm:p-6">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold">{ck.label} over time {ck.reading === "none" ? "(severity)" : ck.unit ? `(${ck.unit})` : ""}</h2>
              <select value={chartKind} onChange={(e) => setChartKind(e.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
                {LOG_KINDS.map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}
              </select>
            </div>
            {chartData.length < 1 ? <p className="py-10 text-center text-sm text-muted-foreground">No {ck.label.toLowerCase()} entries yet.</p> : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={chartData} margin={{ top: 10, right: 12, bottom: 0, left: -16 }}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                  <XAxis dataKey="t" stroke="var(--muted-foreground)" fontSize={10} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} domain={["auto", "auto"]} />
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--foreground)" }} />
                  <Line type="monotone" dataKey="v" name={ck.reading === "two" ? "Systolic" : ck.reading === "none" ? "Severity" : "Reading"} stroke="var(--chart-1)" strokeWidth={2.5} dot={{ r: 4 }} connectNulls />
                  {ck.reading === "two" && <Line type="monotone" dataKey="v2" name="Diastolic" stroke="var(--chart-2)" strokeWidth={2.5} dot={{ r: 4 }} connectNulls />}
                </LineChart>
              </ResponsiveContainer>
            )}
          </section>

          <section>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold">Daily history</h2>
              <select value={filter} onChange={(e) => setFilter(e.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
                <option value="all">All types</option>
                {LOG_KINDS.map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}
              </select>
            </div>
            {!days.length && <p className="text-muted-foreground">No entries yet.</p>}
            <div className="space-y-4">
              {days.map(([day, items]) => (
                <div key={day}>
                  <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">{new Date(`${day}T00:00`).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</p>
                  <div className="space-y-2">
                    {items.map((l) => {
                      const details = issueDetails(l.kind, l.notes);
                      const r = formatReading(l.kind, l.value_num != null ? Number(l.value_num) : null, l.value2_num != null ? Number(l.value2_num) : null, l.unit);
                      return (
                        <div key={l.id} className="glass glass-hover flex items-start gap-3 p-4">
                          <div className="min-w-0 flex-1">
                            <p className="break-words font-medium">{details.label}{r && <span className="text-primary"> · {r}</span>}</p>
                            <p className="text-sm text-muted-foreground">{new Date(l.logged_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}{l.severity != null && ` · severity ${l.severity}/5`}</p>
                            {details.notes && <p className="mt-1 break-words text-sm">{details.notes}</p>}
                          </div>
                          <Button type="button" variant="ghost" size="icon" onClick={() => del(l.id)} aria-label="Delete entry" className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
