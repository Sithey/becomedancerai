"use client";

import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { PASS_SCORE } from "@/lib/pose/config";
import { resultSummary } from "@/lib/result-summary";
import { cn } from "cn";

type Props = {
  trendId: string;
  final: number | null;
  parts: (number | null)[];
  onRestart: () => void;
};

const RING_RADIUS = 104;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

function scoreLabel(score: number | null): string {
  return score === null ? "–" : String(score);
}

export function RunResult({ trendId, final, parts, onRestart }: Props) {
  const summary = resultSummary(parts);
  const filled = ((final ?? 0) / 100) * RING_LENGTH;

  return (
    <div className="flex flex-wrap items-stretch gap-8">
      <section
        aria-labelledby="final-score"
        className="flex flex-[1_1_22rem] flex-col items-center justify-center gap-5 rounded-[1.75rem] border border-border bg-card px-8 py-10 text-center"
      >
        <span id="final-score" className="text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
          Final score
        </span>
        <div className="relative size-60">
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
        </div>
        <span className="font-heading text-[26px] font-semibold">{summary.title}</span>
        <span className="max-w-xs leading-relaxed text-muted-foreground">{summary.detail}</span>
        <div className="flex flex-wrap justify-center gap-3">
          <Button className="h-12 rounded-full px-6" onClick={onRestart}>
            Try again
          </Button>
          <Link href={`/trends/${trendId}`} className={cn(buttonVariants({ variant: "outline" }), "h-12 rounded-full px-6")}>
            Back to Learn
          </Link>
        </div>
      </section>

      <section
        aria-labelledby="parts-title"
        className="flex min-w-0 flex-[999_1_28rem] flex-col gap-4 rounded-[1.75rem] border border-border bg-card p-8"
      >
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="parts-title" className="font-heading text-[22px] font-semibold">
            Part by part
          </h2>
          <span className="text-sm text-muted-foreground">{`Pass at ${PASS_SCORE}`}</span>
        </div>
        <ul className="flex flex-col gap-3.5">
          {parts.map((score, i) => {
            const weak = score !== null && score < PASS_SCORE;
            return (
              <li key={i} className="flex flex-col gap-2.5 rounded-[1.125rem] bg-muted p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-heading text-[17px] font-semibold">{`Part ${i + 1}`}</span>
                  <div className="flex items-center gap-3.5">
                    {weak && (
                      <Link href={`/trends/${trendId}/practice`} className="text-sm font-semibold text-destructive hover:underline">
                        Practice this part
                      </Link>
                    )}
                    <span className={cn("font-heading text-[22px] font-bold tabular-nums", weak ? "text-destructive" : "text-primary")}>
                      {scoreLabel(score)}
                    </span>
                  </div>
                </div>
                <div className="h-2.5 rounded-full bg-foreground/10">
                  <div
                    className={cn("h-2.5 rounded-full transition-all", weak ? "bg-destructive" : "bg-primary")}
                    style={{ width: `${score ?? 0}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
