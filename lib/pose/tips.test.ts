import { expect, test } from "vitest";
import { tipFor } from "./tips";

test("tip names the worst failing limb", () => {
  expect(tipFor({ leftForearm: 40, rightShin: 60, rightUpperArm: 90 })).toBe("Watch your left arm");
  expect(tipFor({ rightShin: 20 })).toBe("Watch your right leg");
});
test("tips for hands, head and torso", () => {
  expect(tipFor({ leftHand: 10, leftForearm: 50 })).toBe("Watch your left hand");
  expect(tipFor({ rightHand: 10 })).toBe("Watch your right hand");
  expect(tipFor({ head: 10 })).toBe("Watch your head");
  expect(tipFor({ torso: 10 })).toBe("Watch your torso");
});
test("no tip when everything passes", () => {
  expect(tipFor({ leftForearm: 70 })).toBeNull();
  expect(tipFor({})).toBeNull();
});
