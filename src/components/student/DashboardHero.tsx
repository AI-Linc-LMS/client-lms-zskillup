'use client';

import { useEffect, useState } from 'react';
import { Flame } from 'lucide-react';
import { ProgressBar } from '@/components/ui/progress-bar';
import { DEMO_STUDENT } from '@/lib/demo-data';
import { getMe, type ApiMe } from '@/lib/api/me';

/**
 * Dashboard hero. Sprint 3 wires the IDENTITY half (name, college, branch,
 * passout year) to the live `GET /me` endpoint. The GAMIFICATION half (level,
 * XP, coins, streak, rank) remains demo data until Sprint 5 builds the XP
 * ledger / student_stats cache — those values can't be invented without
 * either lying to the user or breaking the spec.
 */
export function DashboardHero() {
  const [me, setMe] = useState<ApiMe | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMe()
      .then((data) => {
        if (!cancelled) setMe(data);
      })
      .catch(() => {
        // Preview / unauthenticated → render with demo identity below
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Identity (from API when available)
  const firstName =
    (me?.fullName ? me.fullName.split(' ')[0] : null) ??
    (me?.email ? me.email.split('@')[0] : null) ??
    DEMO_STUDENT.firstName;

  const identity =
    me?.studentProfile?.collegeName && me.studentProfile.passoutYear
      ? `${me.studentProfile.collegeName} · ${me.studentProfile.branch ?? 'CSE'} ${me.studentProfile.passoutYear}`
      : DEMO_STUDENT.identity;

  // Gamification (still demo — Sprint 5)
  const s = DEMO_STUDENT;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      {/* Top row: identity left / stat chips right */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            {me?.role === 'COLLEGE_ADMIN'
              ? 'TPO Workspace'
              : me?.role === 'SUPER_ADMIN'
                ? 'Super Admin Workspace'
                : 'Student Workspace'}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2.5">
            <h1 className="text-[28px] font-extrabold leading-tight tracking-tight text-navy">
              Welcome back, {firstName}
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
              ✦ {s.status}
            </span>
          </div>
          <p className="mt-1.5 flex items-center gap-1.5 text-[13px] text-slate-500">
            <span>🎓</span>
            <span>{identity}</span>
          </p>
        </div>

        {/* Stat chips */}
        <div className="flex flex-col items-end gap-1.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-orange px-3 py-1 text-[11px] font-bold text-white shadow-sm">
            <Flame className="size-3.5" aria-hidden="true" />
            {s.streakDays} DAY STREAK
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200">
            🪙 {s.coins.toLocaleString()} coins
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-[11px] font-semibold text-sky-700 ring-1 ring-sky-200">
            🏆 Rank #{s.rank}
          </span>
        </div>
      </div>

      {/* XP row */}
      <div className="mt-5 flex items-center gap-3.5">
        <div className="grid size-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-amber-400 to-orange text-[13px] font-extrabold text-white shadow-md">
          Lv {s.level}
        </div>
        <div className="flex-1">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-navy">
              XP · LEVEL {s.level} → {s.nextLevel}
            </span>
            <span className="text-[11px] text-slate-500">
              {s.currentXp.toLocaleString()} / {s.nextLevelXp.toLocaleString()}
            </span>
          </div>
          <ProgressBar value={(s.currentXp / s.nextLevelXp) * 100} variant="xp" />
        </div>
      </div>
    </section>
  );
}
