import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  Brain,
  Calculator,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Code2,
  Compass,
  Cpu,
  FileText,
  Flame,
  LineChart,
  LogIn,
  MessageSquare,
  Sparkles,
  Star,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';
import { HOMEPAGE_COMPANY_LOGOS } from '@/lib/demo-data-extra';
import { PublicMobileMenu } from '@/components/marketing/PublicMobileMenu';
import { Disclaimer } from '@/components/legal/Disclaimer';
import { PublicAuthCta } from '@/components/marketing/PublicAuthCta';
import { BrandLogo } from '@/components/layout/BrandLogo';
import { HomeFeaturedTracks } from '@/components/marketing/HomeFeaturedTracks';
import { GamifiedShowcase } from '@/components/marketing/GamifiedShowcase';
import { HomeBlogSection } from '@/components/marketing/HomeBlogSection';
import { HoverVideo } from '@/components/media/HoverVideo';
import RotatingText from '@/components/reactbits/RotatingText';
import SpotlightCard from '@/components/reactbits/SpotlightCard';
import CountUp from '@/components/reactbits/CountUp';
import { getPublicBlogs, getPublicTestimonials } from '@/lib/server/public-content';
import {
  LANDING_FOOTER,
  LANDING_HERO_STATS,
  LANDING_HREFS,
  LANDING_NAV,
} from '@/lib/landing-config';

const HERO_STATS = LANDING_HERO_STATS;

/** Rotating phrases for the final-CTA headline (rendered in a fixed-width slot
 *  sized to the widest phrase, so the centered line never shifts as it cycles). */
const CTA_ROTATING = ['dream job', 'first offer', 'tech career', 'big break'];

/** Split a display stat ("240,000+", "4.7★", "82%") into an animated CountUp
 *  target + trailing suffix so the hero figures count up on load. */
function parseHeroStat(value: string): { to: number; separator: string; suffix: string } | null {
  const m = value.match(/^(\d[\d,]*(?:\.\d+)?)(.*)$/);
  if (!m) return null;
  return {
    to: parseFloat(m[1].replace(/,/g, '')),
    separator: m[1].includes(',') ? ',' : '',
    suffix: m[2],
  };
}

/** The eight modules that make up the platform (was four). */
const MODULES = [
  { icon: Compass, title: 'Company-specific assessments', body: 'Practice company-specific questions based on the latest placement patterns and previous-year questions.' },
  { icon: Zap, title: 'Adaptive practice', body: 'Questions automatically adjust to your skill level so you keep improving with every practice session.' },
  { icon: ClipboardList, title: 'Timed mock assessments', body: 'Take mock tests that feel just like real placement exams with actual timing and question patterns.' },
  { icon: MessageSquare, title: 'AI mock interviews', body: 'Practice interviews with AI and receive instant feedback on your communication, confidence, and interview skills.' },
  { icon: FileText, title: 'Resume builder', body: 'Create professional, ATS-friendly resumes that match your target job role in just a few minutes.' },
  { icon: Code2, title: 'Coding practice', body: 'Solve coding problems, practice DSA, and improve your programming skills with an online compiler.' },
  { icon: Trophy, title: 'Gamified progress', body: 'XP, streaks, daily quests, level badges and a national leaderboard make prep a habit.' },
  { icon: LineChart, title: 'Institutional analytics', body: 'TPOs can easily track student progress, identify placement readiness, and monitor overall performance.' },
];

/** Practice-by-section cards - the five sections students segregate prep by. */
const SECTION_STYLE = {
  sky: { icon: 'text-sky-500/15 group-hover:text-sky-500/25', glow: 'bg-sky-400/10' },
  orange: { icon: 'text-orange-500/15 group-hover:text-orange-500/25', glow: 'bg-orange-400/10' },
  violet: { icon: 'text-violet-500/15 group-hover:text-violet-500/25', glow: 'bg-violet-400/10' },
  emerald: { icon: 'text-emerald-500/15 group-hover:text-emerald-500/25', glow: 'bg-emerald-400/10' },
  indigo: { icon: 'text-indigo-500/15 group-hover:text-indigo-500/25', glow: 'bg-indigo-400/10' },
} as const;

