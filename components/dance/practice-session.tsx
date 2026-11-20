"use client";

import type { PoseLandmarker } from "@mediapipe/tasks-vision";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CoachingTip } from "@/components/dance/coaching-tip";
import { Confetti } from "@/components/dance/confetti";
import { CountIn } from "@/components/dance/count-in";
import { DancerPanel, dancerPoseAt } from "@/components/dance/dancer-panel";
import { drawLearnerPose } from "@/components/dance/draw-learner-pose";
import { LearnerPanel } from "@/components/dance/learner-panel";
import { MoveTimeline } from "@/components/dance/move-timeline";
import { fullRunParts, isPartPassed, shorterPracticeParts } from "@/components/dance/practice-parts";
import { RunResult } from "@/components/dance/run-result";
import { useCoachingReplay } from "@/components/dance/use-coaching-replay";
import { Button, buttonVariants } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { comparePoses } from "@/lib/pose/compare";
import { themeColor } from "@/lib/pose/draw";
import { FRAMED, framingState, sameFraming, type Framing } from "@/lib/pose/framing-state";
import { createPoseLandmarker } from "@/lib/pose/landmarker";
import { fromMediaPipe } from "@/lib/pose/landmarks";
import { averageScore, isPassed } from "@/lib/pose/scoring";
import { LearnerHistory, limbMotion, scoreSegment, type SegmentScore } from "@/lib/pose/segment";
import { correctionFor, limbDirections } from "@/lib/pose/tips";
import type { LimbScores, Move, TrendData } from "@/lib/pose/types";
import { useWebcam } from "@/lib/pose/webcam";
import { allPartsPassed } from "@/lib/result-summary";
import {
  getProgress,
  resumeMoveIndex,
  saveLastPracticedMove,
  saveMoveScore,
  saveRunScore,
  type PracticeList,
} from "@/lib/progress";
import { cn } from "cn";

const SPEEDS = [0.5, 0.75, 1];
const UI_UPDATE_MS = 250;

type Props = { trend: TrendData; mode: "moves" | "full" };
type FullRunResult = { final: number | null; parts: (number | null)[] };

function moveIndexAt(moves: Move[], tMs: number): number {
  const last = moves.length - 1;
  return moves.findIndex(
    (m, i) => tMs >= m.startMs && (tMs < m.endMs || (i === last && tMs <= m.endMs)),
  );
}

const roundScore = (avg: number | null) => (avg === null ? null : Math.round(avg));

