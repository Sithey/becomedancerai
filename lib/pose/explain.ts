import { angleDeg, limbScore } from "./compare";
import { LIMBS, limbDirection } from "./landmarks";
import { amplitude, type LearnerSample } from "./segment";
import type { FrameSize, LimbName, PoseFrame, Vec } from "./types";

export type LimbExplanation = {
  limb: LimbName;
  visible: boolean;
  videoDeg: number | null;
  learnerDeg: number | null;
  diffDeg: number | null;
  score: number | null;
  videoAmp: number;
  learnerAmp: number;
};

export function directionDeg(dir: Vec): number {
  return (Math.atan2(dir.x, dir.y) * 180) / Math.PI;
}

export function explainSegment(
  samples: LearnerSample[],
  learnerSize: FrameSize,
  frames: PoseFrame[],
  sampleMs: number,
  dancerSize: FrameSize,
  lagMs: number,
): LimbExplanation[] {
  const latest = samples[samples.length - 1];
  if (!latest) return [];
  const dancerAt = (t: number) => frames[Math.round((t - lagMs) / sampleMs)]?.pose ?? null;
  const latestDancer = dancerAt(latest.t);

  return (Object.keys(LIMBS) as LimbName[]).map((limb) => {
    const learnerDirs: Vec[] = [];
    const videoDirs: Vec[] = [];
    for (const sample of samples) {
      const dancer = dancerAt(sample.t);
      const a = limbDirection(sample.pose, limb, learnerSize);
      const b = dancer && limbDirection(dancer, limb, dancerSize);
      if (a && b) {
        learnerDirs.push(a);
        videoDirs.push(b);
      }
    }
    const learner = limbDirection(latest.pose, limb, learnerSize);
    const video = latestDancer && limbDirection(latestDancer, limb, dancerSize);
    const visible = Boolean(learner && video);
    return {
      limb,
      visible,
      videoDeg: video ? directionDeg(video) : null,
      learnerDeg: learner ? directionDeg(learner) : null,
      diffDeg: learner && video ? angleDeg(learner, video) : null,
      score: learner && video ? limbScore(learner, video) : null,
      videoAmp: amplitude(videoDirs),
      learnerAmp: amplitude(learnerDirs),
    };
  });
}
