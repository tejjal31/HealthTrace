import { Link } from "@tanstack/react-router";
import { FileSearch } from "lucide-react";

/** "Show me the proof": links an insight to its source report, date and printed value. */
export function ProofLink({ reportId, date, value }: { reportId: string; date: string; value: string }) {
  return (
    <Link
      to="/reports/$id"
      params={{ id: reportId }}
      className="inline-flex items-center gap-1 rounded-full border border-primary/40 px-2 py-0.5 text-xs text-primary hover:shadow-glow"
    >
      <FileSearch className="h-3 w-3" /> Proof: {value} · {date}
    </Link>
  );
}