export function PracticeSession({ trend, mode }: Props) {
  const isFull = mode === "full";
  const { videoRef: webcamRef, status: webcamStatus } = useWebcam();
  const dancerRef = useRef<HTMLVideoElement>(null);
  const learnerCanvasRef = useRef<HTMLCanvasElement>(null);
  const [modelStatus, setModelStatus] = useState<"loading" | "ready" | "error">("loading");
  // The dancer waits for the camera and the model, or the start of move 1 isn't scored.
  const [started, setStarted] = useState(false);

  const [moveIndex, setMoveIndex] = useState(0);
  const [completedParts, setCompletedParts] = useState<Move[]>([]);
  const [shorterParts, setShorterParts] = useState(false);
  const [done, setDone] = useState(false);
  const [speed, setSpeed] = useState(0.75);
  const [mirrored, setMirrored] = useState(true);
  const [runKey, setRunKey] = useState(0);
  const [result, setResult] = useState<FullRunResult | null>(null);
  const [resumeAtMs, setResumeAtMs] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);

  const [liveMove, setLiveMove] = useState(0);
  const [showNice, setShowNice] = useState(false);
  const [countingIn, setCountingIn] = useState(false);
  const [framing, setFraming] = useState<Framing>(FRAMED);

  // Practice tracks one loop. Full Run keeps each part's scores across retries.
  const scoresRef = useRef<number[]>([]);
  const bucketsRef = useRef<number[][]>([]);
  const advanceTimer = useRef<number | null>(null);

  const cancelAdvance = useCallback(() => {
    if (advanceTimer.current === null) return;
    window.clearTimeout(advanceTimer.current);
    advanceTimer.current = null;
  }, []);

  useEffect(() => cancelAdvance, [cancelAdvance]);

  const replayAttempt = useCallback((partIndex?: number) => {
    scoresRef.current = [];
    if (partIndex === undefined) {
      bucketsRef.current = [];
    } else {
      bucketsRef.current[partIndex] = [];
    }
    setRunKey((k) => k + 1);
  }, []);
  const { coaching, pauseIfNeeded, replay, clearCoaching, getCoaching } = useCoachingReplay(replayAttempt);

  const runParts = useMemo(
    () => fullRunParts(trend.moves, trend.durationMs),
    [trend.moves, trend.durationMs],
  );
  const shortMoves = useMemo(() => shorterPracticeParts(trend.moves), [trend.moves]);
  const moves = isFull ? runParts : shorterParts ? shortMoves : trend.moves;
  const list: PracticeList = shorterParts ? "parts" : "moves";
  const passed = useMemo(() => moves.map((move) => isPartPassed(move, completedParts)), [moves, completedParts]);
  const replayPart = coaching?.phase === "replay" && coaching.partIndex !== undefined
    ? runParts[coaching.partIndex]
    : null;
  const range = isFull
    ? replayPart ?? { startMs: resumeAtMs, endMs: trend.durationMs }
    : moves[moveIndex];

  useEffect(() => {
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
      // The raw webcam frame goes to the model (mirroring is CSS only), so its left/right stay anatomical.
      const landmarks = landmarker.detectForVideo(webcam, now).landmarks[0];
      const learner = landmarks ? fromMediaPipe(landmarks) : null;
      if (learner) lastSeen = now;
      const learnerSize = { width: webcam.videoWidth, height: webcam.videoHeight };

      const dancer = dancerRef.current;
      let match: SegmentScore | null = null;
      let reviewScores: LimbScores | undefined;
      let partIndex = -1;
      if (dancer && !dancer.seeking && dancer.readyState >= 2) {
        const tMs = dancer.currentTime * 1000;
        const currentCoaching = getCoaching();
        if (isFull) partIndex = moveIndexAt(runParts, tMs);
        if (!dancer.paused) {
          // No learner pose this frame: skip scoring, so the last segment isn't credited again.
          if (learner) {
            history.push({ t: tMs, pose: learner });
            match = scoreSegment(history.samples(tMs), learnerSize, trend.poses, trend.sampleMs, dancerSize, motion);
          }
          if (match) {
            if (!isFull) {
              scoresRef.current.push(match.score);
            } else if (partIndex !== -1 && (
              currentCoaching?.phase !== "replay" || currentCoaching.partIndex === partIndex
            )) {
              (bucketsRef.current[partIndex] ??= []).push(match.score);
            }
          }
        } else {
          history.clear();
          if (learner && currentCoaching?.phase === "review") {
            const frozenPose = dancerPoseAt(trend, tMs);
            if (frozenPose) reviewScores = comparePoses(learner, learnerSize, frozenPose, dancerSize).limbs;
          }
        }
      } else {
        history.clear();
      }

      drawLearnerPose(ctx, learner, match?.limbs ?? reviewScores, { color: primary, matchColor });

      if (now - lastUiUpdate >= UI_UPDATE_MS) {
        lastUiUpdate = now;
        const nextFraming = framingState(learner, now - lastSeen);
        setFraming((prev) => (sameFraming(prev, nextFraming) ? prev : nextFraming));
        if (dancer && learner && match && (!isFull || partIndex !== -1)) {
          const { score, lagMs, limbs } = match;
          pauseIfNeeded(dancer, score, () => {
            // The dancer pose the learner was matched against: the segment's offset, not the current frame.
            const dancerPose = dancerPoseAt(trend, dancer.currentTime * 1000 - lagMs);
            return dancerPose
              ? correctionFor(limbs, limbDirections(learner, learnerSize), limbDirections(dancerPose, dancerSize))
              : null;
          }, isFull ? partIndex : undefined);
        }
        if (partIndex !== -1) setLiveMove(partIndex);
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
    };
  }, [webcamRef, trend, isFull, runParts, pauseIfNeeded, getCoaching]);

  const finish = (allPassed: boolean) => {
    setDone(true);
    dancerRef.current?.pause();
    // The last loop saved the last move: the next visit starts from move 1 again.
    saveLastPracticedMove(trend.id, 0, list);
    if (allPassed) setShowConfetti(true);
  };

  const clearPassedPrompt = () => {
    cancelAdvance();
    setShowNice(false);
  };

  const nextMove = (passedCurrent = false) => {
    clearPassedPrompt();
    clearCoaching();
    scoresRef.current = [];
    if (moveIndex === moves.length - 1) {
      finish(passed.every((didPass, i) => didPass || (passedCurrent && i === moveIndex)));
    } else {
      const nextIndex = moveIndex + 1;
      setMoveIndex(nextIndex);
      if (!isFull) {
        saveLastPracticedMove(trend.id, nextIndex, list);
      }
      setCountingIn(started);
    }
  };

  const skipMove = () => {
    dancerRef.current?.pause();
    nextMove();
  };

  const selectMove = (index: number) => {
    if (!done && index === moveIndex) return;
    dancerRef.current?.pause();
    clearPassedPrompt();
    clearCoaching();
    scoresRef.current = [];
    setDone(false);
    setShowConfetti(false);
    setMoveIndex(index);
    saveLastPracticedMove(trend.id, index, list);
    setCountingIn(started);
  };

  const handleStart = () => {
    // Read on click, not while rendering: the server has no localStorage, so a saved move there would mismatch.
    if (!isFull) {
      const resumeAt = resumeMoveIndex(getProgress(trend.id), list, moves.length);
      if (resumeAt > 0) setMoveIndex(resumeAt);
    }
    setStarted(true);
    setCountingIn(true);
  };

  const handleCountInDone = useCallback(() => {
    scoresRef.current = [];
    setCountingIn(false);
  }, []);

  const handleLoop = () => {
    if (result) return;
    clearCoaching();
    if (isFull) {
      if (replayPart && replayPart.endMs < trend.durationMs) {
        setResumeAtMs(replayPart.endMs);
        return;
      }
      setResumeAtMs(trend.durationMs);
      const finalScore = roundScore(averageScore(bucketsRef.current.flat()));
      if (finalScore !== null) {
        saveRunScore(trend.id, finalScore);
      }
      const parts = runParts.map((_, i) => roundScore(averageScore(bucketsRef.current[i] ?? [])));
      setResult({ final: finalScore, parts });
      if (allPartsPassed(parts)) setShowConfetti(true);
      return;
    }
    const loopScore = roundScore(averageScore(scoresRef.current));
    if (loopScore !== null) {
      saveMoveScore(trend.id, moveIndex, loopScore, list);
    }
    const loopPassed = isPassed(averageScore(scoresRef.current));
    scoresRef.current = [];
    if (!loopPassed || advanceTimer.current !== null) return;
    setCompletedParts((parts) =>
      isPartPassed(range, parts) ? parts : [...parts, range].sort((a, b) => a.startMs - b.startMs),
    );
    dancerRef.current?.pause();
    setShowNice(true);
    advanceTimer.current = window.setTimeout(() => nextMove(true), 1000);
  };

  const restart = () => {
    dancerRef.current?.pause();
    clearPassedPrompt();
    clearCoaching();
    setCompletedParts([]);
    setMoveIndex(0);
    if (!isFull) {
      saveLastPracticedMove(trend.id, 0, list);
    }
    setLiveMove(0);
    setResumeAtMs(0);
    setDone(false);
    setResult(null);
    setStarted(false);
    setCountingIn(false);
    setShowConfetti(false);
    replayAttempt();
  };

  const changePartLength = (useShorterParts: boolean) => {
    const nextMoves = useShorterParts ? shortMoves : trend.moves;
    dancerRef.current?.pause();
    clearPassedPrompt();
    clearCoaching();
    setShorterParts(useShorterParts);
    setMoveIndex(Math.max(0, moveIndexAt(nextMoves, range.startMs)));
    setCountingIn(started);
    replayAttempt();
  };

  const learnerNotice =
    modelStatus === "loading"
      ? "Loading pose model…"
      : modelStatus === "error"
        ? "Couldn't load the pose model. Reload the page to try again."
        : null;
  const ready = webcamStatus === "ready" && modelStatus === "ready";
  const shownMove = isFull ? liveMove : moveIndex;
  const normalSpeed = isFull ? 1 : speed;
  const replaySpeed = normalSpeed <= 0.5 ? normalSpeed / 2 : 0.5;
  const mirrorToggle = (
    <Toggle variant="outline" pressed={mirrored} onPressedChange={setMirrored}>
      Mirror
    </Toggle>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <span className="text-muted-foreground">
          {`${isFull ? "Part" : "Move"} ${shownMove + 1} of ${moves.length}`}
        </span>
        {!isFull && (
          <MoveTimeline
            count={moves.length}
            current={done ? -1 : moveIndex}
            passed={passed}
            onSelect={selectMove}
          />
        )}
      </div>

      <div className="relative">
        {/* Two columns even on a portrait phone: 9:16 panels are bigger side by side than stacked. */}
        <div className="grid grid-cols-2 gap-3 sm:gap-6">
          <figure className="mx-auto flex w-full max-w-[calc(60vh*9/16)] flex-col gap-2">
            <DancerPanel
              key={runKey}
              trend={trend}
              range={range}
              speed={coaching?.phase === "replay" ? replaySpeed : normalSpeed}
              mirrored={mirrored}
              videoRef={dancerRef}
              onLoop={handleLoop}
              loop={!isFull}
              autoStart={started && !countingIn && !result}
              highlightedLimb={coaching?.limb}
            />
            <figcaption className="text-xs text-muted-foreground sm:text-[13px]">Follow the bright skeleton.</figcaption>
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
        {countingIn && <CountIn key={moveIndex} onDone={handleCountInDone} />}
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

      <div className="flex flex-col items-stretch gap-3 rounded-[1.25rem] border border-border bg-card px-4 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4 sm:px-5">
        <div role="status" className="min-h-8 font-heading text-2xl font-bold text-primary">
          {showNice ? "Nice!" : null}
        </div>
        {/* Touch-sized controls on phones (44 px), compact from sm up. */}
        <div className="flex flex-wrap items-center gap-2.5 [&_button]:min-h-11 sm:[&_button]:min-h-0">
          {!isFull && !done && (
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
          {(!isFull ? !done : !result) && mirrorToggle}
          {!isFull && !done && (
            <Button variant="outline" onClick={skipMove} disabled={countingIn}>
              Skip move
            </Button>
          )}
          <Button variant="outline" disabled={!started && moveIndex === 0 && !done} onClick={restart}>
            Reset
          </Button>
        </div>
      </div>
      <CoachingTip coaching={coaching} replaySpeed={replaySpeed} onReplay={replay} />

      {!isFull && done && (
        <div className="flex flex-col items-center gap-4 rounded-[1.25rem] border border-border bg-muted p-8 text-center">
          <p className="font-heading text-2xl font-semibold">
            {passed.every(Boolean) ? "All moves passed!" : "Now do the full dance"}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href={`/trends/${trend.id}/run`} className={cn(buttonVariants(), "h-12 rounded-full px-6")}>
              Full run
            </Link>
            <Button variant="outline" className="h-12 rounded-full px-6" onClick={restart}>
              Practice again
            </Button>
          </div>
        </div>
      )}

      {isFull && result && (
        <RunResult
          trendId={trend.id}
          final={result.final}
          parts={result.parts}
          onRestart={restart}
        />
      )}

      {showConfetti && <Confetti />}
    </div>
  );
}
