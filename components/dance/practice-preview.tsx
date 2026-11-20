"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { PracticeSession } from "@/components/dance/practice-session";
import { Button } from "@/components/ui/button";
import type { TrendData } from "@/lib/pose/types";

export function PracticePreview({ trend }: { trend: TrendData }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stage, setStage] = useState<"watching" | "finished" | "practice" | "unavailable">("watching");

  // A hidden page (Next's Activity) keeps its video playing, sound included: pause it on the way out.
  useLayoutEffect(() => {
    const video = videoRef.current;
    return () => video?.pause();
  }, []);

  if (stage === "practice") return <PracticeSession trend={trend} mode="moves" />;

  const watchAgain = () => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = 0;
    void video.play().catch(() => video.focus());
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <video
        ref={videoRef}
        src={trend.videoUrl}
        width={trend.width}
        height={trend.height}
        aria-label="Original dance video"
        controls
        playsInline
        preload="metadata"
        className="h-auto max-h-[65svh] w-auto max-w-full rounded-3xl border border-border bg-card object-contain"
        onPlay={() => setStage("watching")}
        onEnded={() => setStage("finished")}
        onError={() => setStage("unavailable")}
      />
      {stage === "unavailable" && (
        <p role="status" className="text-sm text-muted-foreground">{"This video isn't available here."}</p>
      )}
      {stage === "finished" && (
        <div className="flex flex-wrap justify-center gap-3">
          <Button className="h-12 rounded-full px-6" onClick={() => setStage("practice")}>
            Ready to practice?
          </Button>
          <Button variant="outline" className="h-12 rounded-full px-6" onClick={watchAgain}>
            Watch again
          </Button>
        </div>
      )}
    </div>
  );
}
