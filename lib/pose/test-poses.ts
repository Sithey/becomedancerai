import type { Pose } from "./types";

const POINTS: Record<number, [number, number]> = {
  11: [0.55, 0.3],
  12: [0.45, 0.3],
  13: [0.57, 0.42],
  14: [0.43, 0.42],
  15: [0.58, 0.54],
  16: [0.42, 0.54],
  23: [0.53, 0.55],
  24: [0.47, 0.55],
  25: [0.53, 0.7],
  26: [0.47, 0.7],
  27: [0.53, 0.85],
  28: [0.47, 0.85],
};

export function standingPose(): Pose {
  return Array.from({ length: 33 }, (_, i) => {
    const [x, y] = POINTS[i] ?? [0.5, 0.5];
    return { x, y, v: 1 };
  });
}

export function withPoint(pose: Pose, index: number, x: number, y: number, v = 1): Pose {
  return pose.map((l, i) => (i === index ? { x, y, v } : l));
}
