import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Building2,
  CheckCircle2,
  Clock3,
  Compass,
  Flame,
  LineChart,
  PlayCircle,
  Sparkles,
  Star,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';
import { HOMEPAGE_COMPANY_LOGOS } from '@/lib/demo-data-extra';
import { PublicMobileMenu } from '@/components/marketing/PublicMobileMenu';
import { PublicAuthCta } from '@/components/marketing/PublicAuthCta';
import { BrandLogo } from '@/components/layout/BrandLogo';
import { HomeFeaturedTracks } from '@/components/marketing/HomeFeaturedTracks';
import { HomeTopCohort } from '@/components/marketing/HomeTopCohort';

const HERO_STATS = [
  { label: 'Students enrolled', value: '240,000+' },
  { label: 'Partner colleges', value: '1,200+' },
  { label: 'Average rating', value: '4.7★' },
  { label: 'Placement success', value: '82%' },
];

const FEATURES = [
  {
    icon: Compass,
    title: 'Company-wise tracks',
    body: 'Pattern-matched papers for TCS NQT, Infosys InfyTQ, Wipro NTH, Cognizant GenC and more. Real previous-year coverage updated each season.',
  },
  {
    icon: Zap,
    title: 'Mock quizzes',
    body: 'Difficulty re-tunes to your accuracy and speed. Hint ladders, video walkthroughs, and bookmarked weak spots — never grind blindly.',
  },
  {
    icon: Trophy,
    title: 'Gamified progress',
    body: 'XP, streaks, daily quests, level badges and a national leaderboard turn prep into a habit you actually want to keep.',
  },
  {
    icon: LineChart,
    title: 'Institutional analytics',
    body: 'TPOs see cohort heat-maps, at-risk students and PPS distributions — export-ready and audit-friendly.',
  },
];

const TOPIC_PILLS = [
  'Quantitative Aptitude',
  'Logical Reasoning',
  'Verbal Ability',
  'Programming Fundamentals',
  'Data Structures',
  'OOPS',
  'DBMS · SQL',
  'Operating Systems',
  'Computer Networks',
  'HR Interview',
  'Group Discussion',
  'Resume & LinkedIn',
];

