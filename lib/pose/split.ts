import { MOVE_MAX_MS, MOVE_MIN_MS } from "./config";
import type { Move, PoseFrame } from "./types";

const TRACKED = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];

export function motionAt(frames: PoseFrame[], i: number): number {
  const cur = frames[i]?.pose;
  const prev = frames[i - 1]?.pose;
  if (i === 0 || !cur || !prev) return Infinity;
  let sum = 0;
  for (const k of TRACKED) {
    sum += Math.hypot(cur[k].x - prev[k].x, cur[k].y - prev[k].y);
  }
  return sum;
}

export function splitMoves(frames: PoseFrame[], durationMs: number): Move[] {
  const moves: Move[] = [];
  let prev = 0;
  while (durationMs - prev > MOVE_MAX_MS) {
    const lo = prev + MOVE_MIN_MS;
    const hi = Math.min(prev + MOVE_MAX_MS, durationMs - MOVE_MIN_MS);
    let cut = -1;
    let best = Infinity;
    frames.forEach((f, i) => {
      if (f.t < lo || f.t > hi) return;
      const m = motionAt(frames, i);
      if (m < best) {
        best = m;
        cut = f.t;
      }
    });
    // No frame with a measurable motion (pose lost): fall back to 3 s moves.
    if (cut < 0) cut = Math.min(prev + 3000, hi);
    moves.push({ startMs: prev, endMs: cut });
    prev = cut;
  }
  moves.push({ startMs: prev, endMs: durationMs });
  return moves;
}
