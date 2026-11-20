import { PASS_SCORE, SMOOTHING_MS } from "./config";
import { LIMBS } from "./landmarks";
import type { LimbName, LimbScores } from "./types";

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

export function failingLimbs(limbs: LimbScores): LimbName[] {
  return (Object.keys(LIMBS) as LimbName[]).filter((l) => limbs[l] !== undefined && limbs[l]! < PASS_SCORE);
}
