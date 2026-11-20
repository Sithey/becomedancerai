export type TrendProgress = {
  lastMovePracticed: number;
  moveScores: Record<number, number>;
  firstRunScore: number | null;
  bestRunScore: number | null;
};

const DEFAULT_PROGRESS: TrendProgress = {
  lastMovePracticed: 0,
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

export function getProgress(trendId: string): TrendProgress {
  const storage = getStorage();
  if (!storage) return { ...DEFAULT_PROGRESS };
  try {
    const raw = storage.getItem(storageKey(trendId));
    if (!raw) return { ...DEFAULT_PROGRESS };
    const parsed = JSON.parse(raw);
    return {
      lastMovePracticed:
        typeof parsed.lastMovePracticed === "number" ? parsed.lastMovePracticed : 0,
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

function saveProgress(trendId: string, progress: TrendProgress): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(storageKey(trendId), JSON.stringify(progress));
  } catch {
    // Ignore storage errors (quota, disabled, etc.)
  }
}

export function saveMoveScore(trendId: string, moveIndex: number, score: number): TrendProgress {
  const current = getProgress(trendId);
  const existingScore = current.moveScores[moveIndex];
  const bestScore = existingScore !== undefined ? Math.max(existingScore, score) : score;
  const updated: TrendProgress = {
    ...current,
    lastMovePracticed: moveIndex,
    moveScores: {
      ...current.moveScores,
      [moveIndex]: bestScore,
    },
  };
  saveProgress(trendId, updated);
  return updated;
}

export function saveLastPracticedMove(trendId: string, moveIndex: number): TrendProgress {
  const current = getProgress(trendId);
  const updated: TrendProgress = {
    ...current,
    lastMovePracticed: moveIndex,
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
}
