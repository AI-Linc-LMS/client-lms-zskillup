import type { ApiMockAttemptHistory } from '@/lib/api/mocks';

/** Aggregated view of a student's mock history — computed ONCE, reused by the
 *  dashboard hero, KPI row, and mock-tests history (no per-component Math.max). */
export interface MockStats {
  taken: number;
  bestPct: number | null;
  bestPercentile: number | null;
  avgPct: number | null;
}

export function getMockStats(history: ApiMockAttemptHistory[]): MockStats {
  if (history.length === 0) {
    return { taken: 0, bestPct: null, bestPercentile: null, avgPct: null };
  }
  return {
    taken: history.length,
    bestPct: Math.max(...history.map((h) => h.pct)),
    bestPercentile: Math.max(...history.map((h) => h.percentile)),
    avgPct: Math.round(history.reduce((sum, h) => sum + h.pct, 0) / history.length),
  };
}
