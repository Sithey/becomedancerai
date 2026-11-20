import Link from "next/link";
import type { TrendSummary } from "@/lib/pose/types";

export function formatDuration(ms: number) {
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

export function TrendCard({ trend }: { trend: TrendSummary }) {
  return (
    <Link
      href={`/trends/${trend.id}`}
      className="group flex flex-col gap-3.5 rounded-[1.25rem] border border-border bg-card p-3 pb-4 transition-colors hover:border-primary/60"
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-[0.875rem] bg-muted">
        {/* #t=0.5 makes the browser show a frame from half a second in as the thumbnail. */}
        <video
          src={`${trend.videoUrl}#t=0.5`}
          preload="metadata"
          muted
          playsInline
          aria-hidden="true"
          tabIndex={-1}
          className="size-full object-cover brightness-50 transition duration-300 group-hover:brightness-75"
        />
        <span className="absolute bottom-2.5 left-2.5 rounded-full bg-background/80 px-2.5 py-1.5 text-xs font-semibold">
          {formatDuration(trend.durationMs)}
        </span>
      </div>
      <div className="flex flex-col gap-1 px-1">
        <span className="font-heading text-xl font-semibold">{trend.title}</span>
        <span className="text-sm text-muted-foreground">
          {`${trend.moveCount} ${trend.moveCount === 1 ? "move" : "moves"}`}
        </span>
      </div>
    </Link>
  );
}

export function AddTrendCard({ empty }: { empty?: boolean }) {
  return (
    <Link
      href="/trends/new"
      className="flex min-h-[22rem] flex-col items-center justify-center gap-3 rounded-[1.25rem] border-[1.5px] border-dashed border-foreground/20 text-muted-foreground transition-colors hover:border-primary/60"
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
