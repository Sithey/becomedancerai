import { MIN_VISIBILITY } from "./config";
import type { Pose } from "./types";

const ANKLES = [27, 28];
const WRISTS = [15, 16];

// MediaPipe still places landmarks outside the image (guessed), so a point counts only if it's inside it.
function inFrame(pose: Pose, index: number) {
  const p = pose[index];
  return Boolean(p) && p.v >= MIN_VISIBILITY && p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1;
}

export function framingIssue(pose: Pose | null): string | null {
  if (!pose) return "No one detected";
  if (!ANKLES.every((i) => inFrame(pose, i))) return "Step back: your feet aren't in the frame";
  if (!WRISTS.every((i) => inFrame(pose, i))) return "Your hands leave the frame";
  return null;
}
