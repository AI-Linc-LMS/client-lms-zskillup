'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Award, ChevronsUpDown, Code2, Loader2, Search, Target, Users, X } from 'lucide-react';
import {
  getTpoCodingAnalytics,
  getTpoCodingStudentDetail,
  getTpoCodingStudents,
} from '@/lib/api/tpo';
import type {
  TpoCodingAnalytics,
  TpoCodingStudentDetail,
  TpoCodingStudentRow,
} from '@/shared';
import { useTpoConsole } from '@/components/tpo/TpoConsole';
import { BentoCard, KpiCard } from '@/components/tpo/ui';
import { ConsoleHero } from '@/components/layout/ConsoleHero';
import { cn } from '@/lib/utils';

const scoreBg = (v: number | null) =>
  v == null
    ? 'bg-slate-50 text-slate-500 ring-slate-200'
    : v >= 70
      ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
      : v >= 50
        ? 'bg-amber-50 text-amber-700 ring-amber-200'
        : 'bg-rose-50 text-rose-700 ring-rose-200';

function Pill({ value, suffix = '%' }: { value: number | null; suffix?: string }) {
  return (
    <span className={cn('inline-flex min-w-[3rem] justify-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 tabular-nums', scoreBg(value))}>
      {value == null ? '—' : `${value}${suffix}`}
    </span>
  );
}

const DIFF = [
  { key: 'easy', label: 'Easy', color: '#059669' },
  { key: 'medium', label: 'Medium', color: '#f5b400' },
  { key: 'hard', label: 'Hard', color: '#dc2626' },
] as const;

type SortKey = 'solved' | 'accuracy' | 'codingReadiness';

export default function CodingAnalyticsPage() {
  const { cohortId, cohorts } = useTpoConsole();
  const [summary, setSummary] = useState<TpoCodingAnalytics | null>(null);
  const [students, setStudents] = useState<TpoCodingStudentRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<SortKey>('solved');
  const [selected, setSelected] = useState<{ id: string; name: string | null } | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      getTpoCodingAnalytics(cohortId || undefined),
      getTpoCodingStudents(cohortId || undefined),
    ])
      .then(([s, st]) => {
        setSummary(s);
        setStudents(st);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load coding analytics'))
      .finally(() => setLoading(false));
  }, [cohortId]);

  const cohortLabel = cohortId ? cohorts.find((c) => c.id === cohortId)?.name ?? 'Batch' : 'All batches';

  const view = useMemo(() => {
    const rows = students ?? [];
    const needle = q.trim().toLowerCase();
    const filtered = needle
      ? rows.filter((r) => (r.name ?? '').toLowerCase().includes(needle) || (r.branch ?? '').toLowerCase().includes(needle))
      : rows;
    return [...filtered].sort((a, b) => (b[sort] ?? 0) - (a[sort] ?? 0));
  }, [students, q, sort]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-7 animate-spin text-slate-500" />
      </div>
    );
  }
  if (error) {
    return <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</div>;
  }

  const Th = ({ k, children }: { k: SortKey; children: React.ReactNode }) => (
    <th className="px-3 py-2 text-right">
      <button
        type="button"
        onClick={() => setSort(k)}
        className={cn('inline-flex items-center gap-1 font-semibold uppercase tracking-wide transition-colors hover:text-navy', sort === k ? 'text-navy' : 'text-slate-400')}
      >
        {children}
        <ChevronsUpDown className="size-3" />
      </button>
    </th>
  );

  return (
    <div className="space-y-6">
      <ConsoleHero
        icon={Code2}
        eyebrow="Placement Office"
        title="Coding Analytics"
        description="Individual coding performance across your cohort — click a student for topics and company-wise readiness."
        actions={
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white/80 ring-1 ring-inset ring-white/15">
            {cohortLabel}
          </span>
        }
      />

      {summary ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard icon={Users} label="Active Coders" value={summary.activeCoders} tone="sky" source="≥1 submission" />
          <KpiCard icon={Award} label="Problems Solved" value={summary.totalSolved} tone="emerald" source="Distinct solved" />
          <KpiCard icon={Target} label="Solve Rate" value={`${summary.solveRate}%`} tone="orange" source="Solved / attempted" />
          <KpiCard icon={Code2} label="Attempted" value={summary.totalAttempted} tone="violet" source="Distinct attempted" />
        </div>
      ) : null}

      <BentoCard
        title="Student Breakdown"
        subtitle="Every student who has practised coding. Click a row for topics practiced, difficulty split and company-wise readiness."
        source="Coding submissions × problem difficulty"
      >
        <div className="mb-3 flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 sm:max-w-xs">
          <Search className="size-4 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search student or department…"
            className="w-full bg-transparent text-sm text-navy outline-none placeholder:text-slate-400"
          />
        </div>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[48rem] text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[10px] text-slate-400">
                <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide">Student</th>
                <th className="px-3 py-2 text-right font-semibold uppercase tracking-wide text-emerald-600">Easy</th>
                <th className="px-3 py-2 text-right font-semibold uppercase tracking-wide text-amber-600">Med</th>
                <th className="px-3 py-2 text-right font-semibold uppercase tracking-wide text-rose-600">Hard</th>
                <Th k="solved">Solved</Th>
                <Th k="accuracy">Accuracy</Th>
                <Th k="codingReadiness">Coding Readiness</Th>
                <th className="px-3 py-2 text-right font-semibold uppercase tracking-wide text-slate-400">Last Active</th>
              </tr>
            </thead>
            <tbody>
              {view.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => setSelected({ id: r.id, name: r.name })}
                  className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-sky-50/60"
                  title="View topics & company-wise detail"
                >
                  <td className="px-3 py-2.5">
                    <p className="font-semibold text-navy underline-offset-2 hover:underline">{r.name ?? 'Unnamed student'}</p>
                    <p className="text-[11px] text-slate-500">{r.branch ?? 'Dept. unspecified'}</p>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-emerald-600">{r.easy}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-amber-600">{r.medium}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-rose-600">{r.hard}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-bold text-navy">{r.solved}</td>
                  <td className="px-3 py-2.5 text-right"><Pill value={r.accuracy} /></td>
                  <td className="px-3 py-2.5 text-right"><Pill value={r.codingReadiness} /></td>
                  <td className="px-3 py-2.5 text-right text-[11px] text-slate-500">
                    {r.lastActive ? new Date(r.lastActive).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' }) : '—'}
                  </td>
                </tr>
              ))}
              {view.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-sm text-slate-500">
                    {students && students.length === 0 ? 'No coding activity in this scope yet.' : `No students match “${q}”.`}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </BentoCard>

      {selected ? <CodingStudentDrawer student={selected} onClose={() => setSelected(null)} /> : null}
    </div>
  );
}

