import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { profileQuery } from "@/lib/data";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile — HealthTrace" }, { name: "description", content: "Your profile and preferences." }, { property: "og:title", content: "Profile — HealthTrace" }, { property: "og:description", content: "Your profile and preferences." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Profile,
});

function Profile() {
  const qc = useQueryClient();
  const { data: p } = useQuery(profileQuery);
  const [f, setF] = useState({ full_name: "", date_of_birth: "", sex: "", language: "en" });
  useEffect(() => {
    if (p) setF({ full_name: p.full_name ?? "", date_of_birth: p.date_of_birth ?? "", sex: p.sex ?? "", language: p.language });
  }, [p]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("profiles").upsert({ id: u.user!.id, full_name: f.full_name || null, date_of_birth: f.date_of_birth || null, sex: f.sex || null, language: f.language });
    if (error) { toast.error(error.message); return; }
    toast.success("Profile saved");
    qc.invalidateQueries({ queryKey: ["profile"] });
  }
  const sel = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm";
  return (
    <>
      <PageHeader title="Profile" />
      <form onSubmit={save} className="glass max-w-lg space-y-4 p-6">
        <div className="space-y-1.5"><Label htmlFor="n">Full name</Label><Input id="n" value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} /></div>
        <div className="space-y-1.5"><Label htmlFor="d">Date of birth</Label><Input id="d" type="date" value={f.date_of_birth} onChange={(e) => setF({ ...f, date_of_birth: e.target.value })} /></div>
        <div className="space-y-1.5"><Label htmlFor="s">Sex</Label>
          <select id="s" className={sel} value={f.sex} onChange={(e) => setF({ ...f, sex: e.target.value })}>
            <option value="">Prefer not to say</option><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option>
          </select></div>
        <div className="space-y-1.5"><Label htmlFor="l">Explanation language</Label>
          <select id="l" className={sel} value={f.language} onChange={(e) => setF({ ...f, language: e.target.value })}>
            <option value="en">English</option><option value="hi">हिंदी</option>
          </select></div>
        <Button variant="hero">Save</Button>
      </form>
    </>
  );
}
