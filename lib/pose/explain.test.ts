import { describe, expect, test } from "vitest";
import { directionDeg, explainSegment } from "./explain";
import { LIMBS } from "./landmarks";
import type { LearnerSample } from "./segment";
import { standingPose, withPoint } from "./test-poses";
import type { Pose, PoseFrame } from "./types";

const SQUARE = { width: 1000, height: 1000 };
const SAMPLE_MS = 50;

function swing(t: number): Pose {
  const a = ((60 * Math.PI) / 180) * Math.sin((2 * Math.PI * t) / 1000);
  return withPoint(withPoint(standingPose(), 13, 0.57, 0.42), 15, 0.57 + 0.12 * Math.sin(a), 0.42 + 0.12 * Math.cos(a));
}

const frames: PoseFrame[] = Array.from({ length: 41 }, (_, i) => ({ t: i * SAMPLE_MS, pose: swing(i * SAMPLE_MS) }));

const samplesOf = (poseAt: (t: number) => Pose): LearnerSample[] =>
  Array.from({ length: 31 }, (_, i) => ({ t: 1000 + i * 33, pose: poseAt(1000 + i * 33) }));

const byLimb = (rows: ReturnType<typeof explainSegment>) => Object.fromEntries(rows.map((r) => [r.limb, r]));

describe("directionDeg", () => {
  test("measures the angle from straight down", () => {
    expect(directionDeg({ x: 0, y: 1 })).toBeCloseTo(0);
    expect(directionDeg({ x: 1, y: 0 })).toBeCloseTo(90);
    expect(directionDeg({ x: -1, y: 0 })).toBeCloseTo(-90);
    expect(Math.abs(directionDeg({ x: 0, y: -1 }))).toBeCloseTo(180);
  });
});

describe("explainSegment", () => {
  test("a learner matching the video has no difference", () => {
    const rows = explainSegment(samplesOf(swing), SQUARE, frames, SAMPLE_MS, SQUARE, 0);
    expect(rows).toHaveLength(Object.keys(LIMBS).length);
    const forearm = byLimb(rows).leftForearm;
    expect(forearm.diffDeg).toBeCloseTo(0);
    expect(forearm.score).toBeCloseTo(100);
  });

  test("standing still shows the video moving and the learner not", () => {
    const forearm = byLimb(explainSegment(samplesOf(() => swing(0)), SQUARE, frames, SAMPLE_MS, SQUARE, 0)).leftForearm;
    expect(forearm.videoAmp).toBeGreaterThan(15);
    expect(forearm.learnerAmp).toBeLessThan(1);
  });

  test("hidden learner limbs are reported as not visible", () => {
    const legsHidden = (t: number) => {
      let pose = swing(t);
      for (const i of [25, 26, 27, 28]) pose = withPoint(pose, i, 0.5, 0.9, 0.1);
      return pose;
    };
    const shin = byLimb(explainSegment(samplesOf(legsHidden), SQUARE, frames, SAMPLE_MS, SQUARE, 0)).leftShin;
    expect(shin.visible).toBe(false);
    expect(shin.score).toBeNull();
  });

  test("no samples gives no rows", () => {
    expect(explainSegment([], SQUARE, frames, SAMPLE_MS, SQUARE, 0)).toEqual([]);
  });
});
