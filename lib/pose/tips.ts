import { LIMBS, limbDirection } from "./landmarks";
import { failingLimbs } from "./scoring";
import type { FrameSize, LimbName, LimbScores, Pose, Vec } from "./types";

type LimbDirections = Partial<Record<LimbName, Vec>>;
type Side = "left" | "right";
export type PoseCorrection = { limb: LimbName; problem: string; tip: string | null };

const KNEE_BEND_TOLERANCE = (10 * Math.PI) / 180;

export function limbDirections(pose: Pose, size: FrameSize): LimbDirections {
  const directions: LimbDirections = {};
  for (const limb of Object.keys(LIMBS) as LimbName[]) {
    const direction = limbDirection(pose, limb, size);
    if (direction) directions[limb] = direction;
  }
  return directions;
}

function kneeBend(directions: LimbDirections, side: Side): number | null {
  const thigh = directions[`${side}Thigh`];
  const shin = directions[`${side}Shin`];
  if (!thigh || !shin) return null;
  const cross = thigh.x * shin.y - thigh.y * shin.x;
  const dot = thigh.x * shin.x + thigh.y * shin.y;
  // Both segments point down the leg, so a straight knee has zero bend.
  return Math.atan2(Math.abs(cross), dot);
}

export function correctionFor(
  limbs: LimbScores,
  learnerDirs: LimbDirections,
  dancerDirs: LimbDirections,
): PoseCorrection | null {
  let worst: LimbName | null = null;
  for (const limb of failingLimbs(limbs)) {
    if (worst === null || limbs[limb]! < limbs[worst]!) worst = limb;
  }
  if (worst === null) return null;

  if (worst === "head" || worst === "torso") {
    return { limb: worst, problem: `Your ${worst} was out of position.`, tip: `Watch your ${worst}` };
  }

  const side: Side = worst.startsWith("left") ? "left" : "right";
  if (worst.endsWith("Thigh") || worst.endsWith("Shin")) {
    const learnerBend = kneeBend(learnerDirs, side);
    const dancerBend = kneeBend(dancerDirs, side);
    if (learnerBend !== null && dancerBend !== null) {
      const difference = dancerBend - learnerBend;
      if (Math.abs(difference) > KNEE_BEND_TOLERANCE) {
        const tooStraight = difference > 0;
        return {
          limb: worst,
          problem: `Your ${side} knee was ${tooStraight ? "too straight" : "too bent"}.`,
          tip: `${tooStraight ? "Bend" : "Straighten"} your ${side} knee`,
        };
      }
    }
    return {
      limb: worst,
      problem: `Your ${side} leg was out of position.`,
      tip: `Watch your ${side} leg`,
    };
  }

  const part = worst.endsWith("Hand") ? "hand" : "arm";
  const learnerDir = learnerDirs[worst];
  const dancerDir = dancerDirs[worst];
  // Image y increases downwards, so a larger y calls for raising the arm.
  const difference = learnerDir && dancerDir ? learnerDir.y - dancerDir.y : 0;
  if (!difference) {
    return { limb: worst, problem: `Your ${side} ${part} was out of position.`, tip: null };
  }
  const tooLow = difference > 0;
  return {
    limb: worst,
    problem: `Your ${side} ${part} was ${tooLow ? "too low" : "too high"}.`,
    tip: `${tooLow ? "Raise" : "Lower"} your ${side} ${part}`,
  };
}

export function tipFor(
  limbs: LimbScores,
  learnerDirs: LimbDirections,
  dancerDirs: LimbDirections,
): string | null {
  return correctionFor(limbs, learnerDirs, dancerDirs)?.tip ?? null;
}
