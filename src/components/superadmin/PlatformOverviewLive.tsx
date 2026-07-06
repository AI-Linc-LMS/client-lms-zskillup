'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  BookOpen,
  Brain,
  Briefcase,
  Building2,
  CheckCircle2,
  ClipboardList,
  Database,
  Layers,
  RefreshCw,
  Server,
  ShieldCheck,
  Timer,
  TrendingUp,
  Users,
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import {
  getAdminStats,
  type AdminPlatformStats,
} from '@/lib/api/admin';
import { AreaChart, Donut, MiniStat, Panel, ProgressRow, StatCard } from './dashboard-ui';

type Ready = { database: string; migrations: string } | null;

export function PlatformOverviewLive() {
  const [stats, setStats] = useState<AdminPlatformStats | null>(null);
  const [ready, setReady] = useState<Ready>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    const results = await Promise.allSettled([
      getAdminStats(),
      apiClient.get<{ ready: boolean; checks: { database: string; migrations: string } }>('/ready', {
        auth: 'public',
      }),
    ]);
    if (results[0].status === 'fulfilled') {
      setStats(results[0].value);
      setError(null);
    } else if (!stats) {
      setError('Could not load platform stats.');
    }
    setReady(results[1].status === 'fulfilled' ? results[1].value.data.checks : null);
    setRefreshing(false);
  }, [stats]);

  useEffect(() => {
    void load();
  }, []);

  if (error && !stats) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (!stats) return <DashboardSkeleton />;

  // Derived (with safe fallbacks for an older backend).
  const totalUsers = stats.totalUsers ?? stats.students;
  const admins = stats.admins ?? 0;
  const verified = stats.verifiedStudents ?? 0;
  const new7d = stats.newStudents7d ?? 0;
  const adaptive = stats.adaptiveSessions ?? 0;
  const inProgress = stats.mockAttemptsInProgress ?? 0;
  const diff = stats.questionsByDifficulty;
  const signups = stats.signups ?? [];

  const kpis = [
    {
      label: 'Total users',
      value: totalUsers,
      icon: <Users className="size-4" />,
      accent: '#2563eb',
      sub: `${admins.toLocaleString()} admins · ${stats.students.toLocaleString()} students`,
      trend: new7d ? { value: new7d, label: '7d' } : undefined,
    },
    {
      label: 'Verified students',
      value: verified,
      icon: <CheckCircle2 className="size-4" />,
      accent: '#059669',
      sub:
        stats.students > 0
          ? `${Math.round((verified / stats.students) * 100)}% of students verified`
          : 'No students yet',
    },
    {
      label: 'Mock attempts',
      value: stats.mockAttempts,
      icon: <Timer className="size-4" />,
      accent: '#f37021',
      sub: `${inProgress.toLocaleString()} in progress · ${stats.mockTests} live`,
    },
    {
      label: 'Questions live',
      value: stats.questionsPublished,
      icon: <ClipboardList className="size-4" />,
      accent: '#7c3aed',
      sub: `${stats.questionsTotal.toLocaleString()} in the bank`,
    },
    {
      label: 'Adaptive sessions',
      value: adaptive,
      icon: <Brain className="size-4" />,
      accent: '#0ea5e9',
      sub: `${stats.practiceAttempts.toLocaleString()} practice attempts`,
    },
  ];

  const coverage = [
    { label: 'DAU (today)', value: stats.dau ?? 0, icon: <Timer className="size-4" />, color: '#059669' },
    {
      label: `Active students (14d)`,
      value: stats.activeStudents ?? 0,
      icon: <Layers className="size-4" />,
      color: '#2563eb',
    },
    {
      label: 'Active colleges (14d)',
      value: stats.activeColleges ?? 0,
      icon: <Building2 className="size-4" />,
      color: '#f37021',
    },
    { label: 'Assessments run', value: stats.assessmentsConducted ?? 0, icon: <ClipboardList className="size-4" />, color: '#7c3aed' },
    { label: 'Colleges', value: stats.colleges, icon: <Building2 className="size-4" />, color: '#2563eb' },
    { label: 'Companies', value: stats.companies, icon: <Briefcase className="size-4" />, color: '#f37021' },
    { label: 'Courses', value: stats.courses, icon: <BookOpen className="size-4" />, color: '#7c3aed' },
    { label: 'Live mocks', value: stats.mockTests, icon: <Timer className="size-4" />, color: '#059669' },
    { label: 'Practice', value: stats.practiceAttempts, icon: <Layers className="size-4" />, color: '#0ea5e9' },
    { label: 'Adaptive', value: adaptive, icon: <Brain className="size-4" />, color: '#db2777' },
  ];

  const health = [
    { label: 'API', detail: ready ? 'Healthy' : 'Unreachable', ok: !!ready, icon: <Server className="size-4" /> },
    {
      label: 'Database',
      detail: ready ? (ready.database === 'ok' ? 'Connected' : ready.database) : 'Unknown',
      ok: ready?.database === 'ok',
      icon: <Database className="size-4" />,
    },
    {
      label: 'Migrations',
      detail: ready ? ready.migrations : 'Unknown',
      ok: ready?.migrations === 'applied',
      icon: <ShieldCheck className="size-4" />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Refresh control */}
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-xs text-slate-400">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
          </span>
          Live data
        </p>
        <button
          onClick={() => void load()}
          disabled={refreshing}
          className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 shadow-sm transition-colors hover:bg-slate-50 hover:text-navy disabled:opacity-60"
        >
          <RefreshCw className={`size-3.5 ${refreshing ? 'animate-spin' : ''}`} aria-hidden />
          Refresh
        </button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {kpis.map((k) => (
          <StatCard key={k.label} {...k} />
        ))}
      </div>

      {/* Trend + composition */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Panel
          title="Student signups · last 14 days"
          className="lg:col-span-2"
          action={
            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
              <TrendingUp className="size-3.5" /> +{new7d} this week
            </span>
          }
        >
          {signups.length > 0 ? (
            <AreaChart id="signups" data={signups} color="#2563eb" height={210} />
          ) : (
            <EmptyChart label="Signup trend will appear once the enriched stats API is deployed." />
          )}
        </Panel>

        <Panel title="User composition">
          <Donut
            size={150}
            segments={[
              { label: 'Students', value: stats.students, color: '#2563eb' },
              { label: 'Admins', value: admins, color: '#f37021' },
            ]}
            centerTop={totalUsers.toLocaleString()}
            centerBottom="users"
          />
          <div className="mt-5 space-y-3 border-t border-slate-100 pt-4">
            <ProgressRow
              label="Email verified"
              value={verified}
              total={stats.students}
              color="#059669"
              hint={stats.students > 0 ? `(${Math.round((verified / stats.students) * 100)}%)` : ''}
            />
          </div>
        </Panel>
      </div>

      {/* Question bank + coverage + health */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="Question bank">
          {diff ? (
            <Donut
              size={150}
              segments={[
                { label: 'Easy', value: diff.easy, color: '#059669' },
                { label: 'Medium', value: diff.medium, color: '#f59e0b' },
                { label: 'Hard', value: diff.hard, color: '#ef4444' },
              ]}
              centerTop={stats.questionsTotal.toLocaleString()}
              centerBottom="questions"
            />
          ) : (
            <div className="flex items-center gap-4">
              <p className="text-3xl font-extrabold text-navy">{stats.questionsTotal.toLocaleString()}</p>
              <p className="text-xs text-slate-400">total questions</p>
            </div>
          )}
          <div className="mt-5 border-t border-slate-100 pt-4">
            <ProgressRow
              label="Published"
              value={stats.questionsPublished}
              total={stats.questionsTotal}
              color="#7c3aed"
            />
          </div>
        </Panel>

        <Panel title="Content coverage">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {coverage.map((c) => (
              <MiniStat key={c.label} {...c} />
            ))}
          </div>
        </Panel>

        <Panel
          title="Platform health"
          action={
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                health.every((h) => h.ok)
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'bg-amber-50 text-amber-600'
              }`}
            >
              {health.every((h) => h.ok) ? 'All systems go' : 'Degraded'}
            </span>
          }
        >
          <div className="space-y-3">
            {health.map((h) => (
              <div
                key={h.label}
                className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-slate-50/50 p-3"
              >
                <span
                  className={`flex size-9 items-center justify-center rounded-lg ${
                    h.ok ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                  }`}
                >
                  {h.icon}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-navy">{h.label}</p>
                  <p className="text-xs capitalize text-slate-400">{h.detail}</p>
                </div>
                <span className={`size-2.5 rounded-full ${h.ok ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              </div>
            ))}
          </div>
        </Panel>
      </div>

    </div>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-[210px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 text-center">
      <TrendingUp className="size-6 text-slate-300" />
      <p className="max-w-xs text-xs text-slate-400">{label}</p>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-white" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="h-72 animate-pulse rounded-2xl border border-slate-200 bg-white lg:col-span-2" />
        <div className="h-72 animate-pulse rounded-2xl border border-slate-200 bg-white" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-56 animate-pulse rounded-2xl border border-slate-200 bg-white" />
        ))}
      </div>
    </div>
  );
}
