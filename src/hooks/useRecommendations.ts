'use client';

import { useEffect, useState } from 'react';
import { getMyRecommendations, type RecommendationsResponseDto } from '@/lib/api/recommendations';
import { hasRoleHint } from '@/lib/session-hints';

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
    // NOTHING TO RECOMMEND TO A VISITOR WHO IS NOT SIGNED IN.
    //
    // `/jobs` is a public page that lives in the (student) route group, so a logged-out
    // visitor gets the authenticated AppShell — TopBar, and this menu inside it. The
    // call then 401s on every public page view: harmless, because the catch below
    // swallows it, but it is a request per visitor and a console error that trains
    // everyone to ignore console errors.
    //
    // The role hint is the right signal rather than the access token: the token is null
    // on first paint even for a signed-in user, until the refresh completes, so gating on
    // it would suppress the fetch for exactly the people it is for. The hint is
    // re-stamped on every refresh and outlives a browser restart, and the middleware
    // already treats it as its only session signal. It is a UX hint and not a boundary —
    // which is the correct kind of thing to decide "should we even ask" with, since the
    // Nest guard remains the authority on the answer.
    if (!hasRoleHint()) return;

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
