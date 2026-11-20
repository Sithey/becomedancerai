"use client";

import type { RefObject } from "react";
import { GhostOutline } from "@/components/dance/ghost-outline";
import type { Framing } from "@/lib/pose/framing-state";
import type { WebcamStatus } from "@/lib/pose/webcam";

type Props = {
  videoRef: RefObject<HTMLVideoElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  status: WebcamStatus;
  notice?: string | null;
  framing?: Framing;
};

const STATUS_COPY: Record<Exclude<WebcamStatus, "ready">, string> = {
  starting: "Starting camera…",
  denied: "Camera blocked. Allow camera access in your browser to practice.",
  unavailable: "No camera found.",
};

export function LearnerPanel({ videoRef, canvasRef, status, notice, framing }: Props) {
  const fitCanvas = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
  };

  const message = status === "ready" ? (notice ?? framing?.message) : STATUS_COPY[status];

  return (
    <div className="relative aspect-[9/16] overflow-hidden rounded-3xl border border-border bg-card">
      <video
        ref={videoRef}
        muted
        playsInline
        onLoadedMetadata={fitCanvas}
        onResize={fitCanvas}
        className="absolute inset-0 size-full -scale-x-100 object-cover brightness-50"
      />
      <canvas ref={canvasRef} className="absolute inset-0 size-full -scale-x-100 object-cover text-green-400" />
      <GhostOutline visible={status === "ready" && !notice && framing?.inFrame === false} />
      {message && (
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <p className="text-center text-sm text-foreground">{message}</p>
        </div>
      )}
    </div>
  );
}
