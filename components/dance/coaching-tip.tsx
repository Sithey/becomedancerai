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
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4 text-card-foreground">
      <div role="status">
        {reviewing && (
          <p className="text-sm text-muted-foreground">{`Paused at ${coaching.score}. ${coaching.problem}`}</p>
        )}
        {!reviewing && <p className="text-sm text-muted-foreground">{`${replaySpeed}× replay`}</p>}
        <p className="font-medium">{coaching.tip ?? "Match the highlighted limb to the dancer"}.</p>
      </div>
      {reviewing && (
        <Button size="sm" variant="outline" onClick={onReplay}>
          {`Replay now at ${replaySpeed}×`}
        </Button>
      )}
    </div>
  );
}
