import { PASS_SCORE } from "@/lib/pose/config";
import { drawSkeleton } from "@/lib/pose/draw";
import { LIMBS } from "@/lib/pose/landmarks";
import type { LimbName, LimbScores, Pose } from "@/lib/pose/types";

const scoredLimbs = Object.keys(LIMBS) as LimbName[];
const limbsByJoint = new Map<number, LimbName[]>();
for (const limb of scoredLimbs) {
  for (const joint of LIMBS[limb]) {
    // Midpoint endpoints (head, torso) and face landmarks have no joint dot on the drawn skeleton.
    if (typeof joint !== "number" || joint < 11) continue;
    const connected = limbsByJoint.get(joint) ?? [];
    connected.push(limb);
    limbsByJoint.set(joint, connected);
  }
}

export function drawLearnerPose(
  ctx: CanvasRenderingContext2D,
  pose: Pose | null,
  scores: LimbScores | undefined,
  { color, passColor, failColor }: { color: string; passColor: string; failColor: string },
) {
  const limbColors: Partial<Record<LimbName, string>> = {};
  if (scores) {
    for (const limb of scoredLimbs) {
      const score = scores[limb];
      if (score !== undefined) limbColors[limb] = score >= PASS_SCORE ? passColor : failColor;
    }
  }
  drawSkeleton(ctx, pose, { color, limbColors });
  if (!pose || !scores) return;

  const { width, height } = ctx.canvas;
  for (const [index, limbs] of limbsByJoint) {
    const joint = pose[index];
    if (!joint || !limbs.every((limb) => limbColors[limb] !== undefined)) continue;

    ctx.fillStyle = limbs.some((limb) => limbColors[limb] === failColor) ? failColor : passColor;
    ctx.beginPath();
    ctx.arc(joint.x * width, joint.y * height, height / 80, 0, Math.PI * 2);
    ctx.fill();
  }
}
