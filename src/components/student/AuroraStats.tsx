'use client';

import { type ReactNode, useEffect, useState } from 'react';
import { Award, Coins, Flame, Star, Zap } from 'lucide-react';
import { getStudentStats, type ApiStudentStats } from '@/lib/api/gamification';
import { AnimatedNumber, Stagger, StaggerItem } from '@/components/motion/primitives';

/**
 * Animated XP / level / streak / coins / badges tiles for the dashboard.
 * Numbers count up; cards stagger in on scroll. Reads GET /students/stats.
 */
export function AuroraStats() {
  const [s, setS] = useState<ApiStudentStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    getStudentStats()
      .then((data) => !cancelled && setS(data))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const tiles: Array<{
    label: string;
    value: number;
    sub?: string;
    icon: ReactNode;
    from: string;
    to: string;
  }> = [
    {
      label: 'Level',
      value: s?.level ?? 0,
      sub: s ? `${s.xpIntoLevel}/${s.xpForNextLevel} XP` : undefined,
      icon: <Star className="size-5" />,
      from: '#f7a14e',
      to: '#f37021',
    },
    {
      label: 'Total XP',
      value: s?.totalXp ?? 0,
      icon: <Zap className="size-5" />,
      from: '#7c6cf5',
      to: '#5b3bf5',
    },
    {
      label: 'Day streak',
      value: s?.currentStreakDays ?? 0,
      sub: s ? `best ${s.longestStreakDays}` : undefined,
      icon: <Flame className="size-5" />,
      from: '#ff8a4c',
      to: '#f5491e',
    },
    {
      label: 'Coins',
      value: s?.coins ?? 0,
      icon: <Coins className="size-5" />,
      from: '#f5c451',
      to: '#e0a91b',
    },
    {
      label: 'Badges',
      value: s?.badgesEarned ?? 0,
      icon: <Award className="size-5" />,
      from: '#34d399',
      to: '#059669',
    },
  ];

  return (
    <Stagger className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {tiles.map((t) => (
        <StaggerItem key={t.label}>
          <div className="group relative h-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-6 -top-6 size-20 rounded-full opacity-10 blur-xl transition-opacity group-hover:opacity-25"
              style={{ background: t.to }}
            />
            <span
              className="flex size-10 items-center justify-center rounded-xl text-white shadow-sm"
              style={{ background: `linear-gradient(135deg, ${t.from}, ${t.to})` }}
            >
              {t.icon}
            </span>
            <p className="mt-3 text-[26px] font-extrabold leading-none tracking-tight text-navy">
              <AnimatedNumber value={t.value} />
            </p>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
              {t.label}
            </p>
            {t.sub ? <p className="mt-0.5 text-[11px] text-slate-400">{t.sub}</p> : null}
          </div>
        </StaggerItem>
      ))}
    </Stagger>
  );
}
