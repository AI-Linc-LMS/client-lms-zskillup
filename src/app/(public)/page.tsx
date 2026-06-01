import Link from 'next/link';
import { Star, Users, Clock, Zap, Trophy, BookOpen, BarChart3 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import {
  HOMEPAGE_FEATURED_TRACKS,
  HOMEPAGE_WHY_BLOCKS,
  HOMEPAGE_COVERAGE_TOPICS,
  HOMEPAGE_TESTIMONIALS,
  HOMEPAGE_COMPANY_LOGOS,
} from '@/lib/demo-data-extra';

/**
 * Public homepage (STUDENT_JOURNEY_SPEC Â§3). Server Component.
 * Matches the site analysis spec exactly â€” all 9 sections.
 */

const HERO_STATS = [
  { value: '240,000+', label: 'Students enrolled' },
  { value: '1,200+', label: 'Partner colleges' },
  { value: '4.7â˜…', label: 'Average rating' },
  { value: '82%', label: 'Placement success' },
];

const TOPIC_TABS = ['Aptitude', 'Coding', 'Interview prep', 'Company tracks'];

const WHY_ICONS = [BookOpen, Zap, Trophy, BarChart3];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* â”€â”€ Public navbar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-white px-6">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-1 text-xl font-extrabold">
            <span className="text-orange">Z</span>
            <span className="text-foreground">Skillup</span>
          </Link>
          <span className="hidden text-sm text-muted-foreground sm:block">Placement prep</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-md px-4 py-2 text-sm font-medium text-foreground hover:bg-slate-50"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-md bg-orange px-4 py-2 text-sm font-semibold text-white hover:bg-orange/90"
          >
            Create account
          </Link>
        </div>
      </header>

      {/* â”€â”€ Hero â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="bg-gradient-to-b from-navy/95 to-navy px-6 py-24 text-white">
        <div className="mx-auto max-w-4xl text-center">
          <span className="inline-block rounded-full bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-white/80">
            Campus placement, simplified
          </span>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            Land your first tech job with<br />
            <span className="text-orange">India's top recruiters.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base text-white/80 sm:text-lg">
            Real previous-year questions for TCS, Infosys, Wipro, Cognizant, Capgemini, and
            Accenture. Live mock drives, expert instructors, and verified certificates accepted by
            1,200+ campus placement cells.
          </p>

          {/* CTAs â€” single primary + two secondary (STUDENT_JOURNEY_SPEC Â§6) */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/signup"
              className="inline-flex h-12 items-center justify-center rounded-full bg-orange px-7 text-[15px] font-semibold text-white shadow-sm transition-colors hover:bg-orange/90 active:translate-y-px"
            >
              Create free account
            </Link>
            <Link
              href="/dashboard/company"
              className="rounded-md border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white hover:bg-white/20"
            >
              Browse companies
            </Link>
            <Link
              href="/login"
              className="text-sm font-medium text-white/70 underline-offset-4 hover:underline"
            >
              Existing user â€” log in
            </Link>
          </div>

          {/* Topic tabs */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
            {TOPIC_TABS.map((t) => (
              <span
                key={t}
                className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/80"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* â”€â”€ Stats bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="bg-slate-50/60">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-6 px-6 py-10 md:grid-cols-4">
          {HERO_STATS.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-3xl font-extrabold text-navy">{s.value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* â”€â”€ Mock product-preview card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="bg-gradient-to-r from-navy to-indigo-900 px-6 py-4 text-white">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/60">
              Tata Consultancy Services
            </p>
            <h3 className="mt-1 text-lg font-bold">TCS NQT 2026 â€” Complete Preparation</h3>
            <div className="mt-1 flex items-center gap-3 text-xs text-white/70">
              <span className="flex items-center gap-1"><Star className="size-3 fill-amber-400 text-amber-400" /> 4.8</span>
              <span>52,400 enrolled</span>
              <span>24h</span>
            </div>
          </div>
          <div className="grid gap-0 p-6 sm:grid-cols-3">
            {/* Level + XP */}
            <div className="border-r pr-6">
              <div className="flex items-center gap-2">
                <span className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-amber-400 to-orange text-xs font-bold text-white">
                  Lv 12
                </span>
                <div className="flex-1">
                  <p className="text-[10px] font-semibold text-muted-foreground">XP Â· LEVEL 12 â†’ 13</p>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500" style={{ width: '81%' }} />
                  </div>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">2,840 / 3,500</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1.5">
                <span className="text-orange">ðŸ”¥</span>
                <span className="text-xs font-semibold">14-day streak</span>
              </div>
            </div>
            {/* Daily quest */}
            <div className="px-6">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Daily quest</p>
              <p className="mt-1 text-sm font-medium text-navy">
                Solve 5 percentage shortcuts in &lt; 8 min
              </p>
              <p className="text-xs text-muted-foreground">+150 XP Â· 30 coins Â· Speedster badge</p>
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-orange" style={{ width: '60%' }} />
                </div>
                <span className="text-xs text-muted-foreground">3/5</span>
              </div>
            </div>
            {/* Rank */}
            <div className="border-l pl-6">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">National rank</p>
              <p className="mt-1 text-3xl font-extrabold text-navy">#228</p>
              <p className="text-xs text-muted-foreground">â†‘ 12 places Â· cohort 4,910</p>
            </div>
          </div>
        </div>
      </section>

      {/* â”€â”€ Company logos row â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="bg-slate-50/60">
        <div className="mx-auto max-w-5xl px-6 py-8">
          <p className="mb-6 text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Prep tracks for
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            {HOMEPAGE_COMPANY_LOGOS.map((c) => (
              <Link
                key={c.slug}
                href={`/dashboard/company/${c.slug}`}
                className="rounded-lg border bg-white px-5 py-2.5 text-sm font-semibold text-navy shadow-sm transition-shadow hover:shadow-md"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* â”€â”€ Featured tracks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-2 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-navy">Pattern-matched paths for top recruiters</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Each track follows the actual drive â€” paper section weights, time pressure, and section cut-offs.
            </p>
          </div>
          <Link href="/prepare" className="hidden text-sm font-medium text-orange hover:underline sm:block">
            View all tracks â†’
          </Link>
        </div>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {HOMEPAGE_FEATURED_TRACKS.map((t) => (
            <Card key={t.slug} className="overflow-hidden">
              <div className={`relative h-20 bg-gradient-to-br ${t.accent} p-3`}>
                {t.badge ? (
                  <span className="rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold uppercase text-navy">
                    {t.badge}
                  </span>
                ) : null}
                <div className="flex h-full items-center justify-center">
                  <span className="rounded bg-white/20 px-3 py-1 text-base font-extrabold text-white">
                    {t.company}
                  </span>
                </div>
              </div>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{t.description}</p>
                <p className="mt-1 text-sm font-semibold text-navy">{t.title}</p>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span>{t.mcqs} MCQs</span>
                  <span>{t.rounds} rounds</span>
                  <span className="flex items-center gap-1"><Star className="size-3 fill-amber-400 text-amber-400" />{t.rating}</span>
                  <span className="flex items-center gap-1"><Users className="size-3" />{t.enrolled}</span>
                  <span className="flex items-center gap-1"><Clock className="size-3" />{t.hours}h</span>
                </div>
                <Link
                  href={`/dashboard/company/${t.slug}`}
                  className="mt-3 inline-block text-xs font-semibold text-orange hover:underline"
                >
                  View â†’
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="mt-6 text-center sm:hidden">
          <Link href="/prepare" className="text-sm font-medium text-orange hover:underline">
            View all tracks â†’
          </Link>
        </div>
      </section>

      {/* â”€â”€ Why ZSkillup â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="bg-slate-50/60">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="text-center text-2xl font-bold text-navy">
            Built like the platforms students already trust â€” only smarter
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {HOMEPAGE_WHY_BLOCKS.map((b, i) => {
              const Icon = WHY_ICONS[i];
              return (
                <div key={b.title} className="rounded-xl border bg-white p-5">
                  <span className="grid size-9 place-items-center rounded-lg bg-navy/10 text-navy">
                    <Icon className="size-5" />
                  </span>
                  <h3 className="mt-3 font-semibold text-navy">{b.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{b.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* â”€â”€ Gamification section â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold text-navy">
              Daily quests, streaks, levels â€” prep becomes a habit, not a grind
            </h2>
            <p className="mt-3 text-muted-foreground">
              Earn XP for every drill. Unlock badges, level up, climb the national leaderboard.
            </p>
            <ul className="mt-4 space-y-2">
              {['Streaks', 'Daily quests with XP rewards', 'College & national leaderboard', 'Earnable concept badges'].map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm">
                  <span className="size-1.5 rounded-full bg-orange" />
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/leaderboard"
              className="mt-6 inline-block rounded-md bg-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy/90"
            >
              See live leaderboard
            </Link>
          </div>

          {/* Mock gamification widget */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Today's focus
            </p>
            <p className="mt-1 font-semibold text-navy">Probability & permutations</p>
            <p className="text-xs text-muted-foreground">20-min drill Â· High weight for TCS & Infosys</p>
            <Link
              href="/prepare"
              className="mt-3 inline-block rounded-md bg-orange px-4 py-2 text-sm font-semibold text-white"
            >
              Start session
            </Link>
            <div className="mt-5 border-t pt-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-navy">ðŸ”¥ Active streak: 14 days</span>
                <span className="text-xs text-muted-foreground">M T W T F S S</span>
              </div>
              <div className="flex gap-1">
                {['M','T','W','T','F','S','S'].map((d, i) => (
                  <div
                    key={`${d}-${i}`}
                    className={`flex h-7 w-full items-center justify-center rounded text-[10px] font-semibold ${i < 6 ? 'bg-orange text-white' : 'bg-slate-100 text-slate-400'}`}
                  >
                    {d}
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4 space-y-2 border-t pt-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Top of your cohort
              </p>
              {[
                { n: 'Aditya Krishnan', xp: '12,840 XP' },
                { n: 'Sneha Iyer', xp: '11,420 XP' },
                { n: 'Karan Patel', xp: '10,180 XP' },
              ].map((p, i) => (
                <div key={p.n} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="text-xs font-bold text-orange">#{i + 1}</span>
                    <span className="text-navy">{p.n}</span>
                  </span>
                  <span className="text-xs text-muted-foreground">{p.xp}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* â”€â”€ Coverage â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="bg-slate-50/60">
        <div className="mx-auto max-w-4xl px-6 py-16 text-center">
          <h2 className="text-2xl font-bold text-navy">Every section the recruiters ask</h2>
          <Link href="/prepare" className="mt-1 inline-block text-sm font-medium text-orange hover:underline">
            Browse the catalog â†’
          </Link>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {HOMEPAGE_COVERAGE_TOPICS.map((t) => (
              <span
                key={t}
                className="rounded-full border bg-white px-3 py-1 text-sm font-medium text-navy"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* â”€â”€ Testimonials â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-center text-2xl font-bold text-navy">
          Loved by students. Trusted by TPOs.
        </h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {HOMEPAGE_TESTIMONIALS.map((t) => (
            <Card key={t.name}>
              <CardContent className="space-y-4 p-6">
                <p className="text-sm italic text-foreground">"{t.quote}"</p>
                <div>
                  <p className="text-sm font-semibold text-navy">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.detail}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* â”€â”€ Final CTA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="bg-navy px-6 py-20 text-white">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-extrabold">Your next placement starts today.</h2>
          <p className="mt-3 text-white/70">
            Free to start. No credit card. Pick a target company, take an assessment, and we'll
            personalize your path.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/signup"
              className="rounded-md bg-orange px-6 py-3 text-sm font-bold text-white hover:bg-orange/90"
            >
              Get started free
            </Link>
            <Link
              href="/login"
              className="rounded-md border border-white/30 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10"
            >
              Log in
            </Link>
          </div>
        </div>
      </section>

      {/* â”€â”€ Footer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <footer className="border-t px-6 py-12">
        <div className="mx-auto grid max-w-5xl gap-8 sm:grid-cols-3">
          <div>
            <Link href="/" className="flex items-center gap-1 text-xl font-extrabold">
              <span className="text-orange">Z</span>
              <span>Skillup</span>
            </Link>
            <p className="mt-2 text-sm text-muted-foreground">
              Company-wise prep, timed mocks, and cohort analytics.
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Pages</p>
            <ul className="mt-3 space-y-2">
              {[
                { label: 'Home', href: '/' },
                { label: 'Companies', href: '/dashboard/company' },
                { label: 'Prepare', href: '/prepare' },
                { label: 'Full mock quiz', href: '/dashboard/quiz' },
                { label: 'Dashboard', href: '/dashboard' },
                { label: 'Leaderboard', href: '/leaderboard' },
                { label: 'Roadmap', href: '/roadmap' },
              ].map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-muted-foreground hover:text-foreground">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">On this page</p>
            <ul className="mt-3 space-y-2">
              {['Platform', 'Adaptive engine', 'Gamification', 'Institutions'].map((a) => (
                <li key={a}>
                  <span className="text-sm text-muted-foreground">{a}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mx-auto mt-10 max-w-5xl border-t pt-6 text-center text-xs text-muted-foreground">
          Â© 2026 ZSkillup | Future-ready graduates, future-strong institutions
        </div>
      </footer>
    </div>
  );
}
