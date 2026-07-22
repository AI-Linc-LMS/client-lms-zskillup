'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { GuideOverlay } from './GuideOverlay';
import { getTour, pageTourFor } from '@/lib/guide/registry';
import type { GuideStep } from '@/lib/guide/types';
import { markGuideSeen } from '@/lib/api/guide';

interface GuideCtxValue {
  /** Start a named tour (defaults to the grand tour). */
  start: (tourId?: string) => void;
  /** Start the mini-tour for the current route; returns false if none exists. */
  startPageTour: () => boolean;
  /** Whether the current route has its own mini-tour. */
  hasPageTour: boolean;
  stop: () => void;
  active: boolean;
}

const GuideCtx = createContext<GuideCtxValue | null>(null);

export function useGuide(): GuideCtxValue {
  const c = useContext(GuideCtx);
  if (!c) throw new Error('useGuide must be used within GuideProvider');
  return c;
}

/** Non-throwing accessor for chrome (e.g. the top-bar launcher) that may render
 *  in route groups without a GuideProvider (e.g. /prepare). Returns null there. */
export function useOptionalGuide(): GuideCtxValue | null {
  return useContext(GuideCtx);
}

/**
 * Drives the platform guide: holds the active tour + step index, navigates
 * between routes as steps demand (the overlay waits for each target to mount),
 * and marks the guide "seen" on the backend whenever a tour ends (finish or
 * skip) so it never auto-pops again. Mounted once in the student layout.
 */
export function GuideProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [steps, setSteps] = useState<GuideStep[] | null>(null);
  const [index, setIndex] = useState(0);

  const active = !!steps && steps.length > 0;
  const step = active ? steps![index] : null;

  const stop = useCallback(() => {
    setSteps(null);
    setIndex(0);
    markGuideSeen().catch(() => {});
  }, []);

  // Drop desktop-only steps (sidebar / top-bar search) on small screens so
  // mobile users never see a coachmark with nothing to point at.
  const prepare = (all: GuideStep[]): GuideStep[] => {
    const isDesktop = typeof window === 'undefined' || window.innerWidth >= 1024;
    return isDesktop ? all : all.filter((s) => !s.desktopOnly);
  };

  const start = useCallback((tourId?: string) => {
    const t = getTour(tourId);
    if (t) {
      const s = prepare(t.steps);
      if (s.length) {
        setIndex(0);
        setSteps(s);
      }
    }
  }, []);

  const startPageTour = useCallback((): boolean => {
    const t = pageTourFor(pathname);
    if (t) {
      const s = prepare(t.steps);
      if (s.length) {
        setIndex(0);
        setSteps(s);
        return true;
      }
    }
    return false;
  }, [pathname]);

  const next = useCallback(() => {
    if (!steps) return;
    if (index >= steps.length - 1) stop();
    else setIndex(index + 1);
  }, [steps, index, stop]);

  const prev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);

  // When a step lives on another route, navigate there - the overlay polls for
  // the target until it mounts.
  useEffect(() => {
    if (step?.route && step.route !== pathname) router.push(step.route);
    // Only react to the step changing, not to incidental pathname churn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step?.id]);

  const hasPageTour = !!pageTourFor(pathname);

  const value = useMemo<GuideCtxValue>(
    () => ({ start, startPageTour, hasPageTour, stop, active }),
    [start, startPageTour, hasPageTour, stop, active],
  );

  return (
    <GuideCtx.Provider value={value}>
      {children}
      {active && step && (
        <GuideOverlay
          step={step}
          index={index}
          total={steps!.length}
          onNext={next}
          onPrev={prev}
          onClose={stop}
        />
      )}
    </GuideCtx.Provider>
  );
}
