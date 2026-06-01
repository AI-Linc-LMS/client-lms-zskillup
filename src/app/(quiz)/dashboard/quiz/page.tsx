'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  BookOpen,
  Clock,
  Coins,
  Flame,
  Sparkles,
  Star,
  Timer,
  Trophy,
  Zap,
} from 'lucide-react';

const STATS = [
  { icon: BookOpen, label: 'Questions', value: '20' },
  { icon: Timer, label: 'Per question', value: '90s' },
  { icon: Clock, label: 'Total time', value: '~30 min' },
  { icon: Star, label: 'Pass mark', value: '60%' },
];

const HOUSE_RULES = [
  { icon: Clock, text: '90 seconds per question — strict timeout auto-locks the answer.' },
  { icon: Zap, text: 'Streak bonus: every 3 correct in a row = +25 XP and a coin bump.' },
  { icon: Sparkles, text: 'You can review and skip back inside the run; final submit is one-way.' },
  { icon: Trophy, text: '80%+ on the run gets a guaranteed leaderboard climb of at least 5 ranks.' },
];

export default function FullMockQuizPage() {
  const [started, setStarted] = useState(false);

  if (!started) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-navy text-white">
        {/* Soft glow background */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_-10%,rgba(243,112,33,0.15),transparent),radial-gradient(50%_50%_at_100%_100%,rgba(56,189,248,0.12),transparent)]"
        />

        {/* Top bar */}
        <div className="relative z-10 flex items-center justify-between px-8 py-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-1.5 text-xs font-semibold text-white/90 transition-colors hover:bg-white/10"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            Exit to dashboard
          </Link>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-orange px-3 py-1 text-[11px] font-bold text-white shadow-sm">
              <Flame className="size-3.5" aria-hidden="true" /> 14 DAY STREAK
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50/95 px-3 py-1 text-[11px] font-bold text-amber-700 shadow-sm">
              <Coins className="size-3.5" aria-hidden="true" /> 1,420
            </span>
          </div>
        </div>

        {/* Body */}
        <main className="relative z-10 mx-auto max-w-6xl px-8 pb-16 pt-4">
          <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
            {/* Left — title + stats + quest reward + CTA */}
            <div>
              <p className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-white/70">
                <Sparkles className="size-3" aria-hidden="true" /> Assessment mode · Timed · Strict submit
              </p>
              <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">
                Full mock quiz
              </h1>
              <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-white/70">
                20 adaptive questions, randomized from the bank. Each correct answer earns XP and coins.
                Beat the clock to climb the leaderboard.
              </p>

              <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {STATS.map(({ icon: Icon, label, value }) => (
                  <div
                    key={label}
                    className="rounded-xl border border-white/10 bg-white/5 p-4"
                  >
                    <Icon className="size-4 text-white/60" aria-hidden="true" />
                    <p className="mt-3 text-[10px] font-semibold uppercase tracking-widest text-white/50">
                      {label}
                    </p>
                    <p className="mt-1 text-xl font-extrabold text-white">{value}</p>
                  </div>
                ))}
              </div>

              {/* Quest reward */}
              <div className="mt-6 flex items-center gap-4 rounded-xl border border-orange/30 bg-gradient-to-r from-orange/15 to-amber-400/10 p-4">
                <span className="inline-flex items-center gap-1 rounded-full bg-orange px-3 py-1 text-[10px] font-bold text-white shadow-sm">
                  ★ QUEST REWARD
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">
                    Earn up to <span className="text-orange">+500 XP</span> and{' '}
                    <span className="text-amber-300">100 coins</span>
                  </p>
                  <p className="mt-0.5 text-xs text-white/60">
                    Bonuses for correct streaks · Leaderboard boost on 80%+
                  </p>
                </div>
              </div>

              {/* CTAs */}
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setStarted(true)}
                  className="inline-flex h-12 items-center gap-2 rounded-full bg-orange px-7 text-[15px] font-semibold text-white shadow-sm transition-colors hover:bg-orange/90 active:translate-y-px"
                >
                  <Zap className="size-4 fill-white" aria-hidden="true" />
                  Start quiz
                </button>
                <Link
                  href="/dashboard"
                  className="inline-flex h-12 items-center gap-1.5 rounded-full border border-white/20 px-6 text-[15px] font-semibold text-white/90 transition-colors hover:bg-white/10"
                >
                  Maybe later
                </Link>
              </div>

              <p className="mt-3 flex items-center gap-1.5 text-[11px] text-white/40">
                <span aria-hidden="true">⚠</span>
                Once started, the quiz can&apos;t be paused. Closing the tab forfeits the run.
              </p>
            </div>

            {/* Right — XP, House rules, leaderboard */}
            <aside className="space-y-4">
              {/* XP */}
              <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                <div className="flex items-center gap-3">
                  <span className="grid size-11 place-items-center rounded-full bg-gradient-to-br from-amber-400 to-orange text-xs font-extrabold text-white shadow-md">
                    Lv 12
                  </span>
                  <div className="flex-1">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-white/50">
                      XP · 12 → 13
                    </p>
                    <p className="text-sm font-bold text-white">2,840 / 3,500</p>
                  </div>
                </div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500"
                    style={{ width: `${(2840 / 3500) * 100}%` }}
                  />
                </div>
                <p className="mt-2 text-[11px] text-white/60">
                  A perfect run pushes you to <span className="font-semibold text-white">Level 13</span> and
                  unlocks the <span className="font-semibold text-amber-300">Speedster</span> badge.
                </p>
              </div>

              {/* House rules */}
              <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">
                  House rules
                </p>
                <ul className="mt-3 space-y-3">
                  {HOUSE_RULES.map(({ icon: Icon, text }) => (
                    <li key={text} className="flex gap-3 text-[13px] leading-snug text-white/80">
                      <Icon className="mt-0.5 size-4 shrink-0 text-orange" aria-hidden="true" />
                      <span>{text}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Leaderboard */}
              <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-5">
                <Trophy className="size-9 text-amber-300" aria-hidden="true" />
                <div className="flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">
                    Currently on the leaderboard
                  </p>
                  <p className="mt-1 text-2xl font-extrabold text-white">#228</p>
                  <p className="text-[11px] text-emerald-300">↑ 12 places this week · Cohort 4,910</p>
                </div>
              </div>
            </aside>
          </div>
        </main>
      </div>
    );
  }

  // ───── Quiz in progress ─────
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="flex h-14 items-center justify-between border-b border-slate-200 px-6 shadow-sm">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition-colors hover:text-navy"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" /> Exit
        </Link>
        <span className="text-sm font-bold text-navy">ZSkillup Mock Quiz</span>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-sm font-bold text-red-600 ring-1 ring-red-200">
            <Clock className="size-3.5" aria-hidden="true" /> 29:59
          </span>
          <span className="text-[11px] font-semibold text-slate-500">Q 1 / 20</span>
        </div>
      </header>

      <main className="flex flex-1 items-start justify-center bg-[#f8f9fc] px-6 py-10">
        <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Section: Numerical Ability · Question 1 of 20
          </p>
          <h2 className="mt-3 text-lg font-semibold leading-snug text-navy">
            A shopkeeper marks an article 30% above cost price and allows a discount of 10%. Find the
            profit percentage.
          </h2>
          <div className="mt-6 space-y-3">
            {['17%', '20%', '23%', '27%'].map((opt, i) => (
              <button
                key={opt}
                type="button"
                className="flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-navy transition-colors hover:border-orange hover:bg-orange/5"
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-full border border-slate-200 text-xs font-bold text-slate-500">
                  {String.fromCharCode(65 + i)}
                </span>
                {opt}
              </button>
            ))}
          </div>
          <div className="mt-8 flex items-center justify-between">
            <button
              type="button"
              disabled
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-400 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              type="button"
              className="rounded-full bg-orange px-5 py-2 text-sm font-bold text-white shadow-sm transition-opacity hover:opacity-90"
            >
              Next question →
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
