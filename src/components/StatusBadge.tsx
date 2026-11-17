import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

export function StatusBadge({ status }: { status: string }) {
  if (status === "done") return <span className="inline-flex items-center gap-1 text-xs text-success"><CheckCircle2 className="h-3 w-3" /> Read</span>;
  if (status === "error") return <span className="inline-flex items-center gap-1 text-xs text-destructive"><AlertTriangle className="h-3 w-3" /> Failed</span>;
  return <span className="inline-flex items-center gap-1 text-xs text-primary"><Loader2 className="h-3 w-3 animate-spin" /> Scanning</span>;
}

