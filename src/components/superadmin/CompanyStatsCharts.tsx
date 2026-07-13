'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, CalendarClock, ClipboardList, Loader2, Users } from 'lucide-react';
import { getAdminCompanyStats, type AdminCompanyStat } from '@/lib/api/admin';

const BAR_GRAD = 'linear-gradient(90deg,#ffd24d,#f5b400)';

/**
 * Super-admin dashboard charts: per-company registrations + active drives, and
 * question-bank coverage — rendered as animated bars (no chart dependency).
 */
export function CompanyStatsCharts() {
  const [stats, setStats] = useState<AdminCompanyStat[] | null>(null);

  useEffect(() => {
    getAdminCompanyStats()
      .then(setStats)
      .catch(() => setStats([]));
  }, []);

  if (stats === null) {
    return (
      <div className="grid h-56 place-items-center rounded-2xl border border-slate-200 bg-white">
        <Loader2 className="size-6 animate-spin text-slate-500" />
      </div>
    );
  }
  if (stats.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-600">
        No company data yet.
      </div>
    );
  }

  const totalReg = stats.reduce((s, c) => s + c.registrations, 0);
  const totalDrives = stats.reduce((s, c) => s + c.assessments, 0);
  const maxReg = Math.max(1, ...stats.map((c) => c.registrations));
  const maxBank = Math.max(1, ...stats.map((c) => c.questionCount + c.codingCount));
  const byReg = [...stats].sort((a, b) => b.registrations - a.registrations);

  return (
    <section className="space-y-5">
      {/* KPI tiles */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Kpi icon={Building2} label="Companies" value={stats.length} tone="text-navy" />
        <Kpi icon={Users} label="Registrations" value={totalReg} tone="text-[#1a1d29]" />
        <Kpi icon={CalendarClock} label="Active drives" value={totalDrives} tone="text-violet-600" />
        <Kpi
          icon={ClipboardList}
          label="Bank questions"
          value={stats.reduce((s, c) => s + c.questionCount, 0)}
          tone="text-emerald-600"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Registrations per company */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="flex items-center gap-2 text-sm font-bold text-navy">
            <Users className="size-4 text-[#1a1d29]" /> Registrations by company
          </h3>
          <div className="mt-4 space-y-3">
            {byReg.map((c, i) => (
              <div key={c.id}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-semibold text-navy">{c.name}</span>
                  <span className="font-bold tabular-nums text-slate-600">
                    {c.registrations}
                    {c.assessments > 0 ? (
                      <span className="ml-2 font-medium text-violet-500">· {c.assessments} drive{c.assessments === 1 ? '' : 's'}</span>
                    ) : null}
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: BAR_GRAD }}
                    initial={{ width: 0 }}
                    animate={{ width: `${(c.registrations / maxReg) * 100}%` }}
                    transition={{ duration: 0.7, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Question-bank coverage per company */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="flex items-center gap-2 text-sm font-bold text-navy">
            <ClipboardList className="size-4 text-emerald-500" /> Question-bank coverage
          </h3>
          <p className="mt-1 text-[11px] text-slate-500">
            Practice questions <span className="text-emerald-600">▮</span> + coding{' '}
            <span className="text-indigo-500">▮</span> per company.
          </p>
          <div className="mt-4 space-y-3">
            {stats.map((c, i) => {
              const total = c.questionCount + c.codingCount;
              return (
                <div key={c.id}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-semibold text-navy">{c.name}</span>
                    <span className="font-bold tabular-nums text-slate-600">
                      {c.questionCount.toLocaleString()} · {c.codingCount}
                    </span>
                  </div>
                  <div className="flex h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <motion.div
                      className="h-full bg-emerald-400"
                      initial={{ width: 0 }}
                      animate={{ width: `${(c.questionCount / maxBank) * 100}%` }}
                      transition={{ duration: 0.7, delay: i * 0.05 }}
                    />
                    <motion.div
                      className="h-full bg-indigo-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${(c.codingCount / maxBank) * 100}%` }}
                      transition={{ duration: 0.7, delay: i * 0.05 + 0.1 }}
                    />
                  </div>
                  {total === 0 ? <span className="text-[10px] text-slate-400">no bank yet</span> : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5">
      <Icon className={`size-4 ${tone}`} />
      <p className={`mt-2 text-2xl font-black tabular-nums ${tone}`}>{value.toLocaleString()}</p>
      <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
    </div>
  );
}
