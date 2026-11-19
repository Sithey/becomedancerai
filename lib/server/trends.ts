import type { Move, PoseFrame, TrendData, TrendSummary } from "@/lib/pose/types";
import { db } from "./db";

function videoUrl(videoFile: string) {
  return `/api/videos/${videoFile}`;
}

export async function listTrends(): Promise<TrendSummary[]> {
  // poses is ~1 MB per trend: never load it for the list.
  const rows = await db.trend.findMany({
    select: { id: true, title: true, videoFile: true, durationMs: true, moves: true },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    videoUrl: videoUrl(row.videoFile),
    durationMs: row.durationMs,
    moveCount: (row.moves as Move[]).length,
  }));
}

export async function getTrend(id: string): Promise<TrendData | null> {
  const row = await db.trend.findUnique({ where: { id } });
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    videoUrl: videoUrl(row.videoFile),
    width: row.width,
    height: row.height,
    durationMs: row.durationMs,
    sampleMs: row.sampleMs,
    poses: row.poses as PoseFrame[],
    moves: row.moves as Move[],
  };
}
