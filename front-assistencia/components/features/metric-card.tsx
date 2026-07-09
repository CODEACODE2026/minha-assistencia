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
    <section className="min-w-0 overflow-hidden rounded border bg-card p-4 shadow-subtle">
      <div className="mb-4 flex min-w-0 items-center justify-between gap-3">
        <span className="min-w-0 break-words text-sm font-medium text-muted-foreground">{label}</span>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded bg-red-50 text-primary dark:bg-red-950/40">{icon}</span>
      </div>
      <div className="flex min-w-0 flex-wrap items-end justify-between gap-3">
        <strong className="min-w-0 break-words text-xl font-semibold tracking-tight sm:text-2xl">{value}</strong>
        <Badge tone="success">{change}</Badge>
      </div>
    </section>
  );
}
