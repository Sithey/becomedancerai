import { expect, test } from "vitest";
import { parseNewTrend } from "./validate-trend";

const pose = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, v: 1 }));
const FTYP = Buffer.from("000000186674797069736f6d00000000", "hex");

function mp4(bytes: number) {
  const data = new Uint8Array(bytes);
  data.set(FTYP.subarray(0, Math.min(bytes, FTYP.length)));
  return new File([data], "a.mp4", { type: "video/mp4" });
}

function halfDetected(total: number, detected: number) {
  return Array.from({ length: total }, (_, i) => ({ t: i * 50, pose: i < detected ? pose : null }));
}

function evenMoves(count: number, durationMs = 5000) {
  const step = durationMs / count;
  return Array.from({ length: count }, (_, i) => ({ startMs: i * step, endMs: (i + 1) * step }));
}

function withPose(override: unknown) {
  const frames: unknown[] = halfDetected(100, 100);
  frames[0] = { t: 0, pose: override };
  return JSON.stringify(frames);
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

test("valid form passes", async () => expect((await parseNewTrend(validForm())).ok).toBe(true));

test.each([
  [{ moves: JSON.stringify(evenMoves(200)) }],
  // 5000 ms at 50 ms is 100 frames; a couple of extra frames is tolerated.
  [{ poses: JSON.stringify(halfDetected(102, 102)) }],
])("accepts the limits %#", async (override) => expect((await parseNewTrend(validForm(override))).ok).toBe(true));

test.each([
  [{ title: "  " }, "Title is required"],
  [{ title: "x".repeat(33) }, "Title must be 32 characters or fewer"],
  [{ video: new File([new Uint8Array(10)], "a.mov", { type: "video/quicktime" }) }, "Video must be an mp4"],
  [{ video: mp4(0) }, "Video must be an mp4"],
  [{ video: new File([new Uint8Array(1024)], "a.mp4", { type: "video/mp4" }) }, "Video must be an mp4"],
  [{ video: new File(["<html></html>"], "a.mp4", { type: "video/mp4" }) }, "Video must be an mp4"],
  [{ video: mp4(50 * 1024 * 1024 + 1) }, "Video must be under 50 MB"],
  [{ durationMs: "90001" }, "Videos must be 90 seconds or shorter"],
  [{ width: "0" }, "Video details are invalid"],
  [{ sampleMs: "1" }, "Video details are invalid"],
  [{ poses: "not json" }, "Pose data is invalid"],
  [{ poses: JSON.stringify(halfDetected(103, 103)) }, "Pose data is invalid"],
  [{ poses: withPose([]) }, "Pose data is invalid"],
  [{ poses: withPose(pose.slice(1)) }, "Pose data is invalid"],
  [{ poses: withPose([{ v: 1 }, ...pose.slice(1)]) }, "Pose data is invalid"],
  [{ poses: withPose([{ x: "0.5", y: 0.5, v: 1 }, ...pose.slice(1)]) }, "Pose data is invalid"],
  [{ poses: withPose([{ x: 0.5, y: 0.5, v: 1, junk: "x" }, ...pose.slice(1)]) }, "Pose data is invalid"],
  [{ poses: JSON.stringify([{ t: 0, pose, junk: "x" }]) }, "Pose data is invalid"],
  [
    { poses: JSON.stringify(halfDetected(100, 49)) },
    "We couldn't find a dancer in this video. Try one with a single dancer, full body visible.",
  ],
  [{ moves: "[]" }, "Move data is invalid"],
  [{ moves: JSON.stringify([{ startMs: 0, endMs: 6000 }]) }, "Move data is invalid"],
  [{ moves: JSON.stringify(evenMoves(201)) }, "Move data is invalid"],
  [{ moves: JSON.stringify([{ startMs: 0, endMs: 5000, x: "junk" }]) }, "Move data is invalid"],
])("rejects %o", async (override, error) =>
  expect(await parseNewTrend(validForm(override))).toEqual({ ok: false, error }),
);
