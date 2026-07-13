'use client';

import { useEffect, useState } from 'react';
import { formatDateIN } from '@/lib/format';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowUpRight,
  Crosshair,
  Gauge,
  Loader2,
  Target,
  Timer,
  TrendingUp,
  Trophy,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { StatusPill } from '@/components/student/StatusPill';
import {
  AnimatedNumber,
  Reveal,
  Stagger,
  StaggerItem,
} from '@/components/motion/primitives';
import {
  getPracticeAccuracy,
  getTopicAccuracy,
  type ApiAccuracy,
  type ApiTopicAccuracy,
} from '@/lib/api/practice';
import { getMockHistory, type ApiMockAttemptHistory } from '@/lib/api/mocks';

/**
 * Performance report — fully live (Sprint 3 exit: "reports show accuracy" +
 * the Sprint 4 mock report surface). Practice numbers come from
 * `GET /practice/accuracy` (+ per-topic), assessment numbers from
 * `GET /mocks/attempts/mine`. The PPS readiness score arrives in Sprint 7.
 */
export function PerformanceLive() {
  const [accuracy, setAccuracy] = useState<ApiAccuracy | null>(null);
  const [topics, setTopics] = useState<ApiTopicAccuracy[] | null>(null);
  const [mocks, setMocks] = useState<ApiMockAttemptHistory[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([getPracticeAccuracy(), getTopicAccuracy(), getMockHistory()]).then(
      ([a, t, m]) => {
        if (cancelled) return;
        if (a.status === 'fulfilled') setAccuracy(a.value);
        if (t.status === 'fulfilled') setTopics(t.value);
        if (m.status === 'fulfilled') setMocks(m.value);
        setLoading(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-3xl border border-slate-200/80 bg-white p-16">
        <Loader2 className="size-5 animate-spin text-slate-400" aria-hidden="true" />
      </div>
    );
  }

  const weak = (topics ?? []).filter((t) => t.total >= 3 && t.accuracyPct < 60);

  const hasAccuracy = !!(accuracy && accuracy.total > 0);
  const accuracyPct = hasAccuracy ? accuracy.accuracyPct : 0;
  const bestMock =
    mocks && mocks.length > 0 ? Math.max(...mocks.map((m) => m.pct)) : null;

  const kpis: Array<{
    label: string;
    value: number;
    suffix?: string;
    fallback?: string;
    sub: string;
    icon: typeof Target;
    from: string;
    to: string;
  }> = [
    {
      label: 'Questions attempted',
      value: accuracy ? accuracy.total : 0,
      fallback: accuracy ? undefined : '—',
      sub: 'server-graded',
      icon: Crosshair,
      from: '#7c6cf5',
      to: '#5b3bf5',
    },
    {
      label: 'Avg speed',
      value: hasAccuracy ? accuracy.avgTimeSec : 0,
      suffix: 's',
      fallback: hasAccuracy ? undefined : '—',
      sub: 'per question',
      icon: Timer,
      from: '#1e6ff5',
      to: '#2563eb',
    },
    {
      label: 'Mock tests',
      value: mocks ? mocks.length : 0,
      fallback: mocks ? undefined : '—',
      sub: bestMock !== null ? `best ${bestMock}%` : 'none taken yet',
      icon: Trophy,
      from: '#34d399',
      to: '#059669',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Stat hero — featured accuracy ring + supporting KPIs on dark aurora glass */}
      <Reveal>
        <PerformanceHero
          accuracyPct={accuracyPct}
          hasAccuracy={hasAccuracy}
          correct={hasAccuracy ? accuracy.correct : 0}
          total={hasAccuracy ? accuracy.total : 0}
          kpis={kpis}
        />
      </Reveal>

      {/* Topic-wise accuracy */}
      <Reveal>
        <SectionCard
          glow="#f5b400"
          icon={TrendingUp}
          eyebrow="Topic-wise Accuracy"
          title="How each topic is trending"
        >
          {topics === null || topics.length === 0 ? (
            <EmptyState
              title="No practice data yet."
              detail="Attempt a few questions and your per-topic accuracy appears here."
              href="/practice"
              cta="Start practising"
            />
          ) : (
            <Stagger className="space-y-3.5">
              {topics.map((t) => {
                const tone = barTone(t.accuracyPct);
                return (
                  <StaggerItem key={t.topicSlug}>
                    <div className="group/row rounded-2xl px-3 py-2.5 -mx-3 transition-colors hover:bg-slate-50/80">
                      <div className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-2 text-sm font-semibold text-navy">
                          <span
                            aria-hidden
                            className={cn('size-1.5 shrink-0 rounded-full', tone.dot)}
                          />
                          <span className="truncate">{t.topicName}</span>
                        </span>
                        <span className="shrink-0 text-sm font-extrabold tabular-nums text-navy">
                          {t.accuracyPct}%{' '}
                          <span className="text-xs font-normal text-slate-400">
                            ({t.correct}/{t.total})
                          </span>
                        </span>
                      </div>
                      <AccuracyBar value={t.accuracyPct} tone={tone} label={`${t.topicName} accuracy`} />
                    </div>
                  </StaggerItem>
                );
              })}
            </Stagger>
          )}
        </SectionCard>
      </Reveal>

      {/* Weak areas */}
      {weak.length > 0 ? (
        <section>
          <p className="mb-4 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
            <Target className="size-3.5 text-red-400" aria-hidden="true" />
            Weak Areas
          </p>
          <Stagger className="grid gap-4 sm:grid-cols-3">
            {weak.slice(0, 3).map((t) => (
              <StaggerItem key={t.topicSlug} className="h-full">
                <motion.div
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.2 }}
                  className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-red-200/80 bg-white p-5"
                >
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 bg-gradient-to-br from-red-50/70 via-transparent to-transparent"
                  />
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -right-10 -top-12 size-32 rounded-full bg-red-500 opacity-[0.08] blur-2xl transition-opacity duration-500 group-hover:opacity-20"
                  />
                  <div className="relative z-10 flex flex-1 flex-col">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <p className="truncate font-bold text-navy">{t.topicName}</p>
                      <span className="shrink-0 rounded-full bg-red-50 px-2.5 py-0.5 text-[11px] font-extrabold tabular-nums text-red-700 ring-1 ring-red-200">
                        {t.accuracyPct}%
                      </span>
                    </div>
                    <AccuracyBar value={t.accuracyPct} tone={barTone(t.accuracyPct)} label={`${t.topicName} accuracy`} />
                    <p className="mt-3 text-sm leading-relaxed text-slate-600">
                      {t.correct} of {t.total} correct — drill this topic to pull the average up.
                    </p>
                    <Button asChild size="sm" variant="outline" className="mt-4 w-fit">
                      <Link href={`/dashboard/quiz/adaptive?topic=${encodeURIComponent(t.topicSlug)}`}>Drill now</Link>
                    </Button>
                  </div>
                </motion.div>
              </StaggerItem>
            ))}
          </Stagger>
        </section>
      ) : null}

      {/* Mock assessment results */}
      <Reveal>
        <SectionCard
          glow="#6d3bf5"
          icon={Trophy}
          eyebrow="Mock Assessment Results"
          title="Your timed mock history"
        >
          {mocks === null || mocks.length === 0 ? (
            <EmptyState
              title="No mock tests taken yet."
              detail="Finish a timed mock and your score, percentile, and review land here."
              href="/mock-assessment"
              cta="Browse mock tests"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    {['Mock', 'Date', 'Score', 'Percentile', 'Status', ''].map((h, i) => (
                      <th
                        key={h || `c${i}`}
                        className="pb-3 text-left text-[10px] font-semibold uppercase tracking-widest text-slate-400"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mocks.map((m, i) => (
                    <motion.tr
                      key={m.attemptId}
                      initial={{ opacity: 0, y: 8 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: Math.min(i, 6) * 0.05 }}
                      className="group/row border-b border-slate-50 transition-colors last:border-0 hover:bg-slate-50/70"
                    >
                      <td className="py-3.5 pr-4 font-bold text-navy">{m.title}</td>
                      <td className="py-3.5 pr-4 text-slate-400">{formatDateIN(m.submittedAt)}</td>
                      <td className="py-3.5 pr-4">
                        <div className="flex items-center gap-2.5">
                          <ScoreMeter pct={m.pct} passed={m.passed} expired={m.status === 'EXPIRED'} />
                          <span className="whitespace-nowrap font-extrabold tabular-nums text-navy">
                            {m.pct}%{' '}
                            <span className="text-xs font-normal text-slate-400">
                              ({m.score}/{m.total})
                            </span>
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 pr-4 font-semibold tabular-nums text-slate-600">
                        {m.percentile}th
                      </td>
                      <td className="py-3.5 pr-4">
                        {m.status === 'EXPIRED' ? (
                          <StatusPill tone="warning" label="Timed out" />
                        ) : m.passed ? (
                          <StatusPill tone="positive" label="Passed" />
                        ) : (
                          <StatusPill tone="negative" label="Below pass mark" />
                        )}
                      </td>
                      <td className="py-3.5 text-right">
                        <Link
                          href={`/dashboard/quiz?report=${m.attemptId}`}
                          className="inline-flex items-center gap-1 text-xs font-bold text-[#f5b400] transition-colors hover:text-[#f5b400]/80"
                        >
                          View report
                          <ArrowUpRight className="size-3.5 transition-transform group-hover/row:translate-x-0.5 group-hover/row:-translate-y-0.5" />
                        </Link>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </Reveal>
    </div>
  );
}

/* ----------------------------------------------------------------------------
 * Stat hero — featured accuracy ring on deep navy glass + supporting KPI tiles.
 * ------------------------------------------------------------------------- */
function PerformanceHero({
  accuracyPct,
  hasAccuracy,
  correct,
  total,
  kpis,
}: {
  accuracyPct: number;
  hasAccuracy: boolean;
  correct: number;
  total: number;
  kpis: Array<{
    label: string;
    value: number;
    suffix?: string;
    fallback?: string;
    sub: string;
    icon: typeof Target;
    from: string;
    to: string;
  }>;
}) {
  return (
    <section className="relative isolate overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-br from-[#0f1117] via-[#171b2e] to-[#202b63] p-6 text-white sm:p-7">
      {/* aurora orbs */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 -top-28 size-72 rounded-full bg-[#ffc42d]/25 blur-[110px]" />
        <div className="absolute -right-20 top-0 size-64 rounded-full bg-[#6d3bf5]/30 blur-[110px]" />
        <div className="absolute -bottom-24 left-1/3 size-64 rounded-full bg-[#1e6ff5]/20 blur-[110px]" />
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: 'radial-gradient(rgb(255 255 255 / 0.8) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-inset ring-white/10"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent"
      />

      <div className="relative z-10 grid gap-6 lg:grid-cols-[auto_1fr] lg:items-center lg:gap-8">
        {/* Featured accuracy ring */}
        <div className="flex items-center gap-5">
          <AccuracyRing pct={accuracyPct} hasData={hasAccuracy} />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-white/45">
              Practice accuracy
            </p>
            <p className="mt-1 text-[40px] font-extrabold leading-none tracking-tight text-white">
              {hasAccuracy ? (
                <>
                  <AnimatedNumber value={accuracyPct} />
                  <span className="text-2xl text-white/60">%</span>
                </>
              ) : (
                <span className="text-white/40">—</span>
              )}
            </p>
            <p className="mt-1.5 text-xs text-white/55">
              {hasAccuracy ? (
                <>
                  <span className="font-bold tabular-nums text-emerald-300">{correct}</span>
                  <span className="text-white/40"> / {total} correct across all topics</span>
                </>
              ) : (
                'no attempts yet'
              )}
            </p>
          </div>
        </div>

        {/* Supporting KPI tiles — glass */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {kpis.map(({ label, value, suffix, fallback, sub, icon: Icon, from, to }) => (
            <motion.div
              key={label}
              whileHover={{ y: -3 }}
              transition={{ duration: 0.2 }}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur transition-colors hover:border-white/20 hover:bg-white/[0.1]"
            >
              <div
                aria-hidden
                className="pointer-events-none absolute -right-6 -top-6 size-20 rounded-full opacity-20 blur-xl transition-opacity group-hover:opacity-40"
                style={{ background: to }}
              />
              <span
                className="relative flex size-9 items-center justify-center rounded-xl text-white shadow-sm"
                style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
              >
                <Icon className="size-[18px]" aria-hidden="true" />
              </span>
              <p className="relative mt-3 text-[26px] font-extrabold leading-none tracking-tight tabular-nums text-white">
                {fallback ? (
                  <span className="text-white/40">{fallback}</span>
                ) : (
                  <>
                    <AnimatedNumber value={value} />
                    {suffix ? <span className="text-lg text-white/60">{suffix}</span> : null}
                  </>
                )}
              </p>
              <p className="relative mt-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/45">
                {label}
              </p>
              <p className="relative mt-0.5 text-[11px] text-white/55">{sub}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* SVG donut ring that fills to the accuracy %, animated. Lives on the dark hero. */
function AccuracyRing({ pct, hasData }: { pct: number; hasData: boolean }) {
  const reduce = useReducedMotion();
  const r = 46;
  const c = 2 * Math.PI * r;
  const target = hasData ? Math.max(0, Math.min(100, pct)) : 0;
  const offset = c - (c * target) / 100;

  return (
    <div className="relative size-[120px] shrink-0">
      {/* glow under the ring */}
      <div
        aria-hidden
        className="absolute inset-2 rounded-full bg-[#ffc42d]/25 blur-2xl"
      />
      <svg viewBox="0 0 110 110" className="relative size-full -rotate-90">
        <defs>
          <linearGradient id="perf-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffd24d" />
            <stop offset="55%" stopColor="#ffc42d" />
            <stop offset="100%" stopColor="#f5b400" />
          </linearGradient>
        </defs>
        <circle cx="55" cy="55" r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="9" />
        <motion.circle
          cx="55"
          cy="55"
          r={r}
          fill="none"
          stroke="url(#perf-ring)"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={reduce ? false : { strokeDashoffset: c }}
          whileInView={{ strokeDashoffset: offset }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <Gauge className="size-7 text-[#ffd24d]" aria-hidden="true" />
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------------
 * Crisp white Aurora section card with eyebrow + gradient icon chip + glow.
 * ------------------------------------------------------------------------- */
function SectionCard({
  glow,
  icon: Icon,
  eyebrow,
  title,
  children,
}: {
  glow: string;
  icon: typeof Target;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="group relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-slate-50/70 via-transparent to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-12 size-36 rounded-full opacity-[0.07] blur-2xl transition-opacity duration-500 group-hover:opacity-[0.16]"
        style={{ background: glow }}
      />
      <div className="relative z-10">
        <div className="mb-5 flex items-center gap-3">
          <span
            className="grid size-10 shrink-0 place-items-center rounded-xl text-white shadow-sm"
            style={{ background: `linear-gradient(135deg, ${glow}, ${shade(glow)})` }}
          >
            <Icon className="size-[18px]" aria-hidden="true" />
          </span>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              {eyebrow}
            </p>
            <h2 className="text-base font-bold leading-tight text-navy">{title}</h2>
          </div>
        </div>
        {children}
      </div>
    </section>
  );
}

/* Animated gradient accuracy bar — fills on scroll into view. */
function AccuracyBar({
  value,
  tone,
  label,
}: {
  value: number;
  tone: BarTone;
  label: string;
}) {
  const reduce = useReducedMotion();
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-100"
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <motion.div
        className={cn('h-full rounded-full bg-gradient-to-r', tone.bar)}
        initial={reduce ? false : { width: 0 }}
        whileInView={{ width: `${clamped}%` }}
        viewport={{ once: true }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
      />
    </div>
  );
}

/* Compact circular score meter for the mock table rows. */
function ScoreMeter({
  pct,
  passed,
  expired,
}: {
  pct: number;
  passed: boolean;
  expired: boolean;
}) {
  const reduce = useReducedMotion();
  const r = 12;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, pct));
  const offset = c - (c * clamped) / 100;
  const stroke = expired ? '#f59e0b' : passed ? '#10b981' : '#f5b400';
  return (
    <svg viewBox="0 0 32 32" className="size-7 shrink-0 -rotate-90" aria-hidden="true">
      <circle cx="16" cy="16" r={r} fill="none" stroke="rgb(241 245 249)" strokeWidth="4" />
      <motion.circle
        cx="16"
        cy="16"
        r={r}
        fill="none"
        stroke={stroke}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={c}
        initial={reduce ? false : { strokeDashoffset: c }}
        whileInView={{ strokeDashoffset: offset }}
        viewport={{ once: true }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      />
    </svg>
  );
}

/* Shared empty-state block — preserves the original CTA copy + routing. */
function EmptyState({
  title,
  detail,
  href,
  cta,
}: {
  title: string;
  detail: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="py-4 text-center">
      <p className="text-sm font-semibold text-navy">{title}</p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
      <Button asChild size="sm" className="mt-4">
        <Link href={href}>{cta}</Link>
      </Button>
    </div>
  );
}

interface BarTone {
  bar: string;
  dot: string;
}

function barTone(accuracy: number): BarTone {
  if (accuracy > 80) return { bar: 'from-emerald-400 to-emerald-500', dot: 'bg-emerald-500' };
  if (accuracy >= 60) return { bar: 'from-amber-300 to-amber-400', dot: 'bg-amber-400' };
  return { bar: 'from-red-400 to-red-500', dot: 'bg-red-500' };
}

/** Darker companion for a hex accent so icon chips read as a true gradient. */
function shade(hex: string): string {
  const map: Record<string, string> = {
    '#f5b400': '#d99a00',
    '#6d3bf5': '#5b3bf5',
    '#2563eb': '#1e6ff5',
  };
  return map[hex] ?? hex;
}
