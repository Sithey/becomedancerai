import { FULL_SCORE_DEG, ZERO_SCORE_DEG } from "./config";
import { LIMBS, limbDirection } from "./landmarks";
import type { FrameSize, LimbName, LimbScores, Pose, Vec } from "./types";

export type PoseComparison = { limbs: LimbScores; score: number | null; matchT?: number };

export function angleDeg(a: Vec, b: Vec): number {
  const dot = Math.min(1, Math.max(-1, a.x * b.x + a.y * b.y));
  return (Math.acos(dot) * 180) / Math.PI;
}

export function limbScore(a: Vec, b: Vec): number {
  const over = (angleDeg(a, b) - FULL_SCORE_DEG) / (ZERO_SCORE_DEG - FULL_SCORE_DEG);
  return Math.min(100, Math.max(0, 100 * (1 - over)));
}

export function comparePoses(
  learner: Pose,
  learnerSize: FrameSize,
  dancer: Pose,
  dancerSize: FrameSize,
): PoseComparison {
  const limbs: LimbScores = {};
  for (const limb of Object.keys(LIMBS) as LimbName[]) {
    const a = limbDirection(learner, limb, learnerSize);
    const b = limbDirection(dancer, limb, dancerSize);
    if (a && b) limbs[limb] = limbScore(a, b);
  }
  const values = Object.values(limbs);
  const score = values.length ? values.reduce((s, v) => s + v, 0) / values.length : null;
  return { limbs, score };
}
