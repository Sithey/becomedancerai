import { expect, test } from "vitest";
import { tipFor } from "./tips";

const down = { x: 0, y: 1 };
const up = { x: 0, y: -1 };
const right = { x: 1, y: 0 };
const left = { x: -1, y: 0 };

test("raises the left arm when the learner points lower than the dancer", () => {
  expect(tipFor({ leftUpperArm: 20 }, { leftUpperArm: down }, { leftUpperArm: up })).toBe(
    "Raise your left arm",
  );
});

test("lowers the right arm when the learner points higher than the dancer", () => {
  expect(tipFor({ rightForearm: 20 }, { rightForearm: up }, { rightForearm: down })).toBe(
    "Lower your right arm",
  );
});

test("bends the left knee when the learner's leg is straighter than the dancer's", () => {
  expect(
    tipFor(
      { leftShin: 25 },
      { leftThigh: down, leftShin: down },
      { leftThigh: down, leftShin: right },
    ),
  ).toBe("Bend your left knee");
});

test("straightens the right knee when the learner's leg is more bent than the dancer's", () => {
  expect(
    tipFor(
      { rightThigh: 25 },
      { rightThigh: right, rightShin: down },
      { rightThigh: down, rightShin: down },
    ),
  ).toBe("Straighten your right knee");
});

test("uses a generic leg cue when the knee angle is unclear", () => {
  expect(
    tipFor(
      { leftShin: 25 },
      { leftThigh: down, leftShin: right },
      { leftThigh: down, leftShin: left },
    ),
  ).toBe("Watch your left leg");
  expect(tipFor({ rightShin: 25 }, { rightShin: right }, { rightShin: down })).toBe(
    "Watch your right leg",
  );
});

test("coaches only the lowest-scoring failing limb", () => {
  expect(
    tipFor(
      { leftForearm: 60, rightShin: 20, rightUpperArm: 90 },
      { leftForearm: down, rightThigh: down, rightShin: down },
      { leftForearm: up, rightThigh: down, rightShin: right },
    ),
  ).toBe("Bend your right knee");
});

test("gives no arm cue for a purely horizontal mismatch or missing direction", () => {
  expect(tipFor({ leftForearm: 20 }, { leftForearm: left }, { leftForearm: right })).toBeNull();
  expect(tipFor({ leftForearm: 20 }, { leftForearm: down }, {})).toBeNull();
});

test("no tip when everything passes", () => {
  expect(tipFor({ leftForearm: 70 }, { leftForearm: down }, { leftForearm: up })).toBeNull();
  expect(tipFor({}, {}, {})).toBeNull();
});
