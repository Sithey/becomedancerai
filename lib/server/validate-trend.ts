import type { Move, NewTrend, PoseFrame } from "@/lib/pose/types";
import {
  MAX_DURATION_MS,
  MAX_TITLE_LENGTH,
  MAX_UPLOAD_BYTES,
  MIN_DETECTION_RATE,
  SAMPLE_MS,
} from "@/lib/pose/config";
import { hasMp4FileType } from "./videos";

const MAX_MOVES = 200;
const POSE_LANDMARKS = 33;

type Result = { ok: true; value: NewTrend; video: File } | { ok: false; error: string };

const fail = (error: string): Result => ({ ok: false, error });

function parseJson(value: FormDataEntryValue | null): unknown {
  if (typeof value !== "string") return undefined;
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

function positiveInt(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !/^\d+$/.test(value)) return null;
  const n = Number(value);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

const isNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

// Stored JSON is read back on every page view: accept only the exact shape, no extra keys.
function hasKeys(v: unknown, count: number): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v) && Object.keys(v).length === count;
}

function isLandmark(v: unknown) {
  return hasKeys(v, 3) && isNumber(v.x) && isNumber(v.y) && isNumber(v.v);
}

function isPoseFrames(v: unknown, maxFrames: number): v is PoseFrame[] {
  return (
    Array.isArray(v) &&
    v.length <= maxFrames &&
    v.every(
      (f) =>
        hasKeys(f, 2) &&
        isNumber(f.t) &&
        (f.pose === null ||
          (Array.isArray(f.pose) && f.pose.length === POSE_LANDMARKS && f.pose.every(isLandmark))),
    )
  );
}

function isMoves(v: unknown, durationMs: number): v is Move[] {
  return (
    Array.isArray(v) &&
    v.length > 0 &&
    v.length <= MAX_MOVES &&
    v.every(
      (m) =>
        hasKeys(m, 2) &&
        isNumber(m.startMs) &&
        isNumber(m.endMs) &&
        m.startMs >= 0 &&
        m.startMs < m.endMs &&
        m.endMs <= durationMs,
    )
  );
}

async function isMp4(video: File) {
  return hasMp4FileType(new Uint8Array(await video.slice(0, 16).arrayBuffer()));
}

export async function parseNewTrend(form: FormData): Promise<Result> {
  const video = form.get("video");
  const rawTitle = form.get("title");
  const title = typeof rawTitle === "string" ? rawTitle.trim() : "";
  if (!title) return fail("Title is required");
  if (title.length > MAX_TITLE_LENGTH) return fail(`Title must be ${MAX_TITLE_LENGTH} characters or fewer`);

  if (!(video instanceof File) || video.type !== "video/mp4" || video.size === 0) {
    return fail("Video must be an mp4");
  }
  if (video.size > MAX_UPLOAD_BYTES) return fail("Video must be under 50 MB");
  // The MIME type comes from the client: check the bytes too.
  if (!(await isMp4(video))) return fail("Video must be an mp4");

  const width = positiveInt(form.get("width"));
  const height = positiveInt(form.get("height"));
  const durationMs = positiveInt(form.get("durationMs"));
  const sampleMs = positiveInt(form.get("sampleMs"));
  // The client always samples at SAMPLE_MS; a smaller step would allow many more pose frames.
  if (!width || !height || !durationMs || sampleMs !== SAMPLE_MS) return fail("Video details are invalid");
  if (durationMs > MAX_DURATION_MS) return fail("Videos must be 90 seconds or shorter");

  const poses = parseJson(form.get("poses"));
  const maxFrames = Math.ceil(durationMs / sampleMs) + 2;
  if (!isPoseFrames(poses, maxFrames) || poses.length === 0) return fail("Pose data is invalid");
  const detected = poses.filter((f) => f.pose !== null).length;
  if (detected / poses.length < MIN_DETECTION_RATE) {
    return fail("We couldn't find a dancer in this video. Try one with a single dancer, full body visible.");
  }

  const moves = parseJson(form.get("moves"));
  if (!isMoves(moves, durationMs)) return fail("Move data is invalid");

  return { ok: true, value: { title, width, height, durationMs, sampleMs, poses, moves }, video };
}
