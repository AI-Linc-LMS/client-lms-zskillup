'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  ClipboardCheck,
  GraduationCap,
  Loader2,
  Plus,
  TrendingUp,
  Upload,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getTpoAnalytics } from '@/lib/api/tpo';
import type { TpoDashboard } from '@/shared';
import { useTpoConsole } from '@/components/tpo/TpoConsole';
import { ParticipationScatter } from '@/components/charts/ParticipationScatter';
import { ReadinessDonut } from '@/components/charts/ReadinessDonut';
import { CompanyHeatmap } from '@/components/charts/CompanyHeatmap';
import { SkillGapBars } from '@/components/charts/SkillGapBars';
import {
  BentoCard,
  KpiCard,
  ProvenanceChip,
  ReadinessBadge,
} from '@/components/tpo/ui';

/** 4-band readiness distribution for the Overall Placement Readiness donut. */
const READINESS_BANDS = [
  { key: 'ready', label: 'Ready (70+)', color: '#059669', test: (r: number) => r >= 70 },
  { key: 'near', label: 'Near ready (55–69)', color: '#0284c7', test: (r: number) => r >= 55 && r < 70 },
  { key: 'developing', label: 'Developing (40–54)', color: '#f59e0b', test: (r: number) => r >= 40 && r < 55 },
  { key: 'atrisk', label: 'At risk (<40)', color: '#dc2626', test: (r: number) => r < 40 },
] as const;

