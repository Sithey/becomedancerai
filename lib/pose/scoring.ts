import { PASS_SCORE, SMOOTHING_MS, WINDOW_AFTER_MS, WINDOW_BEFORE_MS } from "./config";
import { comparePoses, type PoseComparison } from "./compare";
import { LIMBS } from "./landmarks";
import type { FrameSize, LimbName, LimbScores, Pose, PoseFrame } from "./types";

export function framesInWindow(frames: PoseFrame[], sampleMs: number, tMs: number): PoseFrame[] {
  const from = Math.max(0, Math.ceil((tMs - WINDOW_BEFORE_MS) / sampleMs));
  const to = Math.min(frames.length - 1, Math.floor((tMs + WINDOW_AFTER_MS) / sampleMs));
  const result: PoseFrame[] = [];
  for (let i = from; i <= to; i++) {
    if (frames[i].pose) result.push(frames[i]);
  }
  return result;
}

export function bestMatch(
  learner: Pose | null,
  learnerSize: FrameSize,
  frames: PoseFrame[],
  sampleMs: number,
  tMs: number,
  dancerSize: FrameSize,
): PoseComparison | null {
  if (!learner) return null;
  let best: PoseComparison | null = null;
  for (const frame of framesInWindow(frames, sampleMs, tMs)) {
    const comparison = comparePoses(learner, learnerSize, frame.pose!, dancerSize);
    if (comparison.score === null) continue;
    if (best === null || comparison.score > best.score!) best = { ...comparison, matchT: frame.t };
  }
  return best;
}

export class LimbSmoother {
  private entries: { t: number; limbs: LimbScores }[] = [];

  push(nowMs: number, limbs: LimbScores): void {
    this.entries = this.entries.filter((e) => e.t > nowMs - SMOOTHING_MS);
    this.entries.push({ t: nowMs, limbs });
  }

  current(nowMs: number): LimbScores {
    const sums: LimbScores = {};
    const counts: Partial<Record<LimbName, number>> = {};
    for (const entry of this.entries) {
      if (entry.t <= nowMs - SMOOTHING_MS) continue;
      for (const limb of Object.keys(LIMBS) as LimbName[]) {
        const v = entry.limbs[limb];
        if (v === undefined) continue;
        sums[limb] = (sums[limb] ?? 0) + v;
        counts[limb] = (counts[limb] ?? 0) + 1;
      }
    }
    const result: LimbScores = {};
    for (const limb of Object.keys(sums) as LimbName[]) result[limb] = sums[limb]! / counts[limb]!;
    return result;
  }
}

export function averageScore(scores: (number | null)[]): number | null {
  const values = scores.filter((s): s is number => s !== null);
  return values.length ? values.reduce((s, v) => s + v, 0) / values.length : null;
}

export function isPassed(avg: number | null): boolean {
  return avg !== null && avg >= PASS_SCORE;
}
