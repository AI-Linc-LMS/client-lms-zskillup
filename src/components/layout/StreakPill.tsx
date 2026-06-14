'use client';

import { useEffect, useState } from 'react';
import { Target } from 'lucide-react';
import { getPracticeAccuracy } from '@/lib/api/practice';
import { isStudentContext } from '@/lib/session-hints';

/**
 * Top-bar signal pill. The day-streak counter returns when the Sprint 5
 * streak ledger ships; until then the same slot carries the student's REAL
 * practice accuracy — and renders nothing for visitors with no attempts,
 * rather than inventing a number.
 *
 * The endpoint is STUDENT-only, so the fetch is gated on the role/preview
 * hint cookies — an admin console must not fire doomed 403 requests.
 */
export function StreakPill() {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!isStudentContext()) return;
    let cancelled = false;
    getPracticeAccuracy()
      .then((a) => {
        if (!cancelled && a.total > 0) setLabel(`${a.accuracyPct}% ACCURACY`);
      })
      .catch(() => {
        // Signed out / stale hint → no pill
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!label) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-orange px-3 py-1 text-[11px] font-bold text-white shadow-sm">
      <Target className="size-3.5" aria-hidden="true" />
      {label}
    </span>
  );
}
