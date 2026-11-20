import { expect, test } from "vitest";
import { FRAMED, framingState, NO_PERSON_MS, STEP_BACK_MESSAGE } from "./framing-state";
import { standingPose, withPoint } from "./test-poses";

test("whole body in frame needs no ghost", () => {
  expect(framingState(standingPose(), 0)).toBe(FRAMED);
});

test("no one detected stays quiet for the first 2 seconds", () => {
  expect(framingState(null, NO_PERSON_MS - 1)).toEqual({ inFrame: false, message: null });
});

test("no one detected for 2 seconds asks to step back", () => {
  expect(framingState(null, NO_PERSON_MS)).toEqual({ inFrame: false, message: STEP_BACK_MESSAGE });
});

test("other framing issues show their own message right away", () => {
  const pose = withPoint(standingPose(), 15, 0.58, 1.1);
  expect(framingState(pose, 0)).toEqual({ inFrame: false, message: "Your hands leave the frame" });
});
