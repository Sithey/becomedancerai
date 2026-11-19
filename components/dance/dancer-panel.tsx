"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { Button } from "@/components/ui/button";
import { drawSkeleton, themeColor } from "@/lib/pose/draw";
import type { Move, TrendData } from "@/lib/pose/types";
import { cn } from "cn";

type Props = {
  trend: TrendData;
  range: Move;
  speed: number;
  mirrored: boolean;
  videoRef: RefObject<HTMLVideoElement | null>;
  onLoop?: () => void;
  loop?: boolean;
};

export function DancerPanel({ trend, range, speed, mirrored, videoRef, onLoop, loop }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [needsPlay, setNeedsPlay] = useState(false);
  const onLoopRef = useRef(onLoop);
  const rangeRef = useRef(range);
  const loopRef = useRef(loop);
  const speedRef = useRef(speed);
  // True from the moment the range end is handled until currentTime is back inside the range,
  // so a seek that hasn't landed yet can't fire onLoop twice.
  const finishedRef = useRef(false);

  useEffect(() => {
    onLoopRef.current = onLoop;
    rangeRef.current = range;
    loopRef.current = loop;
    speedRef.current = speed;
  });

  const start = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.play().then(
      () => setNeedsPlay(false),
      () => setNeedsPlay(true),
    );
  }, [videoRef]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = speed;
  }, [speed, videoRef]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    finishedRef.current = false;
    video.currentTime = range.startMs / 1000;
    start();
  }, [range, start, videoRef]);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!video || !canvas || !ctx) return;
    const color = themeColor("primary");
    const lastIndex = trend.poses.length - 1;

    const handleEnd = () => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      if (loopRef.current === false) {
        video.pause();
      } else {
        video.currentTime = rangeRef.current.startMs / 1000;
        start();
      }
      onLoopRef.current?.();
    };

    const onLoadedMetadata = () => {
      video.playbackRate = speedRef.current;
      video.currentTime = rangeRef.current.startMs / 1000;
    };
    video.addEventListener("ended", handleEnd);
    video.addEventListener("loadedmetadata", onLoadedMetadata);
    if (video.readyState >= 1) onLoadedMetadata();

    let raf = requestAnimationFrame(function frame() {
      const ms = video.currentTime * 1000;
      const index = Math.min(lastIndex, Math.max(0, Math.round(ms / trend.sampleMs)));
      drawSkeleton(ctx, trend.poses[index]?.pose ?? null, { color });
      if (ms < rangeRef.current.endMs) finishedRef.current = false;
      else handleEnd();
      raf = requestAnimationFrame(frame);
    });

    return () => {
      cancelAnimationFrame(raf);
      video.removeEventListener("ended", handleEnd);
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
    };
  }, [trend, start, videoRef]);

  const flip = mirrored && "-scale-x-100";

  return (
    <div className="relative aspect-[9/16] overflow-hidden rounded-xl bg-muted">
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
      {needsPlay && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Button size="lg" onClick={start}>
            Play
          </Button>
        </div>
      )}
    </div>
  );
}
