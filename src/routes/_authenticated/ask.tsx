import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Loader2, Search, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { askQuestion } from "@/lib/ask.functions";
import { flagClass } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/ask")({
  head: () => ({ meta: [{ title: "Ask About Tests — HealthTrace" }, { name: "description", content: "Ask about any blood test or medical term and get a simple explanation." }, { property: "og:title", content: "Ask About Tests — HealthTrace" }, { property: "og:description", content: "Ask about any blood test or medical term and get a simple explanation." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Ask,
});

const EXAMPLES = ["What are Basophils?", "What does high TSH mean?", "Is my hemoglobin normal?", "What is HbA1c?", "What is ESR?"];

type Res = Awaited<ReturnType<typeof askQuestion>>;

function Ask() {
  const ask = useServerFn(askQuestion);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [res, setRes] = useState<Res | null>(null);

  async function submit(question: string) {
    if (!question.trim() || busy) return;
    setQ(question); setBusy(true); setErr(null); setRes(null);
    try { setRes(await ask({ data: { question } })); }
    catch (e) { setErr(e instanceof Error ? e.message : "Something went wrong"); }
    finally { setBusy(false); }
  }
  const a = res?.answer;

  return (
    <>
      <PageHeader title="Ask About Tests" subtitle="Ask about any blood test, medical term or report value. Simple answers — not a diagnosis." />
      <form onSubmit={(e) => { e.preventDefault(); submit(q); }} className="glass flex flex-col gap-2 p-4 sm:flex-row">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. What are Basophils?" maxLength={500} className="flex-1" />
        <Button variant="hero" disabled={busy || !q.trim()}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Ask
        </Button>
      </form>
      <div className="mt-3 flex flex-wrap gap-2">
        {EXAMPLES.map((e) => (
          <button key={e} type="button" onClick={() => submit(e)} className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:bg-accent/60 hover:text-foreground">{e}</button>
        ))}
      </div>

      {busy && <p className="mt-6 text-sm text-muted-foreground">Looking it up…</p>}
      {err && <p className="glass mt-6 p-4 text-sm text-destructive">{err}</p>}

      {a && (
        <div className="animate-in-up mt-6 grid gap-4 lg:grid-cols-2">
          <section className="glass p-6 lg:col-span-2">
            <h2 className="flex items-center gap-2 text-xl font-semibold"><Sparkles className="h-5 w-5 text-primary" />{a.title}</h2>
            <p className="mt-3 leading-relaxed">{a.simple_explanation}</p>
            {a.normal_range && <p className="mt-4 text-sm"><span className="text-muted-foreground">Typical normal range: </span><span className="font-medium text-success">{a.normal_range}</span></p>}
          </section>
          {a.high_reasons.length > 0 && <List title="Reasons it may be high" items={a.high_reasons} cls="text-destructive" />}
          {a.low_reasons.length > 0 && <List title="Reasons it may be low" items={a.low_reasons} cls="text-warning" />}
          {(a.your_results || !!res.matched.length) && (
            <section className="glass p-6 lg:col-span-2">
              <h3 className="font-semibold">From your reports</h3>
              {a.your_results && <p className="mt-2 text-sm leading-relaxed">{a.your_results}</p>}
              <ul className="mt-3 space-y-1 text-sm">
                {res.matched.map((r, i) => (
                  <li key={i} className="flex flex-wrap gap-x-2">
                    <span className="text-muted-foreground">{r.measured_on ?? "Undated"}</span>
                    <span>{r.test_name}:</span>
                    <span className={`font-medium ${flagClass(r.flag)}`}>{r.value_text} {r.unit ?? ""}</span>
                    {r.ref_text && <span className="text-muted-foreground">(range {r.ref_text})</span>}
                  </li>
                ))}
              </ul>
            </section>
          )}
          <section className="glass p-6 lg:col-span-2 text-sm text-muted-foreground"><span className="font-medium text-foreground">When to see a doctor: </span>{a.when_to_see_doctor}</section>
        </div>
      )}
    </>
  );
}

function List({ title, items, cls }: { title: string; items: string[]; cls: string }) {
  return (
    <section className="glass p-6">
      <h3 className={`font-semibold ${cls}`}>{title}</h3>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{items.map((x) => <li key={x}>{x}</li>)}</ul>
    </section>
  );
}
