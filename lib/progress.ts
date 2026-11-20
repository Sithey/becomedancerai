// Practice can step through whole moves or "Shorter parts": an index only means something in its own list.
export type PracticeList = "moves" | "parts";

export type TrendProgress = {
  lastMovePracticed: number;
  lastMoveList: PracticeList;
  moveScores: Record<number, number>;
  firstRunScore: number | null;
  bestRunScore: number | null;
};

const DEFAULT_PROGRESS: TrendProgress = {
  lastMovePracticed: 0,
  lastMoveList: "moves",
  moveScores: {},
  firstRunScore: null,
  bestRunScore: null,
};

function storageKey(trendId: string): string {
  return `dance_tutor_progress_${trendId}`;
}

function getStorage(): Storage | null {
  try {
    if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
    if (typeof localStorage !== "undefined") return localStorage;
  } catch {
    return null;
  }
  return null;
}

const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

// For useSyncExternalStore: React re-reads the progress after a save, a reset or a change in another tab.
export function subscribeProgress(onChange: () => void): () => void {
  listeners.add(onChange);
  if (typeof window !== "undefined") window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    if (typeof window !== "undefined") window.removeEventListener("storage", onChange);
  };
}

export function readProgressRaw(trendId: string): string | null {
  const storage = getStorage();
  if (!storage) return null;
  try {
    return storage.getItem(storageKey(trendId));
  } catch {
    return null;
  }
}

export function parseProgress(raw: string | null): TrendProgress {
  if (!raw) return { ...DEFAULT_PROGRESS };
  try {
    const parsed = JSON.parse(raw);
    return {
      lastMovePracticed:
        Number.isInteger(parsed.lastMovePracticed) && parsed.lastMovePracticed >= 0 ? parsed.lastMovePracticed : 0,
      lastMoveList: parsed.lastMoveList === "parts" ? "parts" : "moves",
      moveScores:
        typeof parsed.moveScores === "object" && parsed.moveScores !== null
          ? parsed.moveScores
          : {},
      firstRunScore: typeof parsed.firstRunScore === "number" ? parsed.firstRunScore : null,
      bestRunScore: typeof parsed.bestRunScore === "number" ? parsed.bestRunScore : null,
    };
  } catch {
    return { ...DEFAULT_PROGRESS };
  }
}

export function getProgress(trendId: string): TrendProgress {
  return parseProgress(readProgressRaw(trendId));
}

function saveProgress(trendId: string, progress: TrendProgress): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(storageKey(trendId), JSON.stringify(progress));
  } catch {
    // Ignore storage errors (quota, disabled, etc.)
  }
  notify();
}

export function resumeMoveIndex(progress: TrendProgress, list: PracticeList, count: number): number {
  if (progress.lastMoveList !== list) return 0;
  return Math.max(0, Math.min(count - 1, progress.lastMovePracticed));
}

export function saveMoveScore(trendId: string, moveIndex: number, score: number, list: PracticeList): TrendProgress {
  const current = getProgress(trendId);
  const existingScore = current.moveScores[moveIndex];
  const bestScore = existingScore !== undefined ? Math.max(existingScore, score) : score;
  const updated: TrendProgress = {
    ...current,
    lastMovePracticed: moveIndex,
    lastMoveList: list,
    // moveScores is keyed by whole move: a short part's index would land on the wrong move.
    moveScores: list === "moves" ? { ...current.moveScores, [moveIndex]: bestScore } : current.moveScores,
  };
  saveProgress(trendId, updated);
  return updated;
}

export function saveLastPracticedMove(trendId: string, moveIndex: number, list: PracticeList): TrendProgress {
  const current = getProgress(trendId);
  const updated: TrendProgress = {
    ...current,
    lastMovePracticed: moveIndex,
    lastMoveList: list,
  };
  saveProgress(trendId, updated);
  return updated;
}

export function saveRunScore(trendId: string, score: number): TrendProgress {
  const current = getProgress(trendId);
  const first = current.firstRunScore === null ? score : current.firstRunScore;
  const best = current.bestRunScore === null ? score : Math.max(current.bestRunScore, score);
  const updated: TrendProgress = {
    ...current,
    firstRunScore: first,
    bestRunScore: best,
  };
  saveProgress(trendId, updated);
  return updated;
}

export function resetProgress(trendId: string): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(storageKey(trendId));
  } catch {
    // Ignore storage errors
  }
  notify();
}
