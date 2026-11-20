# Stricter Scoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Score the last second of movement with one time offset, stricter angles, motion-weighted limbs and a movement check, so standing still fails.

**Architecture:** A new pure module `lib/pose/segment.ts` scores a short history of learner samples against the dancer's frames; the practice loop feeds it instead of the per-frame `bestMatch`. All thresholds live in `lib/pose/config.ts`.

**Tech Stack:** TypeScript, Vitest, React 19 (practice loop only).

**Spec:** `docs/superpowers/specs/2026-11-20-stricter-scoring-design.md`

## Global Constraints

- Values (all in `lib/pose/config.ts`): `SEGMENT_MS = 1000`, `MIN_SEGMENT_SAMPLES = 5`, `LAG_MIN_MS = -100`, `LAG_MAX_MS = 600`, `LAG_STEP_MS = 50`, `FULL_SCORE_DEG = 20`, `ZERO_SCORE_DEG = 70`, `LIMB_WEIGHT_BASE = 0.2`, `LIMB_WEIGHT_DEG = 20`, `MOTION_HALF_WINDOW_MS = 1000`, `MOVING_LIMB_DEG = 15`, `MOVEMENT_FLOOR = 0.4`. Remove `MAX_ANGLE_DEG`, `WINDOW_BEFORE_MS`, `WINDOW_AFTER_MS`.
- `PASS_SCORE` (70), `SMOOTHING_MS`, `LimbSmoother`, `averageScore`, `isPassed`, `failingLimbs`, `tipFor` unchanged.
- No new dependencies, no server or schema change. Comments only for the why.

## Review Focus

1. Learner steps out of frame mid-segment: samples without a pose are not pushed; scoring continues on the remaining samples (Task 3 wiring; Task 2 "fewer samples → null").
2. Move loop wraps (dancer time jumps back): history resets, no mixing of two loops (Task 2 test "time going backwards resets").
3. Limbs invisible in the learner (legs out of frame): skipped, not scored 0 (Task 2 test "invisible learner limbs").
4. Dancer pauses or seeks: history clears (Task 3 wiring).
5. A trend with frames missing a pose: those frames are skipped for every lag (Task 2 algorithm, `frames[i].pose` null check).

---

### Task 1: Config and stricter angle mapping

**Files:**
- Modify: `lib/pose/config.ts`, `lib/pose/compare.ts`
- Test: `lib/pose/compare.test.ts`

**Interfaces:**
- Produces: the config constants above; `angleDeg(a: Vec, b: Vec): number` exported from `compare.ts` (degrees, dot product clamped to [-1, 1]); `limbScore(a, b)` = `clamp(100 · (1 − (angleDeg − FULL_SCORE_DEG) / (ZERO_SCORE_DEG − FULL_SCORE_DEG)), 0, 100)`.

- [ ] **Step 1: Update the test** "forearm 90° off scores 25, opposite scores 0" in `compare.test.ts` to:
  ```ts
  test("forearm 45° off scores 50, 90° and opposite score 0", () => {
    const dancer = withPoint(withPoint(standingPose(), 13, 0.5, 0.5), 15, 0.5, 0.6)
    const s = Math.SQRT1_2 * 0.1
    const diag = withPoint(dancer, 15, 0.5 + s, 0.5 + s)
    const side = withPoint(dancer, 15, 0.6, 0.5)
    const up = withPoint(dancer, 15, 0.5, 0.4)
    expect(comparePoses(diag, SQUARE, dancer, SQUARE).limbs.leftForearm).toBeCloseTo(50)
    expect(comparePoses(side, SQUARE, dancer, SQUARE).limbs.leftForearm).toBeCloseTo(0)
    expect(comparePoses(up, SQUARE, dancer, SQUARE).limbs.leftForearm).toBeCloseTo(0)
  })
  test("within 20° scores 100", () => {
    const a = { x: 0, y: 1 }, b = { x: Math.sin(Math.PI / 10), y: Math.cos(Math.PI / 10) } // 18°
    expect(limbScore(a, b)).toBe(100)
  })
  ```
