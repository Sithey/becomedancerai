import { PASS_SCORE } from "@/lib/pose/config";
import { LIMBS } from "@/lib/pose/landmarks";
import type { LimbName, LimbScores, Pose } from "@/lib/pose/types";

const limbsByJoint = new Map<number, LimbName[]>();
for (const limb of Object.keys(LIMBS) as LimbName[]) {
  for (const joint of LIMBS[limb]) {
    const connected = limbsByJoint.get(joint) ?? [];
    connected.push(limb);
    limbsByJoint.set(joint, connected);
  }
}

export function drawMatchingJoints(
  ctx: CanvasRenderingContext2D,
  pose: Pose | null,
  scores: LimbScores | undefined,
  color: string,
) {
  if (!pose || !scores || !color) return;

  const { width, height } = ctx.canvas;
  ctx.fillStyle = color;
  for (const [index, limbs] of limbsByJoint) {
    const joint = pose[index];
    if (!joint || !limbs.every((limb) => (scores[limb] ?? 0) >= PASS_SCORE)) continue;

    ctx.beginPath();
    ctx.arc(joint.x * width, joint.y * height, height / 80, 0, Math.PI * 2);
    ctx.fill();
  }
}
