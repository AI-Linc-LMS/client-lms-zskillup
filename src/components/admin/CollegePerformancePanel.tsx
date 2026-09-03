'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Loader2, Mail, TrendingUp, Users } from 'lucide-react';
import {
  emailCollegeReport,
  getAdminCollegeAnalytics,
  getAdminCollegeCohorts,
  getAdminCollegeParticipation,
} from '@/lib/api/admin-college-analytics';
import { describeError } from '@/lib/api/errors';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/ui/progress-bar';
import { StatusPill, type StatusTone } from '@/components/student/StatusPill';
import type {
  CohortDto,
  ReadinessBand,
  TpoDashboard,
  TpoParticipation,
  TpoStudentRow,
} from '@/shared';
import { cn } from '@/lib/utils';

const BAND: Record<ReadinessBand, { tone: StatusTone; label: string }> = {
  READY: { tone: 'positive', label: 'Ready' },
  IN_TRAINING: { tone: 'warning', label: 'In training' },
  AT_RISK: { tone: 'negative', label: 'At risk' },
};

/**
 * The rich TPO performance & participation dashboard for a college, rendered for an
 * ADMIN / SUPER_ADMIN (TPO Panel View). Reuses the server's college-scoped analytics;
 * adds a cohort filter and the one-click "email the report to the college".
 * `studentHrefBase` keeps the roster link inside the caller's console.
 */