const SECTIONS: { icon: typeof Calculator; name: string; blurb: string; tint: keyof typeof SECTION_STYLE }[] = [
  { icon: Calculator, name: 'Numerical Ability', blurb: 'Percentages, ratios, time-speed-distance & data interpretation.', tint: 'sky' },
  { icon: Brain, name: 'Logical Reasoning', blurb: 'Series, blood relations, syllogisms, coding-decoding & puzzles.', tint: 'orange' },
  { icon: BookOpen, name: 'Verbal Ability', blurb: 'Reading comprehension, grammar, vocabulary & error spotting.', tint: 'violet' },
  { icon: Cpu, name: 'Technical MCQs', blurb: 'DBMS, OS, computer networks, OOP & core CS fundamentals.', tint: 'emerald' },
  { icon: Code2, name: 'Coding', blurb: 'Judge-backed problems across languages - DSA to company sets.', tint: 'indigo' },
];

const TESTIMONIALS = [
  {
    quote:
      'The TCS NQT track is shockingly close to the actual paper. I cleared in my first attempt - the daily quests kept me consistent.',
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
  {
    quote:
      'The mock interviews felt real - I walked into my Infosys interview having already answered the hard questions out loud.',
    name: 'Rahul Nair',
    meta: 'SRM IST · CSE 2025',
    initials: 'RN',
  },
];

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

type Testimonial = { quote: string; name: string; meta: string; initials: string };

/** One outcome/testimonial card used inside the vertical marquee columns. */
function OutcomeCard({ t, muted = false }: { t: Testimonial; muted?: boolean }) {
  return (
    <figure
      aria-hidden={muted}
      className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-white p-6 shadow-[var(--shadow-card)]"
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
  );
}

export default async function HomePage() {
  // Prefer admin-curated testimonials (Phase 5 CMS); fall back to built-in copy.
  const cms = await getPublicTestimonials();
  const blogs = await getPublicBlogs();
  const testimonials =
    cms.length > 0
      ? cms.map((t) => ({
          quote: t.quote,
          name: t.authorName,
          meta: t.authorTitle ?? '',
          initials: initialsOf(t.authorName),
        }))
      : TESTIMONIALS;
  // Two vertical marquee columns (one scrolls up, one down), each duplicated so
  // it loops seamlessly. Column B is rotated so the columns never mirror.
  const half = Math.ceil(testimonials.length / 2);
  const rotated = [...testimonials.slice(half), ...testimonials.slice(0, half)];
  const outcomesUp = [...testimonials, ...testimonials];
  const outcomesDown = [...rotated, ...rotated];

  return (
    <main className="min-h-screen overflow-x-hidden bg-white text-[var(--color-text)]">

      {/* ── Public Navbar ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-white/10 bg-gradient-to-r from-[#0a0a0c] to-[#141a2e] px-5 md:px-8">
        <BrandLogo variant="light" priority className="h-8" />
        <nav className="hidden items-center gap-6 lg:flex" aria-label="Primary">
          {/* Keyed by label, not href: two links legitimately CAN share a destination, and
              keying on href silently produced duplicate React keys when they did. */}
          {LANDING_NAV.map((l) => (
            <Link
              key={l.label}
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
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0c] via-[#0d0e13] to-[#141a2e]" />
        {/* Glow orbs */}
        <div aria-hidden className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-white/[0.08] blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-[#f5b400]/20 blur-3xl" />
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
          {/* Left - copy */}
          <div className="text-white">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.08] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-white/85">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" /> Campus placement, simplified
            </span>

            <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Land your first tech job at{' '}
              <RotatingText
                texts={['TCS', 'Infosys', 'Wipro', 'Accenture', 'Cognizant', 'Capgemini']}
                mainClassName="inline-flex overflow-hidden py-1 -my-1 text-[#ffc42d]"
                staggerFrom="last"
                staggerDuration={0.02}
                rotationInterval={2000}
                splitBy="characters"
                transition={{ type: 'spring', damping: 26, stiffness: 340 }}
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '-120%' }}
              />
            </h1>

            <p className="mt-5 max-w-xl text-base leading-relaxed text-white/75 sm:text-lg">
              Prepare smarter for top companies with real placement questions, mock tests,
              coding practice, AI interviews, and resume building-all on one platform.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link href="/signup" className="btn-brand rounded-full px-7 py-3 text-sm">
                Get started free <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/25 bg-white/[0.08] px-7 py-3 text-sm font-semibold text-white transition hover:border-white/40 hover:bg-white/[0.14]"
              >
                <LogIn className="h-4 w-4" /> Login
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
              {HERO_STATS.map((s, i) => {
                const stat = parseHeroStat(s.value);
                return (
                  <div key={s.label}>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-white/55">
                      {s.label}
                    </p>
                    <p className="mt-1 text-2xl font-extrabold tracking-tight num-tab sm:text-[1.7rem]">
                      {stat ? (
                        <>
                          <CountUp
                            to={stat.to}
                            separator={stat.separator}
                            duration={2}
                            delay={i * 0.12}
                            className="num-tab"
                          />
                          {stat.suffix}
                        </>
                      ) : (
                        s.value
                      )}
                    </p>
                  </div>
                );
              })}
            </div>
            {/* Disclaimer - these figures come from the ZSkillup platform. */}
            <p className="mt-4 max-w-2xl text-[11px] leading-relaxed text-white/45">
              Students enrolled, partner colleges and placement-success figures are from the ZSkillup
              platform.
            </p>
          </div>

          {/* Right - floating preview cards, staggered in a vertical stack with real
              gaps so they never intersect regardless of content height. */}
          <div className="relative hidden flex-col justify-center gap-6 lg:flex">
            {/* Card 1 - course card */}
            <div className="float-card-1 w-[19rem] self-start overflow-hidden rounded-2xl border border-white/15 bg-white shadow-2xl">
              <div className="relative flex h-24 items-center justify-center bg-gradient-to-br from-[#1d4ed8] to-[#0a0a0c]">
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
                <p className="mt-1 text-sm font-bold leading-snug">TCS NQT 2026 - Complete Preparation</p>
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

            {/* Card 2 - XP / level */}
            <div className="float-card-2 w-[17rem] self-end rounded-2xl border border-white/15 bg-white p-5 shadow-2xl">
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

            {/* Card 3 - leaderboard rank */}
            <div className="float-card-4 trophy-tile w-[16rem] self-start p-4">
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

            {/* Card 4 - daily quest */}
            <div className="float-card-3 quest-card w-[19rem] self-end">
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
          </div>
        </div>

        {/* Affiliation disclaimer - full-width, part of the hero (Campus-placement) block,
            lightly amber-highlighted so it reads as an advisory rather than footer fine print.
            Deliberately NOT inside the recruiter-logo strip below. */}
        <div className="relative mx-auto max-w-[1400px] px-5 pb-10 md:px-8">
          <Disclaimer tone="dark" className="border-amber-300/25 bg-amber-300/[0.05]" />
        </div>

        {/* Recruiter logo ticker - centred, larger logos, colour on hover. Solid black
            so the bottom of the hero stays fully dark (no lighter band showing through). */}
        <div className="relative border-t border-white/10 bg-[#0a0a0c]">
          <div className="mx-auto max-w-[1400px] px-5 py-8 md:px-8">
            <p className="text-center text-[11px] font-bold uppercase tracking-[0.18em] text-white/55">
              Aligned with the hiring patterns of
            </p>
            <div className="marquee-hover-pause edge-fade-x relative mt-5 overflow-hidden">
              <div className="marquee-x flex w-max items-center gap-4 pr-4">
                {[...HOMEPAGE_COMPANY_LOGOS, ...HOMEPAGE_COMPANY_LOGOS].map((c, i) => (
                  <div
                    key={`${c.slug}-${i}`}
                    title={c.name}
                    aria-hidden={i >= HOMEPAGE_COMPANY_LOGOS.length}
                    className="group flex h-16 w-40 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] px-6 ring-1 ring-white/10 transition hover:bg-white hover:ring-white/50"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={c.logoSrc}
                      alt={c.logoAlt}
                      className="max-h-8 max-w-full object-contain opacity-70 [filter:brightness(0)_invert(1)] transition group-hover:opacity-100 group-hover:[filter:none]"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Platform tour + founder (video left, founder right) ────────────── */}
      <section className="relative bg-[var(--color-bg)] py-16 lg:py-20">
        <div className="mx-auto max-w-[1400px] px-5 md:px-8">
          <div className="mb-10 max-w-2xl">
            <p className="section-tag">Why prephasz</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
              See how it works - and who&apos;s behind it
            </h2>
            <p className="mt-2 text-sm text-[var(--color-text-muted)] sm:text-base">
              A quick tour of the platform, and the founder betting 19+ years of IT and edtech on
              making placement prep fairer for every student.
            </p>
          </div>

          <div className="grid items-center gap-6 lg:grid-cols-2 lg:gap-8">
            {/* LEFT - platform tour video + what's inside prephasz */}
            <div className="flex flex-col gap-6">
              <HoverVideo
                src="/media/tour.mp4"
                poster="/media/tour-poster.jpg"
                eyebrow="Platform tour"
                title="See how prephasz works"
              />

              {/* What's inside prephasz */}
              <SpotlightCard
                className="flex flex-col rounded-[var(--radius-card-lg)] border border-[var(--color-line)] bg-white p-7 lg:p-8"
                spotlightColor="rgba(245, 180, 0, 0.20)"
              >
                <div
                  aria-hidden
                  className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#ffc42d]/15 blur-3xl"
                />
                <div className="relative flex items-center justify-between gap-3">
                  <p className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-text-subtle)]">
                    <span className="h-px w-6 bg-[var(--color-brand-strong)]" aria-hidden /> Inside prephasz
                  </p>
                  <Link
                    href={LANDING_HREFS.prepare}
                    className="inline-flex items-center gap-1 text-sm font-bold text-[var(--color-text)] transition hover:text-[var(--color-brand-strong)]"
                  >
                    Explore <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
                <ul className="relative mt-6 space-y-5">
                  {[
                    { icon: Brain, t: 'Adaptive practice', d: 'Questions that adjust to your level, section by section.' },
                    { icon: Compass, t: 'Company-specific assessments', d: 'Pattern-matched paths for TCS, Infosys, Accenture and more.' },
                    { icon: ClipboardList, t: 'Timed mock assessments', d: 'Full-length mocks that mirror the real paper and the clock.' },
                    { icon: LineChart, t: 'Placement readiness', d: 'Track accuracy, speed and readiness as your scores climb.' },
                  ].map(({ icon: Icon, t, d }) => (
                    <li key={t} className="flex items-start gap-4">
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)]">
                        <Icon className="size-5" aria-hidden />
                      </span>
                      <div>
                        <p className="font-bold text-[var(--color-text)]">{t}</p>
                        <p className="mt-0.5 text-sm leading-relaxed text-[var(--color-text-muted)]">{d}</p>
                      </div>
                    </li>
                  ))}
                </ul>
                {/* Brand CTA anchors the card so it reads as intentional, not empty. */}
                <Link
                  href={LANDING_HREFS.prepare}
                  className="relative mt-7 inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#ffd24d] via-[#ffc42d] to-[#f5b400] px-5 py-3 text-sm font-extrabold text-[#171717] shadow-[0_10px_24px_-12px_rgba(245,180,0,0.6)] transition hover:brightness-105"
                >
                  Start practising free <ArrowRight className="h-4 w-4" />
                </Link>
              </SpotlightCard>
            </div>

            {/* RIGHT - founder: photo first, then description */}
            <SpotlightCard
              className="rounded-[var(--radius-card-lg)] border border-[var(--color-line)] bg-white"
              spotlightColor="rgba(245, 180, 0, 0.20)"
            >
              {/* Photo (white studio bg blends into the card; a missing file degrades to plain white).
                  Taller crop (4:5) so the founder's chest - incl. the prephasz-logo pocket - is visible. */}
              <div className="relative h-[26rem] w-full overflow-hidden border-b border-[var(--color-line)] bg-white">
                <div
                  role="img"
                  aria-label="Lokesh Mathur, Founder & Director, ZSkillup Education"
                  className="absolute inset-0 bg-contain bg-bottom bg-no-repeat"
                  style={{ backgroundImage: "url('/images/founder-lokesh.png')" }}
                />
                <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-[var(--color-brand)] px-3 py-1 text-[11px] font-black uppercase tracking-wider text-[var(--color-brand-ink)] shadow-sm">
                  <Sparkles className="h-3 w-3" aria-hidden /> Founder &amp; Director
                </span>
              </div>

              {/* Description */}
              <div className="p-7 lg:p-8">
                <h3 className="text-2xl font-extrabold tracking-tight text-[var(--color-text)]">Lokesh Mathur</h3>
                <p className="mt-1 text-sm font-semibold text-[var(--color-brand-strong)]">Founder &amp; Director, ZSkillup Education</p>
                <p className="mt-4 text-sm leading-relaxed text-[var(--color-text-muted)] sm:text-[15px]">
                  A dynamic leader with 19+ years across IT, education, and edtech - an IIM Calcutta
                  Executive MBA, certified in PMP®, CSM®, and SCJP 5.0. From his own venture to senior
                  roles at upGrad, Lokesh has shaped 50,000+ futures with tech-driven education and
                  mentoring at scale, and a genuine commitment to empowering others.
                </p>

                <div className="mt-7">
                  <p className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-text-subtle)]">
                    <span className="h-px w-6 bg-[var(--color-brand-strong)]" aria-hidden /> Key experience
                  </p>
                  <ul className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
                    {[
                      '19+ years in IT, Education & EdTech',
                      'IIM Calcutta Executive MBA',
                      'PMP®, CSM®, SCJP 5.0 Certified',
                      'Former Senior Leader at upGrad',
                      'Mentored 50,000+ students',
                    ].map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-2.5 text-sm text-[var(--color-text)]"
                      >
                        <CheckCircle2
                          className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-brand-strong)]"
                          aria-hidden
                        />
                        <span className="font-medium">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </SpotlightCard>
          </div>
        </div>
      </section>

      {/* ── Featured Tracks - all 8 companies, 4 per row ──────────────────── */}
      <section className="relative bg-white py-16 lg:py-20">
        <div className="mx-auto max-w-[1400px] px-5 md:px-8">
          <div className="mb-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="section-tag">Featured tracks</p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
                Pattern-matched paths for top recruiters
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-[var(--color-text-muted)] sm:text-base">
                Practice exactly the way companies conduct their placement tests, with the latest
                exam pattern, timing, and question types.
              </p>
            </div>
            <Link
              href={LANDING_HREFS.prepare}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-line)] bg-white px-4 py-2 text-sm font-semibold text-[var(--color-text)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-primary)]"
            >
              View all tracks <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <HomeFeaturedTracks />
        </div>
      </section>

      {/* ── Practice by section (after the company cards) ─────────────────── */}
      <section className="bg-[var(--color-bg)] py-16 lg:py-20">
        <div className="mx-auto max-w-[1400px] px-5 md:px-8">
          <div className="mb-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="section-tag">Practice by section</p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
                Every section the recruiters test
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-[var(--color-text-muted)] sm:text-base">
                Strengthen individual topics or test yourself with full-length mock exams anytime.
              </p>
            </div>
            <Link href={LANDING_HREFS.catalog} className="text-sm font-bold text-[var(--color-primary)] hover:underline">
              Browse the catalog →
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {SECTIONS.map((s) => (
              <Link
                key={s.name}
                href="/signup"
                className="hover-lift group relative block h-full overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-line)] bg-white p-6"
              >
                {/* backdrop watermark: soft section-tinted glow + oversized faint icon */}
                <div
                  aria-hidden
                  className={`pointer-events-none absolute -right-10 -top-10 size-36 rounded-full blur-2xl ${SECTION_STYLE[s.tint].glow}`}
                />
                <s.icon
                  aria-hidden
                  strokeWidth={1.25}
                  className={`pointer-events-none absolute -right-5 -top-3 size-28 transition-all duration-500 group-hover:scale-110 ${SECTION_STYLE[s.tint].icon}`}
                />
                <h3 className="relative flex items-center gap-1 text-lg font-bold tracking-tight text-[var(--color-text)]">
                  {s.name}
                  <ArrowRight className="h-4 w-4 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                </h3>
                <p className="relative mt-2 text-sm leading-relaxed text-[var(--color-text-muted)]">{s.blurb}</p>
              </Link>
            ))}
            {/* Trailing CTA tile keeps the 3-col grid balanced at five sections. */}
            <Link
              href="/mock-assessment"
              className="hover-lift flex flex-col justify-center gap-1 rounded-[var(--radius-card)] border border-dashed border-[var(--color-accent)]/40 bg-[var(--color-primary-highlight)]/40 p-6 text-[var(--color-primary)]"
            >
              <span className="text-sm font-bold">Build a custom mock</span>
              <span className="text-xs text-[var(--color-text-muted)]">
                Mix sections and difficulty into one timed set.
              </span>
              <span className="mt-1 inline-flex items-center gap-1 text-sm font-bold">
                Start <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Why prephasz - eight modules ──────────────────────────────────── */}
      <section className="bg-white py-16 lg:py-20">
        <div className="mx-auto max-w-[1400px] px-5 md:px-8">
          <div className="mb-12 max-w-3xl text-center sm:mx-auto">
            <p className="section-tag">Why prephasz</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
              One platform for the whole placement journey
            </h2>
            <p className="mt-3 text-sm text-[var(--color-text-muted)] sm:text-base">
              Eight modules that take you from your first practice question to a signed offer letter.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {MODULES.map((f) => (
              <div
                key={f.title}
                className="hover-lift group relative h-full overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-line)] bg-white p-6"
              >
                <span
                  aria-hidden
                  className="absolute inset-x-0 top-0 z-10 h-[3px] rounded-t-[var(--radius-card)] bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-primary)]"
                />
                {/* backdrop icon: soft glow + oversized faint watermark bleeding off the corner */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute -right-10 -top-10 size-36 rounded-full bg-[#f5b400]/10 blur-2xl transition-opacity duration-500 group-hover:bg-[#f5b400]/20"
                />
                <f.icon
                  aria-hidden
                  strokeWidth={1.25}
                  className="pointer-events-none absolute -right-5 -top-3 size-28 text-[#f5b400]/15 transition-all duration-500 group-hover:scale-110 group-hover:text-[#f5b400]/25"
                />
                <h3 className="relative mt-2 text-lg font-bold tracking-tight">{f.title}</h3>
                <p className="relative mt-2 text-sm leading-relaxed text-[var(--color-text-muted)]">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Gamified prep - animated showcase (backdrop + varied scroll animations) ── */}
      <GamifiedShowcase />

      {/* ── Outcomes - vertical testimonial ticker ────────────────────────── */}
      <section className="bg-white py-16 lg:py-20">
        <div className="mx-auto grid max-w-[1400px] gap-10 px-5 md:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <div>
            <p className="section-tag">Outcomes</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Loved by students. Trusted by TPOs.
            </h2>
            <p className="mt-3 max-w-md text-sm text-[var(--color-text-muted)] sm:text-base">
              Real results from students who prepped on prephasz and placement cells that run their
              cohorts on it.
            </p>
            <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-[var(--color-text-muted)]">
              <span className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, k) => (
                  <Star key={k} className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden />
                ))}
              </span>
              4.7 average · 240,000+ students on the ZSkillup platform
            </div>
          </div>

          {/* Two vertical ticker columns - left scrolls up, right scrolls down */}
          <div className="marquee-hover-pause edge-fade-y relative h-[26rem] overflow-hidden lg:h-[30rem]">
            <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
              {/* Column 1 - scrolls up */}
              <div className="marquee-y flex flex-col gap-4 [--marquee-dur:32s]">
                {outcomesUp.map((t, i) => (
                  <OutcomeCard key={`up-${t.name}-${i}`} t={t} muted={i >= testimonials.length} />
                ))}
              </div>
              {/* Column 2 - scrolls down (single column collapses on the narrowest screens) */}
              <div
                aria-hidden
                className="marquee-y-reverse hidden flex-col gap-4 [--marquee-dur:38s] sm:flex"
              >
                {outcomesDown.map((t, i) => (
                  <OutcomeCard key={`down-${t.name}-${i}`} t={t} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── From the blog ────────────────────────────────────────────────── */}
      <HomeBlogSection posts={blogs.slice(0, 3)} />

      {/* ── Final CTA ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0a0a0c] via-[#0d0e13] to-[#141a2e] py-16 text-white lg:py-24">
        <div aria-hidden className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#f5b400]/30 blur-3xl" />
        <div aria-hidden className="absolute -right-24 -bottom-24 h-72 w-72 rounded-full bg-white/[0.08] blur-3xl" />
        <div className="relative mx-auto max-w-3xl px-5 text-center md:px-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/55">
            Ready when you are
          </p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
            Today&apos;s preparation, tomorrow&apos;s{' '}
            {/* Fixed-width slot: invisible sizers reserve the widest phrase's
                width so the centered headline never shifts as the word cycles. */}
            <span className="relative inline-grid align-bottom">
              {CTA_ROTATING.map((w) => (
                <span
                  key={w}
                  aria-hidden
                  className="invisible col-start-1 row-start-1 whitespace-nowrap"
                >
                  {w}
                </span>
              ))}
              <RotatingText
                texts={CTA_ROTATING}
                mainClassName="col-start-1 row-start-1 inline-flex justify-start overflow-hidden py-1 -my-1 text-[#ffc42d]"
                staggerFrom="last"
                staggerDuration={0.02}
                rotationInterval={2200}
                splitBy="characters"
                transition={{ type: 'spring', damping: 26, stiffness: 340 }}
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '-120%' }}
              />
            </span>
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-base text-white/75">
            Get started for free. Choose your dream company, check where you stand, and
            we&apos;ll create a preparation plan just for you.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/signup" className="btn-brand inline-flex h-12 rounded-full px-8 text-sm">
              Get started free <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex h-12 items-center justify-center rounded-full border border-white/25 bg-white/[0.08] px-8 text-sm font-semibold text-white transition hover:border-white/40 hover:bg-white/[0.14]"
            >
              Login
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
              Company-wise prep, timed mocks, and cohort analytics - all in one platform.
            </p>
          </div>
          <div>
            <p className="group-label mb-3">Product</p>
            <ul className="space-y-2">
              {LANDING_FOOTER.product.map((l) => (
                <li key={l.label}>
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
              {LANDING_FOOTER.account.map((l) => (
                <li key={l.label}>
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
              {LANDING_FOOTER.coverage.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        {/* Affiliation disclaimer moved up next to the recruiter logos (above the "Aligned
            with the hiring patterns of" strip), so it no longer lives in the footer. */}
        <div className="mx-auto mt-10 max-w-[1400px] border-t border-[var(--color-line)] pt-6 text-center text-xs text-[var(--color-text-subtle)]">
          © 2026 prephasz · Powered by ZSkillup · Future-ready graduates, future-strong institutions
        </div>
      </footer>
    </main>
  );
}
