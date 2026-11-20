"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { MAX_DURATION_MS, SAMPLE_MS } from "@/lib/pose/config";
import { drawSkeleton, themeColor } from "@/lib/pose/draw";
import { extractPoses } from "@/lib/pose/extract";
import { splitMoves } from "@/lib/pose/split";
import type { Move, PoseFrame } from "@/lib/pose/types";

type Result = {
  frames: PoseFrame[];
  moves: Move[];
  width: number;
  height: number;
  durationMs: number;
  seconds: number;
};

const TIKTOK_DOWNLOAD_ERROR = "Couldn't download this TikTok. Save the video and upload the mp4 instead.";

async function getTikTokFile(url: string, signal: AbortSignal): Promise<File> {
  const response = await fetch("/api/tiktok", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
    signal,
  }).catch(() => null);

  if (!response) throw new Error(TIKTOK_DOWNLOAD_ERROR);
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(typeof data?.error === "string" ? data.error : TIKTOK_DOWNLOAD_ERROR);
  }

  const blob = await response.blob().catch(() => null);
  if (!blob) throw new Error(TIKTOK_DOWNLOAD_ERROR);
  if (blob.type !== "video/mp4" || blob.size === 0) throw new Error("Video must be an mp4");
  return new File([blob], "tiktok.mp4", { type: blob.type });
}

function loadVideo(video: HTMLVideoElement, url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    video.addEventListener("loadeddata", () => resolve(), { once: true });
    video.addEventListener("error", () => reject(new Error("Could not read this video")), { once: true });
    video.src = url;
  });
}

export function AddTrendForm() {
  const router = useRouter();
  const [source, setSource] = useState<"upload" | "tiktok">("upload");
  const [tiktokUrl, setTiktokUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const extractRef = useRef<HTMLVideoElement>(null);
  const previewRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  useEffect(() => {
    const video = previewRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!result || !video || !canvas || !ctx) return;
    const color = themeColor("primary");
    let raf = requestAnimationFrame(function draw() {
      const index = Math.round((video.currentTime * 1000) / SAMPLE_MS);
      const frame = result.frames[Math.min(Math.max(index, 0), result.frames.length - 1)];
      drawSkeleton(ctx, frame?.pose ?? null, { color });
      raf = requestAnimationFrame(draw);
    });
    return () => cancelAnimationFrame(raf);
  }, [result]);

  function resetVideo() {
    setFile(null);
    setResult(null);
    setProgress(null);
    setObjectUrl(null);
    setError(null);
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.files?.[0] ?? null;
    resetVideo();
    if (next && next.type !== "video/mp4") {
      setError("Video must be an mp4");
      return;
    }
    setFile(next);
  }

  async function process() {
    const video = extractRef.current;
    if (!video) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setError(null);
    setResult(null);
    try {
      let next = file;
      if (source === "tiktok") {
        resetVideo();
        setDownloading(true);
        next = await getTikTokFile(tiktokUrl, controller.signal);
        setFile(next);
        setDownloading(false);
      }
      if (!next || controller.signal.aborted) return;

      setProcessing(true);
      setProgress(0);
      const url = URL.createObjectURL(next);
      setObjectUrl(url);
      const started = performance.now();
      await loadVideo(video, url);
      const durationMs = Math.round(video.duration * 1000);
      if (source === "tiktok" && (!Number.isFinite(durationMs) || durationMs <= 0)) {
        throw new Error("Could not read this video");
      }
      if (source === "tiktok" && durationMs > MAX_DURATION_MS) {
        throw new Error("Videos must be 90 seconds or shorter");
      }
      const frames = await extractPoses(video, setProgress, controller.signal);
      setResult({
        frames,
        moves: splitMoves(frames, durationMs),
        width: video.videoWidth,
        height: video.videoHeight,
        durationMs,
        seconds: (performance.now() - started) / 1000,
      });
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : "Processing failed");
      setProgress(null);
    } finally {
      setDownloading(false);
      setProcessing(false);
    }
  }

  async function save() {
    if (!file || !result) return;
    setSaving(true);
    setError(null);
    const body = new FormData();
    body.set("video", file);
    body.set("title", title);
    body.set("width", String(result.width));
    body.set("height", String(result.height));
    body.set("durationMs", String(result.durationMs));
    body.set("sampleMs", String(SAMPLE_MS));
    body.set("poses", JSON.stringify(result.frames));
    body.set("moves", JSON.stringify(result.moves));
    try {
      const res = await fetch("/api/trends", { method: "POST", body });
      const data = await res.json();
      if (res.status === 201) {
        router.push(`/trends/${data.id}`);
        return;
      }
      setError(data.error ?? "Could not save the trend");
    } catch {
      setError("Could not save the trend");
    }
    setSaving(false);
  }

  const busy = downloading || processing || saving;

  return (
    <div className="flex flex-col gap-6">
      <video
        ref={extractRef}
        muted
        playsInline
        preload="auto"
        className="pointer-events-none absolute size-px opacity-0"
      />

      <fieldset className="flex flex-wrap gap-4" disabled={busy}>
        <legend className="sr-only">Video source</legend>
        {([["upload", "Upload an mp4"], ["tiktok", "Paste a TikTok link"]] as const).map(([value, label]) => (
          <Label key={value}>
            <input
              type="radio"
              name="video-source"
              value={value}
              className="accent-primary"
              checked={source === value}
              onChange={() => {
                resetVideo();
                setSource(value);
              }}
            />
            {label}
          </Label>
        ))}
      </fieldset>
      {source === "upload" ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="video">Video (mp4)</Label>
          <Input id="video" type="file" accept="video/mp4" disabled={busy} onChange={onFileChange} />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <Label htmlFor="tiktok-url">TikTok URL</Label>
          <Input
            id="tiktok-url"
            type="url"
            value={tiktokUrl}
            disabled={busy}
            onChange={(e) => {
              resetVideo();
              setTiktokUrl(e.target.value);
            }}
          />
        </div>
      )}
      <div className="flex flex-col gap-2">
        <Label htmlFor="title">Title</Label>
        <Input id="title" value={title} disabled={busy} onChange={(e) => setTitle(e.target.value)} />
      </div>

      {source === "upload" ? (
        <Button className="self-start" disabled={busy || !file || !title.trim()} onClick={process}>
          Process
        </Button>
      ) : (
        <Button className="self-start" disabled={busy || !tiktokUrl.trim()} onClick={process}>
          {downloading ? "Downloading…" : "Get video"}
        </Button>
      )}

      {progress !== null && !result && (
        <div className="flex flex-col gap-2">
          <Progress value={Math.round(progress * 100)} />
          <span className="text-sm text-muted-foreground">{Math.round(progress * 100)}%</span>
        </div>
      )}

      {result && objectUrl && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            {result.moves.length} moves, processed in {result.seconds.toFixed(1)} s
          </p>
          <div className="relative aspect-[9/16] w-64 overflow-hidden rounded-lg bg-muted">
            <video
              ref={previewRef}
              src={objectUrl}
              muted
              loop
              autoPlay
              playsInline
              className="absolute inset-0 size-full object-cover brightness-50"
            />
            <canvas
              ref={canvasRef}
              width={result.width}
              height={result.height}
              className="absolute inset-0 size-full object-cover"
            />
          </div>
          <Button className="self-start" disabled={busy || (source === "tiktok" && !title.trim())} onClick={save}>
            Save
          </Button>
        </div>
      )}

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
