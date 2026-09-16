'use client';

import { useMemo, useState } from 'react';
import { Download, Loader2, Search } from 'lucide-react';
import type { TpoCompanyReadinessReport } from '@/shared';
import { Button } from '@/components/ui/button';
import { csvScopeSlug, downloadCsv, toCsv } from '@/lib/csv';
import { cn } from '@/lib/utils';

/**
 * Student-level Company Readiness table - shared by the TPO console and the
 * admin/super-admin college page (TPO Panel View) so both read the same columns off
 * the same endpoint.
 *
 * ROSTER-WIDE: the backend LEFT JOINs the whole college/cohort roster, so a student
 * who has done nothing for this company is a zero row, not a missing one. `readiness`
 * is the same per-company blend the student sees on their own dashboard.
 */

// Text-formatted IST date/time so Excel never renders a numeric date as ########.
const IST = 'Asia/Kolkata';
export const fmtActiveDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: IST,
  });
export const fmtActiveTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: IST });

const scoreBg = (v: number | null) =>
  v == null
    ? 'bg-slate-50 text-slate-500 ring-slate-200'
    : v >= 70
      ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
      : v >= 50
        ? 'bg-amber-50 text-amber-700 ring-amber-200'
        : v > 0
          ? 'bg-rose-50 text-rose-700 ring-rose-200'
          : 'bg-slate-50 text-slate-500 ring-slate-200';

function Pill({ value }: { value: number | null }) {
  return (
    <span
      className={cn(
        'inline-flex min-w-[3rem] justify-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold tabular-nums ring-1 ring-inset',
        scoreBg(value),
      )}
    >
      {value == null ? '-' : `${value}%`}
    </span>
  );
}

/** CSV headings are fixed by the owner - do not reorder or rename. */
export function companyReadinessCsv(report: TpoCompanyReadinessReport): string {
  return toCsv(
    [
      'Student Name',
      'Email',
      `${report.company.name} Readiness %`,
      'Accuracy',
      'Questions Attempted',
      'Easy',
      'Medium',
      'Hard',
      'Topics Practiced',
      'Last active',
    ],
    report.students.map((s) => [
      s.name ?? '',
      s.email,
      s.readiness,
      s.accuracy,
      s.questionsAttempted,
      s.easy,
      s.medium,
      s.hard,
      s.topicsPracticed.join('; '),
      // One combined cell, text-formatted IST.
      s.lastActiveAt ? `${fmtActiveDate(s.lastActiveAt)} ${fmtActiveTime(s.lastActiveAt)}` : 'Never',
    ]),
  );
}

export function CompanyReadinessTable({
  report,
  loading,
  companyName,
  /** Batch/cohort label, folded into the export filename so two exports never collide. */
  scopeLabel,
  emptyHint,
}: {
  report: TpoCompanyReadinessReport | null;
  loading: boolean;
  companyName: string;
  scopeLabel: string;
  emptyHint?: string;
}) {
  const [q, setQ] = useState('');

  const rows = useMemo(() => {
    const list = report?.students ?? [];
    const needle = q.trim().toLowerCase();
    return needle
      ? list.filter(
          (s) =>
            (s.name ?? '').toLowerCase().includes(needle) || s.email.toLowerCase().includes(needle),
        )
      : list;
  }, [report, q]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-slate-400">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }
  if (!report) {
    return <p className="py-8 text-center text-sm text-slate-500">{emptyHint ?? 'Select a company to view student-level readiness.'}</p>;
  }
  if (report.students.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-slate-500">
        There are no students in this batch yet, so there is nothing to score against {companyName}.
      </p>
    );
  }

  const exportCsv = () =>
    downloadCsv(
      `company-readiness-${report.company.slug}-${csvScopeSlug(scopeLabel)}.csv`,
      companyReadinessCsv(report),
    );

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 sm:max-w-xs">
          <Search className="size-4 text-slate-400" aria-hidden />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search student…"
            aria-label="Search students"
            className="w-full bg-transparent text-sm text-navy outline-none placeholder:text-slate-400"
          />
        </div>
        <Button size="sm" onClick={exportCsv} className="ml-auto">
          <Download className="size-4" /> Export CSV
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[64rem] text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[10px] text-slate-500">
              <th className="px-3 py-2 text-left font-semibold uppercase tracking-widest">Student Name</th>
              <th className="px-3 py-2 text-left font-semibold uppercase tracking-widest">Email</th>
              <th className="px-3 py-2 text-right font-semibold uppercase tracking-widest">
                {companyName} Readiness %
              </th>
              <th className="px-3 py-2 text-right font-semibold uppercase tracking-widest">Accuracy</th>
              <th className="px-3 py-2 text-right font-semibold uppercase tracking-widest">
                Questions Attempted
              </th>
              <th className="px-3 py-2 text-right font-semibold uppercase tracking-widest text-emerald-600">Easy</th>
              <th className="px-3 py-2 text-right font-semibold uppercase tracking-widest text-amber-600">Medium</th>
              <th className="px-3 py-2 text-right font-semibold uppercase tracking-widest text-red-600">Hard</th>
              <th className="px-3 py-2 text-left font-semibold uppercase tracking-widest">Topics Practiced</th>
              <th className="px-3 py-2 text-right font-semibold uppercase tracking-widest">Last Active Date</th>
              <th className="px-3 py-2 text-right font-semibold uppercase tracking-widest">Last Active Time</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id} className="border-b border-slate-100 align-top last:border-0 hover:bg-slate-50">
                <td className="px-3 py-2.5 font-semibold text-navy">{s.name ?? 'Unnamed student'}</td>
                <td className="px-3 py-2.5 text-[11px] text-slate-500">{s.email}</td>
                <td className="px-3 py-2.5 text-right">
                  <Pill value={s.readiness} />
                </td>
                <td className="px-3 py-2.5 text-right">
                  <Pill value={s.questionsAttempted > 0 ? s.accuracy : null} />
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-slate-600">{s.questionsAttempted}</td>
                <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-emerald-600">{s.easy}</td>
                <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-amber-600">{s.medium}</td>
                <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-red-600">{s.hard}</td>
                <td className="px-3 py-2.5">
                  {s.topicsPracticed.length === 0 ? (
                    <span className="text-[11px] text-slate-400">-</span>
                  ) : (
                    <div className="flex max-w-[16rem] flex-wrap gap-1">
                      {s.topicsPracticed.slice(0, 6).map((t) => (
                        <span
                          key={t}
                          className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700 ring-1 ring-violet-100"
                        >
                          {t}
                        </span>
                      ))}
                      {s.topicsPracticed.length > 6 ? (
                        <span className="text-[10px] text-slate-400">+{s.topicsPracticed.length - 6}</span>
                      ) : null}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2.5 text-right text-[11px] text-slate-500">
                  {s.lastActiveAt ? fmtActiveDate(s.lastActiveAt) : 'Never'}
                </td>
                <td className="px-3 py-2.5 text-right text-[11px] text-slate-500">
                  {s.lastActiveAt ? fmtActiveTime(s.lastActiveAt) : '-'}
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-3 py-6 text-center text-sm text-slate-500">
                  No students match &ldquo;{q}&rdquo;.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {report.truncated ? (
        <p className="mt-2 text-[11px] text-slate-500">
          Showing the first {report.students.length} students - the roster is capped for very large
          colleges. Filter by batch to see the rest.
        </p>
      ) : null}
    </>
  );
}
