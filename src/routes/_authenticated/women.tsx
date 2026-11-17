import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Download, Heart, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { SymptomJournal } from "@/components/SymptomJournal";
import { TrendChart } from "@/components/TrendChart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { groupByTest, periodsQuery, reportsQuery, resultsQuery, symptomsQuery } from "@/lib/data";
import { addDays, diffDays, predictCycle } from "@/lib/cycle";
import { downloadPdf } from "@/lib/pdf";
import uterus from "@/assets/uterus.jpg";
import ovary from "@/assets/ovary.jpg";

export const Route = createFileRoute("/_authenticated/women")({
  head: () => ({ meta: [{ title: "Women's Health — HealthTrace" }, { name: "description", content: "Track your cycle, hormones and PCOS-related symptoms." }, { property: "og:title", content: "Women's Health — HealthTrace" }, { property: "og:description", content: "Track your cycle, hormones and PCOS-related symptoms." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Women,
});

const HORMONE = /\b(lh|fsh|estradiol|estrogen|progesterone|testosterone|amh|prolactin|tsh|dheas?)\b/i;
const today = () => new Date().toISOString().slice(0, 10);

function Women() {
  useEffect(() => {
    document.documentElement.dataset["theme"] = "women";
    return () => { delete document.documentElement.dataset["theme"]; };
  }, []);
  const qc = useQueryClient();
  const { data: periods = [] } = useQuery(periodsQuery);
  const { data: reports = [] } = useQuery(reportsQuery);
  const { data: results = [] } = useQuery(resultsQuery);
  const { data: symptoms = [] } = useQuery(symptomsQuery);
  const pred = predictCycle(periods.map((p) => p.start_date));
  const hormones = groupByTest(results.filter((r) => HORMONE.test(r.test_name)), reports);
  const [start, setStart] = useState(today());
  const [end, setEnd] = useState("");
  const [flow, setFlow] = useState("medium");

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("period_logs").insert({ user_id: u.user!.id, start_date: start, end_date: end || null, flow });
    if (error) { toast.error(error.message); return; }
    toast.success("Period logged");
    qc.invalidateQueries({ queryKey: ["period_logs"] });
  }
  async function del(id: string) {
    await supabase.from("period_logs").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["period_logs"] });
  }

  function summary() {
    const sorted = [...periods].sort((a, b) => a.start_date.localeCompare(b.start_date));
    const lens = sorted.slice(1).map((p, i) => diffDays(sorted[i]!.start_date, p.start_date));
    const ws = symptoms.filter((s) => s.category === "women");
    downloadPdf("Cycle & hormone summary", `Prepared ${today()} for doctor visit`, [
      { heading: "Cycle", lines: pred ? [`Average cycle: ${pred.avgCycle} days from ${pred.cyclesUsed} cycles`, `Cycle lengths: ${lens.join(", ") || "n/a"}`, `Next period estimate: ${pred.nextStart} (±${pred.windowDays} days, ${pred.confidence} confidence)`] : ["No periods logged"] },
      { heading: "Recent periods", lines: [...periods].slice(0, 12).map((p) => `${p.start_date}${p.end_date ? " to " + p.end_date : ""} · ${p.flow} flow`) },
      { heading: "Hormone results", lines: hormones.flatMap((g) => g.points.map((p) => `${g.name}: ${p.value_text ?? ""} ${p.unit ?? ""} on ${p.date} (${p.flag ?? "no flag"}, ref ${p.ref_text ?? "n/a"})`)) },
      { heading: "Symptoms", lines: ws.slice(0, 30).map((s) => `${s.occurred_on} · ${s.name} ${s.severity}/5${s.notes ? " — " + s.notes : ""}`) },
    ], `cycle-summary-${today()}.pdf`);
  }

  return (
    <>
      <PageHeader title="Women's Health" subtitle="Your cycle, hormones and symptoms in one place." action={<Button variant="hero" onClick={summary}><Download /> Doctor summary PDF</Button>} />

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="glass p-6 lg:col-span-2">
          <h2 className="flex items-center gap-2 font-semibold"><Heart className="h-4 w-4 animate-heartbeat text-primary" /> Next period estimate</h2>
          {!pred ? <p className="mt-2 text-muted-foreground">Log your last period to see an estimate.</p> : (
            <>
              <p className="mt-3 text-4xl font-semibold text-gradient-ice">{pred.nextStart}</p>
              <p className="text-sm text-muted-foreground">Likely between {addDays(pred.nextStart, -pred.windowDays)} and {addDays(pred.nextStart, pred.windowDays)} · <span className="capitalize">{pred.confidence}</span> confidence · avg {pred.avgCycle} days from {pred.cyclesUsed} cycle(s)</p>
              <p className="mt-2 text-sm">Estimated fertile window: {pred.fertileStart} → {pred.fertileEnd}</p>
              <p className="mt-2 text-xs text-muted-foreground">Estimates only. Not reliable for contraception. More logs improve accuracy.</p>
              <CycleStrip periods={periods.map((p) => ({ s: p.start_date, e: p.end_date }))} nextStart={pred.nextStart} window={pred.windowDays} fertile={[pred.fertileStart, pred.fertileEnd]} />
            </>
          )}
        </section>
        <form onSubmit={add} className="glass space-y-3 p-6">
          <h2 className="font-semibold">Log a period</h2>
          <label className="block text-sm">Start<Input type="date" value={start} onChange={(e) => setStart(e.target.value)} required /></label>
          <label className="block text-sm">End (optional)<Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></label>
          <div className="flex gap-1">
            {["light", "medium", "heavy"].map((f) => (
              <button type="button" key={f} onClick={() => setFlow(f)} className={`flex-1 rounded-xl border px-2 py-1 text-sm capitalize ${flow === f ? "border-primary bg-accent" : "border-border text-muted-foreground"}`}>{f}</button>
            ))}
          </div>
          <Button variant="hero" className="w-full">Save</Button>
          <ul className="max-h-48 space-y-1 overflow-auto text-sm">
            {periods.map((p) => (
              <li key={p.id} className="flex items-center justify-between">
                <span>{p.start_date}{p.end_date ? ` → ${p.end_date}` : ""} · {p.flow}</span>
                <button type="button" onClick={() => del(p.id)} aria-label="Delete" className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
              </li>
            ))}
          </ul>
        </form>
      </div>

      <section className="glass mt-6 p-6">
        <h2 className="font-semibold">Hormone results</h2>
        {!hormones.length ? <p className="mt-2 text-sm text-muted-foreground">No hormone tests (LH, FSH, estradiol, progesterone, testosterone, AMH, prolactin, TSH) found in your reports yet.</p> : (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {hormones.map((g) => (
              <div key={g.name}>
                <p className="text-sm font-medium">{g.name} <span className="text-muted-foreground">{g.unit}</span></p>
                <TrendChart points={g.points} height={180} />
              </div>
            ))}
          </div>
        )}
      </section>

      <h2 className="mb-3 mt-8 text-xl font-semibold">Cycle symptoms</h2>
      <SymptomJournal category="women" suggestions={["Cramps", "Bloating", "Acne", "Mood swings", "Breast tenderness", "Irregular periods", "Excess hair", "Hair loss", "Fatigue", "Heavy bleeding"]} />

      <section className="mt-8 grid gap-6 md:grid-cols-2">
        <article className="glass overflow-hidden">
          <img src={ovary} alt="Illustration of ovaries" className="h-48 w-full object-cover" loading="lazy" />
          <div className="p-6">
            <h3 className="font-semibold">Understanding PCOS</h3>
            <p className="mt-2 text-sm text-muted-foreground">Polycystic ovary syndrome is a common hormonal condition. Doctors usually look for two of three signs: irregular or missed periods, signs of higher androgens (acne, excess hair, scalp hair thinning, or high testosterone on a test), and many small follicles on ultrasound.</p>
            <p className="mt-2 text-sm text-muted-foreground">Tests often requested: LH and FSH, testosterone, AMH, prolactin, TSH, fasting glucose or HbA1c, and lipids.</p>
          </div>
        </article>
        <article className="glass overflow-hidden">
          <img src={uterus} alt="Illustration of the uterus" className="h-48 w-full object-cover" loading="lazy" />
          <div className="p-6">
            <h3 className="font-semibold">Your cycle phases</h3>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li><b className="text-foreground">Period (days 1–5):</b> hormones are low, lining sheds.</li>
              <li><b className="text-foreground">Follicular:</b> FSH rises, estrogen climbs.</li>
              <li><b className="text-foreground">Ovulation (~day 14):</b> LH surges and an egg is released.</li>
              <li><b className="text-foreground">Luteal:</b> progesterone rises; PMS symptoms may appear.</li>
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">See a doctor for cycles under 21 or over 35 days, very heavy bleeding, or no period for 3 months.</p>
          </div>
        </article>
      </section>
    </>
  );
}

function CycleStrip({ periods, nextStart, window, fertile }: { periods: { s: string; e: string | null }[]; nextStart: string; window: number; fertile: [string, string] }) {
  const from = addDays(today(), -14);
  const days = Array.from({ length: 56 }, (_, i) => addDays(from, i));
  const inPeriod = (d: string) => periods.some((p) => d >= p.s && d <= (p.e ?? addDays(p.s, 4)));
  return (
    <div className="mt-5">
      <div className="grid grid-cols-14 gap-1" style={{ gridTemplateColumns: "repeat(14, minmax(0, 1fr))" }}>
        {days.map((d) => {
          const predicted = Math.abs(diffDays(nextStart, d)) <= window;
          const cls = inPeriod(d) ? "bg-primary" : d === nextStart ? "bg-primary/70 shadow-glow" : predicted ? "bg-primary/25" : d >= fertile[0] && d <= fertile[1] ? "bg-chart-2/40" : "bg-muted/40";
          return <div key={d} title={d} className={`aspect-square rounded-md text-[10px] leading-none ${cls} ${d === today() ? "ring-2 ring-ring" : ""} flex items-center justify-center text-muted-foreground`}>{+d.slice(8)}</div>;
        })}
      </div>
      <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span><i className="mr-1 inline-block h-2 w-2 rounded bg-primary" />Period</span>
        <span><i className="mr-1 inline-block h-2 w-2 rounded bg-primary/25" />Predicted range</span>
        <span><i className="mr-1 inline-block h-2 w-2 rounded bg-chart-2/40" />Fertile window</span>
      </div>
    </div>
  );
}
