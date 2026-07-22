'use client';

import { useEffect, useState } from 'react';
import { getMe } from '@/lib/api/me';
import { profileCompletion, type ProfileCompletion } from '@/lib/profile/completion';
import { onProfileUpdated } from '@/lib/profile-events';

export interface ProfileCompletionState extends ProfileCompletion {
  loading: boolean;
}

/**
 * Live profile-completion state for the signed-in student. Re-checks on window
 * focus / tab visibility so completing (or clearing) a field on the profile page
 * flips gated sections without a hard reload. Fails OPEN - on a fetch error we
 * treat the profile as complete, so a transient blip never locks a legitimate
 * user out of a feature (this is a UX nudge, not a security boundary).
 */
export function useProfileCompletion(): ProfileCompletionState {
  const [state, setState] = useState<ProfileCompletionState>({
    loading: true,
    percent: 0,
    complete: false,
    missing: [],
  });

  useEffect(() => {
    let cancelled = false;
    const check = () => {
      getMe()
        .then((me) => {
          if (cancelled) return;
          setState({ loading: false, ...profileCompletion(me) });
        })
        .catch(() => {
          if (!cancelled) setState({ loading: false, percent: 100, complete: true, missing: [] });
        });
    };
    check();
    const onFocus = () => check();
    const onVis = () => document.visibilityState === 'visible' && check();
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVis);
    // Re-fetch the moment the student saves their profile so the banner + feature
    // lock gates flip immediately, instead of staying stale until a focus change.
    const offProfile = onProfileUpdated(check);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVis);
      offProfile();
    };
  }, []);

  return state;
}
