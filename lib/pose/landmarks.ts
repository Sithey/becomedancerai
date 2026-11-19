import { MIN_VISIBILITY } from "./config";
import type { FrameSize, LimbName, Pose, Vec } from "./types";

export const LIMBS: Record<LimbName, [number, number]> = {
  leftUpperArm: [11, 13],
  leftForearm: [13, 15],
  rightUpperArm: [12, 14],
  rightForearm: [14, 16],
  leftThigh: [23, 25],
  leftShin: [25, 27],
  rightThigh: [24, 26],
  rightShin: [26, 28],
};

// Directions are computed in pixel space: normalized coordinates would distort angles on non-square frames.
export function limbDirection(pose: Pose, limb: LimbName, size: FrameSize): Vec | null {
  const [i, j] = LIMBS[limb];
  const a = pose[i];
  const b = pose[j];
  if (!a || !b || a.v < MIN_VISIBILITY || b.v < MIN_VISIBILITY) return null;
  const dx = (b.x - a.x) * size.width;
  const dy = (b.y - a.y) * size.height;
  const length = Math.hypot(dx, dy);
  if (length === 0) return null;
  return { x: dx / length, y: dy / length };
}

const round3 = (n: number) => Math.round(n * 1000) / 1000;

export function fromMediaPipe(landmarks: { x: number; y: number; visibility: number }[]): Pose {
  return landmarks.map((l) => ({ x: round3(l.x), y: round3(l.y), v: round3(l.visibility) }));
}
