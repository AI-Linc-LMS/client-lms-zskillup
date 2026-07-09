'use client';

import { useEffect, useState } from 'react';
import { getMyRecommendations, type RecommendationsResponseDto } from '@/lib/api/recommendations';

/**
 * Session-cached recommendations, so the top-bar "Recommended for you" dropdown
 * and the dashboard widget share ONE `GET /me/recommendations` call instead of
 * each firing their own on every page.
 */
let cache: RecommendationsResponseDto | null = null;
let inflight: Promise<RecommendationsResponseDto> | null = null;

export function useRecommendations(): RecommendationsResponseDto | null {
  const [data, setData] = useState<RecommendationsResponseDto | null>(cache);

  useEffect(() => {
    if (cache) {
      setData(cache);
      return;
    }
    let alive = true;
    (inflight ??= getMyRecommendations())
      .then((d) => {
        cache = d;
        inflight = null;
        if (alive) setData(d);
      })
      .catch(() => {
        inflight = null;
      });
    return () => {
      alive = false;
    };
  }, []);

  return data;
}
