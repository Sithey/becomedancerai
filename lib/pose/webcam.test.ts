import { expect, test } from "vitest";
import { webcamErrorStatus } from "./webcam";

test("maps getUserMedia errors", () => {
  expect(webcamErrorStatus(new DOMException("", "NotAllowedError"))).toBe("denied");
  expect(webcamErrorStatus(new DOMException("", "SecurityError"))).toBe("denied");
  expect(webcamErrorStatus(new DOMException("", "NotFoundError"))).toBe("unavailable");
  expect(webcamErrorStatus(new Error("x"))).toBe("unavailable");
});
