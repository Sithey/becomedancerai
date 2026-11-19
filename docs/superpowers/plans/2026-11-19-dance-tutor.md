# Dance Tutor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the base of the dance tutor: upload a TikTok dance, read the dancer's poses in
the browser, split it into moves, learn it move by move, then practice with the webcam scoring
each limb, end to end, ready for students to extend through issues.

**Architecture:** One Next.js app. All computer vision runs in the browser with MediaPipe Pose
Landmarker (on the uploaded video once, on the webcam live). The pure math (limb directions,
comparison, move split, scoring, tips) lives in `lib/pose/` and is unit-tested with Vitest.
The server only stores trends (Postgres via Prisma) and video files (disk), and streams videos
with Range support.

**Tech Stack:** Next.js 16.4 (App Router, TypeScript), Tailwind, shadcn/ui, Prisma 7.10 +
`@prisma/adapter-pg`, Postgres, `@mediapipe/tasks-vision` 1.2.3, Vitest 5, Docker on Coolify.

**Spec:** `docs/superpowers/specs/2026-11-19-dance-tutor-design.md`

## Global Constraints

- Read `node_modules/next/dist/docs/` before using a Next.js API; don't trust memory (Next 16:
  `params` is a Promise, `proxy.ts` replaces middleware).
- No `proxy.ts` / middleware: when present, Next buffers request bodies and caps them at 10 MB,
  which breaks video uploads.
- Pages that read the database call `await connection()` (from `next/server`) first: the
  Docker build has no database and must not prerender them.
- Prisma client only through `lib/server/db.ts`. Schema changes and migrations are run by
  Raphael himself, never by an agent.
- Allowed new dependencies: the Prisma set from `docs/team/THURSDAY-CHECKLIST.md`,
  `@mediapipe/tasks-vision@1.2.3`, `vitest@5` (dev). Nothing else.
- Colors only from theme variables in `app/globals.css`; dark theme (`<html class="dark">`).
  Skeleton color `--primary`, wrong limbs `--destructive`.
- MediaPipe WASM and model are served from `/mediapipe/` in our own app, never a CDN.
- Never commit videos: `uploads/` and `*.mp4` are git-ignored. The repo is public: no `.env`.
- Spec values (one source: `lib/pose/config.ts`): pass level **70**; timing window **−400 ms /
  +100 ms**; smoothing **500 ms**; moves **2000–4000 ms**; visibility threshold **0.5**;
  sample step **50 ms**; score falls to 0 at **120°** limb difference.
- Uploads: mp4 only, **≤ 50 MB**, duration **≤ 90 s**, dancer detected in **≥ 50%** of frames.
- Webcam needs a secure context: `localhost` in dev, HTTPS in prod.
- Desktop only. English everywhere. Comments only for the why.

## Review Focus

1. **Camera blocked or missing:** the learner panel says why (copy in Task 9), never a silent
   black box. Test: `webcamErrorStatus` in Task 9.
2. **Learner steps out of frame:** frames with no learner pose are skipped, not scored as 0, so
   a move isn't failed while you walk back. Test: `averageScore` / `bestMatch` null cases in
   Task 5.
3. **Upload where the dancer is barely detected:** rejected with a clear message instead of
   saving a useless trend. Test: `parseNewTrend` detection-rate case in Task 6.
4. **Path traversal on the public video route:** only `^[a-z0-9]+\.mp4$` names are served.
   Test: `isValidVideoFileName` in Task 6.
5. **Last move never loops:** `currentTime` may never reach `endMs` at the end of the video;
   the dancer panel also loops on `ended`. Verification step in Task 8.

## File Structure

```
lib/pose/                    pure + browser pose code (client side, NOT lib/server)
  config.ts                  tuning constants (spec values)
  types.ts                   Landmark, Pose, PoseFrame, Move, LimbName, TrendData…
  landmarks.ts               LIMBS map, limbDirection, fromMediaPipe
  compare.ts                 limbScore, comparePoses
  split.ts                   motionAt, splitMoves
  scoring.ts                 framesInWindow, bestMatch, LimbSmoother, averageScore, isPassed, failingLimbs
  tips.ts                    tipFor
  test-poses.ts              test fixtures (imported only by *.test.ts)
  landmarker.ts              createPoseLandmarker (browser)
  extract.ts                 extractPoses (browser)
  draw.ts                    drawSkeleton, themeColor (browser)
  webcam.ts                  useWebcam, webcamErrorStatus (browser)
lib/server/
  db.ts                      shared Prisma client (checklist)
  trends.ts                  listTrends, getTrend, createTrend
  videos.ts                  UPLOAD_DIR, saveVideo, videoFilePath, isValidVideoFileName
  range.ts                   parseRange
  validate-trend.ts          parseNewTrend
app/
  page.tsx                   Library
  trends/new/page.tsx        Add a trend
  trends/[id]/page.tsx       Learn
  trends/[id]/practice/page.tsx
  trends/[id]/run/page.tsx   Full run
  api/trends/route.ts        POST upload
  api/videos/[file]/route.ts GET with Range
components/dance/
  dancer-panel.tsx           darkened video + skeleton, loops a range
  learner-panel.tsx          mirrored webcam + skeleton canvas
  add-trend-form.tsx
  learn-view.tsx
  practice-session.tsx       live loop, moves + full-run modes
scripts/copy-mediapipe.mjs   copies WASM into public/mediapipe/wasm (postinstall)
public/mediapipe/pose_landmarker_full.task   committed model (Apache 2.0)
Dockerfile, .dockerignore
vitest.config.mts
```

