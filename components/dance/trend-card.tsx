import Link from "next/link";
import { DeleteTrendButton } from "@/components/dance/delete-trend-button";
import { Button } from "@/components/ui/button";
import type { TrendSummary } from "@/lib/pose/types";
import { cn } from "cn";

export function formatDuration(ms: number) {
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

function TrendVideoThumbnail({ videoUrl, shaded }: { videoUrl: string; shaded: boolean }) {
  return (
    <video
      // The time fragment lets the browser use an early frame as the thumbnail.
      src={`${videoUrl}#t=0.5`}
      preload="metadata"
      muted
      playsInline
      aria-hidden="true"
      tabIndex={-1}
      className={cn("size-full object-cover motion-safe:transition-[filter] motion-safe:duration-[440ms]", shaded && "brightness-50")}
    />
  );
}

export function TrendCard({ trend, onSelect }: { trend: TrendSummary; onSelect?: () => void }) {
  const preview = onSelect !== undefined;
  const duration = formatDuration(trend.durationMs);
  const moves = `${trend.moveCount} ${trend.moveCount === 1 ? "move" : "moves"}`;

  return (
    <article className={cn(
      "relative flex flex-col gap-3.5 rounded-[1.25rem] border p-3 pb-4 motion-safe:transition-colors motion-safe:duration-[440ms]",
      preview ? "border-transparent" : "border-border bg-card hover:border-primary/60",
    )}>
      {!preview && (
        <Link
          href={`/trends/${trend.id}`}
          aria-label={`${duration} ${trend.title} ${moves}`}
          className="absolute inset-0 z-10 rounded-[inherit] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
        />
      )}
      <div className="relative aspect-[4/5] overflow-hidden rounded-[0.875rem] bg-muted">
        <TrendVideoThumbnail videoUrl={trend.videoUrl} shaded={preview} />
        <span
          aria-hidden={preview}
          className={cn(
            "absolute bottom-2.5 left-2.5 rounded-full bg-background/80 px-2.5 py-1.5 text-xs font-semibold motion-safe:transition-opacity motion-safe:duration-[440ms]",
            preview && "opacity-0",
          )}
        >
          {duration}
        </span>
        {preview && (
          <Button
            variant="ghost"
            aria-label={`Show ${trend.title}`}
            className="absolute inset-0 h-full w-full rounded-[inherit] hover:bg-transparent focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
            onClick={onSelect}
          />
        )}
      </div>
      <div
        aria-hidden={preview}
        className={cn("flex flex-col gap-1 px-1 motion-safe:transition-opacity motion-safe:duration-[440ms]", preview && "opacity-0")}
      >
        <span className="font-heading text-xl font-semibold wrap-anywhere">{trend.title}</span>
        <span className="text-sm text-muted-foreground">{moves}</span>
      </div>
      <div className={cn("relative z-20 min-h-9 border-t px-1 pt-2", preview ? "border-transparent" : "border-border")}>
        {!preview && <DeleteTrendButton id={trend.id} title={trend.title} inLibrary />}
      </div>
    </article>
  );
}

export function AddTrendCard({ empty }: { empty?: boolean }) {
  return (
    <Link
      href="/trends/new"
      className="flex min-h-56 flex-col items-center justify-center gap-3 p-4 text-center sm:min-h-[22rem] rounded-[1.25rem] border-[1.5px] border-dashed border-foreground/20 text-muted-foreground transition-colors hover:border-primary/60"
    >
      <svg viewBox="0 0 40 40" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="size-10 text-primary">
        <circle cx="20" cy="20" r="18" />
        <path d="M20 12v16M12 20h16" />
      </svg>
      <span className="font-heading text-lg font-semibold text-foreground">Add a trend</span>
      <span className="text-sm">{empty ? "No trends yet. Add your first one." : "Upload a saved TikTok mp4"}</span>
    </Link>
  );
}
