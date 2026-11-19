import { expect, test } from "vitest";
import { tipFor } from "./tips";

test("tip names the worst failing limb", () => {
  expect(tipFor({ leftForearm: 40, rightShin: 60, rightUpperArm: 90 })).toBe("Watch your left arm");
  expect(tipFor({ rightShin: 20 })).toBe("Watch your right leg");
});
test("no tip when everything passes", () => {
  expect(tipFor({ leftForearm: 70 })).toBeNull();
  expect(tipFor({})).toBeNull();
});
