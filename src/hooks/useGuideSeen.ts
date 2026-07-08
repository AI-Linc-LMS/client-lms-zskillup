'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getMe } from '@/lib/api/me';
import { GUIDE_SEEN_EVENT } from '@/lib/api/guide';

export interface GuideSeenState {
  loading: boolean;
  /** True once the student has seen or dismissed the platform guide. */
  seen: boolean;
  /** True for a signed-in student (the only role the guide targets). */
  isStudent: boolean;
  /** Force a re-read (used after finishing the tour). */
  refresh: () => void;
}

/**
 * Whether the signed-in student has seen the platform guide. Drives the
 * first-login walkthrough prompt and gates the calibration prompt so the guide
 * always comes first. Fails "seen" — a fetch blip never re-nags the user.
 *
 * It also listens for the GUIDE_SEEN_EVENT that markGuideSeen() fires, so the
 * moment the guide ends the flag flips to seen everywhere in-session (the
 * calibration prompt then surfaces immediately, no refetch needed).
 */
export function useGuideSeen(): GuideSeenState {
  const [state, setState] = useState<Omit<GuideSeenState, 'refresh'>>({
    loading: true,
    seen: true,
    isStudent: false,
  });
  const mounted = useRef(true);

  const check = useCallback(() => {
    getMe()
      .then((me) => {
        if (!mounted.current) return;
        const isStudent = me.role === 'STUDENT' && !!me.studentProfile;
        setState({ loading: false, isStudent, seen: me.studentProfile?.hasSeenGuide ?? true });
      })
      .catch(() => {
        if (mounted.current) setState({ loading: false, isStudent: false, seen: true });
      });
  }, []);

  useEffect(() => {
    mounted.current = true;
    check();
    const onFocus = () => check();
    const onSeen = () => mounted.current && setState((s) => ({ ...s, loading: false, seen: true }));
    window.addEventListener('focus', onFocus);
    window.addEventListener(GUIDE_SEEN_EVENT, onSeen);
    return () => {
      mounted.current = false;
      window.removeEventListener('focus', onFocus);
      window.removeEventListener(GUIDE_SEEN_EVENT, onSeen);
    };
  }, [check]);

  return { ...state, refresh: check };
}