export function CollegePerformancePanel({
  collegeId,
  studentHrefBase = '/admin/students',
}: {
  collegeId: string;
  studentHrefBase?: string;
}) {
  const [cohorts, setCohorts] = useState<CohortDto[]>([]);
  const [cohortId, setCohortId] = useState<string>('');
  const [data, setData] = useState<TpoDashboard | null>(null);
  const [participation, setParticipation] = useState<TpoParticipation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    void getAdminCollegeCohorts(collegeId)
      .then(setCohorts)
      .catch(() => setCohorts([]));
  }, [collegeId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [d, p] = await Promise.all([
        getAdminCollegeAnalytics(collegeId, cohortId || undefined),
        getAdminCollegeParticipation(collegeId, cohortId || undefined),
      ]);
      setData(d);
      setParticipation(p);
    } catch (err) {
      setError(describeError(err, 'Failed to load performance analytics.'));
    } finally {
      setLoading(false);
    }
  }, [collegeId, cohortId]);

  useEffect(() => {
    void load();
  }, [load]);

  const sendReport = async () => {
    setSending(true);
    try {
      const res = await emailCollegeReport(collegeId, { cohortId: cohortId || undefined });
      toast.success(
        res.sent > 0
          ? `Report emailed to ${res.sent} recipient${res.sent === 1 ? '' : 's'} (${res.recipients.join(', ')}).`
          : `No email was delivered — the transport is unavailable. Recipients: ${res.recipients.join(', ')}.`,
      );
    } catch (err) {
      toast.error(describeError(err, 'Could not send the report.'));
    } finally {
      setSending(false);
    }
  };

  const o = data?.overview;

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid size-11 place-items-center rounded-xl bg-sky-50 text-sky-600 ring-1 ring-sky-100">
            <TrendingUp className="size-5" />
          </span>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              TPO Panel View
            </p>
            <h2 className="text-lg font-bold text-navy">Performance &amp; Participation</h2>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={cohortId}
            onChange={(e) => setCohortId(e.target.value)}
            aria-label="Filter by cohort"
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy focus:border-orange focus:outline-none focus:ring-2 focus:ring-orange/30"
          >
            <option value="">All cohorts</option>
            {cohorts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <Button
            variant="secondary"
            onClick={() => void sendReport()}
            disabled={sending || loading}
          >
            {sending ? <Loader2 className="animate-spin" /> : <Mail />}
            Email report to college
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white py-16">
          <Loader2 className="size-6 animate-spin text-slate-500" />
        </div>
      ) : error || !data || !o ? (
        <div className="rounded-xl border border-slate-200 bg-white py-16 text-center text-sm text-slate-500">
          {error ?? 'No analytics available.'}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <Kpi label="Students" value={o.totalStudents} />
            <Kpi label="Active (14d)" value={o.activeStudents} />
            <Kpi label="Placement-ready" value={o.placementReady} tone="emerald" />
            <Kpi label="Avg readiness" value={`${o.avgReadiness}`} suffix="/100" />
            <Kpi label="At risk" value={o.atRisk} tone={o.atRisk > 0 ? 'red' : undefined} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Company readiness" empty={data.companyReadiness.length === 0} emptyText="No company practice yet.">
              <ul className="space-y-2.5">
                {data.companyReadiness.slice(0, 8).map((c) => (
                  <li key={c.slug} className="flex items-center gap-3 text-sm">
                    <span className="w-32 shrink-0 truncate font-medium text-navy">{c.name}</span>
                    <ProgressBar
                      value={c.readiness}
                      className="h-1.5 flex-1"
                      barClassName="bg-sky-500"
                      label={`${c.name} readiness`}
                    />
                    <span className="w-9 text-right tabular-nums text-slate-600">{c.readiness}</span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card title="Weakest topics (skill gaps)" empty={data.skillGaps.length === 0} emptyText="Not enough practice data yet.">
              <ul className="space-y-2.5">
                {data.skillGaps.slice(0, 8).map((s) => (
                  <li key={s.slug} className="flex items-center gap-3 text-sm">
                    <span className="w-40 shrink-0 truncate font-medium text-navy">{s.topic}</span>
                    <ProgressBar
                      value={s.accuracy}
                      className="h-1.5 flex-1"
                      barClassName="bg-orange"
                      label={`${s.topic} accuracy`}
                    />
                    <span className="w-9 text-right tabular-nums text-slate-600">{s.accuracy}%</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          {participation ? (
            <Card title="Engagement & participation">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                <Stat label="On a streak" value={participation.activeStreaks} />
                <Stat label="Avg XP" value={participation.avgXp} />
                <Stat label="Badges" value={participation.totalBadges} />
                <Stat label="Quests done" value={participation.questsCompleted} />
                <Stat label="Drive regs" value={participation.driveRegistrations} />
                <Stat label="Live sign-ups" value={participation.liveSessionSignups} />
              </div>
            </Card>
          ) : null}

          <RosterTable students={data.students} truncated={data.truncated} studentHrefBase={studentHrefBase} />
        </>
      )}
    </section>
  );
}

function RosterTable({
  students,
  truncated,
  studentHrefBase,
}: {
  students: TpoStudentRow[];
  truncated: boolean;
  studentHrefBase: string;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
        <Users className="size-4 text-slate-400" />
        <h3 className="text-sm font-bold text-navy">Student roster ({students.length})</h3>
        {truncated ? <span className="text-xs text-slate-400">· capped</span> : null}
      </div>
      {students.length === 0 ? (
        <div className="py-12 text-center text-sm text-slate-500">No students enrolled yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-500">
              <tr>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Branch</th>
                <th className="px-4 py-3 text-right">Readiness</th>
                <th className="px-4 py-3 text-right">Participation</th>
                <th className="px-4 py-3">Band</th>
                <th className="px-4 py-3">Last active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`${studentHrefBase}/${s.id}`} className="group">
                      <p className="font-semibold text-navy">{s.name ?? '—'}</p>
                      <p className="text-xs text-slate-500">{s.email}</p>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{s.branch ?? '—'}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-navy">{s.readiness}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-700">{s.participation}</td>
                  <td className="px-4 py-3">
                    <StatusPill tone={BAND[s.band].tone} label={BAND[s.band].label} />
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {s.lastActiveDate
                      ? new Date(s.lastActiveDate).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Kpi({
  label,
  value,
  suffix,
  tone,
}: {
  label: string;
  value: string | number;
  suffix?: string;
  tone?: 'emerald' | 'red';
}) {
  const color = tone === 'emerald' ? 'text-emerald-600' : tone === 'red' ? 'text-red-600' : 'text-navy';
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{label}</p>
      <p className={cn('mt-1 text-[26px] font-extrabold leading-none tabular-nums', color)}>
        {value}
        {suffix ? <span className="text-sm font-semibold text-slate-400">{suffix}</span> : null}
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 text-center">
      <p className="text-lg font-extrabold tabular-nums text-navy">{value}</p>
      <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
    </div>
  );
}

function Card({
  title,
  children,
  empty,
  emptyText,
}: {
  title: string;
  children: React.ReactNode;
  empty?: boolean;
  emptyText?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-3 text-sm font-bold text-navy">{title}</h3>
      {empty ? <p className="py-6 text-center text-sm text-slate-500">{emptyText}</p> : children}
    </div>
  );
}
