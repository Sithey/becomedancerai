"use client";

import type { PoseLandmarker } from "@mediapipe/tasks-vision";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Confetti } from "@/components/dance/confetti";
import { CountIn } from "@/components/dance/count-in";
import { RunResult } from "@/components/dance/run-result";
import { DancerPanel } from "@/components/dance/dancer-panel";
import { LearnerPanel } from "@/components/dance/learner-panel";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { drawSkeleton, themeColor } from "@/lib/pose/draw";
import { createPoseLandmarker } from "@/lib/pose/landmarker";
import { fromMediaPipe } from "@/lib/pose/landmarks";
import { averageScore, bestMatch, failingLimbs, isPassed, LimbSmoother } from "@/lib/pose/scoring";
import { tipFor } from "@/lib/pose/tips";
import type { Move, TrendData } from "@/lib/pose/types";
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
  const [passed, setPassed] = useState<number[]>([]);
  const [done, setDone] = useState(false);
  const [speed, setSpeed] = useState(0.75);
  const [mirrored, setMirrored] = useState(true);
  const [runKey, setRunKey] = useState(0);
  const [result, setResult] = useState<RunResult | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const [tip, setTip] = useState<string | null>(null);
  const [liveMove, setLiveMove] = useState(0);
  const [showNice, setShowNice] = useState(false);
  const [countingIn, setCountingIn] = useState(false);

  // Frame scores of the current loop (moves mode) or of the whole run (full mode).
  const scoresRef = useRef<number[]>([]);
  const bucketsRef = useRef<number[][]>([]);

  const fullRange = useMemo(() => ({ startMs: 0, endMs: trend.durationMs }), [trend.durationMs]);
  const range = isFull ? fullRange : trend.moves[moveIndex];

  useEffect(() => {
    let cancelled = false;
    let landmarker: PoseLandmarker | null = null;
    let raf = 0;
    let lastWebcamTime = -1;
    let lastUiUpdate = -Infinity;
    const smoother = new LimbSmoother();
    const primary = themeColor("primary");
    const destructive = themeColor("destructive");
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

      const dancer = dancerRef.current;
      if (dancer && !dancer.paused && !dancer.seeking && dancer.readyState >= 2) {
        const tMs = dancer.currentTime * 1000;
        const learnerSize = { width: webcam.videoWidth, height: webcam.videoHeight };
        const match = bestMatch(learner, learnerSize, trend.poses, trend.sampleMs, tMs, dancerSize);
        if (match && match.score !== null) {
          smoother.push(now, match.limbs);
          scoresRef.current.push(match.score);
          if (mode === "full") {
            const i = moveIndexAt(trend.moves, tMs);
            if (i !== -1) (bucketsRef.current[i] ??= []).push(match.score);
          }
        }
      }

      const smoothed = smoother.current(now);
      const limbColors = Object.fromEntries(failingLimbs(smoothed).map((limb) => [limb, destructive]));
      drawSkeleton(ctx, learner, { color: primary, limbColors });

      if (now - lastUiUpdate >= UI_UPDATE_MS) {
        lastUiUpdate = now;
        setTip(tipFor(smoothed));
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
  }, [webcamRef, trend, mode]);

  const finish = () => {
    setDone(true);
    dancerRef.current?.pause();
    if (passed.length === trend.moves.length) {
      setShowConfetti(true);
    }
  };

  const nextMove = () => {
    scoresRef.current = [];
    if (moveIndex === trend.moves.length - 1) finish();
    else {
      setMoveIndex((prev) => prev + 1);
      setCountingIn(true);
    }
  };

  const skipMove = () => {
    dancerRef.current?.pause();
    nextMove();
  };

  const handleStart = () => {
    setStarted(true);
    setCountingIn(true);
  };

  const handleCountInDone = useCallback(() => {
    scoresRef.current = [];
    setCountingIn(false);
    dancerRef.current?.play();
  }, []);

  const handleLoop = () => {
    if (isFull) {
      setResult({
        final: roundScore(averageScore(scoresRef.current)),
        moves: trend.moves.map((_, i) => roundScore(averageScore(bucketsRef.current[i] ?? []))),
      });
      setShowConfetti(true);
      return;
    }
    const loopPassed = isPassed(averageScore(scoresRef.current));
    scoresRef.current = [];
    if (!loopPassed) return;
    dancerRef.current?.pause();
    setPassed((p) => (p.includes(moveIndex) ? p : [...p, moveIndex]));
    // Last move: show confetti when all done
    const allPassed = moveIndex === trend.moves.length - 1;
    if (allPassed) setShowConfetti(true);
    setShowNice(true);
    setTimeout(() => {
      setShowNice(false);
      nextMove();
    }, 1000);
  };

  // A new key remounts the dancer panel, which restarts the video even when the range is unchanged.
  const restart = () => {
    scoresRef.current = [];
    bucketsRef.current = [];
    setPassed([]);
    setMoveIndex(0);
    setDone(false);
    setResult(null);
    setTip(null);
    setShowNice(false);
    setShowConfetti(false);
    setCountingIn(false);
    setStarted(false);
    setRunKey((k) => k + 1);
  };

  const learnerNotice =
    modelStatus === "loading"
      ? "Loading pose model…"
      : modelStatus === "error"
        ? "Couldn't load the pose model. Reload the page to try again."
        : null;
  const ready = webcamStatus === "ready" && modelStatus === "ready";
  const shownMove = isFull ? liveMove : moveIndex;
  const mirrorToggle = (
    <Toggle variant="outline" pressed={mirrored} onPressedChange={setMirrored}>
      Mirror
    </Toggle>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="relative">
        <div className="grid grid-cols-2 gap-6">
          <div className="mx-auto w-full max-w-[calc(70vh*9/16)]">
            <DancerPanel
              key={runKey}
              trend={trend}
              range={range}
              speed={isFull ? 1 : speed}
              mirrored={mirrored}
              videoRef={dancerRef}
              onLoop={handleLoop}
              loop={!isFull}
              autoStart={started && !countingIn}
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
        {countingIn && <CountIn onDone={handleCountInDone} />}
      </div>

      {!started && (
        <div className="flex justify-center">
          <Button size="lg" disabled={!ready} onClick={handleStart}>
            {ready ? "Start" : "Getting ready…"}
          </Button>
        </div>
      )}

      <div className="grid grid-cols-3 items-center gap-4">
        <span className="text-sm text-muted-foreground">{`Move ${shownMove + 1} of ${trend.moves.length}`}</span>
        <span className="min-h-[2rem] text-center text-2xl font-semibold">
          {showNice ? "Nice!" : null}
        </span>
        <span className="min-h-[1.5rem] truncate text-right font-medium">{tip}</span>
      </div>

      {!isFull && (
        <div className="flex flex-wrap justify-center gap-1.5">
          {trend.moves.map((_, i) => (
            <Badge
              key={i}
              variant={passed.includes(i) ? "default" : "outline"}
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
          <Button variant="outline" onClick={skipMove} disabled={countingIn}>
            Skip move
          </Button>
        </div>
      )}

      {!isFull && done && (
        <div className="flex flex-col items-center gap-3">
          <p className="text-xl font-semibold">
            {passed.length === trend.moves.length ? "All moves passed!" : "Now do the full dance"}
          </p>
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
        <RunResult
          trendId={trend.id}
          final={result.final}
          moves={result.moves}
          onRestart={restart}
        />
      )}

      {showConfetti && <Confetti />}
    </div>
  );
}
