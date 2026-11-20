import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getProgress,
  parseProgress,
  readProgressRaw,
  resetProgress,
  resumeMoveIndex,
  saveLastPracticedMove,
  saveMoveScore,
  saveRunScore,
  subscribeProgress,
} from "./progress";

describe("progress", () => {
  let store: Record<string, string> = {};

  beforeEach(() => {
    store = {};
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      },
    });
  });

  it("returns default progress when nothing is saved", () => {
    const progress = getProgress("trend-1");
    expect(progress).toEqual({
      lastMovePracticed: 0,
      lastMoveList: "moves",
      moveScores: {},
      firstRunScore: null,
      bestRunScore: null,
    });
  });

  it("saves move score and tracks last move practiced", () => {
    const updated = saveMoveScore("trend-1", 2, 75, "moves");
    expect(updated.lastMovePracticed).toBe(2);
    expect(updated.moveScores[2]).toBe(75);

    const reloaded = getProgress("trend-1");
    expect(reloaded.lastMovePracticed).toBe(2);
    expect(reloaded.moveScores[2]).toBe(75);
  });

  it("keeps the best score for a move", () => {
    saveMoveScore("trend-1", 0, 80, "moves");
    const lower = saveMoveScore("trend-1", 0, 65, "moves");
    expect(lower.moveScores[0]).toBe(80);

    const higher = saveMoveScore("trend-1", 0, 92, "moves");
    expect(higher.moveScores[0]).toBe(92);
  });

  it("saves last practiced move without changing move scores", () => {
    saveMoveScore("trend-1", 1, 70, "moves");
    const updated = saveLastPracticedMove("trend-1", 3, "moves");
    expect(updated.lastMovePracticed).toBe(3);
    expect(updated.moveScores[1]).toBe(70);
  });

  it("saves full run score: sets first and best on first completion", () => {
    const updated = saveRunScore("trend-1", 72);
    expect(updated.firstRunScore).toBe(72);
    expect(updated.bestRunScore).toBe(72);
  });

  it("preserves first run score and updates best run score when higher", () => {
    saveRunScore("trend-1", 60);
    const lower = saveRunScore("trend-1", 55);
    expect(lower.firstRunScore).toBe(60);
    expect(lower.bestRunScore).toBe(60);

    const higher = saveRunScore("trend-1", 85);
    expect(higher.firstRunScore).toBe(60);
    expect(higher.bestRunScore).toBe(85);
  });

  it("resets progress for a trend", () => {
    saveMoveScore("trend-1", 0, 90, "moves");
    saveRunScore("trend-1", 85);
    resetProgress("trend-1");

    const reloaded = getProgress("trend-1");
    expect(reloaded).toEqual({
      lastMovePracticed: 0,
      lastMoveList: "moves",
      moveScores: {},
      firstRunScore: null,
      bestRunScore: null,
    });
  });

  it("handles corrupted JSON in localStorage gracefully", () => {
    store["dance_tutor_progress_bad"] = "invalid json";
    const progress = getProgress("bad");
    expect(progress).toEqual({
      lastMovePracticed: 0,
      lastMoveList: "moves",
      moveScores: {},
      firstRunScore: null,
      bestRunScore: null,
    });
  });

  it("notifies subscribers when progress is saved or reset", () => {
    const seen: number[] = [];
    const unsubscribe = subscribeProgress(() => seen.push(1));
    saveMoveScore("trend-1", 0, 90, "moves");
    saveRunScore("trend-1", 80);
    saveLastPracticedMove("trend-1", 2, "moves");
    resetProgress("trend-1");
    expect(seen).toHaveLength(4);
    unsubscribe();
    saveRunScore("trend-1", 70);
    expect(seen).toHaveLength(4);
  });

  it("reads the raw value and parses it like getProgress", () => {
    expect(readProgressRaw("trend-1")).toBeNull();
    saveRunScore("trend-1", 77);
    expect(parseProgress(readProgressRaw("trend-1")).bestRunScore).toBe(77);
    expect(parseProgress(null)).toEqual(getProgress("nothing-saved"));
  });

  it("records which list the last practiced index belongs to", () => {
    saveLastPracticedMove("trend-1", 5, "parts");
    expect(getProgress("trend-1")).toMatchObject({ lastMovePracticed: 5, lastMoveList: "parts" });
    saveMoveScore("trend-1", 1, 60, "moves");
    expect(getProgress("trend-1")).toMatchObject({ lastMovePracticed: 1, lastMoveList: "moves" });
  });

  it("keeps move scores for whole moves only, not short parts", () => {
    const updated = saveMoveScore("trend-1", 5, 80, "parts");
    expect(updated).toMatchObject({ lastMovePracticed: 5, lastMoveList: "parts", moveScores: {} });
  });

  it("resumes the saved index only in the list it was saved for", () => {
    saveLastPracticedMove("trend-1", 5, "parts");
    expect(resumeMoveIndex(getProgress("trend-1"), "parts", 9)).toBe(5);
    expect(resumeMoveIndex(getProgress("trend-1"), "moves", 3)).toBe(0);
    expect(resumeMoveIndex(getProgress("trend-1"), "parts", 4)).toBe(3);
    expect(resumeMoveIndex(getProgress("nothing-saved"), "moves", 3)).toBe(0);
  });

  it("ignores a saved index that isn't a whole number from 0 up", () => {
    for (const lastMovePracticed of [2.5, -1, "2", null]) {
      expect(parseProgress(JSON.stringify({ lastMovePracticed })).lastMovePracticed).toBe(0);
    }
  });

  it("treats progress saved before lists were recorded as whole moves", () => {
    expect(parseProgress(JSON.stringify({ lastMovePracticed: 2 })).lastMoveList).toBe("moves");
    expect(parseProgress(JSON.stringify({ lastMoveList: "other" })).lastMoveList).toBe("moves");
  });
});
