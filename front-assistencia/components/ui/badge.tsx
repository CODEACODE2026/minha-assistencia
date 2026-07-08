import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BadgeTone = "default" | "success" | "warning" | "danger" | "info";

const tones: Record<BadgeTone, string> = {
  default: "bg-muted text-foreground",
  success: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200",
  warning: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-200",
  danger: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-200",
  info: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100"
};

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
};

export function Badge({ className, tone = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn("inline-flex h-6 items-center rounded px-2 text-xs font-semibold", tones[tone], className)}
      {...props}
    />
  );
}