export default function TpoExecutiveDashboard() {
  const { cohortId, cohorts } = useTpoConsole();
  const [data, setData] = useState<TpoDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const topStudents = useMemo(
    () => (data ? [...data.students].sort((a, b) => b.readiness - a.readiness).slice(0, 6) : []),
    [data],
  );

  const donutSegments = useMemo(() => {
    const students = data?.students ?? [];
    return READINESS_BANDS.map((b) => ({
      label: b.label,
      color: b.color,
      value: students.filter((s) => b.test(s.readiness)).length,
    }));
  }, [data]);

  const cohortLabel = cohortId ? cohorts.find((c) => c.id === cohortId)?.name ?? 'Batch' : 'All batches';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-7 animate-spin text-slate-400" />
      </div>
    );
  }
  if (error) {
    return <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</div>;
  }
  if (!data || data.overview.totalStudents === 0) {
    return <EmptyState />;
  }

  const o = data.overview;

  return (
    <div className="space-y-6">
      {/* Contextual header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-500">
          Campus overview · <span className="text-navy">{cohortLabel}</span>
        </p>
        <Button asChild size="sm" variant="outline">
          <Link href="/tpo/students">
            <Users className="size-4" /> View students
          </Link>
        </Button>
      </div>

      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard icon={Users} label="Total Students" value={o.totalStudents} tone="slate" source="Registrations" />
        <KpiCard icon={Activity} label="Active Students" value={o.activeStudents} tone="sky" source="Login activity (14d)" />
        <KpiCard icon={GraduationCap} label="Placement Ready" value={o.placementReady} tone="emerald" source="Readiness ≥ 70" />
        <KpiCard icon={TrendingUp} label="Avg Readiness" value={`${o.avgReadiness}%`} tone="violet" source="Aptitude + Coding + Mock" />
        <KpiCard icon={AlertTriangle} label="At-Risk" value={o.atRisk} tone="red" source="Readiness < 40%" />
      </div>

      {/* Bento row A: Participation×performance + Student snapshot */}
      <div className="grid gap-5 lg:grid-cols-3">
        <BentoCard
          n={1}
          title="Performance & Participation Map"
          subtitle="Each dot is a student — target the high-effort, under-performing quadrant."
          source="Assessment scores + platform activity"
        >
          <ParticipationScatter students={data.students} />
        </BentoCard>

        <BentoCard
          n={2}
          title="Student Management Snapshot"
          subtitle="Top students by readiness."
          source="Student profiles + activity"
          className="lg:col-span-2"
          action={
            <Link
              href="/tpo/students"
              className="inline-flex items-center gap-1 text-xs font-bold text-[#1a1d29] hover:underline"
            >
              View all <ArrowRight className="size-3.5" />
            </Link>
          }
        >
          <div className="-mx-1 overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                <tr>
                  <th className="px-1 pb-2">Student</th>
                  <th className="px-1 pb-2">Branch</th>
                  <th className="px-1 pb-2">Readiness</th>
                  <th className="px-1 pb-2">Status</th>
                  <th className="px-1 pb-2">Last active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topStudents.map((s) => (
                  <tr key={s.id}>
                    <td className="px-1 py-2">
                      <p className="font-semibold text-navy">{s.name ?? '—'}</p>
                      <p className="truncate text-xs text-slate-400">{s.email}</p>
                    </td>
                    <td className="px-1 py-2 text-slate-600">{s.branch ?? '—'}</td>
                    <td className="px-1 py-2">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-14 overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-navy" style={{ width: `${s.readiness}%` }} />
                        </div>
                        <span className="tabular-nums text-slate-600">{s.readiness}%</span>
                      </div>
                    </td>
                    <td className="px-1 py-2">
                      <ReadinessBadge band={s.band} />
                    </td>
                    <td className="px-1 py-2 text-xs text-slate-400">
                      {s.lastActiveDate ? new Date(s.lastActiveDate).toLocaleDateString('en-IN') : 'Never'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </BentoCard>
      </div>

      {/* Bento row B: Placement readiness donut + Company readiness */}
      <div className="grid gap-5 lg:grid-cols-3">
        <BentoCard
          n={3}
          title="Overall Placement Readiness"
          subtitle="Distribution across readiness bands."
          source="Readiness composite"
        >
          <div className="pt-1">
            <ReadinessDonut
              segments={donutSegments}
              centerValue={o.totalStudents.toLocaleString('en-IN')}
              centerLabel="Students"
            />
          </div>
        </BentoCard>

        <BentoCard
          n={4}
          title="Company Readiness Heatmap"
          subtitle="Students in each accuracy band, per company."
          source="Company-tagged practice"
          className="lg:col-span-2"
          action={
            <Link
              href="/tpo/company-readiness"
              className="inline-flex items-center gap-1 text-xs font-bold text-[#1a1d29] hover:underline"
            >
              Full view <ArrowRight className="size-3.5" />
            </Link>
          }
        >
          <CompanyHeatmap cohortId={cohortId || undefined} />
        </BentoCard>
      </div>

      {/* Bento row C: Skill gaps */}
      <BentoCard
        n={5}
        title="Skill Gaps"
        subtitle="Weakest topics across your campus — where to focus training."
        source="Topic-level practice accuracy"
        action={
          <Link
            href="/tpo/skill-gaps"
            className="inline-flex items-center gap-1 text-xs font-bold text-[#1a1d29] hover:underline"
          >
            All topics <ArrowRight className="size-3.5" />
          </Link>
        }
      >
        <SkillGapBars gaps={data.skillGaps} />
      </BentoCard>

      {/* Assessment Center strip (wired in the Assessment Center module) */}
      <BentoCard
        n={6}
        title="Assessment Center"
        subtitle="Create sectional or company drives, schedule them, and track attendance & results."
        action={
          <Button asChild size="sm">
            <Link href="/tpo/assessments">
              <Plus className="size-4" /> Create Assessment
            </Link>
          </Button>
        }
      >
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {['Total', 'Upcoming', 'Live', 'Completed', 'Students Assigned'].map((label) => (
            <div key={label} className="rounded-xl border border-dashed border-slate-200 bg-slate-50/40 p-3">
              <p className="text-2xl font-black tabular-nums text-slate-300">—</p>
              <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
          <ClipboardCheck className="size-3.5" /> Live counts appear once you create your first assessment.
        </p>
        <div className="mt-3">
          <ProvenanceChip source="Assessment records + participation" />
        </div>
      </BentoCard>
    </div>
  );
}

function EmptyState() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#fff5ea] text-[#f5b400]">
        <Upload className="size-6" aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-lg font-extrabold text-navy">Your cohort is being onboarded</h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
        Your Platform Admin adds your college&apos;s batches and students. Once they join and start
        practising, campus readiness, participation quadrants, company readiness and skill gaps
        populate this console automatically.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        <Button variant="outline" asChild>
          <Link href="/tpo/students">
            <Users className="size-4" /> View students
          </Link>
        </Button>
      </div>
      <p className="mt-6 inline-flex items-center gap-1.5 text-xs text-slate-400">
        <BarChart3 className="size-3.5" /> Interview, coding &amp; placement modules populate as students engage.
      </p>
    </section>
  );
}
