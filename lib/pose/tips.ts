import { failingLimbs } from "./scoring";
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
  leftHand: "Watch your left hand",
  rightHand: "Watch your right hand",
  head: "Watch your head",
  torso: "Watch your torso",
};

export function tipFor(limbs: LimbScores): string | null {
  let worst: LimbName | null = null;
  for (const limb of failingLimbs(limbs)) {
    if (worst === null || limbs[limb]! < limbs[worst]!) worst = limb;
  }
  return worst && TIPS[worst];
}
