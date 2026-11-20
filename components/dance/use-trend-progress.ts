"use client";

import { useSyncExternalStore } from "react";
import { parseProgress, readProgressRaw, subscribeProgress, type TrendProgress } from "@/lib/progress";

// The server has no localStorage: it renders "no progress yet" and the browser fills it in after hydration.
export function useTrendProgress(trendId: string): TrendProgress {
  const raw = useSyncExternalStore(subscribeProgress, () => readProgressRaw(trendId), () => null);
  return parseProgress(raw);
}
