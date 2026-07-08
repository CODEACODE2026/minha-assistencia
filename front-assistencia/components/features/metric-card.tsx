import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";

export function MetricCard({
  label,
  value,
  change,
  icon
}: {
  label: string;
  value: string;
  change: string;
  icon: ReactNode;
}) {
  return (
    <section className="rounded border bg-card p-4 shadow-subtle">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <span className="grid h-9 w-9 place-items-center rounded bg-red-50 text-primary dark:bg-red-950/40">{icon}</span>
      </div>
      <div className="flex items-end justify-between gap-3">
        <strong className="text-2xl font-semibold tracking-tight">{value}</strong>
        <Badge tone="success">{change}</Badge>
      </div>
    </section>
  );
}
