'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  FileText,
  Gauge,
  LayoutGrid,
  ListChecks,
  MessageSquare,
  PlayCircle,
  Sparkles,
  Star,
  Target,
  Trophy,
  Users,
} from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { cn } from '@/lib/utils';
import { HUB_TABS, type HubContent, type HubTab } from '@/lib/hub-data';
import { AnimatedNumber, AuroraBackground, Reveal, Stagger, StaggerItem } from '@/components/motion/primitives';
import { LockedRow } from './LockedRow';
import { CompanyPrepPanel } from './CompanyPrepPanel';

const TAB_ICONS: Record<HubTab, typeof BookOpen> = {
  Overview: LayoutGrid,
  Syllabus: ClipboardList,
  Material: BookOpen,
  'Practice Quiz': ListChecks,
  'Full Mock Assessment': Trophy,
  'Formula Sheet': FileText,
  'Interview Experience': MessageSquare,
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

  const onUnlock = () =>
    // Production opens <PurchasePromptDrawer/> with an API-computed price. Demo stub.
    window.alert('This unlocks with ZSkillup Plus. Pricing is computed server-side at checkout.');

  return (
    <div className="mx-auto max-w-6xl px-5 py-6 sm:px-6">
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
            {tab === 'Material' && <MaterialTab content={content} onUnlock={onUnlock} />}
            {tab === 'Practice Quiz' && (
              <CompanyPrepPanel
                companySlug={content.company.slug}
                companyName={content.company.name}
              />
            )}
            {tab === 'Full Mock Assessment' && <MockTab content={content} onUnlock={onUnlock} />}
            {tab === 'Formula Sheet' && <FormulaTab content={content} onUnlock={onUnlock} />}
            {tab === 'Interview Experience' && <InterviewTab content={content} />}
          </motion.div>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          {/* Drive walkthrough — dark glass companion card */}
          <div className="relative isolate overflow-hidden rounded-3xl p-5 text-white shadow-[0_24px_60px_-30px_rgba(11,18,32,0.8)]">
            <AuroraBackground />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-inset ring-white/10"
            />
            <div className="relative z-10">
              <span className="flex size-10 items-center justify-center rounded-xl border border-white/15 bg-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur">
                <PlayCircle className="size-5 text-[#ffb877]" />
              </span>
              <p className="mt-3 text-sm font-bold">Drive walkthrough</p>
              <p className="mt-1 text-xs leading-relaxed text-white/65">
                Company-specific overview for this hub.
              </p>
              <button
                type="button"
                disabled
                title="Walkthrough videos arrive with the company-content release"
                className="mt-4 w-full rounded-full bg-white px-3 py-2 text-sm font-extrabold text-navy shadow-[0_8px_22px_-10px_rgba(0,0,0,0.5)] transition-colors disabled:cursor-not-allowed disabled:opacity-60"
              >
                Watch overview
              </button>
            </div>
          </div>

          {/* Quick stats — crisp white Aurora card */}
          <AuroraCard glow="#2563eb">
            <SectionLabel icon={Gauge}>Quick stats</SectionLabel>
            <div className="mt-3 divide-y divide-slate-100">
              <Stat label="Total rounds" value={String(content.quickStats.rounds)} />
              <Stat label="Type of exam" value={content.quickStats.examType} />
              <Stat label="Negative marking" value={content.quickStats.negativeMarking} />
              <Stat label="Applicants (est.)" value={content.quickStats.applicants} />
              <Stat label="Company readiness" value={content.quickStats.readiness} accent />
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
              href="/mock-tests"
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
              {content.quickStats.rounds} rounds · {content.quickStats.examType}
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

/** Tiny uppercase section eyebrow. */
function SectionLabel({ icon: Icon, children }: { icon?: typeof Gauge; children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
      {Icon ? <Icon className="size-3.5" aria-hidden="true" /> : null}
      {children}
    </p>
  );
}

/** Crisp white Aurora card — gradient wash + colored glow on hover-lift. */
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
        'group relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_-18px_rgba(15,23,42,0.35)] transition-shadow hover:shadow-[0_18px_50px_-24px_rgba(15,23,42,0.45)] sm:p-6',
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-slate-50/70 via-transparent to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-12 size-32 rounded-full opacity-[0.08] blur-2xl transition-opacity duration-500 group-hover:opacity-20"
        style={{ background: glow }}
      />
      <div className="relative z-10">{children}</div>
    </section>
  );
}

