'use client';

import { useEffect, useState } from 'react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { Loader2 } from 'lucide-react';
import { getAdminStats, getAdminCompanyStats, type AdminPlatformStats, type AdminCompanyStat } from '@/lib/api/admin';
import { getFinancialsPayments } from '@/lib/api/financials';
import { formatPrice } from '@/lib/api/subscriptions';
import type { FinancialsPaymentsDto } from '@/shared/dto/financials.dto';
import { AreaChart, Donut, Panel, ProgressRow } from '@/components/superadmin/dashboard-ui';

export default function SuperadminAnalyticsPage() {
  const [stats, setStats] = useState<AdminPlatformStats | null>(null);
  const [companies, setCompanies] = useState<AdminCompanyStat[]>([]);
  const [fin, setFin] = useState<FinancialsPaymentsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getAdminStats(), getAdminCompanyStats(), getFinancialsPayments().catch(() => null)])
      .then(([s, c, f]) => {
        setStats(s);
        setCompanies(c);
        setFin(f);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load analytics'))
      .finally(() => setLoading(false));
  }, []);

  const diff = stats?.questionsByDifficulty;
  const topCompanies = [...companies].sort((a, b) => b.registrations - a.registrations).slice(0, 10);
  const regMax = Math.max(1, ...topCompanies.map((c) => c.registrations));
  const scopeMax = Math.max(1, ...(fin?.revenueByScope ?? []).map((s) => s.amountCents));

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Super Admin', href: '/superadmin/dashboard' }, { label: 'Platform Analytics' }]} />
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Insights</p>
        <h1 className="mt-1 text-[28px] font-extrabold tracking-tight text-navy">Platform Analytics</h1>
        <p className="mt-1 text-sm text-slate-600">Distributions and trends across the platform - headline KPIs live on the dashboard.</p>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-24"><Loader2 className="size-7 animate-spin text-slate-500" /></div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <Panel title="Student signups (14 days)" className="lg:col-span-2">
              {stats?.signups && stats.signups.length > 0 ? (
                <AreaChart id="signups-analytics" color="#f5b400" data={stats.signups} />
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
                    <ProgressRow
                      key={c.id}
                      label={c.name}
                      value={c.registrations}
                      total={regMax}
                      color="#f5b400"
                      hint={`${c.assessments} drives`}
                    />
                  ))}
                </div>
              )}
            </Panel>

            <Panel title="Revenue by product (B2C)">
              {!fin ? (
                <p className="text-sm text-slate-500">Revenue analytics require the financials capability.</p>
              ) : fin.revenueByScope.length === 0 ? (
                <p className="text-sm text-slate-500">No captured B2C revenue yet.</p>
              ) : (
                <div className="space-y-3">
                  {fin.revenueByScope.map((s) => (
                    <ProgressRow
                      key={s.scope}
                      label={`${s.scope} (${s.count})`}
                      value={s.amountCents}
                      total={scopeMax}
                      color="#059669"
                      hint={formatPrice(s.amountCents, fin.currency)}
                    />
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
