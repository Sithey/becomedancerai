import { angleDeg, limbScore } from "./compare";
import {
  LAG_MAX_MS,
  LAG_MIN_MS,
  LAG_STEP_MS,
  LIMB_WEIGHT_BASE,
  LIMB_WEIGHT_DEG,
  MIN_SEGMENT_SAMPLES,
  MOTION_HALF_WINDOW_MS,
  MOVEMENT_FLOOR,
  MOVING_LIMB_DEG,
  SEGMENT_MS,
} from "./config";
import { LIMBS, limbDirection } from "./landmarks";
import type { FrameSize, LimbName, LimbScores, Pose, PoseFrame, Vec } from "./types";

export type LearnerSample = { t: number; pose: Pose };
export type SegmentScore = { score: number; limbs: LimbScores; lagMs: number };

const LIMB_NAMES = Object.keys(LIMBS) as LimbName[];

export function amplitude(dirs: Vec[]): number {
  if (dirs.length < 2) return 0;
  const sx = dirs.reduce((s, d) => s + d.x, 0);
  const sy = dirs.reduce((s, d) => s + d.y, 0);
  const len = Math.hypot(sx, sy);
  if (len === 0) return 90;
  const mean = { x: sx / len, y: sy / len };
  return dirs.reduce((s, d) => s + angleDeg(d, mean), 0) / dirs.length;
}

export function limbMotion(frames: PoseFrame[], size: FrameSize, sampleMs: number): LimbScores[] {
  const half = Math.round(MOTION_HALF_WINDOW_MS / sampleMs);
  const directions = frames.map((f) =>
    Object.fromEntries(LIMB_NAMES.map((l) => [l, f.pose ? limbDirection(f.pose, l, size) : null])),
  ) as Record<LimbName, Vec | null>[];
  return frames.map((_, i) => {
    const result: LimbScores = {};
    for (const limb of LIMB_NAMES) {
      const dirs: Vec[] = [];
      for (let k = Math.max(0, i - half); k <= Math.min(frames.length - 1, i + half); k++) {
        const d = directions[k][limb];
        if (d) dirs.push(d);
      }
      if (dirs.length) result[limb] = amplitude(dirs);
    }
    return result;
  });
}

export class LearnerHistory {
  private items: LearnerSample[] = [];

  push(sample: LearnerSample): void {
    const last = this.items[this.items.length - 1];
    // A move loop jumps the dancer time back: samples from the previous loop no longer line up.
    if (last && sample.t < last.t) this.items = [];
    // A buffering video keeps the same time: replace instead of piling up samples.
    if (last && sample.t === last.t) this.items.pop();
    this.items.push(sample);
    this.items = this.items.filter((s) => s.t >= sample.t - SEGMENT_MS);
  }

  clear(): void {
    this.items = [];
  }

  samples(nowMs: number): LearnerSample[] {
    return this.items.filter((s) => s.t >= nowMs - SEGMENT_MS && s.t <= nowMs);
  }
}

export function limbWeight(motionDeg = 0): number {
  return LIMB_WEIGHT_BASE + motionDeg / LIMB_WEIGHT_DEG;
}

export function scoreSegment(
  samples: LearnerSample[],
  learnerSize: FrameSize,
  frames: PoseFrame[],
  sampleMs: number,
  dancerSize: FrameSize,
  motion: LimbScores[],
): SegmentScore | null {
  let best: SegmentScore | null = null;
  // One offset for the whole segment: per-frame offsets let a frozen pose match some moment of any move.
  for (let lag = LAG_MIN_MS; lag <= LAG_MAX_MS; lag += LAG_STEP_MS) {
    let poseSum = 0;
    let poseN = 0;
    const limbSum: LimbScores = {};
    const limbN: Partial<Record<LimbName, number>> = {};
    const learnerDirs: Partial<Record<LimbName, Vec[]>> = {};
    const dancerDirs: Partial<Record<LimbName, Vec[]>> = {};

    for (const sample of samples) {
      const i = Math.round((sample.t - lag) / sampleMs);
      const dancer = frames[i]?.pose;
      if (!dancer) continue;
      let weighted = 0;
      let weights = 0;
      for (const limb of LIMB_NAMES) {
        const a = limbDirection(sample.pose, limb, learnerSize);
        const b = limbDirection(dancer, limb, dancerSize);
        if (!a || !b) continue;
        const score = limbScore(a, b);
        const w = limbWeight(motion[i]?.[limb]);
        weighted += score * w;
        weights += w;
        limbSum[limb] = (limbSum[limb] ?? 0) + score;
        limbN[limb] = (limbN[limb] ?? 0) + 1;
        (learnerDirs[limb] ??= []).push(a);
        (dancerDirs[limb] ??= []).push(b);
      }
      if (weights > 0) {
        poseSum += weighted / weights;
        poseN++;
      }
    }
    if (poseN < MIN_SEGMENT_SAMPLES) continue;

    let ratioSum = 0;
    let ampSum = 0;
    const limbFactor: Partial<Record<LimbName, number>> = {};
    for (const limb of LIMB_NAMES) {
      const dancerAmp = amplitude(dancerDirs[limb] ?? []);
      if (dancerAmp < MOVING_LIMB_DEG) continue;
      const ratio = Math.min(1, amplitude(learnerDirs[limb] ?? []) / dancerAmp);
      ratioSum += ratio * dancerAmp;
      ampSum += dancerAmp;
      limbFactor[limb] = MOVEMENT_FLOOR + (1 - MOVEMENT_FLOOR) * ratio;
    }
    const overall = ampSum ? ratioSum / ampSum : 1;
    const score = (poseSum / poseN) * (MOVEMENT_FLOOR + (1 - MOVEMENT_FLOOR) * overall);

    if (best === null || score > best.score) {
      const limbs: LimbScores = {};
      for (const limb of Object.keys(limbSum) as LimbName[]) {
        limbs[limb] = (limbSum[limb]! / limbN[limb]!) * (limbFactor[limb] ?? 1);
      }
      best = { score, limbs, lagMs: lag };
    }
  }
  return best;
}
