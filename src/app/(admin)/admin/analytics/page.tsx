'use client';

import { useEffect, useState } from 'react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { ConsoleHero } from '@/components/layout/ConsoleHero';
import { Activity, Building2, Code2, Loader2, MessageSquare, Sparkles, Users } from 'lucide-react';
import { getAdminStats, getAdminCompanyStats, type AdminPlatformStats, type AdminCompanyStat } from '@/lib/api/admin';
import { AreaChart, Donut, MiniStat, Panel, ProgressRow } from '@/components/superadmin/dashboard-ui';

/**
 * Platform Analytics (ADMIN). Distributions + trends over ADMIN-accessible stats.
 */
export default function AdminAnalyticsPage() {
  const [stats, setStats] = useState<AdminPlatformStats | null>(null);
  const [companies, setCompanies] = useState<AdminCompanyStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getAdminStats(), getAdminCompanyStats()])
      .then(([s, c]) => {
        setStats(s);
        setCompanies(c);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load analytics'))
      .finally(() => setLoading(false));
  }, []);

  const diff = stats?.questionsByDifficulty;
  const topCompanies = [...companies].sort((a, b) => b.registrations - a.registrations).slice(0, 10);
  const regMax = Math.max(1, ...topCompanies.map((c) => c.registrations));

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Platform Admin', href: '/admin/dashboard' }, { label: 'Platform Analytics' }]} />
      <ConsoleHero
        icon={Activity}
        eyebrow="Platform Admin"
        title="Platform Analytics"
        description="Distributions and trends across the platform - headline KPIs live on the dashboard."
      />

      {loading ? (
        <div className="flex items-center justify-center py-24"><Loader2 className="size-7 animate-spin text-slate-500" /></div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <MiniStat label="Active today (DAU)" value={stats?.dau ?? 0} icon={<Activity className="size-4" />} color="#f5b400" />
            <MiniStat label="Active students · 14d" value={stats?.activeStudents ?? 0} icon={<Users className="size-4" />} color="#f5b400" />
            <MiniStat label="Active colleges · 14d" value={stats?.activeColleges ?? 0} icon={<Building2 className="size-4" />} color="#7c3aed" />
            <MiniStat label="Assessments run" value={stats?.assessmentsConducted ?? 0} icon={<Sparkles className="size-4" />} color="#0891b2" />
            <MiniStat label="Coding solved" value={stats?.codingSolved ?? 0} icon={<Code2 className="size-4" />} color="#059669" />
            <MiniStat label="Interview sessions" value={stats?.interviewSessions ?? 0} icon={<MessageSquare className="size-4" />} color="#db2777" />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Panel title="Student signups (14 days)" className="lg:col-span-2">
              {stats?.signups && stats.signups.length > 0 ? (
                <AreaChart id="signups-admin-analytics" color="#f5b400" data={stats.signups} />
              ) : (
                <p className="text-sm text-slate-500">No signup data.</p>
              )}
            </Panel>
            <Panel title="Question bank by difficulty">
              {diff ? (
                <Donut
                  segments={[
                    { label: 'Easy', value: diff.easy, color: '#059669' },
                    { label: 'Medium', value: diff.medium, color: '#f59e0b' },
                    { label: 'Hard', value: diff.hard, color: '#dc2626' },
                  ]}
                  centerTop={(diff.easy + diff.medium + diff.hard).toLocaleString()}
                  centerBottom="Questions"
                />
              ) : (
                <p className="text-sm text-slate-500">No question data.</p>
              )}
            </Panel>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="Top companies by student registrations">
              {topCompanies.length === 0 ? (
                <p className="text-sm text-slate-500">No company activity yet.</p>
              ) : (
                <div className="space-y-3">
                  {topCompanies.map((c) => (
                    <ProgressRow key={c.id} label={c.name} value={c.registrations} total={regMax} color="#f5b400" hint={`${c.assessments} drives`} />
                  ))}
                </div>
              )}
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
}
