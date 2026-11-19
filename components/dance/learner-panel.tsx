"use client";

import type { RefObject } from "react";
import type { WebcamStatus } from "@/lib/pose/webcam";

type Props = {
  videoRef: RefObject<HTMLVideoElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  status: WebcamStatus;
  notice?: string | null;
};

const STATUS_COPY: Record<Exclude<WebcamStatus, "ready">, string> = {
  starting: "Starting camera…",
  denied: "Camera blocked. Allow camera access in your browser to practice.",
  unavailable: "No camera found.",
};

export function LearnerPanel({ videoRef, canvasRef, status, notice }: Props) {
  const fitCanvas = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
  };

  const message = status === "ready" ? notice : STATUS_COPY[status];

  return (
    <div className="relative aspect-[9/16] overflow-hidden rounded-xl bg-muted">
      <video
        ref={videoRef}
        muted
        playsInline
        onLoadedMetadata={fitCanvas}
        onResize={fitCanvas}
        className="absolute inset-0 size-full -scale-x-100 object-cover brightness-50"
      />
      <canvas ref={canvasRef} className="absolute inset-0 size-full -scale-x-100 object-cover" />
      {message && (
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <p className="text-center text-sm text-foreground">{message}</p>
        </div>
      )}
    </div>
  );
}