const TESTIMONIALS = [
  {
    quote:
      'The TCS NQT track is shockingly close to the actual paper. I cleared in my first attempt — the daily quests kept me consistent.',
    name: 'Aditya Krishnan',
    meta: 'VIT Vellore · CSE 2025',
    initials: 'AK',
  },
  {
    quote:
      'Adaptive difficulty meant I stopped grinding easy problems. My quant accuracy went from 58% to 84% in eight weeks.',
    name: 'Sneha Iyer',
    meta: 'PSG Tech · IT 2025',
    initials: 'SI',
  },
  {
    quote:
      'As a TPO, the cohort heat-map is invaluable. We caught at-risk students three weeks before our placement window.',
    name: 'Dr. Priya Menon',
    meta: 'TPO, VVIT',
    initials: 'PM',
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-white text-[var(--color-text)]">

      {/* ── Public Navbar ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-white/10 bg-gradient-to-r from-[#0b1220] to-[#1e3a8a] px-5 md:px-8">
        <BrandLogo variant="light" priority className="h-8" />
        <nav className="hidden items-center gap-6 lg:flex" aria-label="Primary">
          {[
            { label: 'Companies', href: '/dashboard/company' },
            { label: 'Prepare', href: '/prepare' },
            { label: 'Leaderboard', href: '/leaderboard' },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-white/75 transition-colors hover:text-white"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <PublicAuthCta />
          <PublicMobileMenu />
        </div>
      </header>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Dark navy gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0b1220] via-[#101d4a] to-[#1e3a8a]" />
        {/* Glow orbs */}
        <div aria-hidden className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-white/[0.08] blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-[#f37021]/20 blur-3xl" />
        {/* Dotted grid overlay */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: 'radial-gradient(rgb(255 255 255 / 0.7) 1px, transparent 1px)',
            backgroundSize: '22px 22px',
          }}
        />

        <div className="relative mx-auto grid max-w-[1400px] items-center gap-12 px-5 pb-16 pt-12 md:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14 lg:pb-24 lg:pt-20">
          {/* Left — copy */}
          <div className="text-white">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.08] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-white/85">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" /> Campus placement, simplified
            </span>

            <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Land your first tech job with{' '}
              <span className="bg-gradient-to-r from-[#fbbf24] via-[#f97316] to-[#ef4444] bg-clip-text text-transparent">
                India&apos;s top recruiters
              </span>
              .
            </h1>

            <p className="mt-5 max-w-xl text-base leading-relaxed text-white/75 sm:text-lg">
              Structured prep for TCS, Infosys, Wipro, Cognizant, Capgemini and Accenture — real
              previous-year questions, live mock drives, expert instructors, and verified
              certificates accepted by 1,200+ campus placement cells.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link href="/signup" className="btn-brand rounded-full px-7 py-3 text-sm">
                Create free account <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/dashboard/company"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/25 bg-white/[0.08] px-7 py-3 text-sm font-semibold text-white transition hover:border-white/40 hover:bg-white/[0.14]"
              >
                <Building2 className="h-4 w-4" /> Browse companies
              </Link>
              <Link
                href="/login"
                className="text-sm font-semibold text-white/70 transition hover:text-white sm:ml-2"
              >
                Existing user → log in
              </Link>
            </div>

            <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm font-semibold text-white/85">
              {['Aptitude', 'Coding', 'Interview prep', 'Company tracks'].map((label) => (
                <span key={label} className="inline-flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" aria-hidden />
                  {label}
                </span>
              ))}
            </div>

            <div className="mt-10 grid max-w-2xl grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4 sm:gap-x-8">
              {HERO_STATS.map((s) => (
                <div key={s.label}>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-white/55">
                    {s.label}
                  </p>
                  <p className="mt-1 text-2xl font-extrabold tracking-tight num-tab sm:text-[1.7rem]">
                    {s.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Right — floating preview cards */}
          <div className="relative hidden h-[28rem] lg:block">
            {/* Card 1 — course card */}
            <div
              className="float-card-1 absolute left-0 top-4 w-[18rem] overflow-hidden rounded-2xl border border-white/15 bg-white shadow-2xl"
              style={{ transformOrigin: 'center center' }}
            >
              <div className="relative flex h-24 items-center justify-center bg-gradient-to-br from-[#1d4ed8] to-[#0b1220]">
                <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-md bg-[#1d4ed8] px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-widest text-white shadow">
                  Most enrolled
                </span>
                <span className="flex h-12 w-32 items-center justify-center rounded-md bg-white/95 px-3 py-2 shadow-md">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="https://upload.wikimedia.org/wikipedia/commons/0/0e/Tata_Consultancy_Services_old_logo.svg"
                    alt="TCS"
                    className="max-h-7 max-w-full object-contain"
                  />
                </span>
              </div>
              <div className="p-4 text-[var(--color-text)]">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-subtle)]">
                  TATA Consultancy Services
                </p>
                <p className="mt-1 text-sm font-bold leading-snug">TCS NQT 2026 — Complete Preparation</p>
                <div className="mt-3 flex items-center gap-3 text-[11px] font-semibold text-[var(--color-text-muted)]">
                  <span className="inline-flex items-center gap-1">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> 4.8
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3 w-3" /> 52,400
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock3 className="h-3 w-3" /> 24h
                  </span>
                </div>
              </div>
            </div>

            {/* Card 2 — XP / level */}
            <div
              className="float-card-2 absolute right-0 top-0 w-[16rem] rounded-2xl border border-white/15 bg-white p-5 shadow-2xl"
              style={{ transformOrigin: 'center center' }}
            >
              <div className="flex items-center gap-3">
                <span className="level-badge shrink-0">Lv 12</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-subtle)]">
                    XP · 12 → 13
                  </p>
                  <p className="text-sm font-extrabold tracking-tight num-tab text-[var(--color-text)]">
                    2,840 / 3,500
                  </p>
                </div>
              </div>
              <div className="mt-3 xp-bar xp-shine">
                <div className="xp-fill" style={{ width: '81%' }} />
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="streak-flame" style={{ padding: '0.25rem 0.6rem', fontSize: '0.66rem' }}>
                  <Flame className="h-3 w-3" /> 14d
                </span>
                <span className="coin-pill">
                  <span className="coin-dot" />
                  1,420
                </span>
              </div>
            </div>

            {/* Card 3 — daily quest */}
            <div
              className="float-card-3 quest-card absolute bottom-0 right-6 w-[18rem]"
              style={{ transformOrigin: 'center center' }}
            >
              <p className="earned-badge">
                <Star className="h-3 w-3 fill-current" /> Daily quest
              </p>
              <p className="mt-2 text-sm font-bold text-[var(--color-text)]">
                Solve 5 percentage shortcuts in &lt; 8 min
              </p>
              <p className="mt-0.5 text-[11px] font-medium text-[var(--color-text-muted)]">
                +150 XP · 30 coins · Speedster badge
              </p>
              <div className="mt-3 flex items-center gap-2">
                <div className="flex-1 progress-track">
                  <div className="progress-fill" style={{ width: '60%' }} />
                </div>
                <span className="num-tab text-[11px] font-bold text-[var(--color-brand-ink)]">3/5</span>
              </div>
            </div>

            {/* Card 4 — leaderboard rank */}
            <div
              className="float-card-4 trophy-tile absolute bottom-12 left-12 w-[15rem] p-4"
              style={{ transformOrigin: 'center center' }}
            >
              <div className="flex items-center gap-3">
                <Trophy className="h-7 w-7" />
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">
                    National rank
                  </p>
                  <p className="text-2xl font-extrabold tracking-tight num-tab">#228</p>
                  <p className="text-[11px] font-semibold opacity-80">↑ 12 places · cohort 4,910</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recruiter logo strip */}
        <div className="relative border-t border-white/10 bg-white/[0.03]">
          <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-6 px-5 py-5 md:px-8 lg:gap-10">
            <p className="shrink-0 text-[11px] font-bold uppercase tracking-[0.18em] text-white/55">
              Aligned with hiring patterns of
            </p>
            <div className="flex flex-1 flex-wrap items-center gap-x-3 gap-y-2 sm:gap-x-5">
              {HOMEPAGE_COMPANY_LOGOS.map((c) => (
                <Link
                  key={c.slug}
                  href={`/dashboard/company/${c.slug}`}
                  title={c.name}
                  className="group relative flex h-9 w-24 items-center justify-center overflow-hidden rounded-md bg-white/[0.06] px-2 py-1 transition hover:bg-white/[0.14] sm:w-28"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={c.logoSrc}
                    alt={c.logoAlt}
                    className="max-h-5 max-w-full object-contain brightness-0 invert opacity-70 transition group-hover:opacity-100"
                  />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Featured Tracks ───────────────────────────────────────────────── */}
      <section className="relative bg-[var(--color-bg)] py-16 lg:py-20">
        <div className="mx-auto max-w-[1400px] px-5 md:px-8">
          <div className="mb-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="section-tag">Featured tracks</p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
                Pattern-matched paths for top recruiters
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-[var(--color-text-muted)] sm:text-base">
                Each track follows the actual drive — paper section weights, time pressure, and
                section cut-offs.
              </p>
            </div>
            <Link
              href="/prepare"
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-line)] bg-white px-4 py-2 text-sm font-semibold text-[var(--color-text)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-primary)]"
            >
              View all tracks <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <HomeFeaturedTracks />
        </div>
      </section>

      {/* ── Why ZSkillup ─────────────────────────────────────────────────── */}
      <section className="bg-white py-16 lg:py-20">
        <div className="mx-auto max-w-[1400px] px-5 md:px-8">
          <div className="mb-12 max-w-3xl text-center sm:mx-auto">
            <p className="section-tag">Why ZSkillup</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Built like the platforms students already trust — only smarter
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="hover-lift relative h-full rounded-[var(--radius-card)] border border-[var(--color-line)] bg-white p-6"
              >
                <span
                  aria-hidden
                  className="absolute inset-x-0 top-0 h-[3px] rounded-t-[var(--radius-card)] bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-primary)]"
                />
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--color-primary-highlight)] to-white text-[var(--color-primary)]">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold tracking-tight">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-muted)]">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Gamification Preview ──────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-[var(--color-bg)] py-16 lg:py-24">
        <div
          aria-hidden
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              'radial-gradient(circle at 15% 20%, rgb(243 112 33 / 0.12), transparent 40%), radial-gradient(circle at 85% 70%, rgb(37 99 235 / 0.15), transparent 45%)',
          }}
        />
        <div className="relative mx-auto grid max-w-[1400px] gap-10 px-5 md:px-8 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <div>
            <p className="section-tag">Gamified prep</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Daily quests, streaks, levels — prep becomes a habit, not a grind
            </h2>
            <p className="mt-3 text-base text-[var(--color-text-muted)]">
              Earn XP for every drill. Unlock badges, level up, climb the national leaderboard.
              The dopamine loop does the work — you just show up.
            </p>

            <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                { icon: Flame, label: 'Streaks' },
                { icon: Zap, label: 'Daily quests with XP rewards' },
                { icon: Trophy, label: 'College & national leaderboard' },
                { icon: BadgeCheck, label: 'Earnable concept badges' },
              ].map((row) => (
                <li
                  key={row.label}
                  className="flex items-center gap-3 rounded-xl border border-[var(--color-line)] bg-white px-4 py-3"
                >
                  <row.icon className="h-5 w-5 shrink-0 text-[var(--color-brand)]" aria-hidden />
                  <span className="text-sm font-semibold text-[var(--color-text)]">{row.label}</span>
                </li>
              ))}
            </ul>

            <Link href="/leaderboard" className="btn-brand mt-6 inline-flex text-sm">
              <Trophy className="h-4 w-4" /> See live leaderboard
            </Link>
          </div>

          {/* Preview grid */}
          <div className="relative grid gap-4 sm:grid-cols-2">
            <div className="lms-card p-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-subtle)]">
                Today&apos;s focus
              </p>
              <p className="mt-1 text-base font-bold tracking-tight">
                Probability &amp; permutations
              </p>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                20-min drill · High weight for TCS &amp; Infosys
              </p>
              <Link href="/prepare" className="btn-brand mt-3 inline-flex text-xs">
                <PlayCircle className="h-3.5 w-3.5" /> Start session
              </Link>
            </div>

            <div className="lms-card p-5">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-subtle)]">
                  Active streak
                </p>
                <span className="streak-flame" style={{ padding: '0.25rem 0.6rem', fontSize: '0.66rem' }}>
                  <Flame className="h-3 w-3" />14d
                </span>
              </div>
              <div className="mt-3 flex h-12 items-end gap-1.5">
                {[42, 60, 38, 72, 88, 65, 90].map((h, i) => (
                  <div key={i} className="flex flex-1 flex-col items-center gap-1">
                    <div
                      className="w-full rounded-md bg-[var(--color-primary-highlight)]"
                      style={{ height: `${(h / 100) * 36}px` }}
                    />
                    <span className="text-[9px] font-semibold text-[var(--color-text-subtle)]">
                      {['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <HomeTopCohort />
          </div>
        </div>
      </section>

      {/* ── Topics Coverage ───────────────────────────────────────────────── */}
      <section className="bg-white py-14">
        <div className="mx-auto max-w-[1400px] px-5 md:px-8">
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="section-tag">Coverage</p>
              <h2 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
                Every section the recruiters ask
              </h2>
            </div>
            <Link href="/prepare" className="text-sm font-bold text-[var(--color-primary)] hover:underline">
              Browse the catalog →
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {TOPIC_PILLS.map((p) => (
              <span
                key={p}
                className="inline-flex cursor-default items-center gap-1.5 rounded-full border border-[var(--color-line)] bg-[var(--color-surface-2)] px-3.5 py-1.5 text-sm font-semibold text-[var(--color-text)] transition hover:border-[var(--color-brand)] hover:bg-[var(--color-brand-soft)] hover:text-[var(--color-brand-ink)]"
              >
                <BookOpen className="h-3.5 w-3.5 text-[var(--color-text-subtle)]" aria-hidden />
                {p}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────────────────── */}
      <section className="bg-[var(--color-bg)] py-16 lg:py-20">
        <div className="mx-auto max-w-[1400px] px-5 md:px-8">
          <div className="mb-10 max-w-2xl">
            <p className="section-tag">Outcomes</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Loved by students. Trusted by TPOs.
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <figure
                key={t.name}
                className="hover-lift flex h-full flex-col rounded-[var(--radius-card)] border border-[var(--color-line)] bg-white p-6"
              >
                <div className="mb-3 flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, k) => (
                    <Star key={k} className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden />
                  ))}
                </div>
                <blockquote className="text-sm leading-relaxed text-[var(--color-text)]">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-5 flex items-center gap-3 border-t border-[var(--color-line)] pt-4">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] text-xs font-extrabold text-white">
                    {t.initials}
                  </span>
                  <span>
                    <p className="text-sm font-bold text-[var(--color-text)]">{t.name}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">{t.meta}</p>
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0b1220] via-[#101d4a] to-[#1e3a8a] py-16 text-white lg:py-24">
        <div aria-hidden className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#f37021]/30 blur-3xl" />
        <div aria-hidden className="absolute -right-24 -bottom-24 h-72 w-72 rounded-full bg-white/[0.08] blur-3xl" />
        <div className="relative mx-auto max-w-3xl px-5 text-center md:px-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/55">
            Ready when you are
          </p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
            Your next placement starts today.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-base text-white/75">
            Free to start. No credit card. Pick a target company, take an assessment, and
            we&apos;ll personalize your path.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/signup" className="btn-brand inline-flex h-12 rounded-full px-8 text-sm">
              Get started free <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex h-12 items-center justify-center rounded-full border border-white/25 bg-white/[0.08] px-8 text-sm font-semibold text-white transition hover:border-white/40 hover:bg-white/[0.14]"
            >
              Log in
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-[var(--color-line)] bg-white px-5 py-12 md:px-8">
        <div className="mx-auto grid max-w-[1400px] gap-8 sm:grid-cols-4">
          <div className="sm:col-span-1">
            <BrandLogo variant="dark" className="h-7" />
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">
              Company-wise prep, timed mocks, and cohort analytics — all in one platform.
            </p>
          </div>
          <div>
            <p className="group-label mb-3">Product</p>
            <ul className="space-y-2">
              {[
                { label: 'Prepare', href: '/prepare' },
                { label: 'Mock tests', href: '/mock-assessment' },
                { label: 'Companies', href: '/dashboard/company' },
                { label: 'Leaderboard', href: '/leaderboard' },
              ].map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="group-label mb-3">Account</p>
            <ul className="space-y-2">
              {[
                { label: 'Log in', href: '/login' },
                { label: 'Create account', href: '/signup' },
                { label: 'Dashboard', href: '/dashboard' },
                { label: 'Roadmap', href: '/roadmap' },
              ].map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="group-label mb-3">Coverage</p>
            <ul className="space-y-2">
              {['Aptitude & Reasoning', 'Coding & DSA', 'Interview Prep', 'Company Tracks'].map((a) => (
                <li key={a}>
                  <span className="text-sm text-[var(--color-text-muted)]">{a}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mx-auto mt-10 max-w-[1400px] border-t border-[var(--color-line)] pt-6 text-center text-xs text-[var(--color-text-subtle)]">
          © 2026 ZSkillup · Future-ready graduates, future-strong institutions
        </div>
      </footer>
    </main>
  );
}
