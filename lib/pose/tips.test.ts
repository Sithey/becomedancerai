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

test("falls back to a generic arm cue for a purely horizontal mismatch or missing direction", () => {
  expect(tipFor({ leftForearm: 20 }, { leftForearm: left }, { leftForearm: right })).toBe("Watch your left arm");
  expect(tipFor({ leftForearm: 20 }, { leftForearm: down }, {})).toBe("Watch your left arm");
});

test("no tip when everything passes", () => {
  expect(tipFor({ leftForearm: 70 }, { leftForearm: down }, { leftForearm: up })).toBeNull();
  expect(tipFor({}, {}, {})).toBeNull();
});

test("hands never get a raise/lower cue", () => {
  expect(tipFor({ leftHand: 10 }, { leftHand: down }, { leftHand: up })).toBe("Watch your left hand");
  expect(tipFor({ rightHand: 10 }, { rightHand: up }, { rightHand: down })).toBe("Watch your right hand");
});

test("a sideways arm error is not a raise/lower cue", () => {
  const learner = { x: 0.8, y: 0.6 };
  const dancer = { x: -0.8, y: 0.6 };
  expect(tipFor({ leftForearm: 20 }, { leftForearm: learner }, { leftForearm: dancer })).toBe("Watch your left arm");
});

test("a small angle error is not a raise/lower cue", () => {
  const a = { x: 0, y: 1 };
  const b = { x: Math.sin(0.2), y: Math.cos(0.2) };
  expect(tipFor({ leftForearm: 20 }, { leftForearm: a }, { leftForearm: b })).toBe("Watch your left arm");
});

test("the tip names the limb with the most weighted impact", () => {
  const limbs = { leftForearm: 60, rightShin: 50 };
  const learner = { leftForearm: down, rightThigh: down, rightShin: down };
  const dancer = { leftForearm: up, rightThigh: down, rightShin: right };
  expect(tipFor(limbs, learner, dancer)).toBe("Bend your right knee");
  expect(tipFor(limbs, learner, dancer, { leftForearm: 2, rightShin: 0.1 })).toBe("Raise your left arm");
});

test("head and torso have no side", () => {
  expect(tipFor({ head: 10 }, { head: up }, { head: right })).toBe("Watch your head");
  expect(tipFor({ torso: 10 }, { torso: up }, { torso: right })).toBe("Watch your torso");
});
