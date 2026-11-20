import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { Prisma } from "@/generated/prisma/client";
import type { Move, NewTrend, PoseFrame, TrendData, TrendSummary } from "@/lib/pose/types";
import { db } from "./db";
import { deleteVideo, isValidVideoFileName, saveVideo, videoFilePath } from "./videos";

function videoUrl(videoFile: string) {
  return `/api/videos/${videoFile}`;
}

export async function listTrends(): Promise<TrendSummary[]> {
  // poses is ~1 MB per trend: never load it for the list.
  const rows = await db.trend.findMany({
    select: { id: true, title: true, videoFile: true, durationMs: true, moves: true },
    orderBy: { createdAt: "desc" },
  });
  // Videos stay on the machine that uploaded them; with the shared dev database, rows from
  // teammates' laptops have no file here.
  return rows
    .filter((row) => existsSync(videoFilePath(row.videoFile)))
    .map((row) => ({
      id: row.id,
      title: row.title,
      videoUrl: videoUrl(row.videoFile),
      durationMs: row.durationMs,
      moveCount: (row.moves as Move[]).length,
    }));
}

export async function countTrends(): Promise<number> {
  return db.trend.count();
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

export async function createTrend(input: NewTrend, video: File): Promise<{ id: string }> {
  const id = randomBytes(12).toString("hex");
  const videoFile = `${id}.mp4`;
  await saveVideo(videoFile, video);
  try {
    await db.trend.create({
      data: {
        id,
        videoFile,
        title: input.title,
        width: input.width,
        height: input.height,
        durationMs: input.durationMs,
        sampleMs: input.sampleMs,
        poses: input.poses,
        moves: input.moves,
      },
    });
  } catch (error) {
    await deleteVideo(videoFile).catch(() => {});
    throw error;
  }
  return { id };
}

export async function deleteTrend(id: string): Promise<boolean> {
  let restoreVideo: (() => Promise<void>) | undefined;
  try {
    await db.$transaction(async (tx) => {
      const { videoFile } = await tx.trend.delete({ where: { id }, select: { videoFile: true } });
      if (!isValidVideoFileName(videoFile)) throw new Error("Invalid video filename");

      // Keep a copy until the row deletion commits. A file error must roll back the row.
      const path = videoFilePath(videoFile);
      const contents = await readFile(path).catch((error) => {
        // A row whose video is already gone must stay deletable.
        if (error?.code === "ENOENT") return null;
        throw error;
      });
      if (!contents) return;
      await deleteVideo(videoFile);
      restoreVideo = () => writeFile(path, contents, { flag: "wx" });
    });
    return true;
  } catch (error) {
    await restoreVideo?.();
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") return false;
    throw error;
  }
}
