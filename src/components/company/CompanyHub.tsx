'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  BookOpen,
  ClipboardList,
  Code2,
  Gauge,
  LayoutGrid,
  ListChecks,
  Sparkles,
  Star,
  Target,
  Trophy,
  Users,
} from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { CompanyRegisterCard } from '@/components/company/CompanyRegisterCard';
import { cn } from '@/lib/utils';
import { HUB_TABS, type HubContent, type HubTab } from '@/lib/hub-data';
import { AnimatedNumber, AuroraBackground, Reveal, Stagger, StaggerItem } from '@/components/motion/primitives';
import { CompanyPrepPanel } from './CompanyPrepPanel';
import { CompanyMockTab as MockTab } from './CompanyMockTab';
import { CodingProblemsList } from '@/components/coding/CodingProblemsList';

const TAB_ICONS: Record<HubTab, typeof BookOpen> = {
  Overview: LayoutGrid,
  Syllabus: ClipboardList,
  'Practice Quiz': ListChecks,
  Coding: Code2,
  'Full Mock Assessment': Trophy,
};

/** Pull the leading integer out of a readiness string like "74%" → 74. */
function parsePct(raw: string): number | null {
  const m = raw.match(/-?\d+(\.\d+)?/);
  if (!m) return null;
  const n = Math.round(Number(m[0]));
  if (Number.isNaN(n)) return null;
  return Math.max(0, Math.min(100, n));
}

/**
 * Single source of truth for "rounds" so the headline count, the quick-stat, and
 * the syllabus list can never drift apart.
 *
 * RCA: the seed authored `quickStats.rounds` (a raw number), `overview.process`,
 * and `syllabus[]` independently — Infosys showed "3 online stages" while the
 * list rendered 6 rows. We now derive both counts from the syllabus array and
 * only fall back to the stored number when a hub has no syllabus rows.
 *
 * - totalRounds  = every stage in the syllabus (incl. the final interview)
 * - onlineStages = stages that happen online, *before* the final interview
 */
function roundCounts(content: HubContent): { totalRounds: number; onlineStages: number } {
  const syllabus = content.syllabus ?? [];
  if (syllabus.length === 0) {
    const r = content.quickStats.rounds;
    return { totalRounds: r, onlineStages: Math.max(1, r - 1) };
  }
  const onlineStages = syllabus.filter((r) => r.type !== 'Final').length;
  return { totalRounds: syllabus.length, onlineStages: onlineStages || syllabus.length };
}

/**
 * Company hub — the ONE 7-tab template (COMPANY_HUB_SPEC). All 9 hubs are
 * content instances of this. Client component because the tabs are interactive;
 * content is seeded and passed in from the server page. No left sidebar inside
 * the hub (spec §1) — top tabs only.
 *
 * Aurora redesign: a dramatic dark hero carries the company identity + an
 * animated readiness ring, then a sticky glass tab bar drives crafted white
 * Aurora cards (layered glow + gradient washes) with scroll reveals.
 */
