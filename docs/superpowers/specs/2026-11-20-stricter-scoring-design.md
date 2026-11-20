# Stricter scoring: design

Date: 2026-11-20. Status: approved by Raphael. Supersedes the scoring values in
`2026-11-19-dance-tutor-design.md` ("Comparing the learner to the dancer"): the −400/+100 ms
per-frame window and the 0–120° angle mapping.

## Intent

Raphael uploaded a real trend ("bisou", 11.9 s, 4 moves) and wants the score to verify the
dance better. Measured on that trend with simulated learners, today's scoring passes every move
for someone standing still, for the mirrored dance and for the wrong part of the dance.

## Why it's lenient

- Each webcam frame picks its best dancer frame in a 0.5 s window on its own, so a frozen pose
  always finds a similar moment.
- Thighs and upper arms barely move in most dances (3–18° here) and hand out free points.
- A limb 30° off still scores 75.

## Goals

- A correct learner passes, including up to 0.6 s late and with tracking jitter.
- Standing still fails every move.
- Doing the wrong part of the dance, or the mirrored dance, fails most moves.
- Red limbs and the tip follow the same per-limb scores.
- All thresholds in `lib/pose/config.ts`, so they can be tuned with real people tonight.

## Non-goals

- Server changes, schema changes, new dependencies.
- Separate timing and form scores.
- Full-dance alignment (DTW): too heavy for live scoring.

## Approaches

| | How | Result on "bisou" (moves passed /4: standing still, wrong part, mirrored) |
|---|---|---|
| Today | per-frame best match, 0–120° | 4, 4, 4 |
| Tune numbers only | 20–70° mapping + limbs weighted by dancer motion | 3, 1–2, 3 |
| **Segment + movement (picked)** | below | **0, 1, 2** |

Correct, 0.3 s late, 0.6 s late and jittery learners pass 4/4 in every variant.

## Design (picked)

1. **Segment scoring.** Keep the learner's samples from the last `SEGMENT_MS` (1000 ms), each
   tagged with the dancer video time. Try one time offset for the whole segment, from
   `LAG_MIN_MS` (−100) to `LAG_MAX_MS` (600) in `LAG_STEP_MS` (50) steps; keep the best.
   Not enough samples (< `MIN_SEGMENT_SAMPLES`, 5) → no score yet.
2. **Stricter angle mapping.** Per limb: 100 within `FULL_SCORE_DEG` (20°), 0 from
   `ZERO_SCORE_DEG` (70°), linear between.
3. **Limbs weighted by the dancer's motion.** For each dancer frame, each limb's motion is the
   mean angle between its direction and its mean direction over ±`MOTION_HALF_WINDOW_MS`
   (1000 ms), precomputed once per trend. Weight = `LIMB_WEIGHT_BASE` (0.2) +
   motion / `LIMB_WEIGHT_DEG` (20).
4. **Movement check.** Over the segment, for each limb the dancer moves at least
   `MOVING_LIMB_DEG` (15°) (amplitude = mean angle from the segment's mean direction), the
   learner's amplitude ratio is `min(1, learner / dancer)`. The overall factor is the
   amplitude-weighted mean ratio, applied as `score × (MOVEMENT_FLOOR + (1 − MOVEMENT_FLOOR) × ratio)`
   with `MOVEMENT_FLOOR` 0.4. No moving limb in the segment → factor 1.
5. **Per-limb scores** (red limbs, tip): the limb's mean angle score over the segment at the
   best offset, times its own movement factor when it's a moving limb.
6. **Visibility** unchanged: limbs not visible in both poses are skipped.
7. **Loop resets.** The learner history clears when the dancer time jumps backwards (move
   loop) or the dancer pauses or seeks. Frames with no learner pose are skipped, as today.

## Code

- `lib/pose/config.ts`: the constants above; `MAX_ANGLE_DEG`, `WINDOW_BEFORE_MS`,
  `WINDOW_AFTER_MS` removed.
- `lib/pose/compare.ts`: `limbScore` uses the new mapping.
- New `lib/pose/segment.ts`: `limbMotion`, `LearnerHistory`, `scoreSegment`, unit-tested on a
  synthetic dance.
- `lib/pose/scoring.ts`: `bestMatch` and `framesInWindow` removed (replaced by
  `scoreSegment`); `LimbSmoother`, `averageScore`, `isPassed`, `failingLimbs` unchanged.
- `components/dance/practice-session.tsx`: the live loop feeds `LearnerHistory` and uses
  `scoreSegment`.

## Left to the builder

Internal structure of `segment.ts`, test fixture details, and whether `comparePoses` stays
exported for other callers.

## Risk

Measured on learners simulated from the dancer's own poses. Real bodies and cameras differ:
tune `FULL_SCORE_DEG`, `ZERO_SCORE_DEG`, `MOVEMENT_FLOOR` and `PASS_SCORE` with real people.

## Update: more body parts (approved by Raphael, 2026-11-20)

Raphael tested the PR on "bisou" and still got 80 at times on a dance that is hard to copy.
Measured on "bisou": the hands move the most (wrist → index finger ±69° left, ±59° right) and
were not scored at all.

- New segments: `leftHand` (15 → 19), `rightHand` (16 → 20), `head` (shoulders midpoint →
  nose 0), `torso` (hips midpoint → shoulders midpoint). An endpoint can be the midpoint of two
  landmarks; its visibility is the lower of the two.
- Feet stay out: often out of frame on a laptop webcam (left foot visible 41% even in the video).
- `LIMB_WEIGHT_BASE` 0.2 → 0.1, so still segments (head, torso in most dances) don't add free
  points.
- Stricter angles: `FULL_SCORE_DEG` 20 → 15, `ZERO_SCORE_DEG` 70 → 55.
- Tips: "Watch your left hand", "Watch your right hand", "Watch your head", "Watch your torso".
- Red limbs: hands turn red on the skeleton (15–19 and 16–20 are drawn connections); head and
  torso have no drawn line, so only the tip names them.
- Risk: MediaPipe's hand points are noisier than arm points at 2–3 m.
