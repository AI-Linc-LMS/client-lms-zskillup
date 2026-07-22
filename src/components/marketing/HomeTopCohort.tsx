'use client';

import { useEffect, useState } from 'react';
import { getLeaderboard, type ApiLeaderboardEntry } from '@/lib/api/gamification';

const TONE = [
  'bg-gradient-to-br from-amber-300 to-orange-500 text-amber-950',
  'bg-gradient-to-br from-slate-200 to-slate-400 text-slate-800',
  'bg-gradient-to-br from-orange-200 to-orange-500 text-orange-950',
];

/**
 * Homepage "Top of cohort" - live top-3 from the public leaderboard
 * (GET /students/leaderboard), replacing the previously hardcoded names. Falls
 * back to a neutral empty state if the leaderboard is unreachable/empty.
 */
export function HomeTopCohort() {
  const [entries, setEntries] = useState<ApiLeaderboardEntry[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getLeaderboard('national', 3)
      .then((d) => {
        if (!cancelled) setEntries(d.entries.slice(0, 3));
      })
      .catch(() => {
        if (!cancelled) setEntries([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="lms-card sm:col-span-2 p-5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-subtle)]">
        Top of cohort
      </p>
      {entries && entries.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--color-text-muted)]">
          Be the first to top the leaderboard - start practising today.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {(entries ?? [null, null, null]).map((r, i) => (
            <li
              key={i}
              className="flex items-center gap-3 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-2)] px-3 py-2"
            >
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-extrabold ${TONE[i] ?? TONE[2]}`}
              >
                {i + 1}
              </span>
              <span className="flex-1 text-sm font-bold text-[var(--color-text)]">
                {r ? (r.fullName ?? 'Student') : '-'}
              </span>
              <span className="num-tab text-xs font-bold text-[var(--color-text-muted)]">
                {r ? `${r.totalXp.toLocaleString()} XP` : ''}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
