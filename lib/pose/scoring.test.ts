import { describe, expect, test } from "vitest";
import { standingPose, withPoint } from "./test-poses";
import type { PoseFrame } from "./types";
import { LimbSmoother, averageScore, bestMatch, framesInWindow, isPassed } from "./scoring";

const SQUARE = { width: 1000, height: 1000 };
const learner = standingPose();
const moved = withPoint(standingPose(), 15, 0.57, 0.3);
const frames: PoseFrame[] = Array.from({ length: 21 }, (_, i) => ({
  t: i * 50,
  pose: i * 50 === 300 ? standingPose() : moved,
}));

describe("scoring", () => {
  test("window is −400/+100 ms around t", () => {
    expect(framesInWindow(frames, 50, 500).map((f) => f.t)).toEqual([
      100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600,
    ]);
  });
  test("window skips frames without a pose", () => {
    const withGap = frames.map((f) => (f.t === 300 ? { ...f, pose: null } : f));
    expect(framesInWindow(withGap, 50, 500).map((f) => f.t)).not.toContain(300);
  });
  test("window is clamped to the array bounds", () => {
    expect(framesInWindow(frames, 50, 0).map((f) => f.t)).toEqual([0, 50, 100]);
    expect(framesInWindow(frames, 50, 1000).map((f) => f.t).at(-1)).toBe(1000);
  });
  test("bestMatch finds the matching frame inside the window", () => {
    expect(bestMatch(learner, SQUARE, frames, 50, 600, SQUARE)).toMatchObject({ score: 100, matchT: 300 });
    expect(bestMatch(learner, SQUARE, frames, 50, 800, SQUARE)!.score).toBeLessThan(100);
  });
  test("no learner pose gives null", () => {
    expect(bestMatch(null, SQUARE, frames, 50, 600, SQUARE)).toBeNull();
  });
  test("smoother averages the last 500 ms", () => {
    const s = new LimbSmoother();
    s.push(0, { leftForearm: 100 });
    s.push(200, { leftForearm: 50 });
    expect(s.current(300).leftForearm).toBe(75);
    expect(s.current(600).leftForearm).toBe(50);
  });
  test("averageScore ignores nulls", () => {
    expect(averageScore([80, null, 60])).toBe(70);
    expect(averageScore([null])).toBeNull();
  });
  test("pass level is 70", () => {
    expect(isPassed(70)).toBe(true);
    expect(isPassed(69.9)).toBe(false);
    expect(isPassed(null)).toBe(false);
  });
});
