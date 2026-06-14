'use client';

import { useEffect, useState } from 'react';
import { formatDateIN } from '@/lib/format';
import Link from 'next/link';
import { BookOpen, Calendar, Target, Timer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getMockHistory, type ApiMockAttemptHistory } from '@/lib/api/mocks';
import { getPracticeAccuracy, type ApiAccuracy } from '@/lib/api/practice';

/**
 * Dashboard right rail — every number is live: recent activity from the
 * student's real mock attempts, practice totals from the accuracy endpoint,
 * and a true calendar for the current week. Assignment deadlines return when
 * the assignments model ships; until then "Up next" routes into the live
 * features instead of inventing due dates.
 */

const UP_NEXT = [
  {
    icon: Timer,
    title: 'Take a timed mock',
    meta: 'Score, percentile, and a full answer review',
    href: '/mock-tests',
  },
  {
    icon: Target,
    title: 'Drill a weak topic',
    meta: 'Server-graded practice with instant hints',
    href: '/topic-mastery',
  },
  {
    icon: BookOpen,
    title: 'Browse company hubs',
    meta: 'Pattern-matched prep for 9 recruiters',
    href: '/dashboard/company',
  },
];

export function DashboardRightRail() {
  const [history, setHistory] = useState<ApiMockAttemptHistory[] | null>(null);
  const [accuracy, setAccuracy] = useState<ApiAccuracy | null>(null);
  const [week, setWeek] = useState<Array<{ d: string; n: number; today: boolean }>>([]);

  useEffect(() => {
    let cancelled = false;
    getMockHistory()
      .then((rows) => !cancelled && setHistory(rows))
      .catch(() => !cancelled && setHistory([]));
    getPracticeAccuracy()
      .then((a) => !cancelled && setAccuracy(a))
      .catch(() => {});

    // Build the real current week (Mon–Sun) client-side so "today" is true.
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    setWeek(
      labels.map((d, i) => {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        return { d, n: date.getDate(), today: date.toDateString() === now.toDateString() };
      }),
    );
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-5">
      {/* Up next — live feature entry points */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">
          Up Next
        </h2>
        <div className="space-y-2.5">
          {UP_NEXT.map(({ icon: Icon, title, meta, href }) => (
            <Link
              key={title}
              href={href}
              className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 transition-colors hover:border-orange/40 hover:bg-orange/5"
            >
              <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-sky-50 text-navy">
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-sm font-semibold leading-snug text-navy">{title}</span>
                <span className="mt-0.5 block text-xs text-slate-500">{meta}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* This Week — real calendar */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-400">
          <Calendar className="size-3.5" aria-hidden="true" />
          This Week
        </h2>
        <div className="flex justify-between">
          {week.map((day) => (
            <div key={day.d} className="flex flex-col items-center gap-1">
              <span className="text-[10px] font-medium uppercase text-slate-400">{day.d}</span>
              <span
                className={cn(
                  'grid size-8 place-items-center rounded-lg text-xs font-semibold',
                  day.today ? 'bg-navy text-white shadow-sm' : 'text-slate-700',
                )}
              >
                {day.n}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-slate-400">
          {accuracy && accuracy.total > 0
            ? `${accuracy.total} questions practised overall · ${accuracy.accuracyPct}% accuracy`
            : 'Your practice totals appear here as you attempt questions.'}
        </p>
      </section>

      {/* Recent Activity — real mock attempts */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">
          Recent Activity
        </h2>
        {history === null ? (
          <div className="h-20 animate-pulse rounded-lg bg-slate-50" />
        ) : history.length === 0 ? (
          <p className="text-xs text-slate-500">
            No assessments yet — your mock results will show up here.
          </p>
        ) : (
          <ul className="space-y-3">
            {history.slice(0, 4).map((a) => (
              <li key={a.attemptId} className="flex gap-2.5">
                <span
                  className={cn(
                    'mt-1.5 size-1.5 shrink-0 rounded-full',
                    a.passed ? 'bg-emerald-500' : a.status === 'EXPIRED' ? 'bg-amber-500' : 'bg-orange',
                  )}
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <Link
                    href={`/dashboard/quiz?report=${a.attemptId}`}
                    className="block truncate text-xs font-medium leading-snug text-slate-700 transition-colors hover:text-navy"
                  >
                    {a.title} — {a.pct}%
                  </Link>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    {formatDateIN(a.submittedAt, { year: false })} · {a.percentile}th percentile
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