---

### Task 1: Base project, theme, MediaPipe assets, Vitest

**Files:**
- Create: Next.js scaffold (per `docs/team/THURSDAY-CHECKLIST.md` steps 1–4), `scripts/copy-mediapipe.mjs`, `public/mediapipe/pose_landmarker_full.task`, `vitest.config.mts`, `lib/pose/config.ts`
- Modify: `package.json`, `.gitignore`, `app/layout.tsx`, `AGENTS.md` (append Next's managed block only)

**Interfaces:**
- Produces: `/mediapipe/wasm/vision_wasm_internal.{js,wasm}` and `/mediapipe/pose_landmarker_full.task` served by the app; `npm test` runs Vitest; `lib/pose/config.ts` exports `PASS_SCORE = 70`, `WINDOW_BEFORE_MS = 400`, `WINDOW_AFTER_MS = 100`, `SMOOTHING_MS = 500`, `MOVE_MIN_MS = 2000`, `MOVE_MAX_MS = 4000`, `MIN_VISIBILITY = 0.5`, `SAMPLE_MS = 50`, `MAX_ANGLE_DEG = 120`, `MAX_UPLOAD_BYTES = 50 * 1024 * 1024`, `MAX_DURATION_MS = 90_000`, `MIN_DETECTION_RATE = 0.5`.

- [ ] **Step 1: Scaffold** with checklist steps 1–4 (create-next-app next to the repo, rsync in, `npx shadcn@latest init`, `output: 'standalone'`). Add shadcn components `button`, `card`, `progress`, `input`, `label`, `toggle-group`, `badge`.
- [ ] **Step 2: Install** `npm i @mediapipe/tasks-vision@1.2.3` and `npm i -D vitest@5`.
- [ ] **Step 3: Write `scripts/copy-mediapipe.mjs`**: copies only `vision_wasm_internal.js` and `vision_wasm_internal.wasm` from `node_modules/@mediapipe/tasks-vision/wasm/` to `public/mediapipe/wasm/` (create the folder). `package.json` scripts: `"postinstall": "prisma generate && node scripts/copy-mediapipe.mjs"` (the `prisma generate` part becomes valid in Task 2; until then use only the copy), `"test": "vitest run"`.
- [ ] **Step 4: Download the model** from `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task` into `public/mediapipe/` and commit it.
- [ ] **Step 5: `.gitignore`** add `public/mediapipe/wasm/`, `uploads/`, `*.mp4`.
- [ ] **Step 6: `vitest.config.mts`**: `test: { environment: "node", include: ["lib/**/*.test.ts"] }`, alias `@` → project root.
- [ ] **Step 7: Dark theme**: `app/layout.tsx` sets `className="dark"` on `<html>`, title "Dance Tutor".
- [ ] **Step 8: Write `lib/pose/config.ts`** with the constants above.
- [ ] **Step 9: Verify**

Run: `npm run build && npm test -- --passWithNoTests`, then `npm run dev` and `curl -sI localhost:3000/mediapipe/wasm/vision_wasm_internal.wasm`, `curl -sI localhost:3000/mediapipe/pose_landmarker_full.task`
Expected: build succeeds; both curls `200`.

- [ ] **Step 10: Commit** `chore: scaffold Next.js base with MediaPipe assets and Vitest`

### Task 2: Database and trend storage

**Files:**
- Create: `prisma/schema.prisma` model, `lib/server/db.ts`, `lib/server/trends.ts`, `lib/pose/types.ts`
- Modify: `package.json` (Prisma deps, postinstall), `.env.example` (`UPLOAD_DIR=`)

**Interfaces:**
- Produces (`lib/pose/types.ts`):
  ```ts
  type Landmark = { x: number; y: number; v: number }   // normalized x,y; v = visibility
  type Pose = Landmark[]                                 // 33 entries, MediaPipe order
  type PoseFrame = { t: number; pose: Pose | null }      // t = ms from video start
  type Move = { startMs: number; endMs: number }
  type FrameSize = { width: number; height: number }
  type LimbName = "leftUpperArm" | "leftForearm" | "rightUpperArm" | "rightForearm"
                | "leftThigh" | "leftShin" | "rightThigh" | "rightShin"
  type LimbScores = Partial<Record<LimbName, number>>    // only limbs that were scored
  type Vec = { x: number; y: number }
  type TrendData = { id: string; title: string; videoUrl: string; width: number; height: number;
                     durationMs: number; sampleMs: number; poses: PoseFrame[]; moves: Move[] }
  type TrendSummary = { id: string; title: string; videoUrl: string; durationMs: number; moveCount: number }
  type NewTrend = { title: string; width: number; height: number; durationMs: number;
                    sampleMs: number; poses: PoseFrame[]; moves: Move[] }
  ```
- Produces (`lib/server/trends.ts`): `listTrends(): Promise<TrendSummary[]>` (newest first, **never selects `poses`**), `getTrend(id: string): Promise<TrendData | null>`. `videoUrl` = `/api/videos/<videoFile>`. (`createTrend` comes in Task 6.)

- [ ] **Step 1: Prisma setup** per checklist step 5 (Raphael does this by hand: Prisma 7, generator `prisma-client` with explicit `output`, pg adapter, shared client in `lib/server/db.ts`).
- [ ] **Step 2: Model**
  ```prisma
  model Trend {
    id         String   @id @default(cuid())
    title      String
    videoFile  String
    width      Int
    height     Int
    durationMs Int
    sampleMs   Int
    poses      Json
    moves      Json
    createdAt  DateTime @default(now())
  }
  ```
- [ ] **Step 3: Raphael runs** `npx prisma migrate dev --name trend` against the dev database (agents don't).
- [ ] **Step 4: Write `lib/pose/types.ts`** and `listTrends` / `getTrend` in `lib/server/trends.ts`. `moveCount` comes from the `moves` JSON length; select `moves` but not `poses` in the list query.
- [ ] **Step 5: Verify** `npx prisma studio` shows the empty `Trend` table and `npm run build` passes (`listTrends` gets exercised by the Library in Task 8).
- [ ] **Step 6: Commit** `feat: trend model and storage`

### Task 3: Limb directions and pose comparison

**Files:**
- Create: `lib/pose/landmarks.ts`, `lib/pose/compare.ts`, `lib/pose/test-poses.ts`
- Test: `lib/pose/compare.test.ts`

**Interfaces:**
- Consumes: types (Task 2), config (Task 1).
- Produces:
  - `LIMBS: Record<LimbName, [number, number]>` = leftUpperArm `[11,13]`, leftForearm `[13,15]`, rightUpperArm `[12,14]`, rightForearm `[14,16]`, leftThigh `[23,25]`, leftShin `[25,27]`, rightThigh `[24,26]`, rightShin `[26,28]`.
  - `limbDirection(pose: Pose, limb: LimbName, size: FrameSize): Vec | null`: unit vector of `((b.x−a.x)·width, (b.y−a.y)·height)`; `null` if either end has `v < MIN_VISIBILITY` or zero length.
  - `fromMediaPipe(landmarks: { x: number; y: number; visibility: number }[]): Pose`: rounds x, y, v to 3 decimals.
  - `limbScore(a: Vec, b: Vec): number`: `clamp(100 · (1 − angleDeg / MAX_ANGLE_DEG), 0, 100)`.
  - `type PoseComparison = { limbs: LimbScores; score: number | null; matchT?: number }`
  - `comparePoses(learner: Pose, learnerSize: FrameSize, dancer: Pose, dancerSize: FrameSize): PoseComparison`: score each limb visible in both; `score` = mean of scored limbs, `null` if none.
- Fixtures (`test-poses.ts`): `standingPose(): Pose`: 33 landmarks at `(0.5, 0.5, v=1)`, then 11 `(0.55,0.30)`, 12 `(0.45,0.30)`, 13 `(0.57,0.42)`, 14 `(0.43,0.42)`, 15 `(0.58,0.54)`, 16 `(0.42,0.54)`, 23 `(0.53,0.55)`, 24 `(0.47,0.55)`, 25 `(0.53,0.70)`, 26 `(0.47,0.70)`, 27 `(0.53,0.85)`, 28 `(0.47,0.85)`; `withPoint(pose, index, x, y, v = 1): Pose` (copy with one landmark changed).

- [ ] **Step 1: Write the failing tests** (`SQUARE = { width: 1000, height: 1000 }`)
  ```ts
  test("identical poses score 100 on every limb", () => {
    const r = comparePoses(standingPose(), SQUARE, standingPose(), SQUARE)
    expect(Object.keys(r.limbs)).toHaveLength(8)
    expect(r.score).toBeCloseTo(100)
  })
  test("forearm 90° off scores 25, opposite scores 0", () => {
    const dancer = withPoint(withPoint(standingPose(), 13, 0.5, 0.5), 15, 0.5, 0.6)
    const side = withPoint(dancer, 15, 0.6, 0.5)
    const up = withPoint(dancer, 15, 0.5, 0.4)
    expect(comparePoses(side, SQUARE, dancer, SQUARE).limbs.leftForearm).toBeCloseTo(25)
    expect(comparePoses(up, SQUARE, dancer, SQUARE).limbs.leftForearm).toBeCloseTo(0)
  })
  test("bigger and shifted learner still scores 100", () => {
    const scaled = standingPose().map(l => ({ ...l, x: 0.2 + l.x * 1.3, y: l.y * 1.3 - 0.1 }))
    expect(comparePoses(scaled, SQUARE, standingPose(), SQUARE).score).toBeCloseTo(100)
  })
  test("direction accounts for frame aspect ratio", () => {
    const p = withPoint(withPoint(standingPose(), 13, 0.5, 0.5), 15, 0.6, 0.6)
    const d = limbDirection(p, "leftForearm", { width: 1000, height: 2000 })!
    expect(d.x).toBeCloseTo(1 / Math.sqrt(5)); expect(d.y).toBeCloseTo(2 / Math.sqrt(5))
  })
  test("limbs not visible are left out", () => {
    let legsHidden = standingPose()
    for (const i of [25, 26, 27, 28]) legsHidden = withPoint(legsHidden, i, 0.5, 0.9, 0.1)
    const r = comparePoses(legsHidden, SQUARE, standingPose(), SQUARE)
    expect(Object.keys(r.limbs).sort()).toEqual(["leftForearm","leftUpperArm","rightForearm","rightUpperArm"])
  })
  test("nothing visible gives a null score", () => {
    const hidden = standingPose().map(l => ({ ...l, v: 0 }))
    expect(comparePoses(hidden, SQUARE, standingPose(), SQUARE).score).toBeNull()
  })
  ```
- [ ] **Step 2: Run** `npx vitest run lib/pose/compare.test.ts`. Expected: FAIL (modules missing).
- [ ] **Step 3: Implement** `landmarks.ts` and `compare.ts` with the signatures above.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit** `feat: limb-direction pose comparison`

### Task 4: Split a dance into moves

**Files:**
- Create: `lib/pose/split.ts`
- Test: `lib/pose/split.test.ts`

**Interfaces:**
- Produces: `motionAt(frames: PoseFrame[], i: number): number`: sum over landmarks 11–16 and 23–28 of the normalized 2D distance between frame `i` and `i−1`; `Infinity` when `i === 0` or either pose is null. `splitMoves(frames: PoseFrame[], durationMs: number): Move[]`.
- Algorithm (pinned, the tests don't fully determine it):
  ```
  prev = 0; moves = []
  while durationMs − prev > MOVE_MAX_MS:
    lo = prev + MOVE_MIN_MS; hi = min(prev + MOVE_MAX_MS, durationMs − MOVE_MIN_MS)
    candidates = frames with lo ≤ t ≤ hi
    cut = t of the candidate with the lowest finite motionAt (earliest on ties)
          or, if none is finite, min(prev + 3000, hi)
    moves.push({ startMs: prev, endMs: cut }); prev = cut
  moves.push({ startMs: prev, endMs: durationMs })
  ```
- Fixture (in the test file): `framesWithStills(durationMs, stepMs, stillAt: number[])`: frames every `stepMs`; each frame shifts every landmark's x by +0.01 from the previous, except frames whose `t` is in `stillAt`, which copy the previous pose (motion 0).

- [ ] **Step 1: Write the failing tests**
  ```ts
  test("short clips are one move", () => {
    expect(splitMoves(framesWithStills(1500, 100, []), 1500)).toEqual([{ startMs: 0, endMs: 1500 }])
    expect(splitMoves(framesWithStills(4000, 100, []), 4000)).toEqual([{ startMs: 0, endMs: 4000 }])
  })
  test("cuts at the stillest moment in each window", () => {
    expect(splitMoves(framesWithStills(9000, 100, [3000, 6000]), 9000)).toEqual([
      { startMs: 0, endMs: 3000 }, { startMs: 3000, endMs: 6000 }, { startMs: 6000, endMs: 9000 }])
  })
  test("moves are contiguous and 2–4 s long", () => {
    const moves = splitMoves(framesWithStills(30000, 50, []), 30000)
    expect(moves[0].startMs).toBe(0); expect(moves.at(-1)!.endMs).toBe(30000)
    moves.forEach((m, i) => {
      expect(m.endMs - m.startMs).toBeGreaterThanOrEqual(2000)
      expect(m.endMs - m.startMs).toBeLessThanOrEqual(4000)
      if (i > 0) expect(m.startMs).toBe(moves[i - 1].endMs)
    })
  })
  test("no detected pose falls back to 3 s moves", () => {
    const empty = Array.from({ length: 91 }, (_, i) => ({ t: i * 100, pose: null }))
    expect(splitMoves(empty, 9000)).toEqual([
      { startMs: 0, endMs: 3000 }, { startMs: 3000, endMs: 6000 }, { startMs: 6000, endMs: 9000 }])
  })
  ```
- [ ] **Step 2: Run** `npx vitest run lib/pose/split.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `split.ts` as pinned above.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit** `feat: automatic move split`

### Task 5: Live scoring and tips

**Files:**
- Create: `lib/pose/scoring.ts`, `lib/pose/tips.ts`
- Test: `lib/pose/scoring.test.ts`, `lib/pose/tips.test.ts`

**Interfaces:**
- Consumes: `comparePoses`, `PoseComparison` (Task 3).
- Produces:
  - `framesInWindow(frames: PoseFrame[], sampleMs: number, tMs: number): PoseFrame[]`: frames with `tMs − WINDOW_BEFORE_MS ≤ t ≤ tMs + WINDOW_AFTER_MS` and a non-null pose, found by index arithmetic (`frames[i].t === i · sampleMs`).
  - `bestMatch(learner: Pose | null, learnerSize: FrameSize, frames: PoseFrame[], sampleMs: number, tMs: number, dancerSize: FrameSize): PoseComparison | null`: highest-scoring comparison in the window, with `matchT`; `null` if learner is null or no frame scores.
  - `class LimbSmoother { push(nowMs: number, limbs: LimbScores): void; current(nowMs: number): LimbScores }`: per-limb mean of entries with `t > nowMs − SMOOTHING_MS`.
  - `averageScore(scores: (number | null)[]): number | null`: mean ignoring nulls; null if none.
  - `isPassed(avg: number | null): boolean`: `avg !== null && avg >= PASS_SCORE`.
  - `failingLimbs(limbs: LimbScores): LimbName[]`: limbs with score `< PASS_SCORE`.
  - `tipFor(limbs: LimbScores): string | null`: worst failing limb (ties: `LIMBS` order) → `"Watch your left arm"` / `"right arm"` / `"left leg"` / `"right leg"`; null if none failing.

- [ ] **Step 1: Write the failing tests**
  ```ts
  // scoring.test.ts (frames every 50 ms from 0 to 1000)
  test("window is −400/+100 ms around t", () => {
    expect(framesInWindow(frames, 50, 500).map(f => f.t)).toEqual([100,150,200,250,300,350,400,450,500,550,600])
  })
  test("window skips frames without a pose", () => {
    const withGap = frames.map(f => (f.t === 300 ? { ...f, pose: null } : f))
    expect(framesInWindow(withGap, 50, 500).map(f => f.t)).not.toContain(300)
  })
  test("bestMatch finds the matching frame inside the window", () => {
    // learner = standingPose(); dancer frames = standingPose() with left wrist moved to (0.57, 0.30),
    // except t=300, which is standingPose() itself
    expect(bestMatch(learner, SQUARE, frames, 50, 600, SQUARE)).toMatchObject({ score: 100, matchT: 300 })
    expect(bestMatch(learner, SQUARE, frames, 50, 800, SQUARE)!.score).toBeLessThan(100)
  })
  test("no learner pose gives null", () => {
    expect(bestMatch(null, SQUARE, frames, 50, 600, SQUARE)).toBeNull()
  })
  test("smoother averages the last 500 ms", () => {
    const s = new LimbSmoother(); s.push(0, { leftForearm: 100 }); s.push(200, { leftForearm: 50 })
    expect(s.current(300).leftForearm).toBe(75); expect(s.current(600).leftForearm).toBe(50)
  })
  test("averageScore ignores nulls", () => {
    expect(averageScore([80, null, 60])).toBe(70); expect(averageScore([null])).toBeNull()
  })
  test("pass level is 70", () => {
    expect(isPassed(70)).toBe(true); expect(isPassed(69.9)).toBe(false); expect(isPassed(null)).toBe(false)
  })
  // tips.test.ts
  test("tip names the worst failing limb", () => {
    expect(tipFor({ leftForearm: 40, rightShin: 60, rightUpperArm: 90 })).toBe("Watch your left arm")
    expect(tipFor({ rightShin: 20 })).toBe("Watch your right leg")
  })
  test("no tip when everything passes", () => {
    expect(tipFor({ leftForearm: 70 })).toBeNull(); expect(tipFor({})).toBeNull()
  })
  ```
- [ ] **Step 2: Run** `npx vitest run lib/pose/scoring.test.ts lib/pose/tips.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `scoring.ts` and `tips.ts`.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit** `feat: live scoring, smoothing and tips`

### Task 6: Upload and video streaming

**Files:**
- Create: `lib/server/videos.ts`, `lib/server/range.ts`, `lib/server/validate-trend.ts`, `app/api/trends/route.ts`, `app/api/videos/[file]/route.ts`
- Modify: `lib/server/trends.ts` (add `createTrend(input: NewTrend, video: File): Promise<{ id: string }>`)
- Test: `lib/server/range.test.ts`, `lib/server/validate-trend.test.ts`, `lib/server/videos.test.ts`

**Interfaces:**
- Produces:
  - `UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads")`; `saveVideo(fileName: string, file: File): Promise<void>` (creates the dir); `videoFilePath(fileName: string): string`; `isValidVideoFileName(name: string): boolean` = `/^[a-z0-9]+\.mp4$/`.
  - `parseRange(header: string | null, size: number): { start: number; end: number } | "unsatisfiable" | null`: `null` means "send the whole file".
  - `parseNewTrend(form: FormData): { ok: true; value: NewTrend; video: File } | { ok: false; error: string }`. Form fields: `video` (File), `title`, `width`, `height`, `durationMs`, `sampleMs`, `poses` (JSON string), `moves` (JSON string).
  - `POST /api/trends` → `201 { id }` or `400 { error }`. `createTrend` generates the id with Prisma, saves the file as `<id>.mp4`.
  - `GET /api/videos/[file]` → `200` full / `206` partial / `416` / `404`; headers `Content-Type: video/mp4`, `Accept-Ranges: bytes`, `Content-Length`, `Content-Range` on 206. Body: `Readable.toWeb(fs.createReadStream(path, { start, end }))`.

- [ ] **Step 1: Write the failing tests**
  ```ts
  // range.test.ts
  test.each([
    ["bytes=0-99", { start: 0, end: 99 }], ["bytes=500-", { start: 500, end: 999 }],
    ["bytes=-200", { start: 800, end: 999 }], ["bytes=0-5000", { start: 0, end: 999 }],
  ])("%s", (h, r) => expect(parseRange(h, 1000)).toEqual(r))
  test("past the end is unsatisfiable", () => expect(parseRange("bytes=1000-", 1000)).toBe("unsatisfiable"))
  test.each([null, "items=0-1", "bytes=0-1,5-6"])("%s sends the whole file", h => expect(parseRange(h, 1000)).toBeNull())
  // videos.test.ts
  test.each([["abc123.mp4", true], ["../.env", false], ["a/b.mp4", false], ["ABC.mp4", false], ["abc.mov", false]])
    ("%s → %s", (n, ok) => expect(isValidVideoFileName(n)).toBe(ok))
  // validate-trend.test.ts: validForm() builds a passing FormData (1 KB mp4 File, 3 moves, 100 frames all with poses)
  test("valid form passes", () => expect(parseNewTrend(validForm()).ok).toBe(true))
  test.each([
    [{ title: "  " }, "Title is required"],
    [{ video: new File([new Uint8Array(10)], "a.mov", { type: "video/quicktime" }) }, "Video must be an mp4"],
    [{ video: bigMp4(50 * 1024 * 1024 + 1) }, "Video must be under 50 MB"],
    [{ durationMs: "90001" }, "Videos must be 90 seconds or shorter"],
    [{ poses: "not json" }, "Pose data is invalid"],
    [{ poses: JSON.stringify(halfDetected(100, 49)) }, "We couldn't find a dancer in this video. Try one with a single dancer, full body visible."],
    [{ moves: "[]" }, "Move data is invalid"],
  ])("rejects %o", (override, error) => expect(parseNewTrend(validForm(override))).toEqual({ ok: false, error }))
  ```
  (`halfDetected(total, detected)`: `total` frames, only `detected` with a pose → 49% fails the 50% rule.)
- [ ] **Step 2: Run** `npx vitest run lib/server`. Expected: FAIL.
- [ ] **Step 3: Implement** `range.ts`, `videos.ts`, `validate-trend.ts`, then `createTrend` and both routes (read the route handler docs in `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`; `params` is a Promise).
- [ ] **Step 4: Run** `npx vitest run lib/server`. Expected: PASS.
- [ ] **Step 5: Verify the routes** with `npm run dev`: put any mp4 at `uploads/test1.mp4`, then `curl -sI -H "Range: bytes=0-99" localhost:3000/api/videos/test1.mp4` → `206`, `Content-Range: bytes 0-99/<size>`; `curl -sI localhost:3000/api/videos/..%2F.env.mp4` → `404`. Delete `uploads/test1.mp4`.
- [ ] **Step 6: Commit** `feat: trend upload and range video streaming`

### Task 7: Read poses in the browser and add a trend

**Files:**
- Create: `lib/pose/landmarker.ts`, `lib/pose/extract.ts`, `lib/pose/draw.ts`, `components/dance/add-trend-form.tsx`, `app/trends/new/page.tsx`

**Interfaces:**
- Consumes: `fromMediaPipe` (Task 3), `splitMoves` (Task 4), `POST /api/trends` (Task 6).
- Produces:
  - `createPoseLandmarker(): Promise<PoseLandmarker>`: `FilesetResolver.forVisionTasks("/mediapipe/wasm")`, `modelAssetPath: "/mediapipe/pose_landmarker_full.task"`, `delegate: "GPU"`, `runningMode: "VIDEO"`, `numPoses: 1`. VIDEO mode needs strictly increasing timestamps per instance: one instance per use (extraction vs live), `close()` when done.
  - `extractPoses(video: HTMLVideoElement, onProgress: (fraction: number) => void, signal?: AbortSignal): Promise<PoseFrame[]>`: for `t = 0, SAMPLE_MS, …` while `t < duration`: set `currentTime`, await `seeked`, `detectForVideo(video, t)`, push `{ t, pose: result.landmarks[0] ? fromMediaPipe(result.landmarks[0]) : null }`.
  - `drawSkeleton(ctx: CanvasRenderingContext2D, pose: Pose | null, opts: { color: string; limbColors?: Partial<Record<LimbName, string>> }): void`: clears, then draws `PoseLandmarker.POSE_CONNECTIONS` with both ends ≥ 11 (body, no face), scaled to `ctx.canvas` size; segments matching a `LIMBS` pair use `limbColors[limb]` when given. Line width `canvas.height / 120`.
  - `themeColor(name: "primary" | "destructive"): string`: reads `--<name>` from `document.documentElement`.

- [ ] **Step 1: Implement** the three `lib/pose` browser modules.
- [ ] **Step 2: Implement `AddTrendForm`**: file input (`accept="video/mp4"`) + title; on Process: load into a hidden `<video muted playsInline>`, `extractPoses` with a shadcn `Progress`, then `splitMoves(frames, durationMs)` with `durationMs = round(video.duration · 1000)`. Form fields sent: `width`/`height` = `videoWidth`/`videoHeight`, `sampleMs = SAMPLE_MS`, `poses`/`moves` as JSON strings. Show the move count and a preview (video darkened with `brightness-50` + canvas skeleton synced to `currentTime`). Save posts `FormData` to `/api/trends` and redirects to `/trends/<id>`. Show the server's `error` text on 400.
- [ ] **Step 3: Verify** with a 10–30 s dance clip (record a teammate; never commit it): progress reaches 100%, preview shows the skeleton on the dancer, Save lands on `/trends/<id>` (404 until Task 8 is fine) and a row exists. Note the processing time for the demo script.
- [ ] **Step 4: Commit** `feat: add a trend from an uploaded video`

### Task 8: Library, dancer panel, Learn

**Files:**
- Create: `components/dance/dancer-panel.tsx`, `components/dance/learn-view.tsx`, `app/trends/[id]/page.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `listTrends`, `getTrend` (Task 2), `drawSkeleton`, `themeColor` (Task 7).
- Produces: `DancerPanel(props: { trend: TrendData; range: Move; speed: number; mirrored: boolean; videoRef: RefObject<HTMLVideoElement | null>; onLoop?: () => void; loop?: boolean })`: 9:16 box; `<video>` (`object-cover brightness-50`, `playbackRate = speed`) and a `<canvas>` with intrinsic size `trend.width × trend.height`, also `object-cover`, stacked; both get `-scale-x-100` when `mirrored`. A `requestAnimationFrame` loop draws the pose at index `round(currentTime·1000 / sampleMs)` and, when `currentTime·1000 ≥ range.endMs` **or on `ended`**, seeks to `range.startMs` and calls `onLoop` (if `loop === false`, it stops instead). Changing `range` seeks to its start.

- [ ] **Step 1: Library** (`app/page.tsx`): `await connection()`, `listTrends()`, grid of shadcn `Card` links to `/trends/<id>` (title, `durationMs` as `0:23`, "`n` moves"), button "Add a trend" → `/trends/new`. Empty state: "No trends yet. Add your first one."
- [ ] **Step 2: Implement `DancerPanel`.**
- [ ] **Step 3: Learn** (`app/trends/[id]/page.tsx` + `LearnView`): `notFound()` if missing. State: `moveIndex`, `speed` (0.5 | 0.75 | 1, default 0.75), `mirrored` (default `true`). Controls: Previous / Next, `ToggleGroup` for speed, mirror toggle, "Move n of N", buttons "Practice" → `/trends/<id>/practice` and "Full run" → `/trends/<id>/run`.
- [ ] **Step 4: Verify** in the browser: Library lists the trend; Learn loops move 1 with the skeleton on the dancer; speed and mirror work; **jump to the last move and confirm it loops** (the `ended` case); `npm run build` passes.
- [ ] **Step 5: Commit** `feat: library and learn mode`

### Task 9: Practice and full run

**Files:**
- Create: `lib/pose/webcam.ts`, `components/dance/learner-panel.tsx`, `components/dance/practice-session.tsx`, `app/trends/[id]/practice/page.tsx`, `app/trends/[id]/run/page.tsx`
- Test: `lib/pose/webcam.test.ts`

**Interfaces:**
- Consumes: `DancerPanel` (Task 8), `createPoseLandmarker`, `drawSkeleton`, `themeColor` (Task 7), `bestMatch`, `LimbSmoother`, `averageScore`, `isPassed`, `failingLimbs`, `tipFor` (Task 5).
- Produces:
  - `webcamErrorStatus(err: unknown): "denied" | "unavailable"`: `NotAllowedError` / `SecurityError` → `"denied"`, anything else → `"unavailable"`.
  - `useWebcam(): { videoRef: RefObject<HTMLVideoElement | null>; status: "starting" | "ready" | "denied" | "unavailable" }`: `getUserMedia({ video: { width: 1280, height: 720, facingMode: "user" }, audio: false })`, stops tracks on unmount.
  - `LearnerPanel(props: { videoRef; canvasRef; status })`: same stacking as `DancerPanel`, always mirrored and darkened. Copy: denied → "Camera blocked. Allow camera access in your browser to practice."; unavailable → "No camera found."
  - `PracticeSession(props: { trend: TrendData; mode: "moves" | "full" })`.

- [ ] **Step 1: Write the failing test**
  ```ts
  test("maps getUserMedia errors", () => {
    expect(webcamErrorStatus(new DOMException("", "NotAllowedError"))).toBe("denied")
    expect(webcamErrorStatus(new DOMException("", "NotFoundError"))).toBe("unavailable")
    expect(webcamErrorStatus(new Error("x"))).toBe("unavailable")
  })
  ```
- [ ] **Step 2: Run** `npx vitest run lib/pose/webcam.test.ts`. Expected: FAIL. Implement `webcam.ts`. Run again. Expected: PASS.
- [ ] **Step 3: Implement `PracticeSession`.** The webcam frames go to the model **unmirrored** (mirroring is CSS only), so left/right stay anatomical. Per animation frame, when the webcam has a new frame:
  ```
  learner = detectForVideo(webcam, performance.now()).landmarks[0] → fromMediaPipe | null
  tMs     = dancerVideo.currentTime · 1000
  cmp     = bestMatch(learner, webcamSize, trend.poses, trend.sampleMs, tMs, trendSize)
  if cmp: smoother.push(now, cmp.limbs); loopScores.push(cmp.score)
  smoothed = smoother.current(now)
  drawSkeleton(learnerCanvas, learner, { color: primary, limbColors: failingLimbs(smoothed) → destructive })
  ```
  Update React state (live score = `averageScore(loopScores)` rounded, tip = `tipFor(smoothed)`) at most every 250 ms, not every frame.
  - `mode: "moves"`: `DancerPanel` loops the current move; same speed `ToggleGroup` (default 0.75) and mirror toggle (default on) as Learn. `onLoop`: if `isPassed(averageScore(loopScores))` mark the move passed and go to the next; always reset `loopScores`. Button "Skip move". After the last move: "All moves passed!" + link to Full run.
  - `mode: "full"`: range `{ 0, durationMs }`, speed 1, `loop={false}`; frame scores are also bucketed by the move containing `tMs`. On end: "Final score `n`" and per-move scores ("Move 3 · 64"), button "Try again".
  - Layout: the two panels side by side, then "Move n of N", "Score n", tip.
- [ ] **Step 4: Verify the scoring with a fake camera.** Convert the test clip to Y4M (`ffmpeg -i clip.mp4 -pix_fmt yuv420p clip.y4m`), start Chrome with `--use-fake-device-for-media-stream --use-file-for-fake-video-capture=clip.y4m`, open `localhost:3000/trends/<id>/practice` for the same clip. Expected: score mostly ≥ 70, few red limbs, moves pass. Then dance something else in front of a real webcam. Expected: red limbs and a tip. Block the camera permission. Expected: the "Camera blocked…" message.
- [ ] **Step 5: Verify full run**: plays once, then the final score and per-move list appear.
- [ ] **Step 6: Commit** `feat: practice with live scoring and full run`

### Task 10: Docker, AGENTS.md, push, deploy

**Files:**
- Create: `Dockerfile`, `.dockerignore`, `docs/log/2026-11-19-<HHMM>-base.md`
- Modify: `AGENTS.md` (About, How to run, Stack folders, Protected areas), `README.md` (one-line pitch)

- [ ] **Step 1: `Dockerfile`** (Next standalone, Node 22 alpine, multi-stage). Deps stage: `npm ci --ignore-scripts` (the postinstall needs `prisma/` and `scripts/`, not copied yet). Build stage: `COPY . .`, `npx prisma generate`, `node scripts/copy-mediapipe.mjs`, `npm run build`. Runner: copy `.next/standalone`, `.next/static`, `public`; `ENV UPLOAD_DIR=/app/uploads`; `mkdir /app/uploads` owned by the runtime user; `EXPOSE 3000`; `CMD ["node", "server.js"]`. `.dockerignore`: `node_modules`, `.next`, `.env*`, `uploads`, `*.mp4`.
- [ ] **Step 2: Verify** `docker build -t dance-tutor .` succeeds without a database.
- [ ] **Step 3: AGENTS.md**: About (one paragraph from the spec's intent), How to run (`npm install`, `.env.local` with `DATABASE_URL` and optional `UPLOAD_DIR`, `npm run dev`, `npm test`, `npm run build`), folders (`lib/pose/` = browser pose code, `components/dance/`), Protected areas add `lib/pose/` (except `tips.ts`), `components/dance/practice-session.tsx`, `app/api/`, `Dockerfile`, `scripts/`, `vitest.config.mts`, `public/mediapipe/`.
- [ ] **Step 4: Log file + commit + push to main** `chore: docker build and team docs for the base`.
- [ ] **Step 5: Raphael deploys on Coolify**: build pack Dockerfile, port 3000, env `DATABASE_URL` (prod), persistent storage mounted at `/app/uploads`, domain with HTTPS. Before the first deploy run `DATABASE_URL=<prod> npx prisma migrate deploy` from the laptop.
- [ ] **Step 6: Verify prod**: open the HTTPS URL, upload a ~30 MB clip (checks the proxy limit), Learn plays and seeks, Practice opens the webcam. Redeploy, and the trend's video still plays (volume works).

---

## Team issues (open after Task 10)

Each issue lists "Done when" and "Files to look at". In order of demo value:

1. **Countdown 3-2-1 before each move in Practice.** Done when a big 3-2-1 overlays the panels before the move starts looping. Files: `components/dance/practice-session.tsx` (Raphael approves the change in a protected file), new `components/dance/countdown.tsx`.
2. **Move timeline.** Done when Learn and Practice show clickable boxes per move, current one highlighted, passed ones marked. Files: new `components/dance/move-timeline.tsx`, `learn-view.tsx`.
3. **Directional tips.** Done when arms get "Raise your left arm" / "Lower your left arm" from the vertical direction difference, legs keep "Watch your … leg", with tests. Files: `lib/pose/tips.ts`, `lib/pose/tips.test.ts` (signature change to `tipFor(limbs, learnerDirs, dancerDirs)` agreed with Raphael).
4. **Result screen design.** Done when the full-run result is a proper screen: big score, per-move bars, "practice this move" links. Files: new `components/dance/run-result.tsx`.
5. **Library cards.** Done when cards show a video thumbnail (`<video preload="metadata">` at `#t=0.5`), duration and move count, styled. Files: `app/page.tsx`, new `components/dance/trend-card.tsx`.
6. **Adjust cut points before saving.** Done when the add-trend preview shows the split on a timeline and cut points can be dragged (kept 2–4 s apart is a should). Files: `components/dance/add-trend-form.tsx`.
7. **Empty and error states.** Done when "No person detected, step back so your whole body is visible" shows after 2 s without a learner pose, and upload errors are styled. Files: `learner-panel.tsx`, `add-trend-form.tsx`.
8. **Header and branding.** Done when every page has a header with the app name and a link home, and the Library has a hero line. Files: new `components/dance/site-header.tsx`, pages.
9. **Practice screen polish.** Done when the practice screen matches the spec sketch on a 1440×900 laptop and a projector (type scale, spacing, score badge). Files: `practice-session.tsx` layout parts, `learner-panel.tsx`.
10. **Demo trends (no code).** Done when 2–3 trends that track well (one dancer, full body, facing camera, no cuts) are uploaded to prod and rehearsed at the venue distance.
11. **Pitch and backup video (no code).** Done when the 90-second script from the spec is rehearsed and the backup video is recorded before 06:00.
