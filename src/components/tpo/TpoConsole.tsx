'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { getTpoCollegeSummary } from '@/lib/api/tpo';
import { listCohorts, type Cohort } from '@/lib/api/cohorts';
import type { TpoCollegeSummary } from '@/shared';

/**
 * Shared state for the whole TPO console (Placement Office). Holds the college
 * identity (for the sidebar brand lockup), the cohort list + the currently
 * selected batch (the top-bar Batch selector scopes every module to it), and the
 * persisted sidebar-collapse flag. Fetched ONCE at the shell level so switching
 * modules never re-requests the college identity or cohort list.
 */
interface TpoConsoleValue {
  summary: TpoCollegeSummary | null;
  cohorts: Cohort[];
  /** Selected batch - '' means "All batches". */
  cohortId: string;
  setCohortId: (id: string) => void;
  collapsed: boolean;
  toggleCollapsed: () => void;
}

const Ctx = createContext<TpoConsoleValue | null>(null);

const COLLAPSE_KEY = 'tpo:sidebar-collapsed';

export function useTpoConsole(): TpoConsoleValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useTpoConsole must be used inside <TpoConsoleProvider>');
  return v;
}

export function TpoConsoleProvider({ children }: { children: ReactNode }) {
  const [summary, setSummary] = useState<TpoCollegeSummary | null>(null);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [cohortId, setCohortId] = useState('');
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getTpoCollegeSummary()
      .then((s) => !cancelled && setSummary(s))
      .catch(() => {});
    listCohorts()
      .then((c) => !cancelled && setCohorts(c))
      .catch(() => setCohorts([]));
    try {
      if (window.localStorage.getItem(COLLAPSE_KEY) === '1') setCollapsed(true);
    } catch {
      /* ignore storage errors (private mode) */
    }
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleCollapsed = () =>
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });

  return (
    <Ctx.Provider value={{ summary, cohorts, cohortId, setCohortId, collapsed, toggleCollapsed }}>
      {children}
    </Ctx.Provider>
  );
}
