'use client';

import { useState } from 'react';
import { ArrowUpDown, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProgressBar } from '@/components/ui/progress-bar';
import { StatusPill } from './StatusPill';
import { DEMO_COURSES, DEMO_COURSE_TABS, type DemoCourse } from '@/lib/demo-data';

export function CourseTable() {
  const [tab, setTab] = useState<DemoCourse['tab']>('Active');

  const rows =
    tab === 'Active'
      ? DEMO_COURSES
      : DEMO_COURSES.filter((c) => c.tab === tab);

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Tab bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-5 pt-4">
        <div className="flex items-center gap-1" role="tablist" aria-label="Courses">
          {DEMO_COURSE_TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'flex items-center gap-1.5 border-b-2 pb-3 pr-1 text-[13px] font-medium transition-colors',
                tab === t.key
                  ? 'border-orange text-navy'
                  : 'border-transparent text-slate-400 hover:text-slate-600',
              )}
            >
              {t.key}
              {t.count > 0 && (
                <span
                  className={cn(
                    'rounded-full px-1.5 py-px text-[10px] font-bold',
                    tab === t.key ? 'bg-orange text-white' : 'bg-slate-100 text-slate-500',
                  )}
                >
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="mb-3 flex gap-2">
          <button className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-600 hover:bg-slate-50">
            <ArrowUpDown className="size-3" aria-hidden="true" /> Sort: Recent
          </button>
          <button className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-600 hover:bg-slate-50">
            <Filter className="size-3" aria-hidden="true" /> Filter
          </button>
        </div>
      </div>

      <p className="px-5 pt-3 text-[11px] text-slate-400">
        Showing {rows.length} of {DEMO_COURSES.length}
      </p>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left">
              {['Course', 'Category', 'Progress', 'Score', 'Due', 'Status'].map((h) => (
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
                <td colSpan={6} className="px-5 py-10 text-center text-sm text-slate-400">
                  Nothing here yet.
                </td>
              </tr>
            ) : (
              rows.map((c) => (
                <tr key={c.title} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                  <td className="px-5 py-3.5">
                    <p className="font-semibold text-navy">{c.title}</p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      {c.lessons} lessons · {c.hours} hrs · {c.instructor}
                    </p>
                  </td>
                  <td className="px-5 py-3.5 text-[12px] text-slate-500">{c.category}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <ProgressBar value={c.progress} className="w-20" />
                      <span className="text-[11px] font-medium text-slate-500">{c.progress}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-[13px] font-semibold text-navy">
                    {c.score !== null ? `${c.score}%` : '—'}
                  </td>
                  <td className="px-5 py-3.5 text-[12px] text-slate-500">{c.due ?? '—'}</td>
                  <td className="px-5 py-3.5">
                    <StatusPill status={c.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
