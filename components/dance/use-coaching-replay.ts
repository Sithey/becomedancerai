import { useCallback, useEffect, useRef, useState } from "react";
import type { PoseCorrection } from "@/lib/pose/tips";

const PAUSE_SCORE = 50;
const REVIEW_MS = 8000;

export type CoachingReplay = PoseCorrection & {
  phase: "review" | "replay";
  score: number;
};

export function useCoachingReplay(onReplay: () => void) {
  const [coaching, setCoaching] = useState<CoachingReplay | null>(null);
  const active = useRef<CoachingReplay | null>(null);

  const pauseIfNeeded = useCallback(
    (video: HTMLVideoElement, score: number, getCorrection: () => PoseCorrection | null) => {
      if (active.current || score >= PAUSE_SCORE) return;
      const correction = getCorrection();
      if (!correction) return;

      video.pause();
      const review: CoachingReplay = { ...correction, score: Math.floor(score), phase: "review" };
      active.current = review;
      setCoaching(review);
    },
    [],
  );

  const replay = useCallback(() => {
    const review = active.current;
    if (review?.phase !== "review") return;
    const next: CoachingReplay = { ...review, phase: "replay" };
    active.current = next;
    setCoaching(next);
    onReplay();
  }, [onReplay]);

  const clearCoaching = useCallback(() => {
    active.current = null;
    setCoaching(null);
  }, []);

  useEffect(() => {
    if (coaching?.phase !== "review") return;
    const timeout = window.setTimeout(() => {
      if (active.current === coaching) replay();
    }, REVIEW_MS);
    return () => window.clearTimeout(timeout);
  }, [coaching, replay]);

  return { coaching, pauseIfNeeded, replay, clearCoaching };
}
