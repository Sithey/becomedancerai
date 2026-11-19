"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { DancerPanel } from "@/components/dance/dancer-panel";
import { buttonVariants, Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { TrendData } from "@/lib/pose/types";

const SPEEDS = [0.5, 0.75, 1];

export function LearnView({ trend }: { trend: TrendData }) {
  const [moveIndex, setMoveIndex] = useState(0);
  const [speed, setSpeed] = useState(0.75);
  const [mirrored, setMirrored] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastIndex = trend.moves.length - 1;

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
    </div>
  );
}
