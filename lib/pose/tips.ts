import { PASS_SCORE } from "./config";
import { LIMBS } from "./landmarks";
import type { LimbName, LimbScores } from "./types";

const TIPS: Record<LimbName, string> = {
  leftUpperArm: "Watch your left arm",
  leftForearm: "Watch your left arm",
  rightUpperArm: "Watch your right arm",
  rightForearm: "Watch your right arm",
  leftThigh: "Watch your left leg",
  leftShin: "Watch your left leg",
  rightThigh: "Watch your right leg",
  rightShin: "Watch your right leg",
};

export function failingLimbs(limbs: LimbScores): LimbName[] {
  return (Object.keys(LIMBS) as LimbName[]).filter((l) => limbs[l] !== undefined && limbs[l]! < PASS_SCORE);
}

export function tipFor(limbs: LimbScores): string | null {
  let worst: LimbName | null = null;
  for (const limb of failingLimbs(limbs)) {
    if (worst === null || limbs[limb]! < limbs[worst]!) worst = limb;
  }
  return worst && TIPS[worst];
}
