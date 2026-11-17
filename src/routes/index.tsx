import { createFileRoute, Link } from "@tanstack/react-router";
import { FileSearch, LineChart, Languages, ShieldCheck, Link2, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import hero from "@/assets/hero.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HealthTrace — Understand your lab reports with AI" },
      { name: "description", content: "Upload lab reports, extract every value, track trends and get evidence-linked explanations in English and Hindi." },
      { property: "og:title", content: "HealthTrace — Understand your lab reports with AI" },
      { property: "og:description", content: "Evidence-linked AI explanations, trend charts and doctor-ready summaries for your lab reports." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: FileSearch, t: "AI report reading", d: "Drop a PDF or photo. Every test, value, unit, range and date is extracted." },
  { icon: Link2, t: "Show me the proof", d: "Every insight links to the exact report, date and printed value." },
  { icon: LineChart, t: "Trends & comparison", d: "See how each marker moves over time and compare reports side by side." },
  { icon: Languages, t: "English & हिंदी", d: "Plain-language explanations in both languages." },
  { icon: FileDown, t: "Doctor-ready PDF", d: "Download a clean summary to bring to your next visit." },
  { icon: ShieldCheck, t: "Private by design", d: "Your files are stored privately and only visible to you." },
];

function Landing() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between p-6">
        <Logo />
        <Button variant="glass" asChild>
          <Link to="/auth">Sign in</Link>
        </Button>
      </header>
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-12 md:grid-cols-2 md:py-20">
        <div className="animate-in-up">
          <p className="mb-4 inline-flex rounded-full border border-primary/40 px-3 py-1 text-xs text-primary">Evidence-first health intelligence</p>
          <h1 className="text-5xl font-semibold leading-[1.05] md:text-6xl">
            Your lab reports, <span className="text-gradient-ice">finally explained.</span>
          </h1>
          <p className="mt-6 max-w-md text-lg text-muted-foreground">
            HealthTrace reads your reports, tracks every marker over time and shows the proof behind every insight. It never diagnoses.
          </p>
          <div className="mt-8 flex gap-3">
            <Button variant="hero" size="lg" asChild>
              <Link to="/auth">Get started free</Link>
            </Button>
          </div>
        </div>
        <div className="glass relative overflow-hidden p-2 shadow-glow scan-line">
          <img src={hero} alt="Holographic health scan visual" width={1280} height={1024} className="rounded-[calc(var(--radius)-4px)]" />
        </div>
      </section>
      <section className="mx-auto grid max-w-6xl gap-4 px-6 pb-24 sm:grid-cols-2 lg:grid-cols-3">
        {features.map(({ icon: Icon, t, d }, i) => (
          <div key={t} className="glass glass-hover animate-in-up p-6" style={{ animationDelay: `${i * 70}ms` }}>
            <Icon className="h-6 w-6 text-primary" />
            <h3 className="mt-4 font-semibold">{t}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{d}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
