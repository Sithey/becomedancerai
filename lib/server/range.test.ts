import { expect, test } from "vitest";
import { parseRange } from "./range";

test.each([
  ["bytes=0-99", { start: 0, end: 99 }],
  ["bytes=500-", { start: 500, end: 999 }],
  ["bytes=-200", { start: 800, end: 999 }],
  ["bytes=0-5000", { start: 0, end: 999 }],
])("%s", (h, r) => expect(parseRange(h, 1000)).toEqual(r));

test("past the end is unsatisfiable", () => expect(parseRange("bytes=1000-", 1000)).toBe("unsatisfiable"));

test.each([null, "items=0-1", "bytes=0-1,5-6"])("%s sends the whole file", (h) =>
  expect(parseRange(h, 1000)).toBeNull(),
);
