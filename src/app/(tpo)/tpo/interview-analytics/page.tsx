'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Loader2, MessageSquare, Mic, Search, Smile, Users, X } from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getTpoInterviewAnalytics, getTpoStudentInterviews } from '@/lib/api/tpo';
import type { TpoInterviewAnalytics, TpoInterviewStudentRow, TpoStudentInterviews } from '@/shared';
import { useTpoConsole } from '@/components/tpo/TpoConsole';
import { BentoCard, ProvenanceChip } from '@/components/tpo/ui';
import { ConsoleHero } from '@/components/layout/ConsoleHero';
import { cn } from '@/lib/utils';

/** One score→colour scale used across every tile, chart and pill on the page. */
const scoreColor = (v: number | null | undefined) =>
  v == null ? '#94a3b8' : v >= 70 ? '#059669' : v >= 50 ? '#f59e0b' : '#dc2626';
const scoreBg = (v: number | null | undefined) =>
  v == null
    ? 'bg-slate-50 text-slate-500 ring-slate-200'
    : v >= 70
      ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
      : v >= 50
        ? 'bg-amber-50 text-amber-700 ring-amber-200'
        : 'bg-rose-50 text-rose-700 ring-rose-200';

const CHART_TOOLTIP = { borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 } as const;

function ScoreTile({
  icon: Icon,
  label,
  value,
  source,
  suffix = '%',
}: {
  icon: typeof Mic;
  label: string;
  value: number | null;
  source: string;
  suffix?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <span className="grid size-9 place-items-center rounded-xl bg-[#fff5ea] text-[#f5b400]">
        <Icon className="size-5" />
      </span>
      {value != null ? (
        <>
          <p className="mt-3 text-2xl font-black tabular-nums text-navy">
            {value}
            {suffix}
          </p>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        </>
      ) : (
        <>
          <p className="mt-3 text-sm font-bold text-slate-500">Needs data</p>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-1 text-[10px] text-slate-500">Populates as interviews are graded</p>
        </>
      )}
      <p className="mt-2 flex items-center gap-1 text-[10px] text-slate-500">{source}</p>
    </div>
  );
}