function CodingStudentDrawer({
  student,
  onClose,
}: {
  student: { id: string; name: string | null };
  onClose: () => void;
}) {
  const [data, setData] = useState<TpoCodingStudentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    getTpoCodingStudentDetail(student.id)
      .then((d) => alive && setData(d))
      .catch(() => alive && setError('Could not load this student’s coding detail.'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [student.id]);

  if (!mounted) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end">
      <div aria-hidden onClick={onClose} className="absolute inset-0 bg-slate-900/40" />
      <div role="dialog" aria-modal="true" className="relative flex h-full w-full max-w-xl flex-col bg-background shadow-lg">
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Coding detail</p>
            <h3 className="text-base font-bold text-navy">{student.name ?? 'Student'}</h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="grid size-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-navy">
            <X className="size-5" />
          </button>
        </div>
        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-400"><Loader2 className="size-6 animate-spin" /></div>
          ) : error ? (
            <p className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200">{error}</p>
          ) : data ? (
            <>
              <div className="flex flex-wrap gap-4">
                <Metric label="Coding Readiness" value={data.codingReadiness} />
                <Metric label="Accuracy" value={data.accuracy} />
              </div>

              <div>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Topics Practiced</p>
                {data.topicsPracticed.length === 0 ? (
                  <p className="text-sm text-slate-500">No tagged topics yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {data.topicsPracticed.map((t) => (
                      <span key={t} className="rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-semibold text-violet-700 ring-1 ring-violet-100">{t}</span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Difficulty-wise</p>
                <div className="space-y-2.5">
                  {DIFF.map((d) => {
                    const b = data.difficulty[d.key];
                    const rate = b.attempted > 0 ? Math.round((b.solved / b.attempted) * 100) : 0;
                    return (
                      <div key={d.key} className="flex items-center gap-3">
                        <span className="w-16 shrink-0 text-sm font-semibold" style={{ color: d.color }}>{d.label}</span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full" style={{ width: `${rate}%`, background: d.color }} />
                        </div>
                        <span className="w-24 shrink-0 text-right text-xs text-slate-600">
                          <span className="font-bold text-navy">{b.solved}</span>/{b.attempted} · {rate}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Company-wise Readiness</p>
                {data.companies.length === 0 ? (
                  <p className="text-sm text-slate-500">No company-tagged problems attempted yet.</p>
                ) : (
                  <div className="overflow-hidden rounded-lg border border-slate-200">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                        <tr>
                          <th className="px-3 py-2">Company</th>
                          <th className="px-3 py-2 text-right">Readiness</th>
                          <th className="px-3 py-2 text-right">Accuracy</th>
                          <th className="px-3 py-2 text-right">Questions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.companies.map((c) => (
                          <tr key={c.slug} className="border-t border-slate-100">
                            <td className="px-3 py-2 font-semibold text-navy">{c.name}</td>
                            <td className="px-3 py-2 text-right"><Pill value={c.readiness} /></td>
                            <td className="px-3 py-2 text-right"><Pill value={c.accuracy} /></td>
                            <td className="px-3 py-2 text-right tabular-nums text-slate-600">
                              <span className="font-bold text-navy">{c.solved}</span>/{c.attempted}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Metric({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="text-2xl font-extrabold leading-none text-navy">{value != null ? `${value}%` : '—'}</p>
    </div>
  );
}
