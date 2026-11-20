"use client";

import type { PoseLandmarker } from "@mediapipe/tasks-vision";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { DancerPanel } from "@/components/dance/dancer-panel";
import { LearnerPanel } from "@/components/dance/learner-panel";
import { Button, buttonVariants } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { PASS_SCORE } from "@/lib/pose/config";
import { drawSkeleton, themeColor } from "@/lib/pose/draw";
import { explainSegment, recordingSettings, withSegmentScores, type ExplainedRow, type RecordingSettings } from "@/lib/pose/explain";
import { framingIssue } from "@/lib/pose/framing";
import { createPoseLandmarker } from "@/lib/pose/landmarker";
import { fromMediaPipe } from "@/lib/pose/landmarks";
import { failingLimbs, LimbSmoother } from "@/lib/pose/scoring";
import { LearnerHistory, limbMotion, scoreSegment } from "@/lib/pose/segment";
import type { LimbName, Pose, TrendData, TrendSummary } from "@/lib/pose/types";
import { useWebcam } from "@/lib/pose/webcam";
import { cn } from "cn";

const SPEEDS = [0.5, 0.75, 1];
const UI_UPDATE_MS = 250;
// Time to walk back into position after clicking Start.
const COUNTDOWN_S = 5;

const LABELS: Record<LimbName, string> = {
  leftUpperArm: "Left upper arm",
  leftForearm: "Left forearm",
  leftHand: "Left hand",
  rightUpperArm: "Right upper arm",
  rightForearm: "Right forearm",
  rightHand: "Right hand",
  leftThigh: "Left thigh",
  leftShin: "Left shin",
  rightThigh: "Right thigh",
  rightShin: "Right shin",
  head: "Head",
  torso: "Torso",
};

type WorldPoint = { x: number; y: number; z: number; v: number };
type RecordedFrame = {
  t: number;
  wallMs: number;
  pose: Pose | null;
  world: WorldPoint[] | null;
  score: number | null;
  lagMs: number | null;
};
type Live = { score: number | null; lagMs: number | null; samples: number; rows: ExplainedRow[] };

const round = (n: number | null, digits = 0) => (n === null ? "–" : n.toFixed(digits));
const round3 = (n: number) => Math.round(n * 1000) / 1000;

export function DebugSession({ trends, trend }: { trends: TrendSummary[]; trend: TrendData | null }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2">
        {trends.map((t) => (
          <Link
            key={t.id}
            href={`/debug?trend=${t.id}`}
            className={buttonVariants({ variant: t.id === trend?.id ? "default" : "outline", size: "sm" })}
          >
            {t.title}
          </Link>
        ))}
        {trends.length === 0 && <p className="text-muted-foreground">No trends yet.</p>}
      </div>
      {trend ? <DebugRun key={trend.id} trend={trend} /> : <p className="text-muted-foreground">Pick a trend.</p>}
    </div>
  );
}