/** Readiness-score distribution (0-20 … 80-100). Bars coloured by band. */
function DistributionChart({ data }: { data: TpoInterviewAnalytics['distribution'] }) {
  const midpoint = [10, 30, 50, 70, 90];
  const chart = data.map((d, i) => ({ ...d, mid: midpoint[i] ?? 50 }));
  const total = data.reduce((a, d) => a + d.count, 0);
  if (total === 0) return <p className="py-6 text-center text-sm text-slate-500">No graded interviews yet.</p>;
  return (
    <div style={{ height: 200 }} className="w-full">
      <ResponsiveContainer>
        <BarChart data={chart} margin={{ top: 16, right: 8, bottom: 4, left: -18 }} barCategoryGap="22%">
          <XAxis dataKey="bucket" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
          <Tooltip
            cursor={{ fill: '#f8fafc' }}
            formatter={(v) => [`${v} interview${v === 1 ? '' : 's'}`, 'Count']}
            labelFormatter={(l) => `Readiness ${l}%`}
            contentStyle={CHART_TOOLTIP}
          />
          <Bar dataKey="count" radius={[6, 6, 0, 0]} isAnimationActive={false}>
            {chart.map((d, i) => (
              <Cell key={i} fill={scoreColor(d.mid)} />
            ))}
            <LabelList dataKey="count" position="top" style={{ fontSize: 11, fontWeight: 700, fill: '#334155' }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Interview activity + avg readiness over time. Area = volume, line label = score. */
function TrendChart({ data }: { data: TpoInterviewAnalytics['trend'] }) {
  const chart = data.map((d) => ({
    ...d,
    label: d.date.slice(5), // MM-DD
  }));
  if (chart.length === 0) return <p className="py-6 text-center text-sm text-slate-500">No interview activity yet.</p>;
  return (
    <div style={{ height: 200 }} className="w-full">
      <ResponsiveContainer>
        <AreaChart data={chart} margin={{ top: 12, right: 8, bottom: 4, left: -20 }}>
          <defs>
            <linearGradient id="interviewVol" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f5b400" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#f5b400" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} minTickGap={16} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
          <Tooltip
            cursor={{ stroke: '#e2e8f0' }}
            formatter={(v, _n, item) => {
              const p = item?.payload as { readiness?: number | null };
              return [`${v} interview${v === 1 ? '' : 's'}${p?.readiness != null ? ` · avg ${p.readiness}% ready` : ''}`, 'Activity'];
            }}
            contentStyle={CHART_TOOLTIP}
          />
          <Area type="monotone" dataKey="interviews" stroke="#f5b400" strokeWidth={2.5} fill="url(#interviewVol)" isAnimationActive={false} dot={chart.length < 12} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Department (branch) readiness roll-up as horizontal bars. */
function BranchChart({ data }: { data: TpoInterviewAnalytics['byBranch'] }) {
  const chart = data.filter((d) => d.readiness != null).slice(0, 8);
  if (chart.length === 0) return <p className="py-6 text-center text-sm text-slate-500">No department data yet.</p>;
  return (
    <div style={{ height: Math.max(150, chart.length * 42) }} className="w-full">
      <ResponsiveContainer>
        <BarChart data={chart} layout="vertical" margin={{ top: 4, right: 40, bottom: 4, left: 4 }} barSize={16}>
          <XAxis type="number" domain={[0, 100]} hide />
          <YAxis
            type="category"
            dataKey="branch"
            width={110}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: '#475569' }}
          />
          <Tooltip
            cursor={{ fill: '#f8fafc' }}
            formatter={(v, _n, item) => {
              const p = item?.payload as { students?: number; interviews?: number };
              return [`${v}% ready · ${p?.students ?? 0} students · ${p?.interviews ?? 0} interviews`, 'Readiness'];
            }}
            contentStyle={CHART_TOOLTIP}
          />
          <Bar dataKey="readiness" radius={[0, 6, 6, 0]} isAnimationActive={false}>
            {chart.map((d, i) => (
              <Cell key={i} fill={scoreColor(d.readiness)} />
            ))}
            <LabelList dataKey="readiness" position="right" formatter={(v) => `${v}%`} style={{ fontSize: 11, fontWeight: 700, fill: '#334155' }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ScorePill({ value }: { value: number | null }) {
  return (
    <span className={cn('inline-flex min-w-[2.75rem] justify-center rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ring-1 ring-inset', scoreBg(value))}>
      {value != null ? `${value}%` : '—'}
    </span>
  );
}

type SortKey = 'readiness' | 'communication' | 'confidence' | 'interviews';

/** Searchable, sortable per-student breakdown. */
function StudentTable({ rows }: { rows: TpoInterviewStudentRow[] }) {
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<SortKey>('readiness');
  const [selected, setSelected] = useState<{ id: string; name: string | null } | null>(null);

  const view = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const filtered = needle
      ? rows.filter((r) => (r.name ?? '').toLowerCase().includes(needle) || (r.branch ?? '').toLowerCase().includes(needle))
      : rows;
    return [...filtered].sort((a, b) => (b[sort] ?? -1) - (a[sort] ?? -1));
  }, [rows, q, sort]);

  const Th = ({ k, children }: { k: SortKey; children: React.ReactNode }) => (
    <th className="px-3 py-2 text-right">
      <button
        type="button"
        onClick={() => setSort(k)}
        className={cn('inline-flex items-center gap-1 font-semibold uppercase tracking-wide transition-colors hover:text-navy', sort === k ? 'text-navy' : 'text-slate-400')}
      >
        {children}
      </button>
    </th>
  );

  return (
    <div>
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
        <table className="w-full min-w-[42rem] text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[10px] text-slate-400">
              <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide">Student</th>
              <Th k="interviews">Interviews</Th>
              <Th k="readiness">Readiness</Th>
              <Th k="communication">Comm.</Th>
              <Th k="confidence">Confidence</Th>
              <th className="px-3 py-2 text-right font-semibold uppercase tracking-wide text-slate-400">Last</th>
            </tr>
          </thead>
          <tbody>
            {view.map((r) => (
              <tr
                key={r.id}
                onClick={() => setSelected({ id: r.id, name: r.name })}
                className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-sky-50/60"
                title="View interview history & transcripts"
              >
                <td className="px-3 py-2.5">
                  <p className="font-semibold text-navy underline-offset-2 hover:underline">
                    {r.name ?? 'Unnamed student'}
                  </p>
                  <p className="text-[11px] text-slate-500">{r.branch ?? 'Dept. unspecified'}</p>
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-slate-600">{r.interviews}</td>
                <td className="px-3 py-2.5 text-right"><ScorePill value={r.readiness} /></td>
                <td className="px-3 py-2.5 text-right"><ScorePill value={r.communication} /></td>
                <td className="px-3 py-2.5 text-right"><ScorePill value={r.confidence} /></td>
                <td className="px-3 py-2.5 text-right text-[11px] text-slate-500">
                  {r.lastAt ? new Date(r.lastAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
                </td>
              </tr>
            ))}
            {view.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-sm text-slate-500">No students match “{q}”.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {selected ? (
        <InterviewHistoryDrawer student={selected} onClose={() => setSelected(null)} />
      ) : null}
    </div>
  );
}

/** Right-side drawer: a student's mock-interview history (latest→oldest), each
 *  expandable to its Q→A transcript, scores, strengths and improvement areas. */
function InterviewHistoryDrawer({
  student,
  onClose,
}: {
  student: { id: string; name: string | null };
  onClose: () => void;
}) {
  const [data, setData] = useState<TpoStudentInterviews | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
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
    getTpoStudentInterviews(student.id)
      .then((d) => {
        if (!alive) return;
        setData(d);
        setOpenId(d.interviews[0]?.id ?? null);
      })
      .catch(() => alive && setError('Could not load this student’s interviews.'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [student.id]);

  if (!mounted) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end">
      <div aria-hidden onClick={onClose} className="absolute inset-0 bg-slate-900/40" />
      <div
        role="dialog"
        aria-modal="true"
        className="relative flex h-full w-full max-w-2xl flex-col bg-background shadow-lg"
      >
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              Interview history
            </p>
            <h3 className="text-base font-bold text-navy">{student.name ?? 'Student'}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-navy"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-400">
              <Loader2 className="size-6 animate-spin" />
            </div>
          ) : error ? (
            <p className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200">
              {error}
            </p>
          ) : !data || data.interviews.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-500">
              This student hasn’t taken any AI mock interviews yet.
            </p>
          ) : (
            data.interviews.map((iv) => (
              <InterviewCard
                key={iv.id}
                iv={iv}
                open={openId === iv.id}
                onToggle={() => setOpenId((cur) => (cur === iv.id ? null : iv.id))}
              />
            ))
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function InterviewCard({
  iv,
  open,
  onToggle,
}: {
  iv: TpoStudentInterviews['interviews'][number];
  open: boolean;
  onToggle: () => void;
}) {
  const when = iv.submittedAt ?? iv.createdAt;
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-navy">{iv.topic || 'Mock interview'}</p>
          <p className="text-[11px] text-slate-500">
            {new Date(when).toLocaleString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              timeZone: 'Asia/Kolkata',
            })}
            {' · '}
            {iv.interviewType} · {iv.difficulty}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <ScorePill value={iv.overallPercentage} />
          <ChevronDown className={cn('size-4 text-slate-400 transition-transform', open && 'rotate-180')} />
        </div>
      </button>
      {open ? (
        <div className="space-y-4 border-t border-slate-100 px-4 py-4">
          <div className="flex flex-wrap gap-4 text-xs">
            <Metric label="Overall" value={iv.overallPercentage} />
            <Metric label="Communication" value={iv.communicationScore} />
            <Metric label="Confidence" value={iv.confidenceScore} />
          </div>
          {iv.overallFeedback ? (
            <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">{iv.overallFeedback}</p>
          ) : null}
          {iv.strengths.length > 0 || iv.areasForImprovement.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {iv.strengths.length > 0 ? (
                <div>
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-emerald-600">Strengths</p>
                  <ul className="space-y-0.5 text-xs text-slate-600">
                    {iv.strengths.map((s, i) => <li key={i}>• {s}</li>)}
                  </ul>
                </div>
              ) : null}
              {iv.areasForImprovement.length > 0 ? (
                <div>
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-amber-600">To improve</p>
                  <ul className="space-y-0.5 text-xs text-slate-600">
                    {iv.areasForImprovement.map((s, i) => <li key={i}>• {s}</li>)}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Transcript</p>
            {iv.transcript.length === 0 ? (
              <p className="text-xs text-slate-500">No transcript recorded for this interview.</p>
            ) : (
              <ol className="space-y-3">
                {iv.transcript.map((t, i) => (
                  <li key={i} className="rounded-lg border border-slate-200 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold text-navy">Q{i + 1}. {t.question}</p>
                      {t.score != null ? <ScorePill value={t.score} /> : null}
                    </div>
                    <p className="mt-1.5 whitespace-pre-wrap text-sm text-slate-600">
                      {t.answer?.trim() ? t.answer : <span className="italic text-slate-400">No answer given.</span>}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | null }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="text-lg font-extrabold leading-none text-navy">{value != null ? `${value}%` : '—'}</p>
    </div>
  );
}

export default function InterviewAnalyticsPage() {
  const { cohortId, cohorts } = useTpoConsole();
  const [data, setData] = useState<TpoInterviewAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getTpoInterviewAnalytics(cohortId || undefined)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load interview analytics'))
      .finally(() => setLoading(false));
  }, [cohortId]);

  useEffect(() => {
    load();
  }, [load]);

  const cohortLabel = cohortId ? cohorts.find((c) => c.id === cohortId)?.name ?? 'Batch' : 'All batches';

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

  if (!data || data.totalInterviews === 0) {
    return (
      <div className="space-y-4">
        <ConsoleHero
          icon={MessageSquare}
          eyebrow="Placement Office"
          title="Interview Analytics"
          description="Campus interview readiness, communication, and confidence from AI mock interviews."
          actions={
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white/80 ring-1 ring-inset ring-white/15">
              {cohortLabel}
            </span>
          }
        />
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#fff5ea] text-[#f5b400]">
            <MessageSquare className="size-6" />
          </span>
          <h2 className="mt-4 text-lg font-extrabold text-navy">No mock interviews yet</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">
            Once students complete AI mock interviews, campus interview readiness, communication and
            confidence scores, per-student and department breakdowns, trends and the most common weak
            areas appear here.
          </p>
        </div>
      </div>
    );
  }

  // Resilient to an older API that predates these fields.
  const students = data.students ?? [];
  const byBranch = data.byBranch ?? [];
  const distribution = data.distribution ?? [];
  const trend = data.trend ?? [];

  return (
    <div className="space-y-6">
      <ConsoleHero
        icon={MessageSquare}
        eyebrow="Placement Office"
        title="Interview Analytics"
        description="Campus interview readiness, communication, and confidence from AI mock interviews."
        actions={
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white/80 ring-1 ring-inset ring-white/15">
            {cohortLabel} · {data.studentsAttempted} students · {data.totalInterviews} interviews
          </span>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ScoreTile icon={MessageSquare} label="Interview Readiness" value={data.interviewReadiness} source="Mock-interview overall %" />
        <ScoreTile icon={Mic} label="Communication" value={data.communicationScore} source="AI transcript scoring" />
        <ScoreTile icon={Smile} label="Confidence" value={data.confidenceScore} source="AI transcript scoring" />
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <span className="grid size-9 place-items-center rounded-xl bg-[#fff5ea] text-[#f5b400]">
            <Users className="size-5" />
          </span>
          <p className="mt-3 text-2xl font-black tabular-nums text-navy">{data.studentsAttempted}</p>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Students Practised</p>
          <p className="mt-2 text-[10px] text-slate-500">{data.totalInterviews} interviews graded</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <BentoCard
          title="Readiness Distribution"
          subtitle="How interview readiness is spread across students - spot the at-risk tail."
          source="Mock-interview overall %"
        >
          <DistributionChart data={distribution} />
        </BentoCard>
        <BentoCard
          title="Interview Activity Trend"
          subtitle="Interviews taken per day (hover for that day's average readiness)."
          source="Mock-interview timestamps"
        >
          <TrendChart data={trend} />
        </BentoCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <BentoCard
          title="Department Readiness"
          subtitle="Average interview readiness by branch - target the weakest first."
          source="Mock-interview overall %"
        >
          <BranchChart data={byBranch} />
        </BentoCard>
        <BentoCard
          title="Most Common Weaknesses"
          subtitle="Frequent areas for improvement across graded interviews."
          source="Mock-interview evaluations"
        >
          {data.commonWeaknesses.length === 0 ? (
            <p className="text-sm text-slate-500">Not enough graded interviews yet.</p>
          ) : (
            <div className="space-y-2.5">
              {data.commonWeaknesses.map((w) => {
                const max = data.commonWeaknesses[0].count || 1;
                return (
                  <div key={w.area} className="flex items-center gap-3">
                    <span className="w-52 shrink-0 truncate text-sm text-navy" title={w.area}>{w.area}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-gradient-to-r from-[#ffd24d] to-[#f5b400]" style={{ width: `${(w.count / max) * 100}%` }} />
                    </div>
                    <span className="w-8 text-right text-xs font-semibold tabular-nums text-slate-600">{w.count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </BentoCard>
      </div>

      <BentoCard
        title="Student Breakdown"
        subtitle="Every student who practised, with per-dimension scores. Search or sort to find who needs help."
        source="Mock-interview evaluations"
      >
        {students.length === 0 ? (
          <p className="text-sm text-slate-500">Per-student data appears once interviews are graded.</p>
        ) : (
          <StudentTable rows={students} />
        )}
      </BentoCard>

      {(data.communicationScore == null || data.confidenceScore == null) && (
        <div className="flex items-start gap-2 rounded-xl border border-[#ffc42d]/30 bg-[#fff5ea] p-4 text-xs text-slate-600">
          <Mic className="mt-0.5 size-4 shrink-0 text-[#f5b400]" />
          <p>
            Communication &amp; confidence scores are graded by AI from each interview transcript. They fill
            in for interviews completed after this scoring shipped - older interviews contribute only to
            interview readiness. <ProvenanceChip source="AI transcript scoring" className="ml-1 align-middle" />
          </p>
        </div>
      )}
    </div>
  );
}
