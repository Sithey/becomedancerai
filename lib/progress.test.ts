import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getProgress,
  resetProgress,
  saveLastPracticedMove,
  saveMoveScore,
  saveRunScore,
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
      moveScores: {},
      firstRunScore: null,
      bestRunScore: null,
    });
  });

  it("saves move score and tracks last move practiced", () => {
    const updated = saveMoveScore("trend-1", 2, 75);
    expect(updated.lastMovePracticed).toBe(2);
    expect(updated.moveScores[2]).toBe(75);

    const reloaded = getProgress("trend-1");
    expect(reloaded.lastMovePracticed).toBe(2);
    expect(reloaded.moveScores[2]).toBe(75);
  });

  it("keeps the best score for a move", () => {
    saveMoveScore("trend-1", 0, 80);
    const lower = saveMoveScore("trend-1", 0, 65);
    expect(lower.moveScores[0]).toBe(80);

    const higher = saveMoveScore("trend-1", 0, 92);
    expect(higher.moveScores[0]).toBe(92);
  });

  it("saves last practiced move without changing move scores", () => {
    saveMoveScore("trend-1", 1, 70);
    const updated = saveLastPracticedMove("trend-1", 3);
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
    saveMoveScore("trend-1", 0, 90);
    saveRunScore("trend-1", 85);
    resetProgress("trend-1");

    const reloaded = getProgress("trend-1");
    expect(reloaded).toEqual({
      lastMovePracticed: 0,
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
      moveScores: {},
      firstRunScore: null,
      bestRunScore: null,
    });
  });
});
