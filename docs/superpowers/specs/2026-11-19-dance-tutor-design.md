# Dance tutor: design

Date: 2026-11-19. Status: draft for Raphael's approval. Working name "Dance tutor" (final name
left to the team).

## Intent

Someone sees a dance trend on TikTok and wants to do it. The app teaches it to them like a
patient dance teacher: the dance is broken into short moves, they learn one move at a time
(slow motion, loop, mirror), then the webcam watches them, shows which body part is wrong,
and tells them how to fix it. They leave able to do the trend.

Raphael's words: "easy to learn, good design, like a dancing tutor". The camera checks your
movement, shows your mistakes, and tells you whether you did it right.

## Who it's for

Anyone who wants to learn a dance, mostly teenagers who watch TikTok trends and want to post
their own version. The hackathon audience and judges (college programming club) are the
first users.

## Goals

- A learner can go from "never seen it" to "can do one move" in under a minute, guided by the
  app.
- The camera feedback feels instant and fair: wrong limbs turn red, right ones don't flicker,
  and a correct move gets a good score.
- Adding a trend is easy: upload the saved TikTok mp4, the app does the rest.
- It looks polished: dark, bold, made for teenagers, good on a projector.
- One 90-second demo flow that works end to end (see Demo).

## Non-goals (for tonight)

- 3D avatar / 3D world / exporting the dance. Stretch only, if everything else is done.
- Pasting a TikTok link to import a video. Stretch only (see Constraints).
- Accounts, login, saved progress, leaderboards.
- Music beat detection.
- Multiple dancers in one video.
- Mobile layout. The demo runs on a laptop; desktop-only is fine.

## Anti-goals (a failure even if it technically works)

- An impressive tech demo that nobody could actually learn the dance from.
- Feedback that lags or flickers, or scoring that feels random (failing a correct move,
  praising a wrong one). The learner stops trusting it.
- A demo that depends on venue wifi or an external service at the moment it runs.

## Constraints

- 13 hours overnight (Thursday 20:00 → Friday 09:00), live demo + short pitch after.
- Team: Raphael (only experienced developer) builds the base; students, mostly beginners,
  do small issues with AI agents. Rules in `AGENTS.md`.
- Stack (already decided): one Next.js app (App Router, TypeScript, Tailwind, shadcn/ui),
  Postgres through Prisma 7, self-hosted (`output: 'standalone'`). See
  `docs/team/THURSDAY-CHECKLIST.md` for the base setup.
- Only Raphael adds dependencies and changes the Prisma schema.
- No training data: we have one video per trend, so no trained model of our own.
- TikTok has no official API to download other people's videos; unofficial downloaders
  (yt-dlp) break often. So import is by uploading an mp4 the user already saved.
- The webcam (`getUserMedia`) only works in a secure context: `localhost` or HTTPS. The
  deployed app must be served over HTTPS.
- TikTok videos belong to their creators: demo use only, no public redistribution.

## Approaches

| | How | Trade-off |
|---|---|---|
| **A. Everything in the browser (picked)** | MediaPipe Pose Landmarker runs in the browser, both on the uploaded video (once, when adding a trend) and on the webcam (live). The comparison is plain TypeScript math. Next.js + Postgres store trends. | One app, one language, matches the planned base, feedback is instant (no network in the loop). Risk: comparison needs tuning (timing, fairness). |
| B. Python server with TensorFlow / sklearn | Video processing and comparison in a Python service next to Next.js. | Webcam frames round-trip to the server on every check: lag on venue wifi on the feature that must feel instant. Second language and service for beginners. A trained model (sklearn) needs labeled right/wrong examples we don't have. |
| C. Hybrid | Python processes uploaded videos server-side, browser does the live webcam. | No lag, but still two services and two languages for a step the browser does fine. |

Raphael picked A. TensorFlow is still involved: the MediaPipe pose model is a TensorFlow Lite
model. If MediaPipe gets in the way, TensorFlow.js pose models (MoveNet, BlazePose) are the
in-browser fallback.

## The product

### Flow

1. **Library** (home): a grid of trend cards (thumbnail, title, length, number of moves) and an
   "Add a trend" button.
