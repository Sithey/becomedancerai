import { describe, expect, test } from "vitest";
import { comparePoses, limbScore } from "./compare";
import { fromMediaPipe, limbDirection } from "./landmarks";
import { standingPose, withPoint } from "./test-poses";

const SQUARE = { width: 1000, height: 1000 };

describe("comparePoses", () => {
  test("identical poses score 100 on every limb", () => {
    const r = comparePoses(standingPose(), SQUARE, standingPose(), SQUARE);
    expect(Object.keys(r.limbs)).toHaveLength(8);
    expect(r.score).toBeCloseTo(100);
  });

  test("forearm 45° off scores 50, 90° and opposite score 0", () => {
    const dancer = withPoint(withPoint(standingPose(), 13, 0.5, 0.5), 15, 0.5, 0.6);
    const s = Math.SQRT1_2 * 0.1;
    const diag = withPoint(dancer, 15, 0.5 + s, 0.5 + s);
    const side = withPoint(dancer, 15, 0.6, 0.5);
    const up = withPoint(dancer, 15, 0.5, 0.4);
    expect(comparePoses(diag, SQUARE, dancer, SQUARE).limbs.leftForearm).toBeCloseTo(50);
    expect(comparePoses(side, SQUARE, dancer, SQUARE).limbs.leftForearm).toBeCloseTo(0);
    expect(comparePoses(up, SQUARE, dancer, SQUARE).limbs.leftForearm).toBeCloseTo(0);
  });

  test("within 20° scores 100", () => {
    const a = { x: 0, y: 1 };
    const b = { x: Math.sin(Math.PI / 10), y: Math.cos(Math.PI / 10) };
    expect(limbScore(a, b)).toBe(100);
  });

  test("bigger and shifted learner still scores 100", () => {
    const scaled = standingPose().map((l) => ({ ...l, x: 0.2 + l.x * 1.3, y: l.y * 1.3 - 0.1 }));
    expect(comparePoses(scaled, SQUARE, standingPose(), SQUARE).score).toBeCloseTo(100);
  });

  test("direction accounts for frame aspect ratio", () => {
    const p = withPoint(withPoint(standingPose(), 13, 0.5, 0.5), 15, 0.6, 0.6);
    const d = limbDirection(p, "leftForearm", { width: 1000, height: 2000 })!;
    expect(d.x).toBeCloseTo(1 / Math.sqrt(5));
    expect(d.y).toBeCloseTo(2 / Math.sqrt(5));
  });

  test("limbs not visible are left out", () => {
    let legsHidden = standingPose();
    for (const i of [25, 26, 27, 28]) legsHidden = withPoint(legsHidden, i, 0.5, 0.9, 0.1);
    const r = comparePoses(legsHidden, SQUARE, standingPose(), SQUARE);
    expect(Object.keys(r.limbs).sort()).toEqual([
      "leftForearm",
      "leftUpperArm",
      "rightForearm",
      "rightUpperArm",
    ]);
  });

  test("nothing visible gives a null score", () => {
    const hidden = standingPose().map((l) => ({ ...l, v: 0 }));
    expect(comparePoses(hidden, SQUARE, standingPose(), SQUARE).score).toBeNull();
  });
});

describe("fromMediaPipe", () => {
  test("rounds x, y and visibility to 3 decimals", () => {
    expect(fromMediaPipe([{ x: 0.123456, y: 0.98765, visibility: 0.55555 }])).toEqual([
      { x: 0.123, y: 0.988, v: 0.556 },
    ]);
  });
});
