"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { DancerPanel } from "@/components/dance/dancer-panel";
import { DeleteTrendButton } from "@/components/dance/delete-trend-button";
import { MoveTimeline } from "@/components/dance/move-timeline";
import { buttonVariants, Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useTrendProgress } from "@/components/dance/use-trend-progress";
import { resetProgress } from "@/lib/progress";
import type { TrendData } from "@/lib/pose/types";
import { cn } from "cn";

const SPEEDS = [0.5, 0.75, 1];

export function LearnView({ trend }: { trend: TrendData }) {
  const [moveIndex, setMoveIndex] = useState(0);
  const [speed, setSpeed] = useState(0.75);
  const [mirrored, setMirrored] = useState(true);
  const [showPoseGuide, setShowPoseGuide] = useState(false);
  const progress = useTrendProgress(trend.id);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastIndex = trend.moves.length - 1;
  const hasProgress =
    progress.bestRunScore !== null || progress.lastMovePracticed > 0 || Object.keys(progress.moveScores).length > 0;

  const handleReset = () => {
    resetProgress(trend.id);
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
            showPoseGuide={showPoseGuide}
            videoRef={videoRef}
          />
          <span className="pointer-events-none absolute top-3.5 left-3.5 rounded-full bg-background/80 px-3 py-2 text-[13px] font-semibold">
            {`Move ${moveIndex + 1} of ${trend.moves.length} · looping`}
          </span>
        </div>
        {showPoseGuide && (
          <p className="text-[13px] text-muted-foreground">The video is darkened so the moves stand out.</p>
        )}
      </div>

      <div className="flex min-w-0 flex-[999_1_26rem] flex-col gap-6">
        <section aria-labelledby="moves-title" className="flex flex-col gap-3.5 rounded-[1.25rem] border border-border bg-card p-6">
          <h2 id="moves-title" className="font-heading text-xl font-semibold">
            Moves
          </h2>
          <MoveTimeline
            layout="grid"
            count={trend.moves.length}
            current={moveIndex}
            onSelect={setMoveIndex}
          />
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
            <Toggle variant="outline" pressed={showPoseGuide} onPressedChange={setShowPoseGuide}>
              Pose guide
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

        <section
          aria-labelledby="progress-title"
          className="flex flex-wrap items-center justify-between gap-4 rounded-[1.25rem] border border-border bg-card p-6"
        >
          <div className="flex flex-col gap-1">
            <h2 id="progress-title" className="font-heading text-xl font-semibold">
              Your progress
            </h2>
            <span className="text-muted-foreground">
              {progress.bestRunScore === null
                ? "No full run yet."
                : `Best full run: ${progress.bestRunScore}${
                    progress.firstRunScore !== null && progress.firstRunScore !== progress.bestRunScore
                      ? ` · first try ${progress.firstRunScore}`
                      : ""
                  }`}
            </span>
          </div>
          {hasProgress &&
            (confirmingReset ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">Reset all progress?</span>
                <Button variant="destructive" onClick={handleReset}>
                  Reset
                </Button>
                <Button variant="outline" onClick={() => setConfirmingReset(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Button variant="outline" className="rounded-full" onClick={() => setConfirmingReset(true)}>
                Reset progress
              </Button>
            ))}
        </section>
      </div>

      <div className="basis-full border-t border-border pt-6">
        <DeleteTrendButton id={trend.id} title={trend.title} />
      </div>
    </div>
  );
}
