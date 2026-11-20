"use client";

import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";

type Props = {
  trendId: string;
  final: number | null;
  moves: (number | null)[];
  onRestart: () => void;
};

const PASS_THRESHOLD = 70;

function scoreLabel(score: number | null): string {
  if (score === null) return "–";
  return String(score);
}

export function RunResult({ trendId, final, moves, onRestart }: Props) {
  return (
    <div className="flex flex-col items-center gap-6 py-4">
      {/* Final score */}
      <div className="flex flex-col items-center gap-1">
        <p className="text-muted-foreground text-sm font-medium uppercase tracking-widest">
          Final score
        </p>
        <p className="text-7xl font-black tabular-nums">{scoreLabel(final)}</p>
      </div>

      {/* Per-move bars */}
      <div className="w-full max-w-sm space-y-2">
        {moves.map((score, i) => {
          const pct = score ?? 0;
          const weak = score !== null && score < PASS_THRESHOLD;
          return (
            <div key={i} className="flex items-center gap-3">
              <span className="w-16 shrink-0 text-sm text-muted-foreground">
                Move {i + 1}
              </span>
              {/* Bar */}
              <div className="relative h-4 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full transition-all ${weak ? "bg-destructive" : "bg-primary"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-8 shrink-0 text-right text-sm font-semibold tabular-nums">
                {scoreLabel(score)}
              </span>
              {weak && (
                <Link
                  href={`/trends/${trendId}/practice`}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  Practice
                </Link>
              )}
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <Button onClick={onRestart}>Try again</Button>
    </div>
  );
}
