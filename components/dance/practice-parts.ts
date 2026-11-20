import type { Move } from "@/lib/pose/types";

const SHORT_PART_MS = 1500;

export function shorterPracticeParts(moves: Move[]): Move[] {
  return moves.flatMap(({ startMs, endMs }) => {
    const durationMs = endMs - startMs;
    const count = Math.ceil(durationMs / SHORT_PART_MS);
    const boundary = (part: number) =>
      part === count ? endMs : startMs + (durationMs * part) / count;
    return Array.from({ length: count }, (_, index) => ({
      startMs: boundary(index),
      endMs: boundary(index + 1),
    }));
  });
}

export function fullRunParts(moves: Move[], durationMs: number): Move[] {
  const boundaries = [...new Set([0, durationMs, ...moves.map((move) => move.endMs)])].sort(
    (a, b) => a - b,
  );
  return shorterPracticeParts(
    boundaries.slice(1).map((endMs, index) => ({ startMs: boundaries[index], endMs })),
  );
}
