import { expect, test } from "vitest";
import { parseNewTrend } from "./validate-trend";

const pose = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, v: 1 }));

function mp4(bytes: number) {
  return new File([new Uint8Array(bytes)], "a.mp4", { type: "video/mp4" });
}

function halfDetected(total: number, detected: number) {
  return Array.from({ length: total }, (_, i) => ({ t: i * 50, pose: i < detected ? pose : null }));
}

function validForm(override: Record<string, string | File> = {}) {
  const fields: Record<string, string | File> = {
    video: mp4(1024),
    title: "Renegade",
    width: "320",
    height: "568",
    durationMs: "5000",
    sampleMs: "50",
    poses: JSON.stringify(halfDetected(100, 100)),
    moves: JSON.stringify([
      { startMs: 0, endMs: 2000 },
      { startMs: 2000, endMs: 4000 },
      { startMs: 4000, endMs: 5000 },
    ]),
    ...override,
  };
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.set(k, v);
  return form;
}

test("valid form passes", () => expect(parseNewTrend(validForm()).ok).toBe(true));

test.each([
  [{ title: "  " }, "Title is required"],
  [{ title: "x".repeat(33) }, "Title must be 32 characters or fewer"],
  [{ video: new File([new Uint8Array(10)], "a.mov", { type: "video/quicktime" }) }, "Video must be an mp4"],
  [{ video: mp4(0) }, "Video must be an mp4"],
  [{ video: mp4(50 * 1024 * 1024 + 1) }, "Video must be under 50 MB"],
  [{ durationMs: "90001" }, "Videos must be 90 seconds or shorter"],
  [{ width: "0" }, "Video details are invalid"],
  [{ poses: "not json" }, "Pose data is invalid"],
  [
    { poses: JSON.stringify(halfDetected(100, 49)) },
    "We couldn't find a dancer in this video. Try one with a single dancer, full body visible.",
  ],
  [{ moves: "[]" }, "Move data is invalid"],
  [{ moves: JSON.stringify([{ startMs: 0, endMs: 6000 }]) }, "Move data is invalid"],
])("rejects %o", (override, error) => expect(parseNewTrend(validForm(override))).toEqual({ ok: false, error }));
