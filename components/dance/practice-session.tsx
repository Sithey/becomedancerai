"use client";

import type { PoseLandmarker } from "@mediapipe/tasks-vision";
import { useCallback, useEffect, useEffectEvent, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Confetti } from "@/components/dance/confetti";
import { CountIn } from "@/components/dance/count-in";
import { DancerPanel, dancerPoseAt } from "@/components/dance/dancer-panel";
import { drawLearnerPose } from "@/components/dance/draw-learner-pose";
import { LearnerPanel } from "@/components/dance/learner-panel";
import { MoveTimeline } from "@/components/dance/move-timeline";
import { fullRunParts, shorterPracticeParts } from "@/components/dance/practice-parts";
import { RunResult } from "@/components/dance/run-result";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { themeColor } from "@/lib/pose/draw";
import { FRAMED, framingState, sameFraming, type Framing } from "@/lib/pose/framing-state";
import { createPoseLandmarker } from "@/lib/pose/landmarker";
import { fromMediaPipe } from "@/lib/pose/landmarks";
import { averageScore, isPassed } from "@/lib/pose/scoring";
import { LearnerHistory, limbMotion, scoreSegment, type SegmentScore } from "@/lib/pose/segment";
import { correctionFor, limbDirections } from "@/lib/pose/tips";
import type { FrameSize, Pose, TrendData } from "@/lib/pose/types";
import { useWebcam } from "@/lib/pose/webcam";
import {
  getProgress,
  resumeMoveIndex,
  saveLastPracticedMove,
  saveMoveScore,
  saveRunScore,
  type PracticeList,
} from "@/lib/progress";
import { applyPartRetry, moveIndexAt, summarizeAttempt, type RecordedScore, type SessionResult } from "@/lib/result-summary";

const SPEEDS = [0.5, 0.75, 1];
const UI_UPDATE_MS = 250;

type Props = { trend: TrendData; mode: "moves" | "full" };

