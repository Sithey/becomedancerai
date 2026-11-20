import { expect, test } from "vitest";
import { framingIssue } from "./framing";
import { standingPose, withPoint } from "./test-poses";

test("nobody detected", () => {
  expect(framingIssue(null)).toBe("No one detected");
});

test("whole body in frame is fine", () => {
  expect(framingIssue(standingPose())).toBeNull();
});

test("feet below the frame or hidden ask to step back", () => {
  expect(framingIssue(withPoint(standingPose(), 27, 0.53, 1.2))).toBe("Step back: your feet aren't in the frame");
  expect(framingIssue(withPoint(standingPose(), 28, 0.47, 0.85, 0.1))).toBe("Step back: your feet aren't in the frame");
});

test("hands leaving the frame are reported", () => {
  expect(framingIssue(withPoint(standingPose(), 15, 0.58, 1.1))).toBe("Your hands leave the frame");
});
