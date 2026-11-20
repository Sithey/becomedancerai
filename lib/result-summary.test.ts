import { expect, test } from "vitest";
import { resultSummary } from "./result-summary";

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
