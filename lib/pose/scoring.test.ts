import { describe, expect, test } from "vitest";
import { LimbSmoother, averageScore, isPassed } from "./scoring";

describe("scoring", () => {
  test("smoother averages the last 500 ms", () => {
    const s = new LimbSmoother();
    s.push(0, { leftForearm: 100 });
    s.push(200, { leftForearm: 50 });
    expect(s.current(300).leftForearm).toBe(75);
    expect(s.current(600).leftForearm).toBe(50);
  });
  test("averageScore ignores nulls", () => {
    expect(averageScore([80, null, 60])).toBe(70);
    expect(averageScore([null])).toBeNull();
  });
  test("pass level is 70", () => {
    expect(isPassed(70)).toBe(true);
    expect(isPassed(69.9)).toBe(false);
    expect(isPassed(null)).toBe(false);
  });
});