/** Intro line shared by the freemium tabs. */
function TabIntro({ children }: { children: React.ReactNode }) {
  return (
    <Reveal>
      <p className="text-sm leading-relaxed text-slate-500">{children}</p>
    </Reveal>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 text-sm">
      <span className="text-slate-500">{label}</span>
      {accent ? (
        <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-extrabold text-emerald-600 ring-1 ring-emerald-200">
          {value}
        </span>
      ) : (
        <span className="text-right font-semibold text-navy">{value}</span>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Tabs                                                                         */
/* ────────────────────────────────────────────────────────────────────────── */

function OverviewTab({ content }: { content: HubContent }) {
  const GROUP_GLOWS = ['#f37021', '#6d3bf5', '#2563eb'];
  return (
    <div className="space-y-6">
      <Reveal>
        <AuroraCard glow="#f37021">
          <SectionLabel icon={Sparkles}>Hiring process 2026</SectionLabel>
          <h2 className="mt-2 text-xl font-extrabold tracking-tight text-navy">
            {content.company.name} hiring process
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">{content.overview.summary}</p>

          {/* Process timeline */}
          <ol className="relative mt-6 space-y-5">
            <span
              aria-hidden
              className="absolute left-[15px] top-2 bottom-2 w-px bg-gradient-to-b from-orange/40 via-slate-200 to-transparent"
            />
            {content.overview.process.map((p, i) => (
              <li key={p.stage} className="relative flex gap-4">
                <span className="relative z-10 grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#f7a14e] to-[#f37021] text-xs font-extrabold text-white shadow-[0_8px_18px_-8px_rgba(243,112,33,0.8)] ring-4 ring-white">
                  {i + 1}
                </span>
                <div className="pt-0.5">
                  <p className="text-sm font-bold text-navy">{p.stage}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{p.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </AuroraCard>
      </Reveal>

      <div>
        <Reveal>
          <h3 className="mb-3 flex items-center gap-2 text-lg font-extrabold tracking-tight text-navy">
            <Target className="size-4 text-orange" aria-hidden="true" /> Topic grid
          </h3>
        </Reveal>
        <Stagger className="space-y-4">
          {content.overview.topicGrid.map((g, gi) => (
            <StaggerItem key={g.group}>
              <AuroraCard glow={GROUP_GLOWS[gi % GROUP_GLOWS.length]}>
                <SectionLabel>{g.group}</SectionLabel>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {g.topics.map((t) => (
                    <motion.span
                      key={t}
                      whileHover={{ y: -2 }}
                      transition={{ duration: 0.2 }}
                      className="rounded-xl border border-slate-200/80 bg-white px-3 py-2.5 text-sm font-medium text-navy shadow-sm transition-colors hover:border-orange/40 hover:bg-orange/[0.04]"
                    >
                      {t}
                    </motion.span>
                  ))}
                </div>
              </AuroraCard>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </div>
  );
}

function SyllabusTab({ content }: { content: HubContent }) {
  return (
    <Reveal>
      <AuroraCard glow="#6d3bf5">
        <SectionLabel icon={ClipboardList}>Syllabus 2026</SectionLabel>
        <h2 className="mt-2 text-xl font-extrabold tracking-tight text-navy">
          {content.company.name} syllabus
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-500">
          The drive is usually structured in {content.quickStats.rounds} online stages before interviews.
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
                    'group/row relative flex items-center gap-4 overflow-hidden rounded-2xl border p-3.5 transition-colors',
                    final
                      ? 'border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50'
                      : 'border-slate-200/80 bg-white hover:border-slate-300',
                  )}
                >
                  <span
                    className={cn(
                      'grid size-9 shrink-0 place-items-center rounded-xl text-xs font-extrabold text-white shadow-sm',
                      final
                        ? 'bg-gradient-to-br from-emerald-500 to-emerald-600'
                        : 'bg-gradient-to-br from-[#7c6cf5] to-[#5b3bf5]',
                    )}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-navy">{r.round}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{r.info}</p>
                  </div>
                  <span
                    className={cn(
                      'shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1',
                      final
                        ? 'bg-emerald-100 text-emerald-700 ring-emerald-200'
                        : 'bg-slate-100 text-slate-600 ring-slate-200',
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

function MaterialTab({ content, onUnlock }: { content: HubContent; onUnlock: () => void }) {
  return (
    <div className="space-y-4">
      <TabIntro>
        Concept + question-solving videos. The first topic is free; the rest unlock with Plus.
      </TabIntro>
      <Stagger className="space-y-3">
        {content.material.map((m) => (
          <StaggerItem key={m.topic}>
            <LockedRow locked={m.locked} onUnlockClick={onUnlock}>
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    'grid size-10 shrink-0 place-items-center rounded-xl text-white shadow-sm',
                    m.locked
                      ? 'bg-gradient-to-br from-slate-400 to-slate-500'
                      : 'bg-gradient-to-br from-[#f7a14e] to-[#f37021]',
                  )}
                >
                  <PlayCircle className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-bold text-navy">{m.topic}</p>
                  <p className="text-xs text-slate-500">{m.videos} videos</p>
                </div>
              </div>
              {!m.locked ? <FreeBadge /> : null}
            </LockedRow>
          </StaggerItem>
        ))}
      </Stagger>
    </div>
  );
}

function MockTab({ content, onUnlock }: { content: HubContent; onUnlock: () => void }) {
  // The free mock launches the real timed mock engine (catalog → start → graded
  // report). Locked mocks stay on the upsell path.
  return (
    <div className="space-y-4">
      <TabIntro>
        5 full mocks + 1 live contest. 1 mock is free; analytics unlock after upgrade.
      </TabIntro>
      <Stagger className="space-y-3">
        {content.mocks.map((m) => {
          const contest = m.kind === 'contest';
          return (
            <StaggerItem key={m.title}>
              <LockedRow
                locked={m.locked}
                href={m.locked ? undefined : '/mock-tests'}
                onUnlockClick={onUnlock}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      'grid size-10 shrink-0 place-items-center rounded-xl text-white shadow-sm',
                      m.locked
                        ? 'bg-gradient-to-br from-slate-400 to-slate-500'
                        : contest
                          ? 'bg-gradient-to-br from-[#ff8a4c] to-[#f5491e]'
                          : 'bg-gradient-to-br from-[#7c6cf5] to-[#5b3bf5]',
                    )}
                  >
                    <Trophy className="size-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="flex items-center gap-2 font-bold text-navy">
                      {m.title}
                      {contest ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-orange/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-orange">
                          <span className="relative flex size-1.5">
                            <span className="absolute inline-flex size-full animate-ping rounded-full bg-orange opacity-70" />
                            <span className="relative inline-flex size-1.5 rounded-full bg-orange" />
                          </span>
                          Live
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-slate-500">
                      {m.questions} questions · {m.minutes} min · timed
                    </p>
                  </div>
                </div>
                {!m.locked ? <FreeBadge /> : null}
              </LockedRow>
            </StaggerItem>
          );
        })}
      </Stagger>
    </div>
  );
}

function FormulaTab({ content, onUnlock }: { content: HubContent; onUnlock: () => void }) {
  return (
    <div className="space-y-4">
      <TabIntro>Quick-revision cheat sheets. Partial free, full sheet with Plus.</TabIntro>
      <Stagger className="space-y-3">
        {content.formulaSheets.map((f) => (
          <StaggerItem key={f.topic}>
            <LockedRow locked={f.locked} onUnlockClick={onUnlock}>
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    'grid size-10 shrink-0 place-items-center rounded-xl text-white shadow-sm',
                    f.locked
                      ? 'bg-gradient-to-br from-slate-400 to-slate-500'
                      : 'bg-gradient-to-br from-[#34d399] to-[#059669]',
                  )}
                >
                  <FileText className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-bold text-navy">{f.topic}</p>
                  <p className="text-xs text-slate-500">Formula &amp; shortcut sheet</p>
                </div>
              </div>
              {!f.locked ? <FreeBadge /> : null}
            </LockedRow>
          </StaggerItem>
        ))}
      </Stagger>
    </div>
  );
}

function InterviewTab({ content }: { content: HubContent }) {
  return (
    <div className="space-y-4">
      <TabIntro>Real candidate experiences — fully free.</TabIntro>
      <Stagger className="space-y-4">
        {content.interviews.map((iv, i) => {
          const selected = iv.verdict === 'Selected';
          return (
            <StaggerItem key={i}>
              <AuroraCard glow={selected ? '#059669' : '#ef4444'}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-extrabold text-navy">
                      {iv.role} <span className="text-slate-400">· {iv.year}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">{iv.rounds} rounds</p>
                  </div>
                  <span
                    className={cn(
                      'inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1',
                      selected
                        ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                        : 'bg-red-50 text-red-700 ring-red-200',
                    )}
                  >
                    <CheckCircle2 className="size-3" aria-hidden="true" />
                    {iv.verdict}
                  </span>
                </div>
                <p className="mt-3 border-l-2 border-slate-200 pl-3 text-sm leading-relaxed text-slate-700">
                  {iv.excerpt}
                </p>
              </AuroraCard>
            </StaggerItem>
          );
        })}
      </Stagger>
    </div>
  );
}

function FreeBadge() {
  return (
    <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600 ring-1 ring-emerald-200">
      Free
    </span>
  );
}
