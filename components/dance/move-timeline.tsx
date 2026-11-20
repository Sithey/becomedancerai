"use client";

import { cn } from "cn";

type MoveTimelineProps = {
  count: number;
  current: number;
  passed?: readonly boolean[];
  onSelect: (index: number) => void;
  layout?: "grid" | "row";
};

export function MoveTimeline({
  count,
  current,
  passed,
  onSelect,
  layout = "row",
}: MoveTimelineProps) {
  return (
    <div
      role="group"
      aria-label="Moves"
      className={
        layout === "grid"
          ? "grid grid-cols-[repeat(auto-fill,minmax(4.5rem,1fr))] gap-2.5"
          : "flex flex-wrap gap-2"
      }
    >
      {Array.from({ length: count }, (_, i) => {
        const isCurrent = i === current;
        const isPassed = passed?.[i] ?? false;
        return (
          <button
            key={i}
            type="button"
            aria-current={isCurrent ? "step" : undefined}
            aria-label={`Move ${i + 1}${isPassed ? ", passed" : ""}${isCurrent ? ", current" : ""}`}
            onClick={() => onSelect(i)}
            className={cn(
              "border font-semibold transition-colors",
              layout === "grid"
                ? "h-16 rounded-[0.875rem] bg-muted font-heading text-base"
                : "flex size-10 items-center justify-center rounded-lg bg-muted text-sm",
              isPassed
                ? "border-transparent bg-primary font-bold text-primary-foreground"
                : isCurrent
                  ? "border-2 border-primary font-bold text-primary"
                  : "border-border text-muted-foreground hover:text-foreground",
              isCurrent && isPassed && "ring-2 ring-ring",
            )}
          >
            {i + 1}
          </button>
        );
      })}
    </div>
  );
}
