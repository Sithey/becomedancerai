"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { Button } from "@/components/ui/button";
import { drawSkeleton, themeColor } from "@/lib/pose/draw";
import type { LimbName, Move, TrendData } from "@/lib/pose/types";
import { cn } from "cn";

type Props = {
  trend: TrendData;
  range: Move;
  speed: number;
  mirrored: boolean;
  videoRef: RefObject<HTMLVideoElement | null>;
  onLoop?: () => void;
  loop?: boolean;
  autoStart?: boolean;
  highlightedLimb?: LimbName;
};

export function dancerPoseAt(trend: TrendData, timeMs: number) {
  const index = Math.min(trend.poses.length - 1, Math.max(0, Math.round(timeMs / trend.sampleMs)));
  return trend.poses[index]?.pose ?? null;
}

export function DancerPanel({
  trend,
  range,
  speed,
  mirrored,
  videoRef,
  onLoop,
  loop,
  autoStart = true,
  highlightedLimb,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [needsPlay, setNeedsPlay] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const onLoopRef = useRef(onLoop);
  // A refetch of the page (same URL, or coming back to it) hands a new trend object with the same data:
  // keyed on trend.id, the effect below doesn't pause the dancer for it.
  const trendRef = useRef(trend);
  const rangeRef = useRef(range);
  const loopRef = useRef(loop);
  const speedRef = useRef(speed);
  const highlightRef = useRef(highlightedLimb);
  // True from the moment the range end is handled until currentTime is back inside the range,
  // so a seek that hasn't landed yet can't fire onLoop twice.
  const finishedRef = useRef(false);

  useEffect(() => {
    trendRef.current = trend;
    onLoopRef.current = onLoop;
    rangeRef.current = range;
    loopRef.current = loop;
    speedRef.current = speed;
    highlightRef.current = highlightedLimb;
  });

  const start = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.play().then(
      () => setNeedsPlay(false),
      (error: unknown) => {
        // A pause or seek interrupting play() rejects with AbortError: only an autoplay block needs the button.
        if (error instanceof DOMException && error.name === "NotAllowedError") setNeedsPlay(true);
      },
    );
  }, [videoRef]);

  useEffect(() => {
    const video = videoRef.current;
    const onPageHide = () => {
      video?.pause();
    };
    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      if (video) {
        video.pause();
      }
    };
  }, [videoRef]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = speed;
  }, [speed, videoRef]);

  const { startMs, endMs } = range;
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    finishedRef.current = false;
    video.currentTime = startMs / 1000;
    if (autoStart) start();
  }, [startMs, endMs, autoStart, start, videoRef]);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!video || !canvas || !ctx) return;
    const color = themeColor("primary");
    const highlight = themeColor("destructive");

    const handleEnd = () => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      if (loopRef.current === false) {
        video.pause();
      } else {
        // play() on an ended video seeks to 0: call it first so our seek lands last.
        start();
        video.currentTime = rangeRef.current.startMs / 1000;
      }
      onLoopRef.current?.();
    };

    const onLoadedMetadata = () => {
      video.playbackRate = speedRef.current;
      video.currentTime = rangeRef.current.startMs / 1000;
    };
    const onError = () => setUnavailable(true);
    video.addEventListener("ended", handleEnd);
    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("error", onError);
    if (video.readyState >= 1) onLoadedMetadata();
    // The 404 can arrive before hydration, when no listener is attached yet.
    if (video.error) onError();

    let raf = requestAnimationFrame(function frame() {
      const ms = video.currentTime * 1000;
      const limb = highlightRef.current;
      drawSkeleton(ctx, dancerPoseAt(trendRef.current, ms), {
        color,
        limbColors: limb ? { [limb]: highlight } : undefined,
      });
      if (ms < rangeRef.current.endMs) finishedRef.current = false;
      else if (!video.paused) handleEnd();
      raf = requestAnimationFrame(frame);
    });

    return () => {
      cancelAnimationFrame(raf);
      video.removeEventListener("ended", handleEnd);
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("error", onError);
      video.pause();
    };
  }, [trend.id, start, videoRef]);

  const flip = mirrored && "-scale-x-100";

  return (
    <div className="relative aspect-[9/16] overflow-hidden rounded-3xl border border-border bg-card">
      <video
        ref={videoRef}
        src={trend.videoUrl}
        playsInline
        preload="auto"
        className={cn("absolute inset-0 size-full object-cover brightness-50", flip)}
      />
      <canvas
        ref={canvasRef}
        width={trend.width}
        height={trend.height}
        className={cn("absolute inset-0 size-full object-cover", flip)}
      />
      {needsPlay && !unavailable && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Button size="lg" onClick={start}>
            Play
          </Button>
        </div>
      )}
      {unavailable && (
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <p className="text-center text-sm text-foreground">{"This video isn't available here."}</p>
        </div>
      )}
    </div>
  );
}
