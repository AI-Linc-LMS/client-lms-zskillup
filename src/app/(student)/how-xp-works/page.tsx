import Link from 'next/link';
import type { Metadata } from 'next';
import {
  ArrowLeft,
  Award,
  BookOpen,
  Brain,
  Coins,
  Flame,
  Gauge,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Trophy,
  Zap,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'How XP works · ZSkillup',
  description: 'Exactly how XP, levels, streaks, coins, and badges are earned across ZSkillup.',
};

/**
 * Static explainer for the platform's XP / gamification rules. Values mirror the
 * backend source of truth (gamification/domain/calculators.ts). Linked from the
 * (i) button next to every XP display.
 */
export default function HowXpWorksPage() {
  return (
    <div className="pb-16">
      <Link
        href="/dashboard"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-navy"
      >
        <ArrowLeft className="size-4" /> Back to dashboard
      </Link>

      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#0f1117] via-[#171b2e] to-[#202b63] p-7 text-white sm:p-9">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -left-1/4 -top-1/2 size-[38vw] rounded-full bg-[#ffc42d]/20 blur-[110px]" />
          <div className="absolute -right-1/4 -bottom-1/2 size-[34vw] rounded-full bg-[#7c3aed]/20 blur-[110px]" />
        </div>
        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-orange">
            <Zap className="size-3.5" /> Experience points
          </span>
          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-[40px]">How XP works</h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-white/70">
            XP (experience points) reward consistent, quality practice. Here&apos;s exactly how every point,
            level, streak, coin, and badge is earned across ZSkillup - no mystery.
          </p>
        </div>
      </section>

      {/* The 5 metrics */}
      <h2 className="mt-9 mb-3 text-sm font-bold uppercase tracking-widest text-slate-400">Your stats, explained</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <MetricCard icon={<Star className="size-4" />} tint="#2563eb" label="Level" desc="Grows with your total XP along a gentle curve." />
        <MetricCard icon={<Zap className="size-4" />} tint="#7c3aed" label="Total XP" desc="Every point you've ever earned, added up." />
        <MetricCard icon={<Flame className="size-4" />} tint="#dc2626" label="Day streak" desc="Consecutive days you did something." />
        <MetricCard icon={<Coins className="size-4" />} tint="#d97706" label="Coins" desc="Spend them in the Shop." />
        <MetricCard icon={<Award className="size-4" />} tint="#059669" label="Badges" desc="Unlocked at milestones." />
      </div>

      {/* Ways to earn XP */}
      <h2 className="mt-10 mb-3 text-sm font-bold uppercase tracking-widest text-slate-400">Ways to earn XP</h2>
      <div className="grid gap-4 md:grid-cols-3">
        <EarnCard
          icon={<Target className="size-5" />}
          tint="#f5b400"
          title="Practice questions"
          headline="+10 XP"
          sub="per correct answer"
          rows={[
            ['Base (correct answer)', '+10 XP'],
            ['Hard question bonus', '+5 XP'],
            ['Solved without a hint', '+2 XP'],
            ['Wrong answer', '0 XP'],
          ]}
          foot="So a hard question nailed with no hint = 17 XP."
        />
        <EarnCard
          icon={<Brain className="size-5" />}
          tint="#2563eb"
          title="Mocks & assessments"
          headline="100+ XP"
          sub="per submitted test"
          rows={[
            ['Score-based', 'score % × 5'],
            ['Minimum per test', '100 XP'],
            ['First test of the day', '+200 XP'],
            ['Not submitted / expired', '0 XP'],
          ]}
          foot="An 80% mock = max(100, 400) = 400 XP (+200 if it's your first today)."
        />
        <EarnCard
          icon={<Sparkles className="size-5" />}
          tint="#059669"
          title="Daily quest"
          headline="+50 XP"
          sub="+ 10 coins"
          rows={[
            ['Complete the daily quest', '+50 XP'],
            ['Coins reward', '+10 coins'],
            ['Resets', 'every day (IST)'],
          ]}
          foot="One quick quest a day keeps your streak - and your coins - growing."
        />
      </div>

      {/* Streak multiplier callout */}
      <div className="mt-4 overflow-hidden rounded-2xl border border-orange/30 bg-gradient-to-r from-orange/10 to-transparent p-5">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#ffd24d] via-[#ffc42d] to-[#f5b400] text-[#171717] shadow-sm">
            <Flame className="size-5" />
          </span>
          <div>
            <h3 className="text-base font-black text-navy">The 14-day streak multiplier</h3>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              Keep a streak going for <b>14 days</b> and <b>every XP you earn is multiplied by 1.5×</b> - practice,
              mocks, and quests all count more. Miss a day and the streak (and the bonus) resets, so consistency
              literally pays.
            </p>
          </div>
        </div>
      </div>

      {/* Levels */}
      <h2 className="mt-10 mb-3 text-sm font-bold uppercase tracking-widest text-slate-400">How levels work</h2>
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-blue-50 text-blue-600">
            <TrendingUp className="size-5" />
          </span>
          <div>
            <h3 className="text-base font-black text-navy">Your level follows a gentle curve</h3>
            <p className="text-sm text-slate-500">Each level needs a bit more XP than the last, so early levels come quick.</p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <FormulaTile label="Your level" value="⌊ √(Total XP ÷ 100) ⌋" />
          <FormulaTile label="To reach level L+1" value="(2L + 1) × 100 XP" />
          <FormulaTile label="Level L starts at" value="L² × 100 XP" />
        </div>
        <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/70 p-4 text-sm text-slate-600">
          <p className="flex items-center gap-1.5 font-semibold text-navy">
            <Gauge className="size-4 text-[#f5b400]" /> Example
          </p>
          <p className="mt-1 leading-relaxed">
            At <b>4,922 XP</b> you&apos;re <b>Level 7</b> (level 7 starts at 4,900 XP). You need{' '}
            <b>1,500 XP</b> to reach Level 8 - so your bar shows <b>22 / 1,500</b>.
          </p>
        </div>
      </div>

      {/* Coins + Badges */}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-amber-50 text-amber-600">
              <Coins className="size-5" />
            </span>
            <h3 className="text-base font-black text-navy">Coins</h3>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            You earn <b>10 coins</b> for each daily quest you complete. Coins are separate from XP - they don&apos;t
            affect your level. Put them toward a plan in <Link href="/shop" className="font-semibold text-[#f5b400] hover:underline">Explore Plans</Link>.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
              <Trophy className="size-5" />
            </span>
            <h3 className="text-base font-black text-navy">Badges</h3>
          </div>
          <p className="mt-3 text-sm text-slate-600">Unlocked automatically when you cross a milestone:</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {['🔥 Day streaks', '✅ Questions solved', '🧠 Mocks taken', '⭐ Levels reached'].map((b) => (
              <span key={b} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                {b}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* In-quiz points note */}
      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="flex items-center gap-1.5 text-sm font-black text-navy">
          <BookOpen className="size-4 text-slate-400" /> A note on the live points meter
        </h3>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
          During an adaptive quiz you&apos;ll see live points tick up as you answer - those reward <b>speed</b> (they
          decay the longer you take, and dip a little for each hint). That meter is your in-quiz score; the XP that
          lands on your profile afterwards is credited from your <b>final result</b> using the rules above.
        </p>
      </div>

      <p className="mt-8 text-center text-xs text-slate-400">
        Rules apply platform-wide. XP is credited within a moment of finishing an activity.
      </p>
    </div>
  );
}

function MetricCard({ icon, tint, label, desc }: { icon: React.ReactNode; tint: string; label: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3.5">
      <span className="grid size-8 place-items-center rounded-lg" style={{ background: `color-mix(in srgb, ${tint} 12%, white)`, color: tint }}>
        {icon}
      </span>
      <p className="mt-2 text-sm font-black text-navy">{label}</p>
      <p className="mt-0.5 text-[11.5px] leading-snug text-slate-500">{desc}</p>
    </div>
  );
}

function EarnCard({
  icon,
  tint,
  title,
  headline,
  sub,
  rows,
  foot,
}: {
  icon: React.ReactNode;
  tint: string;
  title: string;
  headline: string;
  sub: string;
  rows: [string, string][];
  foot: string;
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-2xl text-white shadow-sm" style={{ background: tint }}>
          {icon}
        </span>
        <div>
          <p className="text-sm font-black text-navy">{title}</p>
          <p className="text-lg font-black leading-none" style={{ color: tint }}>
            {headline} <span className="text-xs font-semibold text-slate-400">{sub}</span>
          </p>
        </div>
      </div>
      <dl className="mt-4 space-y-1.5">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-2 text-sm">
            <dt className="text-slate-500">{k}</dt>
            <dd className="shrink-0 font-bold text-navy tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 border-t border-slate-100 pt-2.5 text-[12px] leading-relaxed text-slate-400">{foot}</p>
    </div>
  );
}

function FormulaTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-center">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-1 font-mono text-[13px] font-bold text-navy">{value}</p>
    </div>
  );
}
