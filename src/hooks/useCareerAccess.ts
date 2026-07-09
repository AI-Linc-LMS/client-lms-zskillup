'use client';

import { useEffect, useState } from 'react';
import { getMySubscription } from '@/lib/api/payments';
import { listInterviews } from '@/lib/api/mock-interviews';
import { listResumes } from '@/lib/api/resumes';

export type CareerTool = 'mock-interview' | 'resume';

/** Free lifetime runs of a career tool before a Company/Full-Platform plan is needed. */
const FREE_LIMIT = 1;

export interface CareerAccessState {
  loading: boolean;
  /** Bundled with an active Company hub / Full Platform plan (or paywall off). */
  entitled: boolean;
  used: number;
  limit: number;
  /** Show the upsell gate: not entitled AND the free run is spent. */
  locked: boolean;
}

/**
 * Whether the signed-in student can still use a career tool (Mock Interview /
 * Resume Builder). They're bundled with a paid plan; unpaid students get one free
 * run each, then it locks. Re-checks on focus so a purchase made mid-flow unlocks
 * on return. **Fails OPEN** — any fetch error leaves it unlocked.
 */
export function useCareerAccess(tool: CareerTool): CareerAccessState {
  const [state, setState] = useState<CareerAccessState>({
    loading: true,
    entitled: true,
    used: 0,
    limit: FREE_LIMIT,
    locked: false,
  });

  useEffect(() => {
    let cancelled = false;
    const countFn = tool === 'mock-interview' ? listInterviews : listResumes;
    const check = () => {
      Promise.all([getMySubscription().catch(() => null), countFn().catch(() => [])]).then(
        ([sub, list]) => {
          if (cancelled) return;
          const entitled = sub?.careerToolsEntitled ?? true; // fail open
          const used = Array.isArray(list) ? list.length : 0;
          setState({ loading: false, entitled, used, limit: FREE_LIMIT, locked: !entitled && used >= FREE_LIMIT });
        },
      );
    };
    check();
    const onFocus = () => check();
    const onVis = () => document.visibilityState === 'visible' && check();
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [tool]);

  return state;
}
