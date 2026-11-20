import { MIN_SEGMENT_PX, MIN_VISIBILITY } from "./config";
import type { FrameSize, Landmark, LimbName, Pose, Vec } from "./types";

// A pair is the midpoint of two landmarks (e.g. between the shoulders).
export type Endpoint = number | readonly [number, number];

export const LIMBS: Record<LimbName, [Endpoint, Endpoint]> = {
  leftUpperArm: [11, 13],
  leftForearm: [13, 15],
  rightUpperArm: [12, 14],
  rightForearm: [14, 16],
  leftThigh: [23, 25],
  leftShin: [25, 27],
  rightThigh: [24, 26],
  rightShin: [26, 28],
  leftHand: [15, 19],
  rightHand: [16, 20],
  head: [[11, 12], 0],
  torso: [[23, 24], [11, 12]],
};

function point(pose: Pose, end: Endpoint): Landmark | null {
  if (typeof end === "number") return pose[end] ?? null;
  const a = pose[end[0]];
  const b = pose[end[1]];
  if (!a || !b) return null;
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, v: Math.min(a.v, b.v) };
}

// Pixel vector of a visible limb. Pixel space: normalized coordinates would distort angles on non-square frames.
function limbVector(pose: Pose, limb: LimbName, size: FrameSize): Vec | null {
  const [from, to] = LIMBS[limb];
  const a = point(pose, from);
  const b = point(pose, to);
  if (!a || !b || a.v < MIN_VISIBILITY || b.v < MIN_VISIBILITY) return null;
  return { x: (b.x - a.x) * size.width, y: (b.y - a.y) * size.height };
}

export function limbLengthPx(pose: Pose, limb: LimbName, size: FrameSize): number | null {
  const v = limbVector(pose, limb, size);
  return v ? Math.hypot(v.x, v.y) : null;
}

// A few pixels of landmark error swing the angle of a short segment (a hand far from the webcam) by
// tens of degrees, so segments under MIN_SEGMENT_PX aren't measured.
export function limbDirection(pose: Pose, limb: LimbName, size: FrameSize): Vec | null {
  const v = limbVector(pose, limb, size);
  if (!v) return null;
  const length = Math.hypot(v.x, v.y);
  if (length < MIN_SEGMENT_PX) return null;
  return { x: v.x / length, y: v.y / length };
}

const round3 = (n: number) => Math.round(n * 1000) / 1000;

export function fromMediaPipe(landmarks: { x: number; y: number; visibility: number }[]): Pose {
  return landmarks.map((l) => ({ x: round3(l.x), y: round3(l.y), v: round3(l.visibility) }));
}
