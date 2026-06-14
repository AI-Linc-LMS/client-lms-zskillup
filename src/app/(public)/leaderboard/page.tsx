'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Flame, Trophy, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DEMO_LEADERBOARD_GLOBAL_STATS,
  DEMO_LEADERBOARD_PODIUM,
  DEMO_LEADERBOARD_TABLE,
  DEMO_LEADERBOARD_SCOPE_TABS,
  DEMO_LEADERBOARD_TIME_TABS,
  type LeaderboardEntry,
} from '@/lib/demo-data-extra';

/**
 * Public leaderboard (demo data, no auth required).
 * Matches the site spec exactly — stats, podium, filters, table, boost CTA.
 */

const PODIUM_HEIGHTS = ['order-2 mt-8', 'order-1', 'order-3 mt-12'];
const PODIUM_BG = ['bg-amber-400', 'bg-slate-300', 'bg-amber-600'];

export default function LeaderboardPage() {
  const [scope, setScope] = useState('national');
  const [timeRange, setTimeRange] = useState('This week');

  return (
    <div className="min-h-screen bg-background">
      {/* Public navbar */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-white px-6">
        <Link href="/" className="flex items-center gap-1 text-xl font-extrabold">
          <span className="text-orange">Z</span>
          <span className="text-foreground">Skillup</span>
        </Link>
        <div className="flex items-center gap-3">
          <Button variant="ghost" asChild>
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild>
            <Link href="/signup">Create account</Link>
          </Button>
        </div>
      </header>

      {/* Hero (Zone C — dark navy) */}
      <section className="relative overflow-hidden bg-navy text-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_100%_0%,rgba(243,112,33,0.18),transparent),radial-gradient(50%_50%_at_0%_100%,rgba(56,189,248,0.12),transparent)]"
        />
        <div className="relative mx-auto max-w-5xl px-6 py-16 text-center sm:py-20">
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-orange">
            Compete · Climb · Earn rewards
          </span>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-[42px]">
            National leaderboard.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-relaxed text-white/70">
            Earn XP for every drill. Streaks multiply your gains. Top 100 each month win mentor
            calls, certificates, and recruiter referrals.
          </p>
        </div>
      </section>

      <main className="mx-auto max-w-5xl px-6 py-10">
        {/* Global stats */}
        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          {DEMO_LEADERBOARD_GLOBAL_STATS.map((s) => (
            <div key={s.label} className="rounded-xl border bg-white p-4 text-center shadow-sm">
              <p className="text-2xl font-extrabold text-navy">{s.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {/* User profile strip */}
        <div className="mb-8 flex items-center gap-4 rounded-xl border bg-white p-4 shadow-sm">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-navy text-sm font-bold text-white">
            SI
          </span>
          <div className="flex-1">
            <p className="font-semibold text-navy">Sneha Iyer</p>
            <p className="text-xs text-muted-foreground">PSG Tech · IT 2025</p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1 text-orange">
              <Flame className="size-3.5" /> 14-day streak
            </span>
            <span className="text-muted-foreground">1,420 coins</span>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-700">
              Speedster
            </span>
          </div>
        </div>

        {/* Podium — top 3 */}
        <div className="mb-8 flex items-end justify-center gap-4 rounded-2xl bg-gradient-to-b from-navy/5 to-transparent px-6 pb-8 pt-4">
          {DEMO_LEADERBOARD_PODIUM.map((entry, i) => (
            <div key={entry.rank} className={cn('flex flex-col items-center', PODIUM_HEIGHTS[i])}>
              <span className="grid size-12 place-items-center rounded-full bg-navy text-sm font-bold text-white">
                {entry.initials}
              </span>
              <p className="mt-2 text-center text-sm font-semibold text-navy">{entry.name}</p>
              <p className="text-center text-xs text-muted-foreground">{entry.college}</p>
              <p className="mt-1 text-xs text-muted-foreground">{entry.leading}</p>
              <div
                className={cn(
                  'mt-3 grid place-items-center rounded-t-lg px-6 py-3 text-white',
                  PODIUM_BG[i],
                  i === 0 ? 'h-24 w-28' : i === 1 ? 'h-20 w-24' : 'h-16 w-20',
                )}
              >
                <span className="text-2xl font-extrabold">#{entry.rank}</span>
              </div>
              <div className="w-full rounded-b-lg bg-slate-100 px-3 py-2 text-center">
                <p className="text-xs font-semibold text-navy">{entry.xp.toLocaleString()} XP</p>
                <p className="text-[10px] text-muted-foreground">
                  Lv {entry.level} · {entry.streak}d streak
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Scope + time range filters */}
        <div className="mb-6 space-y-3">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Leaderboard scope">
            {DEMO_LEADERBOARD_SCOPE_TABS.map((t) => (
              <button
                key={t.key}
                role="tab"
                aria-selected={scope === t.key}
                onClick={() => setScope(t.key)}
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
                  scope === t.key
                    ? 'bg-navy text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                )}
              >
                {t.label}
                <span
                  className={cn(
                    'rounded-full px-1.5 text-[10px]',
                    scope === t.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500',
                  )}
                >
                  {t.count.toLocaleString()}
                </span>
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            {DEMO_LEADERBOARD_TIME_TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTimeRange(t)}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                  timeRange === t
                    ? 'bg-orange text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Your position strip */}
        <div className="mb-4 flex items-center gap-3 rounded-xl border-2 border-orange/30 bg-orange/5 px-4 py-3">
          <span className="grid size-9 place-items-center rounded-full bg-navy text-sm font-bold text-white">
            AK
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-navy">
              Aditya Krishnan{' '}
              <span className="ml-1 rounded-full bg-orange px-2 py-0.5 text-[10px] font-bold text-white">
                You
              </span>
            </p>
            <p className="text-xs text-muted-foreground">VIT Vellore · CSE 2026 · Level 12 · 14-day streak</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-extrabold text-navy">#228</p>
            <p className="text-xs text-muted-foreground">2,840 XP</p>
          </div>
        </div>

        {/* Top performers table */}
        <div className="mb-8 rounded-xl border bg-white shadow-sm">
          <div className="border-b px-4 py-3">
            <h2 className="font-semibold text-navy">Top performers — Showing top 8</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b text-left text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  <th className="px-4 py-3">Rank</th>
                  <th className="px-4 py-3">Learner</th>
                  <th className="px-4 py-3">Level</th>
                  <th className="px-4 py-3">Streak</th>
                  <th className="px-4 py-3">Badges</th>
                  <th className="px-4 py-3 text-right">XP</th>
                </tr>
              </thead>
              <tbody>
                {DEMO_LEADERBOARD_TABLE.map((row) => (
                  <TableRow key={row.rank} entry={row} />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Boost Your Rank CTA */}
        <div className="rounded-2xl bg-gradient-to-r from-navy to-indigo-900 p-6 text-white">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Zap className="size-4 text-orange" />
                Complete today's quest to gain <strong>+150 XP</strong>
              </div>
              <div className="flex items-center gap-2 text-sm text-white/80">
                <Trophy className="size-4 text-amber-400" />
                Streak multiplier: <strong>×1.5 on day 14+</strong>
              </div>
              <p className="text-xs text-white/60">
                Top 100 this month win mentor calls + recruiter referrals. · 12 days left in this cycle.
              </p>
            </div>
            <Button size="lg" asChild>
              <Link href="/prepare">Start now</Link>
            </Button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t px-6 py-8 text-center text-xs text-muted-foreground">
        © 2026 ZSkillup · Future-ready graduates, future-strong institutions
      </footer>
    </div>
  );
}

function TableRow({ entry }: { entry: LeaderboardEntry }) {
  return (
    <tr
      className={cn(
        'border-b last:border-0',
        entry.isYou ? 'bg-orange/5' : 'hover:bg-slate-50',
      )}
    >
      <td className="px-4 py-3 font-semibold text-navy">
        #{entry.rank}
        {entry.rank <= 3 ? (
          <Trophy
            className={cn(
              'ml-1 inline size-3.5',
              entry.rank === 1 ? 'text-amber-400' : entry.rank === 2 ? 'text-slate-400' : 'text-amber-700',
            )}
          />
        ) : null}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-full bg-navy text-[10px] font-bold text-white">
            {entry.initials}
          </span>
          <div>
            <p className="font-medium text-navy">
              {entry.name}
              {entry.isYou ? (
                <span className="ml-1 rounded-full bg-orange px-1.5 py-0.5 text-[9px] font-bold text-white">
                  You
                </span>
              ) : null}
            </p>
            <p className="text-xs text-muted-foreground">
              {entry.college} · Leading {entry.leading}
            </p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-muted-foreground">Lv {entry.level}</td>
      <td className="px-4 py-3">
        <span className="flex items-center gap-1 text-orange">
          <Flame className="size-3" /> {entry.streak}d
        </span>
      </td>
      <td className="px-4 py-3 text-muted-foreground">{entry.badges}</td>
      <td className="px-4 py-3 text-right font-semibold text-navy">
        {entry.xp.toLocaleString()}
      </td>
    </tr>
  );
}
