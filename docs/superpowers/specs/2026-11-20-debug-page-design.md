# Debug page: design

Date: 2026-11-20. Status: approved by Raphael. Builds on
`2026-11-20-stricter-scoring-design.md` (needs `scoreSegment`).

## Intent

Raphael can't pass "bisou" and only gets better results after moving the camera. He wants a
test page where he picks a trend, dances, and sees body part by body part what the video does
versus what he does, and where his attempts are saved so Claude can analyze them offline and
tune the scoring with real data instead of simulations.

## Goals

- Pick a trend and a move (or the full dance), choose the speed, start when camera and model are
  ready.
- Live table, one row per scored body part: video angle, learner angle, difference, score,
  movement amplitude (video / learner), visible or not. Failing rows in the destructive color.
  Above it: live segment score and detected delay.
- Record an attempt and save it to `debug-attempts/` (git-ignored) on the dev machine: per webcam
  frame the dancer time, the learner's 2D landmarks, MediaPipe's 3D world landmarks, and the
  live result. No video.
- Dev only (Raphael): in any other mode the page and the save endpoint return 404.

## Non-goals

- No link from the app's navigation. No production use. No dancer 3D re-extraction (later, if the
  data says 3D comparison is needed).

## Approach

One sensible way: reuse the Practice building blocks (`DancerPanel`, `LearnerPanel`,
`useWebcam`, `createPoseLandmarker`, `LearnerHistory`, `scoreSegment`) in a separate dev-only
page, plus one pure function that explains a segment limb by limb, and one dev-only route that
writes the attempt file. Changing the Practice screen instead was rejected: it's the demo screen
and students work on it.

## Design

- `app/debug/page.tsx`: `notFound()` unless `process.env.NODE_ENV === "development"`; otherwise
  lists trends and loads the one in `?trend=<id>` (Suspense + `connection()`).
- `components/dance/debug-session.tsx` (client): controls (trend select, move select incl.
  "Full", speed 0.5/0.75/1, Start gated on camera + model, Record toggle, Save), the two panels,
  the live score/delay line and the table, refreshed at most every 250 ms.
- `lib/pose/explain.ts` (pure, tested): `directionDeg(dir)` = angle from straight down, in
  degrees (positive toward the image's right); `explainSegment(samples, learnerSize, frames,
  sampleMs, dancerSize, lagMs)` → per limb, for the latest sample at that lag: video and learner
  angle, difference, angle score (`limbScore`), video and learner amplitude over the segment,
  visible.
- `lib/server/debug-attempts.ts` (tested): `debugEnabled()`, `attemptFileName(trendId, move,
  date)` (safe characters only), `saveAttempt(json)`.
- `app/api/debug-attempts/route.ts`: POST, 404 unless dev; writes
  `debug-attempts/<trend>-<move>-<yyyymmdd-hhmmss>.json`; returns `{ file }`.
- `.gitignore`: `debug-attempts/`.

## Left to the builder

Table styling, row order (by score, worst first, is fine), exact JSON field names (documented in
the file itself with a `version` field).
