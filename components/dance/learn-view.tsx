"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { DancerPanel } from "@/components/dance/dancer-panel";
import { buttonVariants, Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { getProgress, resetProgress, type TrendProgress } from "@/lib/progress";
import type { TrendData } from "@/lib/pose/types";

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
    <div className="flex flex-col items-center gap-6">
      <div className="w-full max-w-[min(100%,calc(70vh*9/16))]">
        <DancerPanel
          trend={trend}
          range={trend.moves[moveIndex]}
          speed={speed}
          mirrored={mirrored}
          videoRef={videoRef}
        />
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button variant="outline" disabled={moveIndex === 0} onClick={() => setMoveIndex(moveIndex - 1)}>
          Previous
        </Button>
        <span className="text-sm text-muted-foreground">
          {`Move ${moveIndex + 1} of ${trend.moves.length}`}
        </span>
        <Button variant="outline" disabled={moveIndex === lastIndex} onClick={() => setMoveIndex(moveIndex + 1)}>
          Next
        </Button>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <ToggleGroup
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
      <div className="flex gap-3">
        <Link href={`/trends/${trend.id}/practice`} className={buttonVariants()}>
          Practice
        </Link>
        <Link href={`/trends/${trend.id}/run`} className={buttonVariants({ variant: "secondary" })}>
          Full run
        </Link>
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
