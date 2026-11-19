import { SAMPLE_MS } from "./config";
import { fromMediaPipe } from "./landmarks";
import { createPoseLandmarker } from "./landmarker";
import type { PoseFrame } from "./types";

function seekTo(video: HTMLVideoElement, seconds: number): Promise<void> {
  if (video.currentTime === seconds) return Promise.resolve();
  return new Promise((resolve) => {
    video.addEventListener("seeked", () => resolve(), { once: true });
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
      if (signal?.aborted) throw new DOMException("Extraction aborted", "AbortError");
      await seekTo(video, t / 1000);
      // MediaPipe needs strictly positive, increasing timestamps; t = 0 would be rejected.
      const result = landmarker.detectForVideo(video, t + 1);
      const landmarks = result.landmarks[0];
      frames.push({ t, pose: landmarks ? fromMediaPipe(landmarks) : null });
      onProgress(t / durationMs);
    }
    if (signal?.aborted) throw new DOMException("Extraction aborted", "AbortError");
  } finally {
    landmarker.close();
  }
  onProgress(1);
  return frames;
}