2. **Add a trend**: pick an mp4, give it a title. A progress bar runs while the browser reads
   the dancer's pose frame by frame. Then a preview: the dark video with the skeleton, and the
   dance split into moves on a timeline. Save.
3. **Learn** (per trend): only the dancer panel. One move at a time, looping. Controls: speed
   0.5× / 0.75× / 1×, mirror, previous/next move, move timeline. No camera.
4. **Practice**: camera on, two panels (sketch below). 3-2-1 countdown, then the current move
   loops at the chosen speed. Live score, wrong limbs in red on the learner's skeleton, one tip
   at a time. A move is **passed** when its score for one full loop is at or above the pass
   level; then the next move starts. The learner can skip a move.
5. **Full run**: the whole dance at 1× with the camera, then a result screen: final score and a
   score per move (so you see which moves to practice again). This is the demo ending.

### The practice screen

Both panels are vertical (TikTok is 9:16), so two side by side fill a laptop screen.

```
┌──────────────── "Trend name" · Practice ────────────────┐
│   ┌─────────────┐              ┌─────────────┐          │
│   │ TikTok,     │              │ you, webcam │          │
│   │ darkened    │              │ (mirrored)  │          │
│   │     O       │              │     O       │          │
│   │    /|\      │              │    /|\      │          │
│   │    / \      │              │    / \      │          │
│   │ bright      │              │ your bones, │          │
│   │ skeleton    │              │ red = wrong │          │
│   └─────────────┘              └─────────────┘          │
│   Move 3 of 8           Score 82        Tip: left arm up │
│   ▢ ▢ ■ ▢ ▢ ▢ ▢ ▢     0.5x 0.75x 1x    loop    mirror    │
└──────────────────────────────────────────────────────────┘
```

- **Dancer panel** (Raphael's idea): the TikTok video plays darkened in the background (music
  on), with the dancer's skeleton drawn bright on top.
- **Learner panel**: the webcam, mirrored and darkened the same way, with the learner's
  skeleton on top. Limbs below the pass level are red; the others use the normal skeleton
  color.
- Colors come from the theme in `app/globals.css` (dark theme; red = the theme's destructive
  color). No hardcoded colors.

## How it works

### Reading a dance (when adding a trend)

- The uploaded mp4 goes into a hidden `<video>` in the browser. The app steps through it at a
  fixed sample rate and runs Pose Landmarker in VIDEO mode, one person (`numPoses: 1`).
- Per sampled frame it keeps: timestamp, the 33 normalized landmarks (x, y, visibility) for
  drawing, and whatever the comparison needs (see below). Frames with no detected person are
  stored as empty.
- The browser then sends the mp4 + the pose data + the move split to a route handler, which
  saves the video file and creates the trend.
- The MediaPipe WASM files and `.task` model are served from our own app (`public/`), not a
  CDN, so the demo doesn't depend on the internet.

### Splitting into moves

