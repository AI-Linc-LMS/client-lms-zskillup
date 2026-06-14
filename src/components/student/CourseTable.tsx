'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CATEGORY_LABEL, DIFFICULTY_TONE } from '@/lib/ui-maps';
import { StatusPill, type StatusTone } from './StatusPill';
import { listCourses, type ApiCourseSummary } from '@/lib/api/catalog';

/**
 * Prep-track table — live course catalog (`GET /courses`, Sprint 2). Tabs
 * filter by the real category enum; difficulty renders as a §4.11 tone pill.
 * Per-student progress/score columns return with the Sprint 5 enrollment
 * ledger — until then the table only shows catalog truth.
 */

const CATEGORY_TABS: Array<{ key: string; label: string }> = [
  { key: '', label: 'All tracks' },
  { key: 'APTITUDE', label: 'Aptitude' },
  { key: 'PROGRAMMING_DSA', label: 'Programming · DSA' },
  { key: 'COMMUNICATION_HR', label: 'Communication' },
  { key: 'MOCK_DRIVE', label: 'Mock drives' },
];

export function CourseTable() {
  const [courses, setCourses] = useState<ApiCourseSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState('');

  useEffect(() => {
    let cancelled = false;
    listCourses()
      .then((rows) => !cancelled && setCourses(rows))
      .catch((err: Error) => !cancelled && setError(err.message || 'Could not load the catalog.'))
      .finally(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of courses ?? []) map[c.category] = (map[c.category] ?? 0) + 1;
    return map;
  }, [courses]);

  const rows = useMemo(
    () => (courses ?? []).filter((c) => !tab || c.category === tab),
    [courses, tab],
  );

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Tab bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-5 pt-4">
        <div className="flex flex-wrap items-center gap-1" role="tablist" aria-label="Prep tracks">
          {CATEGORY_TABS.map((t) => {
            const count = t.key === '' ? (courses?.length ?? 0) : (counts[t.key] ?? 0);
            return (
              <button
                key={t.key || 'all'}
                role="tab"
                aria-selected={tab === t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  'flex items-center gap-1.5 border-b-2 pb-3 pr-1 text-[13px] font-medium transition-colors',
                  tab === t.key
                    ? 'border-orange font-semibold text-navy'
                    : 'border-transparent text-slate-400 hover:text-slate-600',
                )}
              >
                {t.label}
                {count > 0 ? (
                  <span
                    className={cn(
                      'rounded-full px-1.5 py-px text-[10px] font-bold',
                      tab === t.key ? 'bg-orange text-white' : 'bg-slate-100 text-slate-500',
                    )}
                  >
                    {count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
        <Link
          href="/prepare"
          className="mb-3 text-[11px] font-semibold text-orange hover:underline"
        >
          Browse full catalog →
        </Link>
      </div>

      {error ? (
        <p className="px-5 py-8 text-sm text-red-600">{error}</p>
      ) : courses === null ? (
        <div className="flex items-center justify-center px-5 py-12">
          <Loader2 className="size-5 animate-spin text-slate-400" aria-hidden="true" />
        </div>
      ) : (
        <>
          <p className="px-5 pt-3 text-[11px] text-slate-400">
            Showing {rows.length} of {courses.length} prep tracks
          </p>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left">
                  {['Course', 'Category', 'Difficulty', 'Duration'].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-10 text-center text-sm text-slate-400">
                      No tracks in this category yet.
                    </td>
                  </tr>
                ) : (
                  rows.map((c) => {
                    const difficulty = DIFFICULTY_TONE[c.difficulty] ?? {
                      tone: 'neutral' as StatusTone,
                      label: c.difficulty,
                    };
                    return (
                      <tr
                        key={c.id}
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60"
                      >
                        <td className="px-5 py-3.5">
                          <p className="font-semibold text-navy">{c.title}</p>
                          {c.summary ? (
                            <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-400">
                              {c.summary}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-5 py-3.5 text-[12px] text-slate-500">
                          {CATEGORY_LABEL[c.category] ?? c.category}
                        </td>
                        <td className="px-5 py-3.5">
                          <StatusPill tone={difficulty.tone} label={difficulty.label} />
                        </td>
                        <td className="px-5 py-3.5 text-[13px] font-semibold text-navy">
                          {c.estimatedHours} hrs
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
