"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { DancerPanel } from "@/components/dance/dancer-panel";
import { buttonVariants, Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { getProgress, resetProgress, type TrendProgress } from "@/lib/progress";
import type { TrendData } from "@/lib/pose/types";
import { cn } from "cn";

const SPEEDS = [0.5, 0.75, 1];

export function LearnView({ trend }: { trend: TrendData }) {
  const [moveIndex, setMoveIndex] = useState(0);
  const [speed, setSpeed] = useState(0.75);
  const [mirrored, setMirrored] = useState(true);
  const [progress, setProgress] = useState<TrendProgress | null>(null);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastIndex = trend.moves.length - 1;

  useEffect(() => {
    setProgress(getProgress(trend.id));
  }, [trend.id]);

  useEffect(() => {
    return () => {
      videoRef.current?.pause();
    };
  }, []);

  const handleReset = () => {
    resetProgress(trend.id);
    setProgress(getProgress(trend.id));
    setConfirmingReset(false);
  };

  return (
    <div className="flex flex-wrap items-start gap-8">
      <div className="mx-auto flex w-full max-w-[min(100%,calc(70vh*9/16))] flex-[1_1_22rem] flex-col gap-3 md:mx-0">
        <div className="relative">
          <DancerPanel
            trend={trend}
            range={trend.moves[moveIndex]}
            speed={speed}
            mirrored={mirrored}
            videoRef={videoRef}
          />
          <span className="pointer-events-none absolute top-3.5 left-3.5 rounded-full bg-background/80 px-3 py-2 text-[13px] font-semibold">
            {`Move ${moveIndex + 1} of ${trend.moves.length} · looping`}
          </span>
        </div>
        <p className="text-[13px] text-muted-foreground">The video is darkened so the moves stand out.</p>
      </div>

      <div className="flex min-w-0 flex-[999_1_26rem] flex-col gap-6">
        <section aria-labelledby="moves-title" className="flex flex-col gap-3.5 rounded-[1.25rem] border border-border bg-card p-6">
          <h2 id="moves-title" className="font-heading text-xl font-semibold">
            Moves
          </h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(4.5rem,1fr))] gap-2.5">
            {trend.moves.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Move ${i + 1}`}
                aria-current={i === moveIndex ? "step" : undefined}
                onClick={() => setMoveIndex(i)}
                className={cn(
                  "h-16 rounded-[0.875rem] border bg-muted font-heading text-base font-semibold transition-colors",
                  i === moveIndex
                    ? "border-2 border-primary font-bold text-primary"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="h-12 flex-1 rounded-full"
              disabled={moveIndex === 0}
              onClick={() => setMoveIndex(moveIndex - 1)}
            >
              ← Previous move
            </Button>
            <Button
              variant="outline"
              className="h-12 flex-1 rounded-full"
              disabled={moveIndex === lastIndex}
              onClick={() => setMoveIndex(moveIndex + 1)}
            >
              Next move →
            </Button>
          </div>
        </section>

        <section
          aria-labelledby="playback-title"
          className="flex flex-wrap items-center justify-between gap-4 rounded-[1.25rem] border border-border bg-card p-6"
        >
          <h2 id="playback-title" className="font-heading text-xl font-semibold">
            Playback
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            <ToggleGroup
              aria-label="Speed"
              variant="outline"
              value={[String(speed)]}
              onValueChange={(value) => value[0] && setSpeed(Number(value[0]))}
            >
              {SPEEDS.map((s) => (
                <ToggleGroupItem key={s} value={String(s)}>
                  {s}×
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <Toggle variant="outline" pressed={mirrored} onPressedChange={setMirrored}>
              Mirror
            </Toggle>
          </div>
        </section>

        <section className="flex flex-wrap items-center justify-between gap-5 rounded-[1.25rem] border border-border bg-muted p-7">
          <div className="flex max-w-md flex-col gap-1.5">
            <span className="font-heading text-[22px] font-semibold">Got the moves?</span>
            <span className="leading-relaxed text-muted-foreground">
              Practice with your camera: it checks each move and tells you what to fix.
            </span>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href={`/trends/${trend.id}/practice`} className={cn(buttonVariants(), "h-12 rounded-full px-6")}>
              Practice
            </Link>
            <Link
              href={`/trends/${trend.id}/run`}
              className={cn(buttonVariants({ variant: "outline" }), "h-12 rounded-full px-6")}
            >
              Full run
            </Link>
          </div>
        </section>
      </div>
      <div className="flex flex-col items-center gap-2 pt-2">
        <span className="text-sm font-medium text-muted-foreground">
          {`Best full run: ${progress?.bestRunScore !== null && progress?.bestRunScore !== undefined ? progress.bestRunScore : "–"}`}
        </span>
        {!confirmingReset ? (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive"
            onClick={() => setConfirmingReset(true)}
          >
            Reset progress
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Reset all progress?</span>
            <Button variant="destructive" size="sm" onClick={handleReset}>
              Confirm
            </Button>
            <Button variant="outline" size="sm" onClick={() => setConfirmingReset(false)}>
              Cancel
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
