'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Flame, Loader2, Trophy, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getLeaderboard, type ApiLeaderboard, type ApiLeaderboardEntry } from '@/lib/api/gamification';

/**
 * Compact "your ranking" leaderboard for the Assessments tab: shows the student's
 * own rank prominently plus the current top of the national board (you highlighted).
 * Full board lives at /leaderboard.
 */
export function MyRankingPanel() {
  const [data, setData] = useState<ApiLeaderboard | null>(null);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    let on = true;
    getLeaderboard('national', 10)
      .then((d) => on && setData(d))
      .catch(() => on && setErrored(true));
    return () => {
      on = false;
    };
  }, []);

  if (errored) return null;
  if (!data) {
    return (
      <div className="flex h-40 items-center justify-center rounded-3xl border border-slate-200/80 bg-white">
        <Loader2 className="size-5 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Your rank hero */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#0f1117] via-[#171b2e] to-[#202b63] p-5 text-white sm:p-6">
        <span aria-hidden className="pointer-events-none absolute -right-12 -top-12 size-40 rounded-full bg-[#ffc42d]/20 blur-3xl" />
        <div className="relative flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">Your rank</p>
            <p className="mt-1 text-3xl font-black tabular-nums">
              {data.myRank ? `#${data.myRank}` : '-'}
              {data.totalStudents ? (
                <span className="ml-1 text-sm font-semibold text-white/50">of {data.totalStudents.toLocaleString()}</span>
              ) : null}
            </p>
            {data.myEntry ? (
              <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-bold">
                <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-amber-200 ring-1 ring-inset ring-white/15">
                  <Zap className="size-3.5" /> {data.myEntry.totalXp.toLocaleString()} XP
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-emerald-200 ring-1 ring-inset ring-white/15">
                  Lv {data.myEntry.level}
                </span>
                {data.myEntry.currentStreakDays > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-orange-200 ring-1 ring-inset ring-white/15">
                    <Flame className="size-3.5" /> {data.myEntry.currentStreakDays}d
                  </span>
                ) : null}
              </div>
            ) : (
              <p className="mt-2 text-xs text-white/55">Take an assessment or practice to join the board.</p>
            )}
          </div>
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/10 text-[#ffc42d] ring-1 ring-inset ring-white/15">
            <Trophy className="size-6" />
          </span>
        </div>
      </div>

      {/* Top of the board */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Top students</p>
          <Link href="/leaderboard" className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-600 hover:underline">
            Full leaderboard <ArrowUpRight className="size-3" />
          </Link>
        </div>
        <ul className="space-y-1">
          {data.entries.map((e) => (
            <RankRow key={e.userId} e={e} />
          ))}
          {/* If you're outside the top 10, show your row pinned at the bottom. */}
          {data.myEntry && !data.entries.some((e) => e.isYou) ? (
            <>
              <li className="py-1 text-center text-[10px] font-bold text-slate-300">···</li>
              <RankRow e={data.myEntry} />
            </>
          ) : null}
        </ul>
      </div>
    </div>
  );
}

function RankRow({ e }: { e: ApiLeaderboardEntry }) {
  return (
    <li
      className={cn(
        'flex items-center gap-3 rounded-xl px-2.5 py-2',
        e.isYou ? 'bg-orange/10 ring-1 ring-inset ring-orange/30' : 'hover:bg-slate-50',
      )}
    >
      <span
        className={cn(
          'grid size-7 shrink-0 place-items-center rounded-lg text-[12px] font-black tabular-nums',
          e.rank === 1
            ? 'bg-amber-100 text-amber-700'
            : e.rank === 2
              ? 'bg-slate-200 text-slate-600'
              : e.rank === 3
                ? 'bg-orange-100 text-orange-700'
                : 'bg-slate-100 text-slate-500',
        )}
      >
        {e.rank}
      </span>
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-navy/5 text-[10px] font-bold text-navy">
        {e.initials}
      </span>
      <span className={cn('min-w-0 flex-1 truncate text-sm font-semibold', e.isYou ? 'text-navy' : 'text-slate-700')}>
        {e.fullName ?? 'Student'}
        {e.isYou ? <span className="ml-1 text-[10px] font-bold text-orange-600">You</span> : null}
      </span>
      <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 tabular-nums">
        <Zap className="size-3.5 fill-amber-400 text-amber-500" /> {e.totalXp.toLocaleString()}
      </span>
    </li>
  );
}
