"use client";

import type { PoseLandmarker } from "@mediapipe/tasks-vision";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CoachingTip } from "@/components/dance/coaching-tip";
import { DancerPanel, dancerPoseAt } from "@/components/dance/dancer-panel";
import { drawMatchingJoints } from "@/components/dance/draw-matching-joints";
import { LearnerPanel } from "@/components/dance/learner-panel";
import { isPartPassed, shorterPracticeParts } from "@/components/dance/practice-parts";
import { useCoachingReplay } from "@/components/dance/use-coaching-replay";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { comparePoses } from "@/lib/pose/compare";
import { drawSkeleton, themeColor } from "@/lib/pose/draw";
import { createPoseLandmarker } from "@/lib/pose/landmarker";
import { fromMediaPipe } from "@/lib/pose/landmarks";
import { averageScore, bestMatch, isPassed } from "@/lib/pose/scoring";
import { correctionFor, limbDirections } from "@/lib/pose/tips";
import type { LimbScores, Move, TrendData } from "@/lib/pose/types";
import { useWebcam } from "@/lib/pose/webcam";
import { cn } from "cn";

const SPEEDS = [0.5, 0.75, 1];
const UI_UPDATE_MS = 250;

type Props = { trend: TrendData; mode: "moves" | "full" };
type RunResult = { final: number | null; moves: (number | null)[] };

function moveIndexAt(moves: Move[], tMs: number): number {
  const last = moves.length - 1;
  return moves.findIndex(
    (m, i) => tMs >= m.startMs && (tMs < m.endMs || (i === last && tMs <= m.endMs)),
  );
}

