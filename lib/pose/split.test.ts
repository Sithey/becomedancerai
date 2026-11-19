import { describe, expect, test } from "vitest";
import { splitMoves } from "./split";
import { standingPose } from "./test-poses";
import type { PoseFrame } from "./types";

function framesWithStills(durationMs: number, stepMs: number, stillAt: number[]): PoseFrame[] {
  const frames: PoseFrame[] = [];
  let pose = standingPose();
  for (let t = 0; t <= durationMs; t += stepMs) {
    if (t > 0 && !stillAt.includes(t)) pose = pose.map((l) => ({ ...l, x: l.x + 0.01 }));
    frames.push({ t, pose });
  }
  return frames;
}

describe("splitMoves", () => {
  test("short clips are one move", () => {
    expect(splitMoves(framesWithStills(1500, 100, []), 1500)).toEqual([{ startMs: 0, endMs: 1500 }]);
    expect(splitMoves(framesWithStills(4000, 100, []), 4000)).toEqual([{ startMs: 0, endMs: 4000 }]);
  });

  test("cuts at the stillest moment in each window", () => {
    expect(splitMoves(framesWithStills(9000, 100, [3000, 6000]), 9000)).toEqual([
      { startMs: 0, endMs: 3000 },
      { startMs: 3000, endMs: 6000 },
      { startMs: 6000, endMs: 9000 },
    ]);
  });

  test("moves are contiguous and 2–4 s long", () => {
    const moves = splitMoves(framesWithStills(30000, 50, []), 30000);
    expect(moves[0].startMs).toBe(0);
    expect(moves.at(-1)!.endMs).toBe(30000);
    moves.forEach((m, i) => {
      expect(m.endMs - m.startMs).toBeGreaterThanOrEqual(2000);
      expect(m.endMs - m.startMs).toBeLessThanOrEqual(4000);
      if (i > 0) expect(m.startMs).toBe(moves[i - 1].endMs);
    });
  });

  test("no detected pose falls back to 3 s moves", () => {
    const empty = Array.from({ length: 91 }, (_, i) => ({ t: i * 100, pose: null }));
    expect(splitMoves(empty, 9000)).toEqual([
      { startMs: 0, endMs: 3000 },
      { startMs: 3000, endMs: 6000 },
      { startMs: 6000, endMs: 9000 },
    ]);
  });
});
