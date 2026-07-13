import Link from 'next/link';
import {
  ArrowRight,
  Check,
  GraduationCap,
  Shield,
  Star,
  Target,
  Trophy,
  Sparkles,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Public /about page — Sprint 1 deliverable (Implementation Plan §7).
 * SSG by default (Server Component, no data fetch). Communicates positioning,
 * the four BRD success metrics, and the trust signals (security, transparency).
 */

const STATS = [
  { label: 'Students enrolled', value: '240,000+' },
  { label: 'Partner colleges', value: '1,200+' },
  { label: 'Average rating', value: '4.7', rating: true },
  { label: 'Placement success', value: '82%' },
];

const PILLARS = [
  {
    icon: Target,
    title: 'Real recruiter patterns',
    body: 'Every question is mapped to a real hiring pattern at TCS, Infosys, Wipro, Cognizant, Capgemini, Accenture and the product giants. No "general aptitude" filler.',
  },
  {
    icon: Trophy,
    title: 'Gamified, but honest',
    body: 'XP, streaks and badges are computed from a single append-only ledger - never edited, always reproducible. Every score the platform shows is the backend\'s honest answer, never invented in the browser.',
  },
  {
    icon: Users,
    title: 'Built for placement cells',
    body: 'TPOs onboard their whole cohort with a single CSV upload, with strict per-college tenant isolation. Cohort readiness analytics and exports are on the roadmap.',
  },
  {
    icon: Shield,
    title: 'Secure by default',
    body: 'Two-token auth with rotation and reuse detection. Tenant isolation in one place. No PII in URLs or logs. WCAG AA accessibility on every screen.',
  },
];

const PRINCIPLES = [
  'Backend is the only source of truth - XP, PPS and rank are never invented client-side',
  'Migrations only, never `synchronize: true` - the schema is reviewed code',
  'Heavy work runs async - exports, recompute, leaderboards never block the request path',
  'Every admin write produces an audit log',
  'No payments, video DRM or institutional SSO in v1 - features land deliberately',
];

export default function AboutPage() {
  return (
    <main className="bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden bg-navy text-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_100%_0%,rgba(243,112,33,0.18),transparent),radial-gradient(50%_50%_at_0%_100%,rgba(56,189,248,0.12),transparent)]"
        />
        <div className="relative mx-auto max-w-5xl px-4 py-20 sm:px-6 sm:py-28">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/60">
            About ZSkillup
          </p>
          <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight sm:text-[44px]">
            A measurable, gamified readiness loop -
            <br />
            <span className="text-orange">for the next generation of placements.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-white/70">
            ZSkillup is a campus placement preparation platform built around four things:
            recruiter-aligned content, server-graded practice, a transparent readiness signal, and
            tools that let TPOs act on their cohort&apos;s state in real time.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button size="lg" asChild>
              <Link href="/signup">
                <Sparkles className="size-4" aria-hidden="true" />
                Create free account
              </Link>
            </Button>
            <Link
              href="/dashboard/company"
              className="inline-flex h-12 items-center gap-1.5 rounded-full border border-white/20 px-6 text-[15px] font-semibold text-white/90 transition-colors hover:bg-white/5"
            >
              Browse companies
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-6 px-4 py-10 sm:grid-cols-4 sm:px-6">
          {STATS.map((s) => (
            <div key={s.label}>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                {s.label}
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-2xl font-extrabold text-navy sm:text-3xl">
                {s.value}
                {s.rating ? (
                  <Star className="size-5 fill-amber-400 text-amber-400" aria-hidden="true" />
                ) : null}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Pillars */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
          Why ZSkillup
        </p>
        <h2 className="mt-2 text-2xl font-bold text-navy sm:text-3xl">
          Four ideas that the platform refuses to compromise on.
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {PILLARS.map(({ icon: Icon, title, body }) => (
            <article
              key={title}
              className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <span className="grid size-11 place-items-center rounded-xl bg-sky-50 text-sky-600 ring-1 ring-sky-100">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-base font-bold text-navy">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* For TPOs */}
      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto grid max-w-5xl gap-8 px-6 py-16 lg:grid-cols-[1fr_1fr]">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              For Training & Placement Officers
            </p>
            <h2 className="mt-2 text-2xl font-bold text-navy sm:text-3xl">
              Decisions, not dashboards.
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-600">
              TPOs onboard their cohort with a single CSV upload, with tenant isolation that
              guarantees a TPO never sees another college&apos;s data. Cohort placement-readiness
              analytics - PPS distribution, at-risk students, branch comparison and exports - are on
              the roadmap.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {['Bulk student invite', 'Tenant isolation', 'Cohort analytics - roadmap', 'CSV / PDF export - roadmap'].map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-center">
            <div className="grid size-32 place-items-center rounded-2xl bg-navy/5 ring-1 ring-navy/10">
              <GraduationCap className="size-16 text-navy" aria-hidden="true" />
            </div>
          </div>
        </div>
      </section>

      {/* Engineering principles */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
          Engineering principles
        </p>
        <h2 className="mt-2 text-2xl font-bold text-navy sm:text-3xl">
          We optimise for correctness, security and DevEx - never speed.
        </h2>
        <ul className="mt-6 space-y-3">
          {PRINCIPLES.map((p) => (
            <li
              key={p}
              className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600">
                <Check className="size-3" aria-hidden="true" />
              </span>
              <span className="text-sm leading-relaxed text-slate-600">{p}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* CTA */}
      <section className="bg-white">
        <div className="mx-auto max-w-5xl px-6 py-16 text-center">
          <h2 className="text-2xl font-bold text-navy sm:text-3xl">
            Ready to start your placement journey?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-600">
            Create a free account in under a minute. We&apos;ll match you to the right tracks for
            your campus drives.
          </p>
          <Button size="lg" className="mt-6" asChild>
            <Link href="/signup">
              Get started
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
