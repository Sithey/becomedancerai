import { PoseLandmarker } from "@mediapipe/tasks-vision";
import { MIN_VISIBILITY } from "./config";
import { LIMBS } from "./landmarks";
import type { LimbName, Pose } from "./types";

const FIRST_BODY_INDEX = 11;

const limbByPair = new Map<string, LimbName>(
  (Object.entries(LIMBS) as [LimbName, [number, number]][]).flatMap(([limb, [a, b]]) => [
    [`${a}-${b}`, limb],
    [`${b}-${a}`, limb],
  ]),
);

export function themeColor(name: "primary" | "destructive"): string {
  return getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim();
}

export function drawSkeleton(
  ctx: CanvasRenderingContext2D,
  pose: Pose | null,
  opts: { color: string; limbColors?: Partial<Record<LimbName, string>> },
): void {
  const { width, height } = ctx.canvas;
  ctx.clearRect(0, 0, width, height);
  if (!pose) return;

  ctx.lineWidth = height / 120;
  ctx.lineCap = "round";
  const joints = new Set<number>();

  for (const { start, end } of PoseLandmarker.POSE_CONNECTIONS) {
    if (start < FIRST_BODY_INDEX || end < FIRST_BODY_INDEX) continue;
    const a = pose[start];
    const b = pose[end];
    if (!a || !b || a.v < MIN_VISIBILITY || b.v < MIN_VISIBILITY) continue;
    const limb = limbByPair.get(`${start}-${end}`);
    ctx.strokeStyle = (limb && opts.limbColors?.[limb]) ?? opts.color;
    ctx.beginPath();
    ctx.moveTo(a.x * width, a.y * height);
    ctx.lineTo(b.x * width, b.y * height);
    ctx.stroke();
    joints.add(start);
    joints.add(end);
  }

  ctx.fillStyle = opts.color;
  for (const i of joints) {
    ctx.beginPath();
    ctx.arc(pose[i].x * width, pose[i].y * height, height / 120, 0, Math.PI * 2);
    ctx.fill();
  }
}