export function PracticeSession({ trend, mode }: Props) {
  const isFull = mode === "full";
  const { videoRef: webcamRef, status: webcamStatus } = useWebcam();
  const dancerRef = useRef<HTMLVideoElement>(null);
  const learnerCanvasRef = useRef<HTMLCanvasElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const [modelStatus, setModelStatus] = useState<"loading" | "ready" | "error">("loading");
  // The dancer waits for the camera and the model, or the start of move 1 isn't scored.
  const [started, setStarted] = useState(false);

  const [liveMove, setLiveMove] = useState(0);
  const [shorterParts, setShorterParts] = useState(false);
  const [speed, setSpeed] = useState(0.75);
  const [mirrored, setMirrored] = useState(true);
  const [showPoseGuide, setShowPoseGuide] = useState(false);
  const [result, setResult] = useState<SessionResult | null>(null);
  const [startMs, setStartMs] = useState(0);
  const [retryIndex, setRetryIndex] = useState<number | null>(null);
  const [retryScore, setRetryScore] = useState<{ index: number; score: number | null } | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [countingIn, setCountingIn] = useState(false);
  const [framing, setFraming] = useState<Framing>(FRAMED);
  const framesRef = useRef<RecordedScore[]>([]);
  const practicePartRef = useRef<{ index: number; scores: number[] } | null>(null);

  const runParts = useMemo(
    () => fullRunParts(trend.moves, trend.durationMs),
    [trend.moves, trend.durationMs],
  );
  const shortMoves = useMemo(() => shorterPracticeParts(trend.moves), [trend.moves]);
  const moves = isFull ? runParts : shorterParts ? shortMoves : trend.moves;
  const list: PracticeList = shorterParts ? "parts" : "moves";
  const retrying = retryIndex !== null;
  const showResults = result !== null && !retrying;
  const range = retrying ? moves[retryIndex] : { startMs, endMs: trend.durationMs };

  // Back to the Start button, without writing progress: leaving the page keeps the move to resume.
  const resetSession = useCallback(() => {
    framesRef.current = [];
    practicePartRef.current = null;
    setLiveMove(0);
    setStartMs(0);
    setResult(null);
    setRetryIndex(null);
    setRetryScore(null);
    setStarted(false);
    setCountingIn(false);
    setShowConfetti(false);
  }, []);

  // Next keeps a left page hidden (Activity) and re-runs its effects on return: without this reset the
  // dancer starts again on its own, with no count-in, mid-session or during a part retry.
  useLayoutEffect(() => resetSession, [resetSession]);

  useEffect(() => {
    if (retrying) playerRef.current?.focus();
    if (showResults) resultsRef.current?.focus();
  }, [retrying, showResults]);

  const savePracticePart = () => {
    const part = practicePartRef.current;
    const average = part ? averageScore(part.scores) : null;
    if (part && average !== null) saveMoveScore(trend.id, part.index, Math.round(average), list);
  };

  const recordFrame = useEffectEvent((
    timeMs: number,
    match: SegmentScore | null,
    learner: Pose | null,
    learnerSize: FrameSize,
    dancerSize: FrameSize,
    updateUi: boolean,
  ) => {
    if (!started || countingIn || showResults || timeMs < range.startMs || timeMs > range.endMs) return;
    const index = moveIndexAt(moves, timeMs);
    if (index === -1 || (retrying && index !== retryIndex)) return;
    if (index !== liveMove) setLiveMove(index);

    if (!isFull && !retrying && practicePartRef.current?.index !== index) {
      savePracticePart();
      saveLastPracticedMove(trend.id, index, list);
      practicePartRef.current = { index, scores: [] };
    }
    if (!match || !learner) return;

    const frame: RecordedScore = { timeMs, score: match.score };
    if (updateUi && !isPassed(match.score)) {
      const reference = dancerPoseAt(trend, timeMs - match.lagMs);
      if (reference) {
        frame.correction = correctionFor(
          match.limbs, limbDirections(learner, learnerSize), limbDirections(reference, dancerSize),
        ) ?? undefined;
      }
    }
    framesRef.current.push(frame);
    practicePartRef.current?.scores.push(match.score);
  });

  // A refetch of the page hands a new trend object with the same data: the loop below reads it here and
  // is keyed on trend.id, so a refetch doesn't close and reload the pose model.
  const trendRef = useRef(trend);

  const guideColor = useEffectEvent((color: string) => showPoseGuide ? color : "transparent");

  useEffect(() => {
    trendRef.current = trend;
  });

  useEffect(() => {
    const trend = trendRef.current;
    let cancelled = false;
    let landmarker: PoseLandmarker | null = null;
    let raf = 0;
    let lastWebcamTime = -1;
    let lastUiUpdate = -Infinity;
    let lastSeen = performance.now();
    const primary = themeColor("primary");
    const learnerCanvas = learnerCanvasRef.current;
    const matchColor = learnerCanvas ? getComputedStyle(learnerCanvas).color : "";
    const dancerSize = { width: trend.width, height: trend.height };
    const motion = limbMotion(trend.poses, dancerSize, trend.sampleMs);
    const history = new LearnerHistory();

    const frame = () => {
      raf = requestAnimationFrame(frame);
      const webcam = webcamRef.current;
      const ctx = learnerCanvasRef.current?.getContext("2d");
      if (!landmarker || !webcam || !ctx) return;
      if (webcam.readyState < 2 || webcam.currentTime === lastWebcamTime) return;
      lastWebcamTime = webcam.currentTime;

      const now = performance.now();
      const updateUi = now - lastUiUpdate >= UI_UPDATE_MS;
      // The raw webcam frame goes to the model (mirroring is CSS only), so its left/right stay anatomical.
      const landmarks = landmarker.detectForVideo(webcam, now).landmarks[0];
      const learner = landmarks ? fromMediaPipe(landmarks) : null;
      if (learner) lastSeen = now;
      const learnerSize = { width: webcam.videoWidth, height: webcam.videoHeight };

      const dancer = dancerRef.current;
      let match: SegmentScore | null = null;
      if (dancer && !dancer.paused && !dancer.seeking && dancer.readyState >= 2) {
        const tMs = dancer.currentTime * 1000;
        // A missing pose must not credit the most recent score again.
        if (learner) {
          history.push({ t: tMs, pose: learner });
          match = scoreSegment(history.samples(tMs), learnerSize, trend.poses, trend.sampleMs, dancerSize, motion);
        }
        recordFrame(tMs, match, learner, learnerSize, dancerSize, updateUi);
      } else {
        history.clear();
      }

      drawLearnerPose(ctx, learner, match?.limbs, { color: guideColor(primary), matchColor });

      if (updateUi) {
        lastUiUpdate = now;
        const nextFraming = framingState(learner, now - lastSeen);
        setFraming((prev) => (sameFraming(prev, nextFraming) ? prev : nextFraming));
      }
    };

    createPoseLandmarker().then(
      (created) => {
        if (cancelled) {
          created.close();
          return;
        }
        landmarker = created;
        setModelStatus("ready");
        raf = requestAnimationFrame(frame);
      },
      () => {
        if (!cancelled) setModelStatus("error");
      },
    );

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      landmarker?.close();
      // The model is loaded again when the page is shown again: Start waits for it.
      setModelStatus("loading");
    };
  }, [webcamRef, trend.id]);

  const startRetry = (index: number) => {
    dancerRef.current?.pause();
    framesRef.current = [];
    practicePartRef.current = null;
    setLiveMove(index);
    setRetryIndex(index);
    setRetryScore(null);
    setShowConfetti(false);
    setCountingIn(true);
  };

  const selectMove = (index: number) => {
    if (retrying) return;
    if (showResults) {
      startRetry(index);
      return;
    }
    if (index === liveMove) return;
    dancerRef.current?.pause();
    practicePartRef.current = null;
    setLiveMove(index);
    setStartMs(moves[index].startMs);
    saveLastPracticedMove(trend.id, index, list);
    setCountingIn(started);
  };

  const handleStart = () => {
    // Read on click, not while rendering: the server has no localStorage, so a saved move there would mismatch.
    if (!isFull) {
      const index = resumeMoveIndex(getProgress(trend.id), list, moves.length);
      setLiveMove(index);
      setStartMs(moves[index]?.startMs ?? 0);
    }
    setStarted(true);
    setCountingIn(true);
  };

  const handleCountInDone = useCallback(() => {
    setCountingIn(false);
  }, []);

  const handleFinish = () => {
    if (!started || countingIn || showResults) return;
    if (retryIndex !== null && result) {
      const [attempt] = summarizeAttempt([moves[retryIndex]], framesRef.current).parts;
      if (!isFull && attempt.score !== null) saveMoveScore(trend.id, retryIndex, attempt.score, list);
      setResult(applyPartRetry(result, retryIndex, attempt));
      setRetryScore({ index: retryIndex, score: attempt.score });
      setRetryIndex(null);
      return;
    }

    const nextResult = summarizeAttempt(moves, framesRef.current);
    if (isFull && nextResult.final !== null) saveRunScore(trend.id, nextResult.final);
    if (!isFull) {
      savePracticePart();
      // Playing through the last move saved it as the place to resume: the next visit starts from move 1.
      saveLastPracticedMove(trend.id, 0, list);
    }
    practicePartRef.current = null;
    setResult(nextResult);
    setShowConfetti(nextResult.parts.length > 0 && nextResult.parts.every(({ score }) => isPassed(score)));
  };

  const skipMove = () => {
    if (liveMove < moves.length - 1) {
      selectMove(liveMove + 1);
    } else {
      dancerRef.current?.pause();
      handleFinish();
    }
  };

  const restart = () => {
    dancerRef.current?.pause();
    resetSession();
    if (!isFull) saveLastPracticedMove(trend.id, 0, list);
  };

  const changePartLength = (useShorterParts: boolean) => {
    const nextMoves = useShorterParts ? shortMoves : trend.moves;
    const timeMs = started ? (dancerRef.current?.currentTime ?? 0) * 1000 : startMs;
    const index = Math.max(0, moveIndexAt(nextMoves, timeMs));
    savePracticePart();
    practicePartRef.current = null;
    setShorterParts(useShorterParts);
    setLiveMove(index);
    saveLastPracticedMove(trend.id, index, useShorterParts ? "parts" : "moves");
    if (!started) setStartMs(nextMoves[index]?.startMs ?? 0);
  };

  const learnerNotice =
    modelStatus === "loading"
      ? "Loading pose model…"
      : modelStatus === "error"
        ? "Couldn't load the pose model. Reload the page to try again."
        : null;
  const ready = webcamStatus === "ready" && modelStatus === "ready";
  const normalSpeed = isFull ? 1 : speed;
  const mirrorToggle = (
    <Toggle variant="outline" pressed={mirrored} onPressedChange={setMirrored}>
      Mirror
    </Toggle>
  );

  return (
    <div className="flex flex-col gap-6">
      <div ref={playerRef} tabIndex={-1} className="flex flex-wrap items-center justify-between gap-4">
        <span className="text-muted-foreground">
          {retrying
            ? `Retrying ${isFull ? "part" : "move"} ${retryIndex + 1} at 0.5×`
            : `${isFull ? "Part" : "Move"} ${liveMove + 1} of ${moves.length}`}
        </span>
        {!isFull && !retrying && (
          <MoveTimeline
            count={moves.length}
            current={showResults ? -1 : liveMove}
            passed={result?.parts.map(({ score }) => isPassed(score))}
            onSelect={selectMove}
          />
        )}
      </div>

      <div className="relative">
        {/* Two columns even on a portrait phone: 9:16 panels are bigger side by side than stacked. */}
        <div className="grid grid-cols-2 gap-3 sm:gap-6">
          <figure className="mx-auto flex w-full max-w-[calc(60vh*9/16)] flex-col gap-2">
            <DancerPanel
              trend={trend}
              range={range}
              speed={retrying ? 0.5 : normalSpeed}
              mirrored={mirrored}
              showPoseGuide={showPoseGuide}
              videoRef={dancerRef}
              onLoop={handleFinish}
              loop={false}
              autoStart={started && !countingIn && !showResults}
              highlightedLimb={retrying ? result?.parts[retryIndex].correction?.limb : undefined}
            />
            <figcaption className="text-xs text-muted-foreground sm:text-[13px]">
              {showPoseGuide ? "Follow the bright skeleton." : "Follow the dancer."}
            </figcaption>
          </figure>
          <figure className="mx-auto flex w-full max-w-[calc(60vh*9/16)] flex-col gap-2">
            <LearnerPanel
              videoRef={webcamRef}
              canvasRef={learnerCanvasRef}
              status={webcamStatus}
              notice={learnerNotice}
              framing={framing}
            />
            <figcaption className="text-xs text-muted-foreground sm:text-[13px]">Body parts in orange need fixing.</figcaption>
          </figure>
        </div>
        {countingIn && <CountIn key={liveMove} onDone={handleCountInDone} />}
        {/* Over the panels, not below them: on a 900 px laptop screen a button under the panels is off screen. */}
        {!started && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
            <Button
              size="lg"
              className="pointer-events-auto h-14 rounded-full px-10 text-base shadow-lg"
              disabled={!ready}
              onClick={handleStart}
            >
              {ready ? "Start" : "Getting ready…"}
            </Button>
          </div>
        )}
      </div>

      {!showResults && (
        <div className="flex flex-wrap items-center gap-2.5 rounded-[1.25rem] border border-border bg-card px-4 py-4 sm:px-5 [&_button]:min-h-11 sm:[&_button]:min-h-0">
          {!isFull && !retrying && (
            <>
              <ToggleGroup
                aria-label="Speed"
                variant="outline"
                value={[String(speed)]}
                onValueChange={(value) => value[0] && setSpeed(Number(value[0]))}
              >
                {SPEEDS.map((s) => (
                  <ToggleGroupItem key={s} value={String(s)}>
                    {s}×
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              {shortMoves.length > trend.moves.length && (
                <Toggle
                  variant="outline"
                  pressed={shorterParts}
                  onPressedChange={changePartLength}
                  disabled={countingIn}
                >
                  Shorter parts
                </Toggle>
              )}
            </>
          )}
          {mirrorToggle}
          <Toggle variant="outline" pressed={showPoseGuide} onPressedChange={setShowPoseGuide}>
            Pose guide
          </Toggle>
          {!isFull && !retrying && (
            <Button variant="outline" onClick={skipMove} disabled={!started || countingIn}>
              Skip move
            </Button>
          )}
          <Button variant="outline" disabled={!started && liveMove === 0} onClick={restart}>
            Reset
          </Button>
        </div>
      )}

      {showResults && (
        <div ref={resultsRef} tabIndex={-1}>
          <RunResult
            trendId={trend.id}
            mode={mode}
            result={result}
            retryScore={retryScore}
            onRestart={restart}
            onRetry={startRetry}
          />
        </div>
      )}

      {showConfetti && <Confetti />}
    </div>
  );
}