export function CompanyHub({ content }: { content: HubContent }) {
  const [tab, setTab] = useState<HubTab>('Overview');
  const c = content.company;
  const reduce = useReducedMotion();

  return (
    <div className="w-full">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Companies', href: '/dashboard/company' },
          { label: c.name },
        ]}
      />

      {/* ── Hero — dramatic aurora company identity + readiness ──────────── */}
      <CompanyHero content={content} reduce={!!reduce} />

      {/* ── Sticky glass tab bar (7, canonical) ─────────────────────────── */}
      <div className="sticky top-2 z-30 mt-6">
        <div
          className="flex gap-1 overflow-x-auto rounded-2xl border border-slate-200/80 bg-white/80 p-1.5 shadow-[0_8px_30px_-18px_rgba(15,23,42,0.35)] backdrop-blur-xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label="Company hub"
        >
          {HUB_TABS.map((t) => {
            const Icon = TAB_ICONS[t];
            const active = tab === t;
            return (
              <button
                key={t}
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t)}
                className={cn(
                  'relative flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors',
                  active ? 'text-white' : 'text-slate-500 hover:text-navy',
                )}
              >
                {active && (
                  <motion.span
                    layoutId="hub-tab-pill"
                    className="absolute inset-0 -z-10 rounded-xl bg-gradient-to-b from-[#1f2d4d] to-[#0b1220] shadow-[0_10px_24px_-10px_rgba(11,18,32,0.7)]"
                    transition={{ type: 'spring', stiffness: 480, damping: 38 }}
                  />
                )}
                <Icon
                  className={cn('size-4 transition-colors', active ? 'text-[#ffb877]' : 'text-slate-400')}
                  aria-hidden="true"
                />
                {t}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Content + quick-stats rail ──────────────────────────────────── */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_19rem]">
        <div className="min-w-0">
          {/* Re-mount per tab so the reveal/stagger plays on switch. */}
          <motion.div
            key={tab}
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            {tab === 'Overview' && <OverviewTab content={content} />}
            {tab === 'Syllabus' && <SyllabusTab content={content} />}
            {tab === 'Practice Quiz' && (
              <CompanyPrepPanel
                companySlug={content.company.slug}
                companyName={content.company.name}
              />
            )}
            {tab === 'Coding' && (
              <div className="space-y-4">
                <div>
                  <SectionLabel icon={Code2}>Coding problems</SectionLabel>
                  <h2 className="mt-3 text-lg font-extrabold tracking-tight text-navy sm:text-xl">
                    {content.company.name} coding questions
                  </h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
                    Problems this company has asked — solve in your language, run the samples, then
                    submit to grade against the full test set and earn XP.
                  </p>
                </div>
                <CodingProblemsList company={content.company.slug} />
              </div>
            )}
            {tab === 'Full Mock Assessment' && <MockTab content={content} />}
          </motion.div>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          {/* Register for this drive (assessment lifecycle) */}
          <CompanyRegisterCard companySlug={c.slug} companyName={c.name} />

          {/* Quick stats — standout violet Aurora card */}
          <AuroraCard glow="#7c3aed">
            <SectionLabel icon={Gauge}>Quick stats</SectionLabel>
            <div className="mt-4 space-y-2">
              <Stat label="Total rounds" value={String(roundCounts(content).totalRounds)} />
              <Stat label="Type of exam" value={content.quickStats.examType} />
              <Stat label="Negative marking" value={content.quickStats.negativeMarking} />
              <Stat label="Applicants (est.)" value={content.quickStats.applicants} />
              <Stat label="Competitiveness" value={content.quickStats.readiness} accent />
              <Stat label="Open roles (est.)" value={content.quickStats.openRoles} />
            </div>
          </AuroraCard>
        </aside>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Hero                                                                         */
/* ────────────────────────────────────────────────────────────────────────── */

function CompanyHero({ content, reduce }: { content: HubContent; reduce: boolean }) {
  const c = content.company;
  const initials = c.name.slice(0, 2).toUpperCase();
  const readyPct = useMemo(() => parsePct(content.quickStats.readiness), [content.quickStats.readiness]);

  const facts: Array<{ icon: typeof Star; label: string; value: string }> = [
    { icon: Star, label: 'Rating', value: c.rating.toFixed(1) },
    { icon: Users, label: 'Enrolled', value: c.enrolled },
    { icon: Target, label: 'Difficulty', value: c.difficulty },
    { icon: ListChecks, label: 'Question bank', value: c.mcqs },
  ];

  return (
    <section className="relative isolate overflow-hidden rounded-[1.75rem] p-6 text-white shadow-[0_30px_90px_-32px_rgba(11,18,32,0.85)] sm:rounded-[2rem] sm:p-9">
      <AuroraBackground />

      {/* layered depth — top highlight + inner ring */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[1.75rem] ring-1 ring-inset ring-white/10 sm:rounded-[2rem]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent"
      />

      <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
        {/* Identity */}
        <div className="min-w-0 max-w-2xl">
          <motion.div
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.08] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-white/75 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur"
            initial={reduce ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Sparkles className="size-3.5 text-[#ffb877]" />
            Company hub
            {c.badge ? (
              <>
                <span aria-hidden className="size-1 rounded-full bg-white/30" />
                <span className="text-[#ffb877]">{c.badge}</span>
              </>
            ) : null}
          </motion.div>

          <div className="mt-6 flex items-center gap-4">
            <motion.span
              className={cn(
                'grid size-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br text-xl font-extrabold text-white shadow-[0_14px_34px_-10px_rgba(0,0,0,0.6)] ring-1 ring-white/15',
                c.accent,
              )}
              initial={reduce ? false : { opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
            >
              {initials}
            </motion.span>
            <div className="min-w-0">
              <motion.h1
                className="bg-gradient-to-b from-white to-white/70 bg-clip-text text-3xl font-extrabold leading-[1.05] tracking-tight text-transparent sm:text-[40px]"
                initial={reduce ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.08 }}
              >
                {c.name}
              </motion.h1>
              <motion.p
                className="mt-1 truncate text-sm text-white/65 sm:text-base"
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.16 }}
              >
                {c.tagline}
              </motion.p>
            </div>
          </div>

          {/* Fact chips */}
          <div className="mt-7 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {facts.map((f, i) => (
              <motion.div
                key={f.label}
                className="rounded-2xl border border-white/10 bg-white/[0.06] px-3.5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur"
                initial={reduce ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.22 + i * 0.07 }}
              >
                <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/45">
                  <f.icon className="size-3 text-[#ffb877]" aria-hidden="true" />
                  {f.label}
                </span>
                <p className="mt-1 truncate text-sm font-extrabold text-white">{f.value}</p>
              </motion.div>
            ))}
          </div>

          {/* CTAs */}
          <motion.div
            className="mt-7 flex flex-wrap gap-3"
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <Link
              href={`/practice?company=${c.slug}`}
              className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-gradient-to-b from-[#f7a14e] to-[#f37021] px-5 py-2.5 text-sm font-extrabold text-white shadow-[0_14px_34px_-10px_rgba(243,112,33,0.85)] transition-transform hover:-translate-y-0.5 active:scale-[0.98]"
            >
              <span
                aria-hidden
                className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full"
              />
              <BookOpen className="size-4" aria-hidden="true" /> Practice topics
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/mock-assessment"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.08] px-5 py-2.5 text-sm font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur transition-colors hover:bg-white/[0.14]"
            >
              <Trophy className="size-4" aria-hidden="true" /> Timed assessment
            </Link>
          </motion.div>
        </div>

        {/* Readiness ring */}
        <motion.div
          className="mx-auto w-full max-w-xs shrink-0 lg:mx-0 lg:w-64"
          initial={reduce ? false : { opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06] p-6 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur">
            <ReadinessRing pct={readyPct} raw={content.quickStats.readiness} reduce={reduce} />
            <p className="mt-4 text-[11px] font-semibold uppercase tracking-widest text-white/50">
              Community readiness
            </p>
            <p className="mt-1 text-xs leading-relaxed text-white/55">
              {roundCounts(content).totalRounds} rounds · {content.quickStats.examType}
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function ReadinessRing({ pct, raw, reduce }: { pct: number | null; raw: string; reduce: boolean }) {
  const R = 52;
  const C = 2 * Math.PI * R;
  const value = pct ?? 0;
  const dash = (value / 100) * C;

  return (
    <div className="relative mx-auto size-36">
      <svg viewBox="0 0 120 120" className="size-full -rotate-90">
        <defs>
          <linearGradient id="readyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f7a14e" />
            <stop offset="55%" stopColor="#f37021" />
            <stop offset="100%" stopColor="#6d3bf5" />
          </linearGradient>
        </defs>
        <circle cx="60" cy="60" r={R} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="10" />
        <motion.circle
          cx="60"
          cy="60"
          r={R}
          fill="none"
          stroke="url(#readyGrad)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={C}
          initial={reduce ? { strokeDashoffset: C - dash } : { strokeDashoffset: C }}
          animate={{ strokeDashoffset: C - dash }}
          transition={{ duration: 1.2, delay: 0.5, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {pct === null ? (
          <span className="text-2xl font-extrabold tabular-nums text-white">{raw}</span>
        ) : (
          <span className="text-4xl font-extrabold tabular-nums text-white">
            <AnimatedNumber value={pct} />
            <span className="text-2xl text-white/70">%</span>
          </span>
        )}
        <span className="mt-0.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-[#ffb877]">
          <Gauge className="size-3" aria-hidden="true" /> ready
        </span>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Shared building blocks                                                       */
/* ────────────────────────────────────────────────────────────────────────── */

/** Violet eyebrow pill — shared section label for the employer hub. */
function SectionLabel({ icon: Icon, children }: { icon?: typeof Gauge; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-violet-600 ring-1 ring-inset ring-violet-100">
      {Icon ? <Icon className="size-3.5" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}

/** Standout white Aurora card — violet-tinted shadow + colored glow on hover-lift. */
function AuroraCard({
  glow,
  className,
  children,
}: {
  glow: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        'group relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_18px_50px_-30px_rgba(124,58,237,0.22)] transition-shadow hover:shadow-[0_24px_60px_-28px_rgba(124,58,237,0.35)] sm:p-7',
        className,
      )}
    >
      {/* violet accent rail */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-500/0 via-violet-500/70 to-violet-500/0"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-50/60 via-transparent to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-12 size-36 rounded-full opacity-[0.1] blur-2xl transition-opacity duration-500 group-hover:opacity-25"
        style={{ background: glow }}
      />
      <div className="relative z-10">{children}</div>
    </section>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  // Values range from short numbers ("6", "No", "60%") to long phrases
  // ("InfyTQ / SE assessment + SP/DSE coding"). Scale the type to the content so
  // short values read big & bold while long ones wrap cleanly instead of
  // overflowing/clipping the tile.
  // Two tiers only — short values (numbers/%) read big & bold, everything longer
  // sits one consistent size and wraps. The label reserves two lines so values
  // start at the same height across every tile (consistent alignment).
  const isShort = value.trim().length <= 6;
  return (
    <div
      className={cn(
        'rounded-xl border p-3',
        accent ? 'border-violet-200 bg-violet-50/70' : 'border-slate-200/80 bg-slate-50/60',
      )}
    >
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p
        className={cn(
          'mt-0.5 break-words leading-snug',
          isShort ? 'text-lg font-black tracking-tight tabular-nums' : 'text-[13px] font-bold',
          accent ? 'text-violet-600' : 'text-navy',
        )}
      >
        {value}
      </p>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Tabs                                                                         */
/* ────────────────────────────────────────────────────────────────────────── */

function OverviewTab({ content }: { content: HubContent }) {
  return (
    <div className="space-y-6">
      <Reveal>
        <AuroraCard glow="#7c3aed">
          <SectionLabel icon={Sparkles}>Hiring process 2026</SectionLabel>
          <h2 className="mt-3 text-lg font-extrabold tracking-tight text-navy sm:text-xl">
            {content.company.name} hiring process
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-500 sm:text-base">{content.overview.summary}</p>

          {/* Process timeline */}
          <ol className="relative mt-6 space-y-5">
            <span
              aria-hidden
              className="absolute left-[15px] top-2 bottom-2 w-px bg-gradient-to-b from-violet-400/50 via-slate-200 to-transparent"
            />
            {content.overview.process.map((p, i) => (
              <li key={p.stage} className="relative flex gap-4">
                <span className="relative z-10 grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-violet-600 text-xs font-extrabold text-white shadow-[0_8px_18px_-8px_rgba(124,58,237,0.8)] ring-4 ring-white">
                  {i + 1}
                </span>
                <div className="pt-0.5">
                  <p className="text-sm font-bold text-navy sm:text-base">{p.stage}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-500 sm:text-sm">{p.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </AuroraCard>
      </Reveal>
    </div>
  );
}

function SyllabusTab({ content }: { content: HubContent }) {
  return (
    <Reveal>
      <AuroraCard glow="#7c3aed">
        <SectionLabel icon={ClipboardList}>Syllabus 2026</SectionLabel>
        <h2 className="mt-3 text-lg font-extrabold tracking-tight text-navy sm:text-xl">
          {content.company.name} syllabus
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-500 sm:text-base">
          The drive is usually structured in {roundCounts(content).onlineStages} online stages before
          interviews, then a final interview round.
        </p>

        {/* Round cards (a table on a phone is unkind) */}
        <Stagger className="mt-5 space-y-2.5">
          {content.syllabus.map((r, i) => {
            const final = r.type === 'Final';
            return (
              <StaggerItem key={r.round}>
                <motion.div
                  whileHover={{ y: -2 }}
                  transition={{ duration: 0.2 }}
                  className={cn(
                    'group/row relative flex items-center gap-4 overflow-hidden rounded-2xl border p-4 transition-colors',
                    final
                      ? 'border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50'
                      : 'border-slate-200/80 bg-white hover:border-violet-300 hover:bg-violet-50/40',
                  )}
                >
                  <span
                    className={cn(
                      'grid size-10 shrink-0 place-items-center rounded-xl text-sm font-extrabold text-white shadow-sm',
                      final
                        ? 'bg-gradient-to-br from-emerald-500 to-emerald-600'
                        : 'bg-gradient-to-br from-violet-500 to-violet-600',
                    )}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-navy sm:text-base">{r.round}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{r.info}</p>
                  </div>
                  <span
                    className={cn(
                      'shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1',
                      final
                        ? 'bg-emerald-100 text-emerald-700 ring-emerald-200'
                        : 'bg-violet-100 text-violet-700 ring-violet-200',
                    )}
                  >
                    {r.type}
                  </span>
                </motion.div>
              </StaggerItem>
            );
          })}
        </Stagger>
      </AuroraCard>
    </Reveal>
  );
}
