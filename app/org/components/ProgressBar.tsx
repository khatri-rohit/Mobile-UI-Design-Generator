import { cn } from "@/lib/utils";
import { ProgressBarProps } from "../types";

export function ProgressBar({ current, max }: ProgressBarProps) {
  const pct = Math.min((current / max) * 100, 100);

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">
          {current} / {max} seats
        </span>
        <span className="font-medium pl-2">{pct.toFixed(0)}%</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            pct >= 90
              ? "bg-destructive"
              : pct >= 70
                ? "bg-orange-500"
                : "bg-primary",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