- Automatic: moves of roughly 2–4 seconds, cutting at the lowest-motion moment near each
  boundary (where the dancer's landmarks move least). A move is just `{ startMs, endMs }`;
  moves are named "Move 1…N".
- Should: on the add-a-trend preview, the uploader can drag the cut points before saving.

### Comparing the learner to the dancer

- **Pose representation:** directions of the limb segments (left/right upper arm, forearm,
  thigh, shin; torso optional), as unit vectors. Directions don't depend on body size or
  where the person stands in the frame. Plain joint angles aren't enough: an arm straight up
  and straight forward have the same elbow angle.
- **Left/right:** compare anatomically: the learner's right arm against the dancer's right
  arm. Feed the **unmirrored** webcam frames to the model and mirror only the display (CSS),
  otherwise the model's left/right labels flip. The mirror toggle only flips how the videos
  are shown.
- **Timing:** beginners lag behind the music. Each live frame is compared with the
  best-matching dancer frame in a short window around the current video time (about
  −400 ms to +100 ms, to tune). The reference time is the dancer video's `currentTime`, so
  this works at any playback speed.
- **Per-limb score:** similarity of the learner's and the dancer's limb direction, mapped to
  0–100. A limb is red when its score, smoothed over about half a second, is below the pass
  level (smoothing stops the flicker).
- **Visibility:** limbs not visible in both poses (low visibility, e.g. legs out of frame on a
  laptop webcam) are left out of the score, so upper-body-only practice still works.
- **Frame score:** average of the scored limbs. **Move score:** average of the frame scores
  over one loop of the move. **Pass level:** starts at 70, tuned with real people tonight.
- **Tips:** take the worst limb. Must: "Watch your left arm". Should: a direction from the
  vector difference ("Raise your left arm", "Bend your right knee") from a small lookup
  table.
- Only one model runs live (on the webcam). The dancer's skeleton is drawn from the stored
  pose data at the video's current time.

### Data

One table, owned by Raphael:

- `Trend`: id, title, video file location, thumbnail (optional), duration, sample rate, pose
  data (JSON), moves (JSON array of `{ startMs, endMs }`), created at.
- The library query must not load the pose data (it's around 1 MB per trend).

### Video files

- Saved on the server's disk at upload. Next.js only serves `public/` files that existed at
  build time, so uploads are served by a route handler (or the reverse proxy).
- That route must support HTTP Range requests, or seeking and looping the video break.
- Upload through a route handler, not a Server Action (Server Actions have a small default
  body size limit; TikTok mp4s are 5–30 MB).

## Demo (90 seconds)

1. Library with 2–3 ready trends (5 s).
2. Add a trend: upload a short clip, show the progress bar and the split into moves (20 s).
   If processing is slower than real time, show it starting and switch to a trend added
   earlier.
3. Learn move 1 at 0.5× with mirror (15 s).
4. Practice: a teammate dances live; an arm goes red, the tip says "raise your left arm",
   they fix it, the move passes (25 s).
5. Full run → final score (25 s).

**Demo content** (content/research students): 2–3 trends chosen to track well: one dancer,
full body visible, facing the camera, no jump cuts or zooms, good light, not too fast. Added
before the demo. Rehearse at the venue's distance and lighting.

## Scope for 13 hours

**Must:** library, add a trend (upload → poses → auto-split → save), learn mode (speed, loop,
mirror, move navigation), practice with live score + red limbs + limb tip + pass/next, full
run with result screen, 2–3 demo trends, HTTPS deploy.

**Should:** directional tips, adjusting cut points, countdown, per-move scores on the result
screen, design polish pass, empty and error states (no camera, no person detected).

**Won't (stretch, in this order):** 3D view of the dancer, paste-a-TikTok-link import,
accounts and progress.

**If it slips:** cut "Add a trend" from the live demo (keep the preloaded trends), then cut
directional tips, then cut the full run (practice alone still demos the tutor).

## Risks

- **Comparison feels unfair** (the biggest one). Mitigation: limb directions, timing window,
  smoothing, visibility filter, tuning the pass level with real people early (before
  midnight), not at 6am.
- **Venue camera/light:** the learner must stand 2–3 m from the laptop to be fully visible.
  The visibility filter keeps upper-body practice working; rehearse in place.
- **Tracking fails on a trend** (fast spins, edits). Pick demo trends that track well.
- **Performance:** live model + video + two canvases on a laptop. Use the GPU delegate and a
  lighter model variant if the frame rate drops.

## What Raphael decided

- Dance tutor first, 3D only if there's time.
- For everyone, mostly teenagers.
- The camera checks your movement and shows your mistakes.
- Import by uploading the mp4.
- Approach A (all in the browser).
- The look: darkened TikTok video with the bright skeleton on top; the two-panel practice
  screen and the Library → Add → Learn → Practice → Full run flow.

## Calls I made (Raphael to check)

- Limb directions for the comparison, the timing window, the pass level of 70, smoothing,
  and the visibility filter.
- Automatic 2–4 s move split at low-motion moments, with manual adjustment as a should.
- No accounts or saved progress; desktop only.
- Model and WASM self-hosted in `public/`.
- Videos on the server's disk, served by a Range-aware route; pose data as JSON in Postgres.

## Left to the builder

- Sample rate for reading the uploaded video, and the model variant (lite/full/heavy).
- Exact similarity-to-score mapping and smoothing method.
- Whether pose data lives in the `Trend` row or in a file next to the video.
- Folder for the client-side pose and comparison code (not `lib/server/`, it runs in the
  browser).
- Which shadcn/ui components the base installs, and how the work is split into issues for
  the students.