const roundScore = (avg: number | null) => (avg === null ? null : Math.round(avg));
const scoreText = (score: number | null) => (score === null ? "–" : String(score));

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
  const [result, setResult] = useState<RunResult | null>(null);

  const [liveMove, setLiveMove] = useState(0);
  const [showNice, setShowNice] = useState(false);

  // Frame scores of the current loop (moves mode) or of the whole run (full mode).
  const scoresRef = useRef<number[]>([]);
  const bucketsRef = useRef<number[][]>([]);
  const advanceTimer = useRef<number | null>(null);

  const cancelAdvance = useCallback(() => {
    if (advanceTimer.current === null) return;
    window.clearTimeout(advanceTimer.current);
    advanceTimer.current = null;
  }, []);

  useEffect(() => cancelAdvance, [cancelAdvance]);

  const replayAttempt = useCallback(() => {
    scoresRef.current = [];
    bucketsRef.current = [];
    setRunKey((k) => k + 1);
  }, []);
  const { coaching, pauseIfNeeded, replay, clearCoaching, isReviewing } = useCoachingReplay(replayAttempt);

  const fullRange = useMemo(() => ({ startMs: 0, endMs: trend.durationMs }), [trend.durationMs]);
  const shortMoves = useMemo(() => shorterPracticeParts(trend.moves), [trend.moves]);
  const moves = !isFull && shorterParts ? shortMoves : trend.moves;
  const passed = useMemo(() => moves.map((move) => isPartPassed(move, completedParts)), [moves, completedParts]);
  const range = isFull ? fullRange : moves[moveIndex];

  useEffect(() => {
    let cancelled = false;
    let landmarker: PoseLandmarker | null = null;
    let raf = 0;
    let lastWebcamTime = -1;
    let lastUiUpdate = -Infinity;
    const primary = themeColor("primary");
    const learnerCanvas = learnerCanvasRef.current;
    const matchColor = learnerCanvas ? getComputedStyle(learnerCanvas).color : "";
    const dancerSize = { width: trend.width, height: trend.height };

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
      const learnerSize = { width: webcam.videoWidth, height: webcam.videoHeight };

      const dancer = dancerRef.current;
      let match: ReturnType<typeof bestMatch> = null;
      let reviewScores: LimbScores | undefined;
      if (dancer && !dancer.seeking && dancer.readyState >= 2) {
        const tMs = dancer.currentTime * 1000;
        if (!dancer.paused) {
          match = bestMatch(learner, learnerSize, trend.poses, trend.sampleMs, tMs, dancerSize);
          if (match && match.score !== null) {
            scoresRef.current.push(match.score);
            if (mode === "full") {
              const i = moveIndexAt(trend.moves, tMs);
              if (i !== -1) (bucketsRef.current[i] ??= []).push(match.score);
            }
          }
        } else if (learner && isReviewing()) {
          const frozenPose = dancerPoseAt(trend, tMs);
          if (frozenPose) reviewScores = comparePoses(learner, learnerSize, frozenPose, dancerSize).limbs;
        }
      }

      drawSkeleton(ctx, learner, { color: primary });
      drawMatchingJoints(ctx, learner, match?.limbs ?? reviewScores, matchColor);

      if (now - lastUiUpdate >= UI_UPDATE_MS) {
        lastUiUpdate = now;
        if (dancer && learner && match && match.score !== null) {
          const { score, matchT, limbs } = match;
          pauseIfNeeded(dancer, score, () => {
            const dancerPose = trend.poses.find((frame) => frame.t === matchT)?.pose;
            return dancerPose
              ? correctionFor(limbs, limbDirections(learner, learnerSize), limbDirections(dancerPose, dancerSize))
              : null;
          });
        }
        if (mode === "full" && dancer) {
          setLiveMove(Math.max(0, moveIndexAt(trend.moves, dancer.currentTime * 1000)));
        }
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
  }, [webcamRef, trend, mode, pauseIfNeeded, isReviewing]);

  const finish = () => {
    setDone(true);
    dancerRef.current?.pause();
  };

  const clearPassedPrompt = () => {
    cancelAdvance();
    setShowNice(false);
  };

  const nextMove = () => {
    clearPassedPrompt();
    clearCoaching();
    scoresRef.current = [];
    if (moveIndex === moves.length - 1) finish();
    else setMoveIndex(moveIndex + 1);
  };

  const handleLoop = () => {
    clearCoaching();
    if (isFull) {
      setResult({
        final: roundScore(averageScore(scoresRef.current)),
        moves: trend.moves.map((_, i) => roundScore(averageScore(bucketsRef.current[i] ?? []))),
      });
      return;
    }
    const loopPassed = isPassed(averageScore(scoresRef.current));
    scoresRef.current = [];
    if (!loopPassed || advanceTimer.current !== null) return;
    setCompletedParts((parts) =>
      isPartPassed(range, parts) ? parts : [...parts, range].sort((a, b) => a.startMs - b.startMs),
    );
    dancerRef.current?.pause();
    setShowNice(true);
    advanceTimer.current = window.setTimeout(nextMove, 1000);
  };

  const restart = () => {
    clearPassedPrompt();
    clearCoaching();
    setCompletedParts([]);
    setMoveIndex(0);
    setLiveMove(0);
    setDone(false);
    setResult(null);
    replayAttempt();
  };

  const reset = () => {
    dancerRef.current?.pause();
    setStarted(false);
    restart();
  };

  const changePartLength = (useShorterParts: boolean) => {
    const nextMoves = useShorterParts ? shortMoves : trend.moves;
    clearPassedPrompt();
    clearCoaching();
    setShorterParts(useShorterParts);
    setMoveIndex(Math.max(0, moveIndexAt(nextMoves, range.startMs)));
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
      <div className="grid grid-cols-2 gap-6">
        <div className="mx-auto w-full max-w-[calc(70vh*9/16)]">
          <DancerPanel
            key={runKey}
            trend={trend}
            range={range}
            speed={coaching?.phase === "replay" ? replaySpeed : normalSpeed}
            mirrored={mirrored}
            videoRef={dancerRef}
            onLoop={handleLoop}
            loop={!isFull}
            autoStart={started}
            highlightedLimb={coaching?.limb}
          />
        </div>
        <div className="mx-auto w-full max-w-[calc(70vh*9/16)]">
          <LearnerPanel
            videoRef={webcamRef}
            canvasRef={learnerCanvasRef}
            status={webcamStatus}
            notice={learnerNotice}
          />
        </div>
      </div>

      {!started && (
        <div className="flex justify-center">
          <Button size="lg" disabled={!ready} onClick={() => setStarted(true)}>
            {ready ? "Start" : "Getting ready…"}
          </Button>
        </div>
      )}

      <div className="grid grid-cols-3 items-center gap-4">
        <span className="text-sm text-muted-foreground">{`Move ${shownMove + 1} of ${moves.length}`}</span>
        <span className="min-h-[2rem] text-center text-2xl font-semibold">{showNice ? "Nice!" : null}</span>
        <Button
          variant="outline"
          size="sm"
          className="justify-self-end"
          disabled={!started && moveIndex === 0 && !done}
          onClick={reset}
        >
          Reset
        </Button>
      </div>
      <CoachingTip coaching={coaching} replaySpeed={replaySpeed} onReplay={replay} />

      {!isFull && (
        <div className="flex flex-wrap justify-center gap-1.5">
          {moves.map((_, i) => (
            <Badge
              key={i}
              variant={passed[i] ? "default" : "outline"}
              className={cn(i === moveIndex && !done && "ring-2 ring-ring")}
            >
              {i + 1}
            </Badge>
          ))}
        </div>
      )}

      {!isFull && !done && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          <ToggleGroup
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
          {mirrorToggle}
          {shortMoves.length > trend.moves.length && (
            <Toggle variant="outline" pressed={shorterParts} onPressedChange={changePartLength}>
              Shorter parts
            </Toggle>
          )}
          <Button variant="outline" onClick={nextMove}>
            Skip move
          </Button>
        </div>
      )}

      {!isFull && done && (
        <div className="flex flex-col items-center gap-3">
          <p className="text-xl font-semibold">Now do the full dance</p>
          <div className="flex gap-3">
            <Link href={`/trends/${trend.id}/run`} className={buttonVariants()}>
              Full run
            </Link>
            <Button variant="outline" onClick={restart}>
              Practice again
            </Button>
          </div>
        </div>
      )}

      {isFull && !result && <div className="flex justify-center">{mirrorToggle}</div>}

      {isFull && result && (
        <div className="flex flex-col items-center gap-3">
          <p className="text-3xl font-semibold">{`Final score ${scoreText(result.final)}`}</p>
          <ul className="flex flex-col items-center gap-1 text-sm text-muted-foreground">
            {result.moves.map((score, i) => (
              <li key={i}>{`Move ${i + 1} · ${scoreText(score)}`}</li>
            ))}
          </ul>
          <Button onClick={restart}>Try again</Button>
        </div>
      )}
    </div>
  );
}
