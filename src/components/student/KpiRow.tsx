'use client';

import { useEffect, useState } from 'react';
import { getPracticeAccuracy } from '@/lib/api/practice';
import { getMockHistory } from '@/lib/api/mocks';
import { getStudentStats, type ApiStudentStats } from '@/lib/api/gamification';
import { getMockStats } from '@/lib/mock-stats';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';

export function KpiRow() {
  const [accuracy, setAccuracy] = useState<{ total: number; accuracyPct: number } | null>(null);
  const [mocks, setMocks] = useState<{ taken: number; best: number | null } | null>(null);
  const [stats, setStats] = useState<ApiStudentStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    getPracticeAccuracy()
      .then((a) => !cancelled && setAccuracy(a))
      .catch(() => {});
    getMockHistory()
      .then((rows) => {
        if (cancelled) return;
        const s = getMockStats(rows);
        setMocks({ taken: s.taken, best: s.bestPct });
      })
      .catch(() => {});
    getStudentStats()
      .then((s) => !cancelled && setStats(s))
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const kpis: { label: string; value: number | null; suffix?: string; sub: string; accent: string }[] = [
    {
      label: 'Practice accuracy',
      value: accuracy ? accuracy.accuracyPct : null,
      suffix: '%',
      sub:
        accuracy && accuracy.total > 0
          ? `${accuracy.total} question${accuracy.total === 1 ? '' : 's'} attempted`
          : 'Start a practice set',
      accent: '#2563eb',
    },
    {
      label: 'XP earned',
      value: stats ? stats.totalXp : null,
      sub: stats ? `Level ${stats.level} · ${stats.badgesEarned} badge${stats.badgesEarned === 1 ? '' : 's'}` : 'Complete quests to earn XP',
      accent: '#1a1a1a',
    },
    {
      label: 'Day streak',
      value: stats ? stats.currentStreakDays : null,
      sub: stats && stats.longestStreakDays > 0 ? `Best: ${stats.longestStreakDays} day${stats.longestStreakDays === 1 ? '' : 's'}` : 'Practice daily to build a streak',
      accent: '#f97316',
    },
    {
      label: 'Mock tests taken',
      value: mocks ? mocks.taken : null,
      sub:
        mocks && mocks.taken > 0
          ? `Best score ${mocks.best}%`
          : 'Take your first timed mock',
      accent: '#f5b400',
    },
  ];

  return (
    <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {kpis.map((kpi) => (
        <div key={kpi.label} className="stat-card relative overflow-hidden">
          <span
            aria-hidden
            className="absolute inset-x-0 top-0 h-[3px]"
            style={{ background: kpi.accent }}
          />
          <p className="stat-label mt-1">{kpi.label}</p>
          <p className="stat-value num-tab">
            {kpi.value === null ? '—' : <AnimatedNumber value={kpi.value} suffix={kpi.suffix} />}
          </p>
          <p className="stat-meta">{kpi.sub}</p>
        </div>
      ))}
    </section>
  );
}
