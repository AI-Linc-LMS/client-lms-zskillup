'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface FocusGuardSummary {
  tabSwitches: number;
  fullscreenExits: number;
}

export interface FocusGuard {
  active: boolean;
  /** Whether the document is currently in fullscreen. */
  inFullscreen: boolean;
  tabSwitches: number;
  fullscreenExits: number;
  /** Transient warning shown to the user (auto-clears). */
  lastWarning: string | null;
  /** Enter fullscreen + begin watching tab-switches / fullscreen-exits. */
  start: () => Promise<void>;
  /** Re-enter fullscreen (used by the "return to fullscreen" prompt). */
  enterFullscreen: () => Promise<void>;
  stop: () => void;
}

/**
 * Lightweight focus guard for the AI mock interview: runs the session in
 * fullscreen and counts tab switches + fullscreen exits (warn-only, never ends
 * the session), mirroring the AI-LINC proctored interview. No camera/mic — the
 * interview owns the mic itself. Fullscreen failures are non-fatal.
 */
export function useFocusGuard(): FocusGuard {
  const [active, setActive] = useState(false);
  const [inFullscreen, setInFullscreen] = useState(false);
  const [tabSwitches, setTabSwitches] = useState(0);
  const [fullscreenExits, setFullscreenExits] = useState(0);
  const [lastWarning, setLastWarning] = useState<string | null>(null);
  const warnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const warn = useCallback((msg: string) => {
    setLastWarning(msg);
    if (warnTimer.current) clearTimeout(warnTimer.current);
    warnTimer.current = setTimeout(() => setLastWarning((m) => (m === msg ? null : m)), 4500);
  }, []);

  const onVisibility = useCallback(() => {
    if (document.visibilityState === 'hidden') {
      setTabSwitches((n) => n + 1);
      warn('You switched away from the interview - this is logged.');
    }
  }, [warn]);

  const onFullscreenChange = useCallback(() => {
    const fs = !!document.fullscreenElement;
    setInFullscreen(fs);
    if (!fs) {
      setFullscreenExits((n) => n + 1);
      warn('You exited fullscreen - please return to continue.');
    }
  }, [warn]);

  const enterFullscreen = useCallback(async () => {
    try {
      await document.documentElement.requestFullscreen?.();
      setInFullscreen(!!document.fullscreenElement);
    } catch {
      /* non-fatal — some browsers block programmatic fullscreen */
    }
  }, []);

  const start = useCallback(async () => {
    setActive(true);
    document.addEventListener('visibilitychange', onVisibility);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    await enterFullscreen();
  }, [onVisibility, onFullscreenChange, enterFullscreen]);

  const stop = useCallback(() => {
    setActive(false);
    document.removeEventListener('visibilitychange', onVisibility);
    document.removeEventListener('fullscreenchange', onFullscreenChange);
    if (warnTimer.current) clearTimeout(warnTimer.current);
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  }, [onVisibility, onFullscreenChange]);

  // Ensure listeners + fullscreen are torn down if the runner unmounts (e.g. the
  // interview finishes and navigates to the results page).
  useEffect(() => () => stop(), [stop]);

  return { active, inFullscreen, tabSwitches, fullscreenExits, lastWarning, start, enterFullscreen, stop };
}
