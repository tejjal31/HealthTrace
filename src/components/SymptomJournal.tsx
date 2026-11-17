import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { symptomsQuery } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function SymptomJournal({ category = "general", suggestions = [] as string[] }) {
  const qc = useQueryClient();
  const { data: all = [] } = useQuery(symptomsQuery);
  const list = all.filter((s) => (category === "general" ? true : s.category === category));
  const [name, setName] = useState("");
  const [severity, setSeverity] = useState(3);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("symptoms").insert({ user_id: u.user!.id, name: name.trim(), severity, occurred_on: date, notes: notes || null, category });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setName(""); setNotes("");
    toast.success("Symptom logged");
    qc.invalidateQueries({ queryKey: ["symptoms"] });
  }
  async function del(id: string) {
    await supabase.from("symptoms").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["symptoms"] });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <form onSubmit={add} className="glass space-y-3 p-6">
        <h2 className="font-semibold">Log a symptom</h2>
        <Input placeholder="Symptom (e.g. fatigue)" value={name} onChange={(e) => setName(e.target.value)} list={`sugg-${category}`} required />
        <datalist id={`sugg-${category}`}>{suggestions.map((s) => <option key={s} value={s} />)}</datalist>
        <label className="block text-sm">Severity: {severity}/5
          <input type="range" min={1} max={5} value={severity} onChange={(e) => setSeverity(+e.target.value)} className="w-full accent-primary" />
        </label>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <Textarea placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <Button variant="hero" className="w-full" disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
      </form>
      <div className="space-y-2">
        {!list.length && <p className="text-muted-foreground">No symptoms logged yet.</p>}
        {list.map((s) => (
          <div key={s.id} className="glass glass-hover flex items-start gap-3 p-4">
            <div className="flex-1">
              <p className="font-medium">{s.name} <span className="text-sm text-muted-foreground">· {s.severity}/5 · {s.occurred_on}</span></p>
              {s.notes && <p className="text-sm text-muted-foreground">{s.notes}</p>}
            </div>
            <button onClick={() => del(s.id)} aria-label="Delete" className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
