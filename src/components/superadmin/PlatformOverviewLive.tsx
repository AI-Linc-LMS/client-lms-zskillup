'use client';

import { useEffect, useState } from 'react';
import { formatDateIN } from '@/lib/format';
import {
  BarChart2,
  Building2,
  ClipboardList,
  Loader2,
  Timer,
  Users,
} from 'lucide-react';
import { StatusPill } from '@/components/student/StatusPill';
import { apiClient } from '@/lib/api/client';
import {
  getAdminStats,
  listAdminColleges,
  type AdminCollegeRow,
  type AdminPlatformStats,
} from '@/lib/api/admin';

/**
 * Super-admin platform overview — fully live: counts from `GET /admin/stats`,
 * the college register from `GET /admin/colleges`, and service health from
 * the real `GET /ready` probe. Audit logging joins in Sprint 8.
 */
export function PlatformOverviewLive() {
  const [stats, setStats] = useState<AdminPlatformStats | null>(null);
  const [colleges, setColleges] = useState<AdminCollegeRow[] | null>(null);
  const [ready, setReady] = useState<{ database: string; migrations: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getAdminStats()
      .then((s) => !cancelled && setStats(s))
      .catch((err: Error) => !cancelled && setError(err.message || 'Could not load platform stats.'));
    listAdminColleges()
      .then((rows) => !cancelled && setColleges(rows))
      .catch(() => !cancelled && setColleges([]));
    apiClient
      .get<{ ready: boolean; checks: { database: string; migrations: string } }>('/ready', {
        auth: 'public',
      })
      .then((res) => !cancelled && setReady(res.data.checks))
      .catch(() => !cancelled && setReady(null));
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white p-16 shadow-sm">
        <Loader2 className="size-5 animate-spin text-slate-400" aria-hidden="true" />
      </div>
    );
  }

  const kpis = [
    { label: 'Colleges', value: stats.colleges, icon: Building2, sub: 'Institutions registered' },
    { label: 'Students', value: stats.students, icon: Users, sub: 'Accounts on the platform' },
    {
      label: 'Published questions',
      value: stats.questionsPublished,
      icon: ClipboardList,
      sub: `${stats.questionsTotal} in the bank`,
    },
    {
      label: 'Mock attempts',
      value: stats.mockAttempts,
      icon: Timer,
      sub: `across ${stats.mockTests} live mocks`,
    },
  ];

  const coverage = [
    { label: 'Recruiter companies', value: stats.companies },
    { label: 'Prep courses', value: stats.courses },
    { label: 'Practice attempts', value: stats.practiceAttempts },
    { label: 'Live mock tests', value: stats.mockTests },
  ];

  return (
    <div className="space-y-8">
      {/* KPI Row — live counts */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map(({ label, value, icon: Icon, sub }) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                {label}
              </p>
              <Icon className="size-4 text-slate-400" aria-hidden="true" />
            </div>
            <p className="text-[26px] font-extrabold leading-none text-navy">
              {value.toLocaleString()}
            </p>
            <p className="mt-1.5 text-xs text-slate-400">{sub}</p>
          </div>
        ))}
      </div>

      {/* College register — live */}
      <section>
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          College Register
        </p>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {['College Name', 'State', 'City', 'Registered', 'Status'].map((col) => (
                  <th
                    key={col}
                    className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-slate-400"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {colleges === null ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-400">
                    Loading…
                  </td>
                </tr>
              ) : colleges.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-400">
                    No colleges registered yet.
                  </td>
                </tr>
              ) : (
                colleges.slice(0, 6).map((college, i) => (
                  <tr
                    key={college.id}
                    className={`border-b border-slate-100 last:border-0 ${i % 2 === 0 ? '' : 'bg-slate-50/40'}`}
                  >
                    <td className="px-4 py-3 font-medium text-navy">{college.name}</td>
                    <td className="px-4 py-3 text-slate-600">{college.state}</td>
                    <td className="px-4 py-3 text-slate-600">{college.city}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {formatDateIN(college.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      {college.status === 'ACTIVE' ? (
                        <StatusPill tone="positive" label="Active" />
                      ) : (
                        <StatusPill tone="neutral" label="Suspended" />
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Content coverage + Platform health */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Content Coverage
          </p>
          <div className="grid grid-cols-2 gap-4">
            {coverage.map(({ label, value }) => (
              <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                  <BarChart2 className="size-3.5" aria-hidden="true" />
                  {label}
                </p>
                <p className="mt-2 text-xl font-extrabold leading-none text-navy">
                  {value.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Platform Health
          </p>
          <div className="grid grid-cols-1 gap-4">
            {[
              {
                label: 'API',
                detail: ready ? 'Healthy' : 'Unreachable',
                ok: !!ready,
              },
              {
                label: 'Database',
                detail: ready ? (ready.database === 'ok' ? 'Connected' : ready.database) : 'Unknown',
                ok: ready?.database === 'ok',
              },
              {
                label: 'Migrations',
                detail: ready ? ready.migrations : 'Unknown',
                ok: ready?.migrations === 'applied',
              },
            ].map(({ label, detail, ok }) => (
              <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`size-2.5 shrink-0 rounded-full ${ok ? 'bg-emerald-500' : 'bg-amber-500'}`}
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-sm font-semibold text-navy">{label}</p>
                    <p className="text-xs capitalize text-slate-400">{detail}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
