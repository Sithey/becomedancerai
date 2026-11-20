"use client";

import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { PASS_SCORE } from "@/lib/pose/config";
import { isPassed } from "@/lib/pose/scoring";
import { resultSummary, type SessionResult } from "@/lib/result-summary";
import { cn } from "cn";

type Props = {
  trendId: string;
  mode: "moves" | "full";
  result: SessionResult;
  retryScore: { index: number; score: number | null } | null;
  onRestart: () => void;
  onRetry: (index: number) => void;
};

const RING_RADIUS = 104;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

function scoreLabel(score: number | null): string {
  return score === null ? "–" : String(score);
}

export function RunResult({ trendId, mode, result: { final, parts }, retryScore, onRestart, onRetry }: Props) {
  const isFull = mode === "full";
  const unit = isFull ? "Part" : "Move";
  const summary = resultSummary(parts.map(({ score }) => score));
  const filled = ((final ?? 0) / 100) * RING_LENGTH;

  return (
    <div className="flex flex-wrap items-stretch gap-8">
      <section
        aria-labelledby="final-score"
        className="flex flex-[1_1_22rem] flex-col items-center justify-center gap-5 rounded-[1.75rem] border border-border bg-card px-5 sm:px-8 py-10 text-center"
      >
        <h2 id="final-score" className={isFull
          ? "text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase"
          : "font-heading text-[26px] font-semibold"}>
          {isFull ? "Final score" : "Practice complete"}
        </h2>
        {isFull && <div className="relative size-60">
          <svg viewBox="0 0 240 240" aria-hidden="true" className="size-60">
            <circle cx="120" cy="120" r={RING_RADIUS} fill="none" strokeWidth="16" className="stroke-muted" />
            <circle
              cx="120"
              cy="120"
              r={RING_RADIUS}
              fill="none"
              strokeWidth="16"
              strokeLinecap="round"
              strokeDasharray={`${filled} ${RING_LENGTH}`}
              transform="rotate(-90 120 120)"
              className="stroke-primary"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
            <span className="font-heading text-[84px] leading-none font-bold tracking-tighter tabular-nums">
              {scoreLabel(final)}
            </span>
            <span className="text-sm text-muted-foreground">out of 100</span>
          </div>
        </div>}
        {isFull && (
          <>
            <p className="font-heading text-[26px] font-semibold">{summary.title}</p>
            <p className="max-w-xs leading-relaxed text-muted-foreground">{summary.detail}</p>
          </>
        )}
        <div className="flex flex-wrap justify-center gap-3">
          <Button className="h-12 rounded-full px-6" onClick={onRestart}>
            {isFull ? "Try again" : "Practice again"}
          </Button>
          <Link
            href={isFull ? `/trends/${trendId}` : `/trends/${trendId}/run`}
            className={cn(buttonVariants({ variant: "outline" }), "h-12 rounded-full px-6")}
          >
            {isFull ? "Back to Learn" : "Full Run"}
          </Link>
        </div>
      </section>

      <section
        aria-labelledby="parts-title"
        className="flex min-w-0 flex-[999_1_28rem] flex-col gap-4 rounded-[1.75rem] border border-border bg-card p-8"
      >
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="parts-title" className="font-heading text-[22px] font-semibold">
            {isFull ? "Part by part" : "Move results"}
          </h2>
          <span className="text-sm text-muted-foreground">{`Pass at ${PASS_SCORE}`}</span>
        </div>
        <ul className="flex flex-col gap-3.5">
          {parts.map(({ score, correction }, i) => {
            const passed = isPassed(score);
            return (
              <li key={i} className="flex flex-col gap-2.5 rounded-[1.125rem] bg-muted p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="font-heading text-[17px] font-semibold">{`${unit} ${i + 1}`}</span>
                  <span className={cn("text-sm", passed ? "text-primary" : "text-muted-foreground")}>
                    {score === null ? "No score" : `${score}/100 · ${passed ? "Passed" : "Needs practice"}`}
                  </span>
                </div>
                <div aria-hidden="true" className="h-2.5 rounded-full bg-foreground/10">
                  <div
                    className={cn("h-2.5 rounded-full transition-all", passed ? "bg-primary" : "bg-destructive")}
                    style={{ width: `${score ?? 0}%` }}
                  />
                </div>
                {retryScore?.index === i && (
                  <p role="status" className="text-sm text-muted-foreground">
                    {retryScore.score === null ? "Retry: no score. Stay in frame and try again." : `Retry score: ${retryScore.score}/100`}
                  </p>
                )}
                {!passed && (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    {correction && <p className="text-sm">{correction.tip ?? correction.problem}</p>}
                    <Button variant="outline" onClick={() => onRetry(i)}>
                      {`Practice ${unit.toLowerCase()} ${i + 1}`}
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
