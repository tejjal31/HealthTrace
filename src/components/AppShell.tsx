import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Activity, FileText, LayoutDashboard, LineChart, LogOut, NotebookPen, Clock, User, Search, Heart } from "lucide-react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "./Logo";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/reports", label: "Reports", icon: FileText },
  { to: "/trends", label: "Trends", icon: LineChart },
  { to: "/timeline", label: "Timeline", icon: Clock },
  { to: "/journal", label: "Health Journal", icon: NotebookPen },
  { to: "/ask", label: "Ask About Tests", icon: Search },
  { to: "/women", label: "Women's Health", icon: Heart },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }
  return (
    <div className="min-h-screen md:flex">
      <aside className="glass sticky top-0 z-20 m-0 flex items-center gap-2 overflow-x-auto rounded-none border-x-0 border-t-0 p-3 md:m-4 md:h-[calc(100vh-2rem)] md:w-60 md:flex-col md:items-stretch md:rounded-[var(--radius)] md:border md:p-5">
        <Link to="/dashboard" className="mr-2 shrink-0 md:mb-8 md:mr-0">
          <Logo />
        </Link>
        <nav className="flex gap-1 md:flex-col">
          {nav.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="flex shrink-0 items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
              activeProps={{ className: "bg-accent text-foreground shadow-glow" }}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{label}</span>
            </Link>
          ))}
        </nav>
        <div className="ml-auto md:ml-0 md:mt-auto">
          <p className="mb-3 hidden text-xs leading-relaxed text-muted-foreground md:block">
            <Activity className="mr-1 inline h-3 w-3 text-primary" />
            HealthTrace explains your reports. It does not diagnose. Always consult a doctor.
          </p>
          <button
            onClick={signOut}
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-accent/60 hover:text-foreground"
          >
            <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </aside>
      <main className="mx-auto w-full max-w-6xl flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="animate-in-up mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-semibold md:text-4xl">{title}</h1>
        {subtitle && <p className="mt-2 text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
