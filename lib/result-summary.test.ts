import { expect, test } from "vitest";
import { applyPartRetry, resultSummary, summarizeAttempt } from "./result-summary";

test("every part passed", () => {
  expect(resultSummary([91, 75, 80])).toEqual({
    title: "You've got this trend.",
    detail: "Every part passed. Time to film your version.",
  });
});

test("some parts are weak", () => {
  expect(resultSummary([91, 64, null])).toEqual({
    title: "Almost there.",
    detail: "1 part is still shaky. Practice it, then try again.",
  });
  expect(resultSummary([50, 64, 90]).detail).toBe("2 parts are still shaky. Practice them, then try again.");
});

test("nothing scored is not a success", () => {
  expect(resultSummary([null, null])).toEqual({
    title: "No score this time.",
    detail: "We couldn't see you during the run. Check your framing and try again.",
  });
  expect(resultSummary([]).title).toBe("No score this time.");
});

test("unscored parts don't count as passed", () => {
  expect(resultSummary([91, null]).title).toBe("Almost there.");
});

test("a session keeps low scores with their own move and leaves missing scores blank", () => {
  const correction = { limb: "head", problem: "Your head was out of position.", tip: "Watch your head" } as const;
  const moves = [
    { startMs: 0, endMs: 1000 },
    { startMs: 1000, endMs: 2000 },
    { startMs: 2000, endMs: 3000 },
  ];
  expect(summarizeAttempt(moves, [
    { timeMs: 500, score: 30, correction },
    { timeMs: 900, score: 50 },
    { timeMs: 1000, score: 90 },
  ])).toEqual({
    final: 57,
    parts: [{ score: 40, correction }, { score: 90 }, { score: null }],
  });
});

test("a retry updates only its own move and preserves the original session score", () => {
  const result = { final: 50, parts: [{ score: 40 }, { score: 60 }] };
  expect(applyPartRetry(result, 0, { score: null })).toBe(result);
  expect(applyPartRetry(result, 0, { score: 35 })).toBe(result);
  expect(applyPartRetry(result, 0, { score: 80 })).toEqual({
    final: 50,
    parts: [{ score: 80 }, { score: 60 }],
  });
});
