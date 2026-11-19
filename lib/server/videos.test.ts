import { expect, test } from "vitest";
import { isValidVideoFileName } from "./videos";

test.each([
  ["abc123.mp4", true],
  ["../.env", false],
  ["a/b.mp4", false],
  ["ABC.mp4", false],
  ["abc.mov", false],
])("%s → %s", (n, ok) => expect(isValidVideoFileName(n)).toBe(ok));
