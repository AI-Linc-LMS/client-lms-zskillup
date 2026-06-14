'use client';

import { useEffect, useState } from 'react';
import { BadgeCheck, GraduationCap, Target, Timer, Trophy } from 'lucide-react';
import { ProgressBar } from '@/components/ui/progress-bar';
import { getMe, type ApiMe } from '@/lib/api/me';
import { getPracticeAccuracy, type ApiAccuracy } from '@/lib/api/practice';
import { getMockHistory, type ApiMockAttemptHistory } from '@/lib/api/mocks';
import { getMockStats } from '@/lib/mock-stats';

/**
 * Dashboard hero — every number on it is live (Sprint 0–4 data only):
 * identity from `GET /me`, practice stats from `GET /practice/accuracy`,
 * mock stats from `GET /mocks/attempts/mine`. The Sprint 5 gamification
 * chrome (XP, coins, streak) returns to these slots when the ledger ships;
 * until then the same premium layout carries real readiness signals instead
 * of invented ones.
 */
export function DashboardHero() {
  const [me, setMe] = useState<ApiMe | null>(null);
  const [accuracy, setAccuracy] = useState<ApiAccuracy | null>(null);
  const [history, setHistory] = useState<ApiMockAttemptHistory[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMe()
      .then((data) => !cancelled && setMe(data))
      .catch(() => {});
    getPracticeAccuracy()
      .then((data) => !cancelled && setAccuracy(data))
      .catch(() => {});
    getMockHistory()
      .then((data) => !cancelled && setHistory(data))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const firstName =
    (me?.fullName ? me.fullName.split(' ')[0] : null) ??
    (me?.email ? me.email.split('@')[0] : null) ??
    'there';

  const identity =
    me?.studentProfile?.collegeName && me.studentProfile.passoutYear
      ? `${me.studentProfile.collegeName} · ${me.studentProfile.branch ?? 'CSE'} ${me.studentProfile.passoutYear}`
      : (me?.email ?? 'Complete onboarding to link your college');

  const { bestPct, bestPercentile } = getMockStats(history ?? []);

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
            {me?.status === 'ACTIVE' ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                <BadgeCheck className="size-3.5" aria-hidden="true" /> Active
              </span>
            ) : null}
          </div>
          <p className="mt-1.5 flex items-center gap-1.5 text-[13px] text-slate-500">
            <GraduationCap className="size-4 text-slate-400" aria-hidden="true" />
            <span>{identity}</span>
          </p>
        </div>

        {/* Stat chips — all live */}
        <div className="flex flex-col items-end gap-1.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-orange px-3 py-1 text-[11px] font-bold text-white shadow-sm">
            <Target className="size-3.5" aria-hidden="true" />
            {accuracy ? `${accuracy.total} QUESTIONS PRACTISED` : 'START PRACTISING'}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200">
            <Timer className="size-3.5" aria-hidden="true" />
            {accuracy && accuracy.total > 0
              ? `${accuracy.accuracyPct}% practice accuracy`
              : 'No attempts yet'}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-[11px] font-semibold text-sky-700 ring-1 ring-sky-200">
            <Trophy className="size-3.5" aria-hidden="true" />
            {bestPercentile !== null ? `Best mock · ${bestPercentile}th percentile` : 'No mocks yet'}
          </span>
        </div>
      </div>

      {/* Mock readiness row — best mock score against the 60% pass mark */}
      <div className="mt-5 flex items-center gap-3.5">
        <div className="grid size-11 shrink-0 place-items-center rounded-full bg-navy text-[13px] font-extrabold text-white shadow-md">
          {bestPct !== null ? `${bestPct}%` : '—'}
        </div>
        <div className="flex-1">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-navy">
              MOCK READINESS · BEST SCORE VS 60% PASS MARK
            </span>
            <span className="text-[11px] text-slate-500">
              {history && history.length > 0
                ? `${history.length} mock${history.length === 1 ? '' : 's'} taken`
                : 'Take your first timed mock'}
            </span>
          </div>
          <ProgressBar
            value={bestPct ?? 0}
            label="Best mock score against the pass mark"
          />
        </div>
      </div>
    </section>
  );
}
