import { framingIssue } from "./framing";
import type { Pose } from "./types";

export const NO_PERSON_MS = 2000;
export const STEP_BACK_MESSAGE = "Step back so your whole body is visible";

export type Framing = { inFrame: boolean; message: string | null };

export const FRAMED: Framing = { inFrame: true, message: null };

// noPersonMs: how long no pose has been detected. A brief detection dropout shouldn't flash a message.
export function framingState(pose: Pose | null, noPersonMs: number): Framing {
  const issue = framingIssue(pose);
  if (!issue) return FRAMED;
  if (!pose) return { inFrame: false, message: noPersonMs >= NO_PERSON_MS ? STEP_BACK_MESSAGE : null };
  return { inFrame: false, message: issue };
}

export function sameFraming(a: Framing, b: Framing) {
  return a.inFrame === b.inFrame && a.message === b.message;
}
