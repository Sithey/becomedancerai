import { describe, expect, test } from "vitest";
import { MIN_SEGMENT_SAMPLES } from "./config";
import { LearnerHistory, limbMotion, scoreSegment, type SegmentScore } from "./segment";
import { standingPose, withPoint } from "./test-poses";
import type { Pose, PoseFrame } from "./types";

const SQUARE = { width: 1000, height: 1000 };
const SAMPLE_MS = 50;

const theta = (t: number) => ((60 * Math.PI) / 180) * Math.sin((2 * Math.PI * t) / 1000);

function swing(t: number): Pose {
  const a = theta(t);
  const wx = 0.57 + 0.12 * Math.sin(a);
  const wy = 0.42 + 0.12 * Math.cos(a);
  const arm = withPoint(withPoint(standingPose(), 13, 0.57, 0.42), 15, wx, wy);
  return withPoint(arm, 19, wx + 0.04 * Math.sin(a), wy + 0.04 * Math.cos(a));
}

function wrongArm(t: number): Pose {
  const a = theta(t);
  const wx = 0.43 - 0.12 * Math.sin(a);
  const wy = 0.42 + 0.12 * Math.cos(a);
  const arm = withPoint(withPoint(standingPose(), 14, 0.43, 0.42), 16, wx, wy);
  return withPoint(arm, 20, wx - 0.04 * Math.sin(a), wy + 0.04 * Math.cos(a));
}

const frames: PoseFrame[] = Array.from({ length: 6000 / SAMPLE_MS + 1 }, (_, i) => ({
  t: i * SAMPLE_MS,
  pose: swing(i * SAMPLE_MS),
}));
const motion = limbMotion(frames, SQUARE, SAMPLE_MS);

function run(poseAt: (t: number) => Pose) {
  const history = new LearnerHistory();
  const scores: number[] = [];
  let last: SegmentScore | null = null;
  for (let t = 1000; t < 5000; t += 33) {
    history.push({ t, pose: poseAt(t) });
    last = scoreSegment(history.samples(t), SQUARE, frames, SAMPLE_MS, SQUARE, motion);
    if (last) scores.push(last.score);
  }
  return { avg: scores.reduce((s, v) => s + v, 0) / scores.length, last };
}

describe("limbMotion", () => {
  test("sees the swinging forearm, not the still thigh", () => {
    expect(motion[60].leftForearm).toBeGreaterThan(15);
    expect(motion[60].rightThigh).toBeLessThan(1);
  });
});

describe("scoreSegment", () => {
  test("correct learner scores high", () => {
    expect(run(swing).avg).toBeGreaterThanOrEqual(95);
  });

  test("300 ms late learner still scores high", () => {
    expect(run((t) => swing(t - 300)).avg).toBeGreaterThanOrEqual(90);
  });

  test("standing still fails", () => {
    expect(run(() => swing(0)).avg).toBeLessThan(70);
  });

  test("wrong arm fails and marks the left forearm", () => {
    const r = run(wrongArm);
    expect(r.avg).toBeLessThan(70);
    expect(r.last!.limbs.leftForearm!).toBeLessThan(70);
  });

  test("fewer than MIN_SEGMENT_SAMPLES samples gives null", () => {
    const history = new LearnerHistory();
    for (let i = 0; i < MIN_SEGMENT_SAMPLES - 1; i++) history.push({ t: 1000 + i * 33, pose: swing(1000 + i * 33) });
    expect(scoreSegment(history.samples(1000 + (MIN_SEGMENT_SAMPLES - 2) * 33), SQUARE, frames, SAMPLE_MS, SQUARE, motion)).toBeNull();
  });

  test("invisible learner limbs give null", () => {
    const history = new LearnerHistory();
    for (let i = 0; i < 10; i++) {
      const t = 1000 + i * 33;
      history.push({ t, pose: swing(t).map((l) => ({ ...l, v: 0 })) });
    }
    expect(scoreSegment(history.samples(1000 + 9 * 33), SQUARE, frames, SAMPLE_MS, SQUARE, motion)).toBeNull();
  });
});

describe("LearnerHistory", () => {
  test("keeps the last second", () => {
    const history = new LearnerHistory();
    for (let t = 0; t <= 2000; t += 100) history.push({ t, pose: standingPose() });
    expect(history.samples(2000)[0].t).toBe(1000);
  });

  test("samples older than a second before the dancer time are not returned", () => {
    const history = new LearnerHistory();
    for (let t = 1000; t <= 2000; t += 33) history.push({ t, pose: swing(t) });
    expect(history.samples(3500)).toHaveLength(0);
    expect(scoreSegment(history.samples(3500), SQUARE, frames, SAMPLE_MS, SQUARE, motion)).toBeNull();
  });

  test("a repeated dancer time replaces the last sample", () => {
    const history = new LearnerHistory();
    for (let i = 0; i < 100; i++) history.push({ t: 1000, pose: standingPose() });
    expect(history.samples(1000)).toHaveLength(1);
  });

  test("time going backwards resets the history", () => {
    const history = new LearnerHistory();
    history.push({ t: 2000, pose: standingPose() });
    history.push({ t: 100, pose: standingPose() });
    expect(history.samples(100)).toHaveLength(1);
  });
});