function DebugRun({ trend }: { trend: TrendData }) {
  const { videoRef: webcamRef, status: webcamStatus } = useWebcam();
  const dancerRef = useRef<HTMLVideoElement>(null);
  const learnerCanvasRef = useRef<HTMLCanvasElement>(null);
  const [modelStatus, setModelStatus] = useState<"loading" | "ready" | "error">("loading");
  const [started, setStarted] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [framing, setFraming] = useState<string | null>("No one detected");
  const [move, setMove] = useState<number | "full">(0);
  const [speed, setSpeed] = useState(0.75);
  const [mirrored, setMirrored] = useState(true);
  const [live, setLive] = useState<Live>({ score: null, lagMs: null, samples: 0, rows: [] });
  const [recording, setRecording] = useState(false);
  const [recordedCount, setRecordedCount] = useState(0);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const recordingRef = useRef(false);
  const settingsRef = useRef<RecordingSettings>(recordingSettings(0, 0.75, true));
  const framesRef = useRef<RecordedFrame[]>([]);

  useEffect(() => {
    if (countdown === null) return;
    const timer = setTimeout(() => {
      if (countdown > 1) {
        setCountdown(countdown - 1);
        return;
      }
      setCountdown(null);
      setStarted(true);
    }, 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const fullRange = useMemo(() => ({ startMs: 0, endMs: trend.durationMs }), [trend.durationMs]);
  const range = move === "full" ? fullRange : trend.moves[move];

  useEffect(() => {
    let cancelled = false;
    let landmarker: PoseLandmarker | null = null;
    let raf = 0;
    let lastWebcamTime = -1;
    let lastUiUpdate = -Infinity;
    const primary = themeColor("primary");
    const destructive = themeColor("destructive");
    const dancerSize = { width: trend.width, height: trend.height };
    const motion = limbMotion(trend.poses, dancerSize, trend.sampleMs);
    const history = new LearnerHistory();
    const smoother = new LimbSmoother();
    let current: Live = { score: null, lagMs: null, samples: 0, rows: [] };
    let currentFraming: string | null = "No one detected";

    const frame = () => {
      raf = requestAnimationFrame(frame);
      const webcam = webcamRef.current;
      const ctx = learnerCanvasRef.current?.getContext("2d");
      if (!landmarker || !webcam || !ctx) return;
      if (webcam.readyState < 2 || webcam.currentTime === lastWebcamTime) return;
      lastWebcamTime = webcam.currentTime;

      const now = performance.now();
      // Same as Practice: the raw webcam frame goes to the model, mirroring is CSS only.
      const detection = landmarker.detectForVideo(webcam, now);
      const learner = detection.landmarks[0] ? fromMediaPipe(detection.landmarks[0]) : null;
      const world = detection.worldLandmarks[0]
        ? detection.worldLandmarks[0].map((l) => ({ x: round3(l.x), y: round3(l.y), z: round3(l.z), v: round3(l.visibility) }))
        : null;

      currentFraming = framingIssue(learner);

      const dancer = dancerRef.current;
      if (dancer && !dancer.paused && !dancer.seeking && dancer.readyState >= 2) {
        const tMs = dancer.currentTime * 1000;
        const learnerSize = { width: webcam.videoWidth, height: webcam.videoHeight };
        let result = null;
        if (learner) {
          history.push({ t: tMs, pose: learner });
          const samples = history.samples(tMs);
          result = scoreSegment(samples, learnerSize, trend.poses, trend.sampleMs, dancerSize, motion);
          current = result
            ? {
                score: result.score,
                lagMs: result.lagMs,
                samples: samples.length,
                rows: withSegmentScores(
                  explainSegment(samples, learnerSize, trend.poses, trend.sampleMs, dancerSize, result.lagMs),
                  result.limbs,
                ),
              }
            : { ...current, score: null, samples: samples.length };
          if (result) smoother.push(now, result.limbs);
        }
        if (recordingRef.current) {
          framesRef.current.push({
            t: Math.round(tMs),
            wallMs: Math.round(now),
            pose: learner,
            world,
            score: result ? round3(result.score) : null,
            lagMs: result ? result.lagMs : null,
          });
        }
      } else {
        history.clear();
      }

      // Same colors as Practice (primary passing, destructive failing), but smoothed over half a second; Practice colors the raw segment scores.
      const failing = failingLimbs(smoother.current(now));
      drawSkeleton(ctx, learner, {
        color: primary,
        limbColors: Object.fromEntries(failing.map((limb) => [limb, destructive])),
      });

      if (now - lastUiUpdate >= UI_UPDATE_MS) {
        lastUiUpdate = now;
        setLive(current);
        setFraming(currentFraming);
        setRecordedCount(framesRef.current.length);
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
  }, [webcamRef, trend]);

  const toggleRecording = () => {
    if (!recording) {
      // Frozen at the start so the file matches what was recorded, whatever is clicked later.
      settingsRef.current = recordingSettings(move, speed, mirrored);
      framesRef.current = [];
      setRecordedCount(0);
      setSaveMessage(null);
    }
    recordingRef.current = !recording;
    setRecording(!recording);
  };

  const save = async () => {
    recordingRef.current = false;
    setRecording(false);
    const webcam = webcamRef.current;
    const body = {
      version: 1,
      trendId: trend.id,
      trendTitle: trend.title,
      ...settingsRef.current,
      webcam: { width: webcam?.videoWidth ?? 0, height: webcam?.videoHeight ?? 0 },
      sampleMs: trend.sampleMs,
      recordedAt: new Date().toISOString(),
      frames: framesRef.current,
    };
    try {
      const res = await fetch("/api/debug-attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as { file?: string; error?: string };
      setSaveMessage(res.ok && data.file ? `Saved: ${data.file}` : `Couldn't save: ${data.error ?? res.status}`);
    } catch {
      setSaveMessage("Couldn't save: network error");
    }
  };

  const ready = webcamStatus === "ready" && modelStatus === "ready";
  const learnerNotice =
    modelStatus === "loading"
      ? "Loading pose model…"
      : modelStatus === "error"
        ? "Couldn't load the pose model."
        : null;
  const rows = live.rows;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <ToggleGroup
          variant="outline"
          disabled={recording}
          value={[String(move)]}
          onValueChange={(value) => value[0] && setMove(value[0] === "full" ? "full" : Number(value[0]))}
        >
          {trend.moves.map((_, i) => (
            <ToggleGroupItem key={i} value={String(i)}>
              {`Move ${i + 1}`}
            </ToggleGroupItem>
          ))}
          <ToggleGroupItem value="full">Full</ToggleGroupItem>
        </ToggleGroup>
        {move !== "full" && (
          <ToggleGroup
            variant="outline"
            disabled={recording}
            value={[String(speed)]}
            onValueChange={(value) => value[0] && setSpeed(Number(value[0]))}
          >
            {SPEEDS.map((s) => (
              <ToggleGroupItem key={s} value={String(s)}>
                {s}×
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        )}
        <Toggle variant="outline" pressed={mirrored} onPressedChange={setMirrored}>
          Mirror
        </Toggle>
        {!started && countdown === null && (
          <Button disabled={!ready} onClick={() => setCountdown(COUNTDOWN_S)}>
            {ready ? "Start" : "Getting ready…"}
          </Button>
        )}
        <Button variant={recording ? "destructive" : "outline"} disabled={!ready} onClick={toggleRecording}>
          {recording ? `■ Stop (${recordedCount} frames)` : "● Record"}
        </Button>
        <Button variant="outline" disabled={recordedCount === 0} onClick={save}>
          Save attempt
        </Button>
        {saveMessage && <span className="text-sm text-muted-foreground">{saveMessage}</span>}
      </div>

      <div className="relative grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.6fr)] gap-6">
        {countdown !== null && (
          <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-background/70">
            <span className="text-8xl font-bold">{countdown}</span>
            <span className="text-xl font-semibold">Get in place</span>
            <span className={cn("text-lg", framing ? "text-destructive" : "text-muted-foreground")}>
              {framing ?? "Framing OK"}
            </span>
          </div>
        )}
        <div className="mx-auto w-full max-w-[calc(60vh*9/16)]">
          <DancerPanel
            trend={trend}
            range={range}
            speed={move === "full" ? 1 : speed}
            mirrored={mirrored}
            videoRef={dancerRef}
            loop={move !== "full"}
            autoStart={started}
          />
        </div>
        <div className="mx-auto w-full max-w-[calc(60vh*9/16)]">
          <LearnerPanel
            videoRef={webcamRef}
            canvasRef={learnerCanvasRef}
            status={webcamStatus}
            notice={learnerNotice}
            modelFailed={modelStatus === "error"}
          />
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-lg font-semibold">
            {`Live score ${round(live.score)} · delay ${round(live.lagMs)} ms · ${live.samples} samples`}
          </p>
          <p className={cn("text-sm", framing ? "text-destructive" : "text-muted-foreground")}>
            {`Framing: ${framing ?? "OK"}`}
          </p>
          <table className="w-full text-sm tabular-nums">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="py-1 font-medium">Body part</th>
                <th className="py-1 text-right font-medium">Video</th>
                <th className="py-1 text-right font-medium">You</th>
                <th className="py-1 text-right font-medium">Diff</th>
                <th className="py-1 text-right font-medium">Segment</th>
                <th className="py-1 text-right font-medium">Angle now</th>
                <th className="py-1 text-right font-medium">Moves video / you</th>
                <th className="py-1 text-right font-medium">Seen</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.limb}
                  className={cn(
                    "border-t border-border",
                    r.segment !== null && r.segment < PASS_SCORE && "text-destructive",
                    !r.visible && "text-muted-foreground",
                  )}
                >
                  <td className="py-1">{LABELS[r.limb]}</td>
                  <td className="py-1 text-right">{`${round(r.videoDeg)}°`}</td>
                  <td className="py-1 text-right">{`${round(r.learnerDeg)}°`}</td>
                  <td className="py-1 text-right">{`${round(r.diffDeg)}°`}</td>
                  <td className="py-1 text-right font-semibold">{round(r.segment)}</td>
                  <td className="py-1 text-right">{round(r.score)}</td>
                  <td className="py-1 text-right">{`±${round(r.videoAmp)}° / ±${round(r.learnerAmp)}°`}</td>
                  <td className="py-1 text-right">{r.visible ? "✓" : r.tooSmall ? "too small" : "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <p className="text-sm text-muted-foreground">Click Start, then dance.</p>}
        </div>
      </div>
    </div>
  );
}
