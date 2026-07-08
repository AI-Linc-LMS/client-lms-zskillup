'use client';

import { useEffect, useState } from 'react';
import { Award, Coins, Flame, Star, Zap, type LucideIcon } from 'lucide-react';
import { getStudentStats, type ApiStudentStats } from '@/lib/api/gamification';
import { AnimatedNumber, Stagger, StaggerItem } from '@/components/motion/primitives';
import { onXpUpdated } from '@/lib/xp-events';
import { XpInfoButton } from '@/components/gamification/XpInfoButton';

/**
 * Animated XP / level / streak / coins / badges tiles for the dashboard.
 * Numbers count up; cards stagger in on scroll. Reads GET /students/stats.
 */
export function AuroraStats() {
  const [s, setS] = useState<ApiStudentStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      getStudentStats()
        .then((data) => !cancelled && setS(data))
        .catch(() => {});
    load();
    const off = onXpUpdated(load); // refresh when any widget awards XP
    return () => {
      cancelled = true;
      off();
    };
  }, []);

  const tiles: Array<{
    label: string;
    value: number;
    sub?: string;
    Icon: LucideIcon;
    from: string;
    to: string;
    info?: boolean;
  }> = [
    {
      label: 'Level',
      value: s?.level ?? 0,
      sub: s ? `${s.xpIntoLevel.toLocaleString()} / ${s.xpForNextLevel.toLocaleString()} XP` : undefined,
      Icon: Star,
      from: '#f7a14e',
      to: '#f37021',
      info: true,
    },
    { label: 'Total XP', value: s?.totalXp ?? 0, Icon: Zap, from: '#7c6cf5', to: '#5b3bf5', info: true },
    {
      label: 'Day streak',
      value: s?.currentStreakDays ?? 0,
      sub: s ? `best ${s.longestStreakDays}` : undefined,
      Icon: Flame,
      from: '#ff8a4c',
      to: '#f5491e',
    },
    { label: 'Coins', value: s?.coins ?? 0, Icon: Coins, from: '#f5c451', to: '#e0a91b' },
    { label: 'Badges', value: s?.badgesEarned ?? 0, Icon: Award, from: '#34d399', to: '#059669' },
  ];

  return (
    <Stagger data-tour="dash:stats" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {tiles.map((t) => {
        const Icon = t.Icon;
        return (
          <StaggerItem key={t.label}>
            <div className="group relative h-full overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-[0_22px_50px_-26px_rgba(15,23,42,0.4)]">
              {/* accent top hairline */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-1"
                style={{ background: `linear-gradient(90deg, ${t.from}, ${t.to})` }}
              />
              {/* large faint backdrop icon (replaces the small tile) */}
              <Icon
                aria-hidden
                strokeWidth={1.75}
                className="pointer-events-none absolute -bottom-4 -right-3 size-28 -rotate-12 opacity-[0.12] transition-transform duration-300 group-hover:scale-110 group-hover:opacity-[0.18]"
                style={{ color: t.to }}
              />
              {/* soft corner glow */}
              <span
                aria-hidden
                className="pointer-events-none absolute -right-8 -top-8 size-24 rounded-full opacity-20 blur-2xl transition-opacity group-hover:opacity-35"
                style={{ background: t.to }}
              />
              {t.info ? <XpInfoButton className="absolute right-3 top-3 z-10" /> : null}
              <div className="relative">
                <p className="text-[28px] font-black leading-none tracking-tight text-navy sm:text-[34px]">
                  <AnimatedNumber value={t.value} />
                </p>
                <p className="mt-2 text-[11px] font-bold uppercase tracking-widest text-slate-500">
                  {t.label}
                </p>
                {t.sub ? (
                  <p className="mt-1 text-xs font-bold tabular-nums" style={{ color: t.to }}>
                    {t.sub}
                  </p>
                ) : null}
              </div>
            </div>
          </StaggerItem>
        );
      })}
    </Stagger>
  );
}
