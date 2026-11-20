import { describe, expect, test } from "vitest";
import { directionDeg, explainSegment, recordingSettings, withSegmentScores } from "./explain";
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
  Array.from({ length: 21 }, (_, i) => ({ t: 1000 + i * SAMPLE_MS, pose: poseAt(1000 + i * SAMPLE_MS) }));

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

  test("a learner limb shorter than 30 px is marked too small", () => {
    const tinyHand = (t: number) => withPoint(swing(t), 19, swing(t)[15].x, swing(t)[15].y + 0.01);
    const hand = byLimb(explainSegment(samplesOf(tinyHand), SQUARE, frames, SAMPLE_MS, SQUARE, 0)).leftHand;
    expect(hand.tooSmall).toBe(true);
    expect(hand.visible).toBe(false);
    expect(byLimb(explainSegment(samplesOf(swing), SQUARE, frames, SAMPLE_MS, SQUARE, 0)).leftHand.tooSmall).toBe(false);
  });

  test("no samples gives no rows", () => {
    expect(explainSegment([], SQUARE, frames, SAMPLE_MS, SQUARE, 0)).toEqual([]);
  });
});

describe("withSegmentScores", () => {
  test("adds the segment score per limb and sorts worst first", () => {
    const rows = explainSegment(samplesOf(() => swing(0)), SQUARE, frames, SAMPLE_MS, SQUARE, 0);
    const merged = withSegmentScores(rows, { leftForearm: 17.6, rightHand: 80 });
    expect(merged[0]).toMatchObject({ limb: "leftForearm", segment: 17.6 });
    expect(merged[1]).toMatchObject({ limb: "rightHand", segment: 80 });
    expect(merged.at(-1)!.segment).toBeNull();
    expect(merged).toHaveLength(rows.length);
  });
});

describe("recordingSettings", () => {
  test("full dance always plays at 1×", () => {
    expect(recordingSettings("full", 0.5, true)).toEqual({ move: "full", speed: 1, mirrored: true });
  });

  test("a move keeps its speed and is numbered from 1", () => {
    expect(recordingSettings(0, 0.75, false)).toEqual({ move: "move1", speed: 0.75, mirrored: false });
  });
});
