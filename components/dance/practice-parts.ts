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

export function isPartPassed(part: Move, completedParts: Move[]): boolean {
  let covered = part.startMs;
  // Completed parts are ordered by start time, so a gap cannot be filled by later entries.
  for (const { startMs, endMs } of completedParts) {
    if (startMs > covered) return false;
    if (endMs >= part.endMs) return true;
    covered = Math.max(covered, endMs);
  }
  return false;
}
