"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { TrendCard } from "@/components/dance/trend-card";
import { Button } from "@/components/ui/button";
import type { TrendSummary } from "@/lib/pose/types";
import { cn } from "cn";

const OFFSETS = [-2, -1, 0, 1, 2];

export function TrendCarousel({ trends }: { trends: TrendSummary[] }) {
  const [selection, setSelection] = useState({ id: trends[0]?.id, position: 0 });
  const index = Math.max(0, trends.findIndex((trend) => trend.id === selection.id));
  const active = trends[index];
  if (!active) return null;

  const count = trends.length;
  const move = (direction: number) => {
    setSelection(({ id, position }) => {
      const current = Math.max(0, trends.findIndex((trend) => trend.id === id));
      const next = trends[(current + direction + count) % count];
      return { id: next.id, position: position + direction };
    });
  };

  return (
    <div role="group" aria-roledescription="carousel" aria-label="Trending videos" className="flex flex-col gap-4">
      <div className="relative isolate mx-auto grid w-full max-w-4xl justify-items-center overflow-clip py-1 [--slide-step:72%] [--preview-scale:0.42] sm:[--slide-step:95%] sm:[--preview-scale:0.66]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[url('/carousel-flames.webp')] bg-[length:100%_100%] bg-center bg-no-repeat opacity-50 [mask-image:radial-gradient(ellipse_at_center,black_42%,transparent_78%)]"
        />
        {(count === 1 ? [0] : OFFSETS).map((offset) => {
          const trend = trends[(index + offset + count) % count];
          const centered = offset === 0;
          const hidden = Math.abs(offset) > 1 || (count === 2 && offset === -1);
          return (
            <div
              // A key follows the same video from one slot to the next, including at the wrap.
              key={`${selection.position + offset}:${trend.id}`}
              inert={hidden}
              style={{
                translate: `calc(${offset} * var(--slide-step))`,
                scale: centered ? 1 : "var(--preview-scale)",
              }}
              className={cn(
                "relative z-10 col-start-1 row-start-1 w-[52%] min-w-0 max-w-xs motion-safe:transition-[translate,scale,opacity] motion-safe:duration-[440ms] motion-safe:ease-[cubic-bezier(0.22,0.8,0.25,1)]",
                centered && "z-20",
                count === 1 && "w-full",
                hidden && "pointer-events-none opacity-0",
              )}
            >
              <TrendCard trend={trend} onSelect={centered ? undefined : () => move(offset)} />
            </div>
          );
        })}
      </div>
      {count > 1 && (
        <div className="flex justify-center gap-3">
          <Button variant="outline" size="icon-lg" className="size-11 rounded-full" aria-label="Previous video" onClick={() => move(-1)}>
            <ChevronLeft aria-hidden="true" />
          </Button>
          <Button variant="outline" size="icon-lg" className="size-11 rounded-full" aria-label="Next video" onClick={() => move(1)}>
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
      )}
      <p aria-live="polite" className="sr-only">{`${active.title}, video ${index + 1} of ${trends.length}`}</p>
    </div>
  );
}
