import { PASS_SCORE } from "./pose/config";
import { averageScore } from "./pose/scoring";
import type { PoseCorrection } from "./pose/tips";
import type { Move } from "./pose/types";

export type RecordedScore = { timeMs: number; score: number; correction?: PoseCorrection };
export type PartResult = { score: number | null; correction?: PoseCorrection };
export type SessionResult = { final: number | null; parts: PartResult[] };

export function moveIndexAt(moves: Move[], timeMs: number): number {
  return moves.findIndex((move, index) =>
    timeMs >= move.startMs && (timeMs < move.endMs || (index === moves.length - 1 && timeMs === move.endMs)),
  );
}

export function summarizeAttempt(moves: Move[], frames: RecordedScore[]): SessionResult {
  const buckets: RecordedScore[][] = moves.map(() => []);
  for (const frame of frames) {
    const index = moveIndexAt(moves, frame.timeMs);
    if (index !== -1) buckets[index].push(frame);
  }
  return {
    final: summarizePart(buckets.flat()).score,
    parts: buckets.map(summarizePart),
  };
}

function summarizePart(frames: RecordedScore[]): PartResult {
  const average = averageScore(frames.map((frame) => frame.score));
  if (average === null) return { score: null };

  const score = Math.round(average);
  if (score >= PASS_SCORE) return { score };
  let weakest: RecordedScore | undefined;
  for (const frame of frames) {
    if (frame.correction && (!weakest || frame.score < weakest.score)) weakest = frame;
  }
  return weakest?.correction ? { score, correction: weakest.correction } : { score };
}

export function applyPartRetry(result: SessionResult, index: number, attempt: PartResult): SessionResult {
  if (attempt.score === null || attempt.score <= (result.parts[index].score ?? -1)) return result;
  return { ...result, parts: result.parts.map((part, i) => i === index ? attempt : part) };
}

export type ResultSummary = { title: string; detail: string };

export function resultSummary(parts: (number | null)[]): ResultSummary {
  const scored = parts.filter((score): score is number => score !== null);
  if (scored.length === 0) {
    return {
      title: "No score this time.",
      detail: "We couldn't see you during the run. Check your framing and try again.",
    };
  }
  const weak = scored.filter((score) => score < PASS_SCORE).length;
  // An unscored part (learner out of frame) is not a pass either.
  if (weak === 0 && scored.length === parts.length) {
    return { title: "You've got this trend.", detail: "Every part passed. Time to film your version." };
  }
  if (weak === 0) {
    return { title: "Almost there.", detail: "Some parts couldn't be scored. Stay in frame and try again." };
  }
  return {
    title: "Almost there.",
    detail: `${weak} ${weak === 1 ? "part is" : "parts are"} still shaky. Practice ${weak === 1 ? "it" : "them"}, then try again.`,
  };
}
