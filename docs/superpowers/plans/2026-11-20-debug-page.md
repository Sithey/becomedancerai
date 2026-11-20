# Debug Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A dev-only `/debug` page that compares the learner with the video body part by body part and saves attempts to `debug-attempts/`.

**Architecture:** A pure `explainSegment` explains the live segment limb by limb; a dev-only route writes attempt files; a client `DebugSession` reuses the Practice building blocks.

**Tech Stack:** Next.js 16 (App Router, Cache Components), React 19, MediaPipe, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-20-debug-page-design.md`

## Global Constraints

- Dev only: page and route return 404 unless `process.env.NODE_ENV === "development"`.
- Reuse `DancerPanel`, `LearnerPanel`, `useWebcam`, `createPoseLandmarker`, `LearnerHistory`, `limbMotion`, `scoreSegment`; no new dependency; theme colors only; comments only for the why.
- Attempt files only under `debug-attempts/` with names made of `[a-z0-9-]` plus `.json`.

## Review Focus

1. A crafted `trendId`/`move` with `../` or slashes: the file still lands in `debug-attempts/` (Task 2 test).
2. Production build: `/debug` and `POST /api/debug-attempts` are 404 (Task 3 verification).
3. Learner out of frame while recording: frames are still recorded with `pose: null`, scoring skips them (Task 3).
4. Leaving the page: camera tracks stopped, landmarker closed, nothing saved unless Save was clicked (Task 3).
5. Trend with frames missing a pose: `explainSegment` reports the limb as not visible (Task 1 test).

---

### Task 1: Per-limb explanation

**Files:** Create `lib/pose/explain.ts`, test `lib/pose/explain.test.ts`.

**Interfaces:**
```ts
type LimbExplanation = { limb: LimbName; visible: boolean; videoDeg: number | null; learnerDeg: number | null;
                         diffDeg: number | null; score: number | null; videoAmp: number; learnerAmp: number }
directionDeg(dir: Vec): number   // atan2(x, y) in degrees: down 0, right 90, left -90, up 180
explainSegment(samples: LearnerSample[], learnerSize: FrameSize, frames: PoseFrame[], sampleMs: number,
               dancerSize: FrameSize, lagMs: number): LimbExplanation[]
  // one entry per LIMBS key (LIMBS order) for the latest sample; dancer frame = round((t − lagMs) / sampleMs);
  // amplitudes over all samples at that lag (`amplitude` from segment.ts); [] when samples is empty
```

- [ ] **Step 1: Tests** — `directionDeg` of (0,1), (1,0), (−1,0), (0,−1) → 0, 90, −90, 180; learner = dancer → 12 entries, `leftForearm` diff 0 and score 100; learner standing still while the dancer's forearm swings → `leftForearm.videoAmp > 15`, `learnerAmp < 1`; learner legs hidden → `leftShin.visible === false`, `score === null`; empty samples → `[]`.
- [ ] **Step 2: Run** `npx vitest run lib/pose/explain.test.ts`. Expected: FAIL (module missing).
- [ ] **Step 3: Implement** `explain.ts`.
- [ ] **Step 4: Run** the same. Expected: PASS.
- [ ] **Step 5: Commit** `feat: explain the live segment limb by limb (#26)`

### Task 2: Saving attempts (dev only)

**Files:** Create `lib/server/debug-attempts.ts`, `app/api/debug-attempts/route.ts`, test `lib/server/debug-attempts.test.ts`.

**Interfaces:** `debugEnabled(): boolean`; `attemptFileName(trendId: string, move: string, date: Date): string` = `<safe trendId>-<safe move>-<yyyymmdd>-<hhmmss>.json` (safe = lowercase, runs of anything but `[a-z0-9]` → `-`, trimmed); `saveAttempt(name: string, json: string): Promise<void>` writes under `debug-attempts/` (creates it). Route `POST`: 404 `{}` unless `debugEnabled()`; body JSON with string `trendId` and `move` else 400; returns `{ file: "debug-attempts/<name>" }`.

- [ ] **Step 1: Tests** — `attemptFileName("ab56605c0e5790cc4ce2447b", "move1", new Date(2026, 10, 20, 2, 15, 3))` → `"ab56605c0e5790cc4ce2447b-move1-20261120-021503.json"`; `attemptFileName("../../etc", "Full Run", d)` → starts with `"etc-full-run-"`, contains no `/` and no `..`; `debugEnabled()` false with `vi.stubEnv("NODE_ENV", "production")`, true with `"development"`.
- [ ] **Step 2: Run** `npx vitest run lib/server/debug-attempts.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** module and route.
- [ ] **Step 4: Run** the same. Expected: PASS.
- [ ] **Step 5: Commit** `feat: dev-only endpoint to save debug attempts (#26)`

### Task 3: The page

**Files:** Create `app/debug/page.tsx`, `components/dance/debug-session.tsx`.

- [ ] **Step 1: Page** — `notFound()` unless dev; Suspense loader awaits `searchParams`, `connection()`, `listTrends()`, `getTrend(trend)`; renders `<DebugSession trends trend />`.
- [ ] **Step 2: Client** — trend select (navigates to `?trend=<id>`), move select (`Move 1…N`, `Full`), speed 0.5/0.75/1 (default 0.75), mirror on, Start (enabled when camera + model ready), Record toggle, Save (POSTs `{ version: 1, trendId, trendTitle, move, speed, mirrored, webcam: {width, height}, sampleMs, recordedAt, frames: [{ t, wallMs, pose, world, score, lagMs }] }`, shows the returned file or the error). Live loop like Practice (`LearnerHistory` + `scoreSegment`, history cleared when the dancer isn't playing); the table from `explainSegment` at the best lag, worst score first, failing rows (score < `PASS_SCORE`) in `text-destructive`; refresh at most every 250 ms. Recording keeps `pose: null` frames.
- [ ] **Step 3: Verify** — `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`; dev: `/debug` and `/debug?trend=<id>` → 200, a POST writes a file in `debug-attempts/` (delete it after); production standalone server (`node .next/standalone/server.js` with `PORT=3200`): `/debug` → 404, POST → 404.
- [ ] **Step 4: Commit** `feat: dev-only debug page (#26)`
