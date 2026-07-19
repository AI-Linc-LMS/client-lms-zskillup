'use client';

import type { ReactNode } from 'react';
import { BarChart3, BookOpen, Star, Trophy, Zap } from 'lucide-react';
import { BrandLogo } from '@/components/layout/BrandLogo';
import BlurText from '@/components/reactbits/BlurText';
import CountUp from '@/components/reactbits/CountUp';
import ShinyText from '@/components/reactbits/ShinyText';

const BRAND_FEATURES = [
  { icon: BookOpen, label: 'Company-wise tracks', desc: 'TCS, Infosys, Wipro & more' },
  { icon: Zap, label: 'Mock quizzes', desc: 'Re-tunes to your accuracy' },
  { icon: Trophy, label: 'National leaderboard', desc: 'Rank among 240,000+ students' },
  { icon: BarChart3, label: 'Cohort analytics', desc: 'TPO heat-maps & risk alerts' },
];

const TESTIMONIAL = {
  quote:
    'The TCS NQT track is shockingly close to the actual paper. I cleared in my first attempt - the daily quests kept me consistent.',
  name: 'Aditya Krishnan',
  meta: 'VIT Vellore · CSE 2025',
  initials: 'AK',
};

/**
 * Shared split-panel auth shell — the animated brand showcase on the left
 * (hidden on mobile) and your form on the right via {children}. Used by both
 * /login and /signup so they share one identity; only the right-panel form
 * differs between them.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* ── Left brand panel (hidden on mobile) ────────────────────────────── */}
      <aside className="relative hidden w-[42%] shrink-0 overflow-x-hidden bg-gradient-to-br from-[#0a0a0c] via-[#0d0e13] to-[#141a2e] text-white lg:flex lg:flex-col lg:gap-8 lg:overflow-y-auto lg:p-10 xl:p-14">
        {/* Glow orbs */}
        <div aria-hidden className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-[#f5b400]/25 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-24 -right-16 h-64 w-64 rounded-full bg-white/[0.06] blur-3xl" />
        {/* Dotted grid */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: 'radial-gradient(rgb(255 255 255 / 0.8) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />

        {/* Logo */}
        <div className="relative">
          <BrandLogo variant="light" className="h-9" />
          <p className="mt-1 text-sm text-white/60">Placement preparation, simplified</p>
        </div>

        {/* Main copy */}
        <div className="relative space-y-8">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.08] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-white/80">
              <ShinyText
                text="India's #1 campus prep platform"
                speed={4}
                color="rgba(255,255,255,0.75)"
                shineColor="#ffffff"
              />
            </span>
            <BlurText
              text="Land your first tech job with confidence."
              animateBy="words"
              direction="top"
              delay={110}
              stepDuration={0.38}
              className="mt-4 text-2xl font-extrabold leading-tight tracking-tight xl:text-3xl"
            />
            <p className="mt-3 text-sm leading-relaxed text-white/70">
              Real previous-year questions for TCS, Infosys, Wipro, Cognizant, Capgemini and
              Accenture. 240,000+ students already inside.
            </p>
          </div>

          {/* Feature list */}
          <ul className="space-y-3">
            {BRAND_FEATURES.map((f) => (
              <li key={f.label} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <f.icon className="h-4 w-4 text-white/80" />
                </span>
                <span>
                  <span className="block text-sm font-semibold">{f.label}</span>
                  <span className="text-xs text-white/60">{f.desc}</span>
                </span>
              </li>
            ))}
          </ul>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 border-t border-white/10 pt-6">
            {[
              { to: 240, separator: '', suffix: 'k+', label: 'Students' },
              { to: 1200, separator: ',', suffix: '+', label: 'Colleges' },
              { to: 82, separator: '', suffix: '%', label: 'Placement rate' },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-xl font-extrabold num-tab">
                  <CountUp to={s.to} separator={s.separator} duration={2.2} className="num-tab" />
                  {s.suffix}
                </p>
                <p className="text-[11px] text-white/55">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Testimonial */}
        <div className="relative lg:mt-auto rounded-2xl border border-white/10 bg-white/[0.06] p-5">
          <div className="mb-2 flex items-center gap-0.5">
            {Array.from({ length: 5 }).map((_, k) => (
              <Star key={k} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden />
            ))}
          </div>
          <p className="text-sm leading-relaxed text-white/85">
            &ldquo;{TESTIMONIAL.quote}&rdquo;
          </p>
          <div className="mt-4 flex items-center gap-3 border-t border-white/10 pt-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#1d4ed8] to-[#0a0a0c] text-[11px] font-extrabold">
              {TESTIMONIAL.initials}
            </span>
            <span>
              <p className="text-sm font-semibold">{TESTIMONIAL.name}</p>
              <p className="text-xs text-white/55">{TESTIMONIAL.meta}</p>
            </span>
          </div>
        </div>
      </aside>

      {/* ── Right form panel ────────────────────────────────────────────────── */}
      <main className="flex flex-1 flex-col">
        {/* Mobile header */}
        <header className="flex h-14 items-center border-b border-[var(--color-line)] bg-white px-6 lg:hidden">
          <BrandLogo variant="dark" className="h-7" />
        </header>

        <div className="flex flex-1 items-center justify-center bg-[var(--color-bg)] px-6 py-12">
          {children}
        </div>

        <footer className="border-t border-[var(--color-line)] bg-white px-6 py-4 text-center text-xs text-[var(--color-text-subtle)]">
          © 2026 ZSkillup · Future-ready graduates, future-strong institutions
        </footer>
      </main>
    </div>
  );
}
