import { Area, CartesianGrid, ComposedChart, Line, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { LabResult } from "@/lib/data";

type Pt = LabResult & { date: string };

export function TrendChart({ points, height = 260 }: { points: Pt[]; height?: number }) {
  const data = points.filter((p) => p.value_num != null).map((p) => ({ date: p.date, v: p.value_num, flag: p.flag }));
  const low = points.find((p) => p.ref_low != null)?.ref_low;
  const high = points.find((p) => p.ref_high != null)?.ref_high;
  if (!data.length) return <p className="p-6 text-sm text-muted-foreground">No numeric values to chart.</p>;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 10, right: 16, bottom: 0, left: -10 }}>
        <defs>
          <linearGradient id="tg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.4} />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
        <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} />
        <YAxis stroke="var(--muted-foreground)" fontSize={11} />
        {low != null && high != null && <ReferenceArea y1={low} y2={high} fill="var(--success)" fillOpacity={0.08} stroke="var(--success)" strokeOpacity={0.3} />}
        <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--foreground)" }} />
        <Area type="monotone" dataKey="v" stroke="none" fill="url(#tg)" />
        <Line type="monotone" dataKey="v" name="Value" stroke="var(--chart-1)" strokeWidth={2.5} dot={{ r: 4, fill: "var(--chart-1)" }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
