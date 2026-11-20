import { SAMPLE_MS } from "./config";
import { fromMediaPipe } from "./landmarks";
import { createPoseLandmarker } from "./landmarker";
import type { PoseFrame } from "./types";

const abortError = () => new DOMException("Extraction aborted", "AbortError");

// A file that fails to decode mid-way fires "error" and never "seeked": without these exits the promise hangs.
export function seekTo(video: HTMLVideoElement, seconds: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) return Promise.reject(abortError());
  if (video.error) return Promise.reject(new Error("Could not read this video"));
  if (video.currentTime === seconds) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const settle = (error?: Error) => {
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onError);
      signal?.removeEventListener("abort", onAbort);
      if (error) reject(error);
      else resolve();
    };
    const onSeeked = () => settle();
    const onError = () => settle(new Error("Could not read this video"));
    const onAbort = () => settle(abortError());
    video.addEventListener("seeked", onSeeked);
    video.addEventListener("error", onError);
    signal?.addEventListener("abort", onAbort);
    video.currentTime = seconds;
  });
}

export async function extractPoses(
  video: HTMLVideoElement,
  onProgress: (fraction: number) => void,
  signal?: AbortSignal,
): Promise<PoseFrame[]> {
  const durationMs = Math.round(video.duration * 1000);
  const landmarker = await createPoseLandmarker();
  const frames: PoseFrame[] = [];
  try {
    for (let t = 0; t < durationMs; t += SAMPLE_MS) {
      if (signal?.aborted) throw abortError();
      await seekTo(video, t / 1000, signal);
      // MediaPipe needs strictly positive, increasing timestamps; t = 0 would be rejected.
      const result = landmarker.detectForVideo(video, t + 1);
      const landmarks = result.landmarks[0];
      frames.push({ t, pose: landmarks ? fromMediaPipe(landmarks) : null });
      onProgress(t / durationMs);
    }
    if (signal?.aborted) throw abortError();
  } finally {
    landmarker.close();
  }
  onProgress(1);
  return frames;
}
