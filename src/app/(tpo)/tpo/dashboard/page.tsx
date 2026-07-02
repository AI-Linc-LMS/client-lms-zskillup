'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  ChevronDown,
  GraduationCap,
  Loader2,
  Mail,
  Search,
  ShieldCheck,
  TrendingUp,
  Upload,
  Users,
} from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { Button } from '@/components/ui/button';
import { getTpoAnalytics } from '@/lib/api/tpo';
import { listCohorts, type Cohort } from '@/lib/api/cohorts';
import type { ReadinessBand, TpoDashboard } from '@/shared';

const BAND_STYLE: Record<ReadinessBand, string> = {
  READY: 'bg-emerald-100 text-emerald-700',
  IN_TRAINING: 'bg-amber-100 text-amber-700',
  AT_RISK: 'bg-red-100 text-red-700',
};
const BAND_LABEL: Record<ReadinessBand, string> = {
  READY: 'Ready',
  IN_TRAINING: 'In training',
  AT_RISK: 'At risk',
};

export default function TpoDashboardPage() {
  const [data, setData] = useState<TpoDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [cohortId, setCohortId] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    listCohorts().then(setCohorts).catch(() => setCohorts([]));
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getTpoAnalytics(cohortId || undefined)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load analytics'))
      .finally(() => setLoading(false));
  }, [cohortId]);

  useEffect(() => {
    load();
  }, [load]);

  const roster = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    const rows = q
      ? data.students.filter(
          (s) => (s.name ?? '').toLowerCase().includes(q) || s.email.toLowerCase().includes(q),
        )
      : data.students;
    return [...rows].sort((a, b) => b.readiness - a.readiness);
  }, [data, query]);

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Placement Office' }]} />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Placement Office</p>
          <h1 className="mt-1 text-[28px] font-extrabold tracking-tight text-navy">Cohort readiness</h1>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
            <ShieldCheck className="size-3.5" /> Scoped to your college
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={cohortId}
              onChange={(e) => setCohortId(e.target.value)}
              className="w-48 appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-sm shadow-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
            >
              <option value="">All cohorts</option>
              {cohorts.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          </div>
          <Button asChild>
            <Link href="/tpo/invitations"><Mail className="size-4" /> Invite</Link>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24"><Loader2 className="size-7 animate-spin text-slate-400" /></div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</div>
      ) : !data || data.overview.totalStudents === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* Executive stats */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Stat icon={Users} label="Students" value={data.overview.totalStudents} tone="slate" />
            <Stat icon={Activity} label="Active (14d)" value={data.overview.activeStudents} tone="sky" />
            <Stat icon={GraduationCap} label="Placement-ready" value={data.overview.placementReady} tone="emerald" />
            <Stat icon={TrendingUp} label="Avg readiness" value={`${data.overview.avgReadiness}%`} tone="violet" />
            <Stat icon={AlertTriangle} label="At risk" value={data.overview.atRisk} tone="red" />
          </div>

          {/* Quadrants + skill gaps */}
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-bold text-navy">Participation × performance</h2>
              <p className="mt-0.5 text-xs text-slate-400">Where your students sit — target the top-left (engaged but under-performing).</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Quad label="High effort · High performance" value={data.quadrants.highPartHighPerf} tone="emerald" />
                <Quad label="High effort · Needs support" value={data.quadrants.highPartLowPerf} tone="amber" />
                <Quad label="Low effort · High performance" value={data.quadrants.lowPartHighPerf} tone="sky" />
                <Quad label="Low effort · Low performance" value={data.quadrants.lowPartLowPerf} tone="red" />
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-bold text-navy">Campus skill gaps</h2>
              <p className="mt-0.5 text-xs text-slate-400">Weakest aptitude topics by accuracy (min 10 attempts).</p>
              <div className="mt-4 space-y-2.5">
                {data.skillGaps.length === 0 ? (
                  <p className="text-sm text-slate-400">Not enough practice data yet.</p>
                ) : (
                  data.skillGaps.map((g) => (
                    <div key={g.slug} className="flex items-center gap-3">
                      <span className="w-40 shrink-0 truncate text-sm text-navy">{g.topic}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-red-500" style={{ width: `${g.accuracy}%` }} />
                      </div>
                      <span className="w-10 text-right text-xs font-semibold tabular-nums text-slate-500">{g.accuracy}%</span>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          {/* Company readiness */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-bold text-navy">Company readiness</h2>
            <p className="mt-0.5 text-xs text-slate-400">Average accuracy on each company&apos;s tagged questions across your students.</p>
            {data.companyReadiness.length === 0 ? (
              <p className="mt-3 text-sm text-slate-400">No company-tagged practice yet.</p>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {data.companyReadiness.map((c) => (
                  <div key={c.slug} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                    <div className="flex items-center justify-between">
                      <span className="truncate text-sm font-semibold text-navy">{c.name}</span>
                      <span className="text-sm font-bold tabular-nums text-navy">{c.readiness}%</span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
                      <div className="h-full rounded-full bg-navy" style={{ width: `${c.readiness}%` }} />
                    </div>
                    <p className="mt-1 text-[11px] text-slate-400">{c.attempted} attempts</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Roster */}
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
              <h2 className="text-sm font-bold text-navy">Students <span className="text-slate-400">({roster.length})</span></h2>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search name or email…"
                  className="w-64 rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm shadow-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                />
              </div>
            </div>
            <div className="max-h-[28rem] overflow-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="sticky top-0 border-b border-slate-100 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                  <tr>
                    <th className="px-4 py-2.5">Student</th>
                    <th className="px-4 py-2.5">Branch</th>
                    <th className="px-4 py-2.5">Readiness</th>
                    <th className="px-4 py-2.5">Participation</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5">Last active</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {roster.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5">
                        <p className="font-semibold text-navy">{s.name ?? '—'}</p>
                        <p className="text-xs text-slate-400">{s.email}</p>
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">{s.branch ?? '—'}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full rounded-full bg-navy" style={{ width: `${s.readiness}%` }} />
                          </div>
                          <span className="tabular-nums text-slate-600">{s.readiness}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 tabular-nums text-slate-500">{s.participation}</td>
                      <td className="px-4 py-2.5">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${BAND_STYLE[s.band]}`}>{BAND_LABEL[s.band]}</span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-400">
                        {s.lastActiveDate ? new Date(s.lastActiveDate).toLocaleDateString() : 'Never'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.truncated ? (
              <p className="border-t border-slate-100 px-4 py-2 text-[11px] text-slate-400">Showing the first 5,000 students.</p>
            ) : null}
          </section>
        </>
      )}
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Users;
  label: string;
  value: number | string;
  tone: 'slate' | 'sky' | 'emerald' | 'violet' | 'red';
}) {
  const tint: Record<string, string> = {
    slate: 'bg-slate-100 text-slate-600',
    sky: 'bg-sky-50 text-sky-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    violet: 'bg-violet-50 text-violet-600',
    red: 'bg-red-50 text-red-600',
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <span className={`grid size-9 place-items-center rounded-xl ${tint[tone]}`}>
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <p className="mt-3 text-2xl font-black tabular-nums text-navy">{value}</p>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  );
}

function Quad({ label, value, tone }: { label: string; value: number; tone: 'emerald' | 'amber' | 'sky' | 'red' }) {
  const tint: Record<string, string> = {
    emerald: 'border-emerald-200 bg-emerald-50/60',
    amber: 'border-amber-200 bg-amber-50/60',
    sky: 'border-sky-200 bg-sky-50/60',
    red: 'border-red-200 bg-red-50/60',
  };
  return (
    <div className={`rounded-xl border p-3 ${tint[tone]}`}>
      <p className="text-2xl font-black tabular-nums text-navy">{value}</p>
      <p className="mt-0.5 text-[11px] font-medium leading-tight text-slate-500">{label}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-orange/10 text-orange">
        <Upload className="size-6" aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-lg font-extrabold text-navy">Invite your cohort to get started</h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
        Once students join and start practising, cohort readiness, participation quadrants, company
        readiness, and skill gaps appear here automatically.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link href="/tpo/invitations"><Mail className="size-4" /> Invite students</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/tpo/cohorts"><Users className="size-4" /> Manage cohorts</Link>
        </Button>
      </div>
      <p className="mt-6 inline-flex items-center gap-1.5 text-xs text-slate-400">
        <BarChart3 className="size-3.5" /> Interview & communication analytics arrive once that module ships.
      </p>
    </section>
  );
}
