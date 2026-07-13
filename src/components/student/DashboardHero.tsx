'use client';

import { useEffect, useState } from 'react';
import { BadgeCheck, Flame, GraduationCap, Target, Timer, Trophy } from 'lucide-react';
import { ProgressBar } from '@/components/ui/progress-bar';
import { getMe, type ApiMe } from '@/lib/api/me';
import { getPracticeAccuracy, type ApiAccuracy } from '@/lib/api/practice';
import { getMockHistory, type ApiMockAttemptHistory } from '@/lib/api/mocks';
import { getStudentStats, type ApiStudentStats } from '@/lib/api/gamification';
import { getMockStats } from '@/lib/mock-stats';

export function DashboardHero() {
  const [me, setMe] = useState<ApiMe | null>(null);
  const [accuracy, setAccuracy] = useState<ApiAccuracy | null>(null);
  const [history, setHistory] = useState<ApiMockAttemptHistory[] | null>(null);
  const [stats, setStats] = useState<ApiStudentStats | null>(null);

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
    getStudentStats()
      .then((data) => !cancelled && setStats(data))
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

  const workspaceLabel =
    me?.role === 'COLLEGE_ADMIN'
      ? 'TPO Workspace'
      : me?.role === 'SUPER_ADMIN'
        ? 'Super Admin Workspace'
        : 'Student Workspace';

  return (
    <section className="hero-band overflow-hidden p-6 lg:p-8">
      {/* Top row */}
      <div className="flex flex-wrap items-start justify-between gap-5">
        {/* Identity */}
        <div className="min-w-0">
          <p className="group-label">{workspaceLabel}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2.5">
            <h1 className="text-[28px] font-extrabold leading-tight tracking-tight text-[var(--color-ink)]">
              Welcome back, {firstName}
            </h1>
            {me?.status === 'ACTIVE' ? (
              <span className="pill pill-success">
                <BadgeCheck className="h-3.5 w-3.5" aria-hidden /> Active
              </span>
            ) : null}
          </div>
          <p className="mt-1.5 flex items-center gap-1.5 text-[13px] text-[var(--color-text-muted)]">
            <GraduationCap className="h-4 w-4 text-[var(--color-text-subtle)]" aria-hidden />
            <span>{identity}</span>
          </p>
        </div>

        {/* Stat chips */}
        <div className="flex flex-wrap items-start gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-brand)] px-3 py-1 text-[11px] font-bold text-[#171717] shadow-sm">
            <Target className="h-3.5 w-3.5" aria-hidden />
            {accuracy ? `${accuracy.total} QUESTIONS PRACTISED` : 'START PRACTISING'}
          </span>
          <span className="pill pill-warning">
            <Timer className="h-3.5 w-3.5" aria-hidden />
            {accuracy && accuracy.total > 0
              ? `${accuracy.accuracyPct}% practice accuracy`
              : 'No attempts yet'}
          </span>
          <span className="pill pill-info">
            <Trophy className="h-3.5 w-3.5" aria-hidden />
            {bestPercentile !== null
              ? `Best mock · ${bestPercentile}th percentile`
              : 'No mocks yet'}
          </span>
        </div>
      </div>

      {/* Divider */}
      <div className="my-5 border-t border-[var(--color-line)]" />

      {/* Bottom row — mock readiness + mini gamification hints */}
      <div className="flex flex-wrap items-center gap-6">
        {/* Mock readiness */}
        <div className="flex min-w-0 flex-1 items-center gap-3.5">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[var(--color-ink)] text-[13px] font-extrabold text-white shadow-md">
            {bestPct !== null ? `${bestPct}%` : '—'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="group-label">Mock readiness · best score vs 60% pass mark</span>
              <span className="shrink-0 text-[11px] text-[var(--color-text-muted)]">
                {history && history.length > 0
                  ? `${history.length} mock${history.length === 1 ? '' : 's'} taken`
                  : 'Take your first timed mock'}
              </span>
            </div>
            <ProgressBar value={bestPct ?? 0} label="Best mock score against the pass mark" />
          </div>
        </div>

        {/* Gamification chrome */}
        <div className="hidden shrink-0 items-center gap-4 sm:flex">
          <div className="text-center">
            <span className="level-badge">
              {stats ? `Lv ${stats.level}` : 'Lv —'}
            </span>
            <p className="mt-1.5 text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-subtle)]">
              Level
            </p>
          </div>
          <div className="w-32">
            <div className="mb-1 flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-subtle)]">
                XP Progress
              </p>
              {stats && (
                <p className="text-[10px] text-[var(--color-text-subtle)]">
                  {stats.xpIntoLevel}/{stats.xpForNextLevel}
                </p>
              )}
            </div>
            <div className="xp-bar">
              <div
                className="xp-fill"
                style={{
                  width: stats && stats.xpForNextLevel > 0
                    ? `${Math.min(100, Math.round((stats.xpIntoLevel / stats.xpForNextLevel) * 100))}%`
                    : '0%',
                }}
              />
            </div>
            <p className="mt-1 text-[10px] text-[var(--color-text-subtle)]">
              {stats ? `${stats.totalXp.toLocaleString()} total XP` : 'Loading…'}
            </p>
          </div>
          <div className="text-center">
            <span className="streak-flame">
              <Flame className="h-3.5 w-3.5" />
              {stats ? `${stats.currentStreakDays} day${stats.currentStreakDays === 1 ? '' : 's'}` : '—'}
            </span>
            <p className="mt-1.5 text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-subtle)]">
              Streak
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
