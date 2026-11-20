import { Button } from "@/components/ui/button";
import type { CoachingReplay } from "./use-coaching-replay";

export function CoachingTip({
  coaching,
  replaySpeed,
  onReplay,
}: {
  coaching: CoachingReplay | null;
  replaySpeed: number;
  onReplay: () => void;
}) {
  if (!coaching) return null;
  const reviewing = coaching.phase === "review";
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-[1.25rem] border-2 border-destructive/60 bg-card px-5 py-4 text-card-foreground">
      <div className="flex items-center gap-3.5">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-destructive/15" aria-hidden="true">
          <svg viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="size-5 text-destructive">
            <path d="M11 4v8M11 16v.5" />
          </svg>
        </span>
        <div role="status" className="space-y-0.5">
          <p className="font-heading text-2xl leading-snug font-bold">
            {coaching.tip ?? "Match the highlighted limb to the dancer"}
          </p>
          <p className="text-sm text-muted-foreground">
            {reviewing ? `Paused at ${coaching.score}. ${coaching.problem}` : `${replaySpeed}× replay`}
          </p>
        </div>
      </div>
      {reviewing && (
        <Button size="lg" className="h-12 rounded-full px-6 text-base" onClick={onReplay}>
          {`Replay now at ${replaySpeed}×`}
        </Button>
      )}
    </div>
  );
}
