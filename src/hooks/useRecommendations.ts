'use client';

import { useEffect, useState } from 'react';
import { getMyRecommendations, type RecommendationsResponseDto } from '@/lib/api/recommendations';

/**
 * Session-cached recommendations, so the top-bar "Recommended for you" dropdown
 * and the dashboard widget share ONE `GET /me/recommendations` call instead of
 * each firing their own on every page.
 *
 * The cache is deliberately re-validated WHILE the student is still uncalibrated: the
 * locked → unlocked flip after the Placement Readiness (calibration) test is the whole
 * point, and returning to the dashboard is a client-side navigation that reuses this
 * module cache — so a naive "cache forever" froze the card at `calibrated:false` until a
 * hard reload. Once calibrated, the answer is stable, so we stop re-fetching.
 */
let cache: RecommendationsResponseDto | null = null;
let inflight: Promise<RecommendationsResponseDto> | null = null;

/** Drop the cache so the next read re-fetches (called right after finishing the test). */
export function invalidateRecommendations(): void {
  cache = null;
  inflight = null;
}

function load(apply: (d: RecommendationsResponseDto) => void): void {
  const p = (inflight ??= getMyRecommendations());
  void p
    .then((d) => {
      cache = d;
      inflight = null;
      apply(d);
    })
    .catch(() => {
      inflight = null;
    });
}

export function useRecommendations(): RecommendationsResponseDto | null {
  const [data, setData] = useState<RecommendationsResponseDto | null>(cache);

  useEffect(() => {
    let alive = true;
    const apply = (d: RecommendationsResponseDto) => {
      if (alive) setData(d);
    };
    // Serve any cached value immediately; re-fetch on mount unless already calibrated.
    if (cache) setData(cache);
    if (!cache?.calibrated) load(apply);

    // Also re-check when the tab/window regains focus (tab-switch case) — but only
    // while still uncalibrated, to avoid needless polling once unlocked.
    const recheck = () => {
      if (cache?.calibrated) return;
      load(apply);
    };
    const onFocus = () => recheck();
    const onVis = () => document.visibilityState === 'visible' && recheck();
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      alive = false;
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  return data;
}