- [ ] **Step 2: Run** `npx vitest run lib/pose/compare.test.ts`. Expected: FAIL (old mapping gives 62.5 / 25).
- [ ] **Step 3: Implement** the constants in `config.ts` and `angleDeg` + the new `limbScore` in `compare.ts`. Leave the removed constants' importers compiling until Task 3 (remove `WINDOW_*` there; remove `MAX_ANGLE_DEG` now).
- [ ] **Step 4: Run** `npx vitest run lib/pose/compare.test.ts`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: stricter limb angle mapping (#21)`

### Task 2: Segment scoring

**Files:**
- Create: `lib/pose/segment.ts`
- Test: `lib/pose/segment.test.ts`

**Interfaces:**
- Consumes: `angleDeg`, `limbScore` (Task 1), `limbDirection`, `LIMBS` (`landmarks.ts`), config constants.
- Produces:
  ```ts
  type LearnerSample = { t: number; pose: Pose }            // t = dancer video time, ms
  type SegmentScore = { score: number; limbs: LimbScores; lagMs: number }
  amplitude(dirs: Vec[]): number                            // mean angle (deg) to the normalized mean direction; 0 if < 2 dirs
  limbMotion(frames: PoseFrame[], size: FrameSize, sampleMs: number): LimbScores[]
      // per frame index: amplitude of each visible limb's direction over ±MOTION_HALF_WINDOW_MS
  class LearnerHistory { push(sample: LearnerSample): void; clear(): void; samples(): LearnerSample[] }
      // push: if sample.t < last t, clear first; drop samples with t < sample.t − SEGMENT_MS
  scoreSegment(samples: LearnerSample[], learnerSize: FrameSize, frames: PoseFrame[],
               sampleMs: number, dancerSize: FrameSize, motion: LimbScores[]): SegmentScore | null
  ```
- Algorithm for `scoreSegment` (pinned):
  ```
  for lag = LAG_MIN_MS; lag <= LAG_MAX_MS; lag += LAG_STEP_MS:
    for each sample s: i = round((s.t − lag) / sampleMs); skip if out of range or frames[i].pose null
      for each limb with both directions a (learner) and b (dancer):
        sc = limbScore(a, b); w = LIMB_WEIGHT_BASE + (motion[i][limb] ?? 0) / LIMB_WEIGHT_DEG
        frame weighted sum += sc·w, weights += w; per-limb sum += sc, count++; keep a, b per limb
      if weights > 0: pose sum += weighted sum / weights; poseN++
    if poseN < MIN_SEGMENT_SAMPLES: next lag
    for each limb with dancerAmp = amplitude(dancer dirs) >= MOVING_LIMB_DEG:
      ratio = min(1, amplitude(learner dirs) / dancerAmp); ratio sum += ratio·dancerAmp; amp sum += dancerAmp
      limbFactor[limb] = MOVEMENT_FLOOR + (1 − MOVEMENT_FLOOR)·ratio
    overall = amp sum ? ratio sum / amp sum : 1
    score = (pose sum / poseN) · (MOVEMENT_FLOOR + (1 − MOVEMENT_FLOOR)·overall)
    limbs[limb] = (per-limb sum / count) · (limbFactor[limb] ?? 1)
    keep the highest score (earliest lag on ties)
  ```
- Test fixture (in the test file): `SQUARE = { width: 1000, height: 1000 }`, `sampleMs = 50`, `swing(t)` = `standingPose()` with landmark 13 at (0.57, 0.42) and wrist 15 at elbow + 0.12·(sin θ, cos θ), θ = 60° · sin(2π t / 1000); dancer `frames` = `swing(t)` for t = 0, 50, …, 6000; `motion = limbMotion(frames, SQUARE, 50)`. `run(poseAt)` pushes `poseAt(t)` for t = 1000, 1033, … < 5000 into a `LearnerHistory`, calls `scoreSegment` each time, returns the average score and the last result.

- [ ] **Step 1: Write the failing tests**
  ```ts
  test("limbMotion sees the swinging forearm, not the still thigh", () => {
    expect(motion[60].leftForearm).toBeGreaterThan(15)
    expect(motion[60].rightThigh).toBeLessThan(1)
  })
  test("correct learner scores high", () => expect(run(swing).avg).toBeGreaterThanOrEqual(95))
  test("300 ms late learner still scores high", () => expect(run(t => swing(t - 300)).avg).toBeGreaterThanOrEqual(90))
  test("standing still fails", () => expect(run(() => swing(0)).avg).toBeLessThan(70))
  test("wrong arm fails and marks the left forearm", () => {
    // right forearm swings (landmarks 14→16 mirrored), left forearm still
    const r = run(wrongArm)
    expect(r.avg).toBeLessThan(70)
    expect(r.last!.limbs.leftForearm!).toBeLessThan(70)
  })
  test("fewer than MIN_SEGMENT_SAMPLES samples gives null", () => {
    const h = new LearnerHistory(); for (let t = 1000; t < 1000 + 4 * 33; t += 33) h.push({ t, pose: swing(t) })
    expect(scoreSegment(h.samples(), SQUARE, frames, 50, SQUARE, motion)).toBeNull()
  })
  test("invisible learner limbs give null", () => { /* all v = 0 for 10 samples → null */ })
  test("history keeps the last second", () => { /* push t = 0..2000 step 100 → samples()[0].t === 1000 */ })
  test("time going backwards resets the history", () => { /* push 2000 then 100 → samples().length === 1 */ })
  ```
  (`wrongArm(t)` = `standingPose()` with landmark 14 at (0.43, 0.42) and wrist 16 at elbow + 0.12·(−sin θ, cos θ).)
- [ ] **Step 2: Run** `npx vitest run lib/pose/segment.test.ts`. Expected: FAIL (module missing).
- [ ] **Step 3: Implement** `segment.ts` as pinned above.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit** `feat: segment scoring with movement check (#21)`

### Task 3: Wire the practice loop and remove the per-frame matcher

**Files:**
- Modify: `components/dance/practice-session.tsx`, `lib/pose/scoring.ts`, `lib/pose/scoring.test.ts`, `lib/pose/config.ts`

**Interfaces:**
- Consumes: `limbMotion`, `LearnerHistory`, `scoreSegment` (Task 2).

- [ ] **Step 1: Wire** the live loop in `practice-session.tsx`: inside the effect, `motion = limbMotion(trend.poses, dancerSize, trend.sampleMs)` and `history = new LearnerHistory()`. While the dancer plays: if a learner pose exists, `history.push({ t: tMs, pose: learner })`, then `scoreSegment(history.samples(), learnerSize, trend.poses, trend.sampleMs, dancerSize, motion)`; a non-null result feeds the smoother (`result.limbs`), the loop scores and the full-run buckets (`result.score`) exactly where `bestMatch` did. While the dancer is paused, seeking or not ready: `history.clear()`.
- [ ] **Step 2: Remove** `bestMatch`, `framesInWindow` and their tests, and `WINDOW_BEFORE_MS` / `WINDOW_AFTER_MS` from `config.ts`.
- [ ] **Step 3: Verify** `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build` all pass.
- [ ] **Step 4: Verify on "bisou"**: rerun the scratch evaluation with `scoreSegment` (learners: exact, 0.3/0.6 s late, jitter, standing still, wrong part, mirrored). Expected: exact and late 4/4, standing still 0/4.
- [ ] **Step 5: Commit** `feat: practice scores the last second of movement (#21)`

### Task 4: Hands, head and torso; stricter values (design update)

**Files:** `lib/pose/types.ts`, `lib/pose/landmarks.ts`, `lib/pose/config.ts`, `lib/pose/tips.ts`, `lib/pose/draw.ts`, `lib/pose/test-poses.ts`, tests in `compare.test.ts`, `segment.test.ts`, `tips.test.ts`.

**Interfaces:** `LimbName` gains `"leftHand" | "rightHand" | "head" | "torso"`. `LIMBS: Record<LimbName, [Endpoint, Endpoint]>` with `type Endpoint = number | readonly [number, number]` (a pair = midpoint, visibility = min). `draw.ts` maps only numeric pairs to drawn connections.

- [ ] **Step 1: Tests first.** `compare.test.ts`: 45° → 25, 12° → 100, identical poses score on 12 limbs, legs hidden leaves arms + hands + head (torso needs hips). New `landmarks` test: head direction from shoulders midpoint to nose; torso from hips midpoint to shoulders midpoint. `tips.test.ts`: `{ leftHand: 10 }` → "Watch your left hand", `{ torso: 10 }` → "Watch your torso". `test-poses.ts` gets nose (0.5, 0.2) and index fingers 19 (0.585, 0.58), 20 (0.415, 0.58); `segment.test.ts` fixtures move the index finger with the wrist.
- [ ] **Step 2: Run** `npx vitest run lib/pose`. Expected: FAIL.
- [ ] **Step 3: Implement** the types, `LIMBS`, midpoint support in `limbDirection`, tips, draw mapping, config values (`FULL_SCORE_DEG = 15`, `ZERO_SCORE_DEG = 55`, `LIMB_WEIGHT_BASE = 0.1`).
- [ ] **Step 4: Verify** `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`; rerun the "bisou" evaluation (correct and late learners must still pass 4/4).
- [ ] **Step 5: Commit** `feat: score hands, head and torso with stricter angles (#21)`
