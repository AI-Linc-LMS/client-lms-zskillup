'use client';

import { useMemo, useState } from 'react';
import { FileSpreadsheet, FileText, Search, ShieldAlert } from 'lucide-react';
import type { AssessmentResults } from '@/lib/api/scheduling';
import { exportResultsCsv, exportResultsPdf, exportResultsXlsx } from '@/lib/results-export';
import { cn } from '@/lib/utils';

type SortKey = 'rank' | 'scorePct' | 'accuracy' | 'violations' | 'integrityScore' | 'timeTakenSec';

const fmtTime = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m ? `${m}m ${sec}s` : `${sec}s`;
};
const scoreTone = (v: number) =>
  v >= 70 ? 'text-emerald-700' : v >= 50 ? 'text-amber-700' : 'text-rose-700';

/**
 * Cohort-wise mock-assessment results report (shared by the Admin + TPO panels).
 * Full per-student roster with search, pass/fail filter, sortable columns, and
 * export to Excel / CSV / PDF. The row shows the key columns; the export carries
 * all ~28 fields (contact, section-wise scores, full proctoring breakdown, …).
 */
export function ResultsReport({ data }: { data: AssessmentResults }) {
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<SortKey>('rank');
  const [pass, setPass] = useState<'all' | 'pass' | 'fail'>('all');

  const view = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let rows = data.rows;
    if (needle) {
      rows = rows.filter(
        (r) =>
          (r.fullName ?? '').toLowerCase().includes(needle) ||
          r.email.toLowerCase().includes(needle) ||
          (r.collegeName ?? '').toLowerCase().includes(needle) ||
          (r.cohort ?? '').toLowerCase().includes(needle),
      );
    }
    if (pass !== 'all') rows = rows.filter((r) => (pass === 'pass' ? r.passed : !r.passed));
    // rank + time sort ascending (lower is better/faster); everything else descending.
    const asc = sort === 'rank' || sort === 'timeTakenSec';
    return [...rows].sort((a, b) => {
      const av = (a[sort] ?? 0) as number;
      const bv = (b[sort] ?? 0) as number;
      return asc ? av - bv : bv - av;
    });
  }, [data.rows, q, sort, pass]);

  const stats = [
    { label: 'Attempted', value: data.stats.attempted },
    { label: 'Passed', value: data.stats.passed },
    { label: 'Avg score', value: `${data.stats.avgScorePct}%` },
    { label: 'Top score', value: `${data.stats.topScorePct}%` },
    { label: 'Flagged', value: data.stats.flagged },
  ];

  const Th = ({ k, children, className }: { k?: SortKey; children: React.ReactNode; className?: string }) => (
    <th className={cn('whitespace-nowrap px-3 py-2 text-[10px] font-semibold uppercase tracking-wide', className)}>
      {k ? (
        <button
          type="button"
          onClick={() => setSort(k)}
          className={cn('inline-flex items-center gap-1 transition-colors hover:text-navy', sort === k ? 'text-navy' : 'text-slate-400')}
        >
          {children}
        </button>
      ) : (
        <span className="text-slate-400">{children}</span>
      )}
    </th>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* stats + export */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 pt-4">
        <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-5">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2">
              <p className="text-lg font-black tabular-nums text-navy">{s.value}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 px-6 pb-3 pt-3">
        <div className="flex min-w-[12rem] flex-1 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5">
          <Search className="size-4 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, email, college, cohort…"
            className="w-full bg-transparent text-sm text-navy outline-none placeholder:text-slate-400"
          />
        </div>
        <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 p-0.5 text-xs font-semibold">
          {(['all', 'pass', 'fail'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPass(p)}
              className={cn('rounded-full px-3 py-1 capitalize transition-colors', pass === p ? 'bg-white text-navy shadow-sm' : 'text-slate-500')}
            >
              {p}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={() => exportResultsXlsx(data)} disabled={!data.rows.length} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-navy transition-colors hover:bg-slate-50 disabled:opacity-40">
            <FileSpreadsheet className="size-3.5 text-emerald-600" /> Excel
          </button>
          <button type="button" onClick={() => exportResultsCsv(data)} disabled={!data.rows.length} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-navy transition-colors hover:bg-slate-50 disabled:opacity-40">
            <FileText className="size-3.5 text-sky-600" /> CSV
          </button>
          <button type="button" onClick={() => exportResultsPdf(data)} disabled={!data.rows.length} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-navy transition-colors hover:bg-slate-50 disabled:opacity-40">
            <FileText className="size-3.5 text-rose-600" /> PDF
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-6 pb-6">
        {data.rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-600">No attempts yet.</p>
        ) : (
          <table className="w-full min-w-[52rem] text-left text-sm">
            <thead className="sticky top-0 z-10 bg-white">
              <tr className="border-b border-slate-200">
                <Th k="rank">#</Th>
                <Th>Student</Th>
                <Th>College · Cohort</Th>
                <Th k="scorePct" className="text-right">Score</Th>
                <Th className="text-right">Correct</Th>
                <Th k="accuracy" className="text-right">Acc.</Th>
                <Th k="timeTakenSec" className="text-right">Time</Th>
                <Th k="violations" className="text-right">Integrity</Th>
                <Th className="text-right">Result</Th>
              </tr>
            </thead>
            <tbody>
              {view.map((r) => (
                <tr key={r.userId} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                  <td className="px-3 py-2.5 font-bold tabular-nums text-slate-500">{r.rank}</td>
                  <td className="px-3 py-2.5">
                    <span className="block font-semibold text-navy">{r.fullName ?? r.email}</span>
                    <span className="text-[11px] text-slate-500">{r.email}{r.phone ? ` · ${r.phone}` : ''}</span>
                  </td>
                  <td className="px-3 py-2.5 text-[11px] text-slate-600">
                    {r.collegeName ?? '—'}
                    {r.cohort ? <span className="block text-slate-400">{r.cohort}</span> : null}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <span className={cn('font-bold tabular-nums', scoreTone(r.scorePct))}>{r.scorePct}%</span>
                    <span className="block text-[11px] text-slate-500">{r.score}/{r.total}</span>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-slate-600">
                    {r.correctAnswers}/{r.attemptedQuestions}
                    <span className="block text-[10px] text-slate-400">of {r.totalQuestions}</span>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-slate-600">{r.accuracy}%</td>
                  <td className="px-3 py-2.5 text-right text-[11px] tabular-nums text-slate-500">{fmtTime(r.timeTakenSec)}</td>
                  <td className="px-3 py-2.5 text-right">
                    {!r.proctored ? (
                      <span className="text-[11px] text-slate-400">—</span>
                    ) : r.violations > 0 ? (
                      <span
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700"
                        title={`${r.tabSwitches} tab · ${r.fullscreenExits} FS · ${r.faceViolations} face (${r.faceValidationFailures} no-face, ${r.multipleFaceDetections} multi) · integrity ${r.integrityScore ?? '—'}`}
                      >
                        <ShieldAlert className="size-3.5" /> {r.violations}
                        {r.integrityScore != null ? <span className="text-slate-400">· {r.integrityScore}</span> : null}
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-emerald-600">Clean{r.integrityScore != null ? ` · ${r.integrityScore}` : ''}</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ring-inset', r.passed ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-rose-50 text-rose-700 ring-rose-200')}>
                      {r.passed ? 'Pass' : 'Fail'}
                    </span>
                  </td>
                </tr>
              ))}
              {view.length === 0 ? (
                <tr><td colSpan={9} className="px-3 py-6 text-center text-sm text-slate-500">No students match the filter.</td></tr>
              ) : null}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
