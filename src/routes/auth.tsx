import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — HealthTrace" },
      { name: "description", content: "Sign in or create your HealthTrace account." },
      { property: "og:title", content: "Sign in — HealthTrace" },
      { property: "og:description", content: "Access your private health reports and trends." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => data.session && navigate({ to: "/dashboard" }));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => s && navigate({ to: "/dashboard" }));
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "up") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/dashboard", data: { full_name: name } },
        });
        if (error) throw error;
        setSent(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }


  async function oauth() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin + "/auth",
      },
    });

    if (error) {
      toast.error(error.message);
    }
  }


  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="glass animate-in-up w-full max-w-md p-8 shadow-glow">
        <Logo />
        <h1 className="mt-6 text-2xl font-semibold">{mode === "in" ? "Welcome back" : "Create your account"}</h1>
        {sent ? (
          <p className="mt-4 text-muted-foreground">Check your email to confirm your account, then sign in.</p>
        ) : (
          <>
            <form onSubmit={submit} className="mt-6 space-y-4">
              {mode === "up" && (
                <div className="space-y-1.5">
                  <Label htmlFor="name">Full name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pw">Password</Label>
                <Input id="pw" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <Button type="submit" variant="hero" className="w-full" disabled={busy}>
                {busy ? "Please wait…" : mode === "in" ? "Sign in" : "Create account"}
              </Button>
            </form>
            <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
              <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
            </div>

            <div className="space-y-2">
              <Button
                variant="glass"
                className="w-full"
                onClick={() => oauth()}
              >
                Continue with Google
              </Button>
            </div>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              {mode === "in" ? "New here?" : "Already have an account?"}{" "}
              <button className="text-primary hover:underline" onClick={() => setMode(mode === "in" ? "up" : "in")}>
                {mode === "in" ? "Create an account" : "Sign in"}
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
