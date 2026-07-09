'use client';

import { useEffect, useState } from 'react';
import { formatDateIN } from '@/lib/format';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowUpRight, BookOpen, Calendar, CalendarClock, Target, Timer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Reveal, Stagger, StaggerItem } from '@/components/motion/primitives';
import { getMockHistory, type ApiMockAttemptHistory } from '@/lib/api/mocks';
import { getPracticeAccuracy, getTopicAccuracy, type ApiAccuracy } from '@/lib/api/practice';
import { getMySchedule, type ApiScheduledAssessment } from '@/lib/api/scheduling';

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

/**
 * Dashboard right rail — every number is live: recent activity from the
 * student's real mock attempts, practice totals from the accuracy endpoint,
 * and a true calendar for the current week. Assignment deadlines return when
 * the assignments model ships; until then "Up next" routes into the live
 * features instead of inventing due dates.
 */

const UP_NEXT = [
  {
    id: 'mock',
    icon: Timer,
    title: 'Take a timed mock',
    meta: 'Score, percentile, and a full answer review',
    href: '/mock-assessment',
    from: '#f7a14e',
    to: '#f37021',
  },
  {
    id: 'weak',
    icon: Target,
    title: 'Drill a weak topic',
    meta: 'Server-graded practice with instant hints',
    href: '/practice',
    from: '#7c6cf5',
    to: '#5b3bf5',
  },
  {
    id: 'company',
    icon: BookOpen,
    title: 'Browse company hubs',
    meta: 'Pattern-matched prep for 9 recruiters',
    href: '/dashboard/company',
    from: '#1e6ff5',
    to: '#2563eb',
  },
] as const;

/** Tiny uppercase section eyebrow shared across the rail's cards. */
function RailLabel({ icon: Icon, children }: { icon?: typeof Calendar; children: React.ReactNode }) {
  return (
    <h2 className="mb-4 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
      {Icon ? <Icon className="size-3.5" aria-hidden="true" /> : null}
      {children}
    </h2>
  );
}

/** Crisp white Aurora card with a soft gradient wash + colored glow on hover. */
function RailCard({
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
        'group relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_-18px_rgba(15,23,42,0.35)] transition-shadow hover:shadow-[0_18px_50px_-24px_rgba(15,23,42,0.45)]',
        className,
      )}
    >
      {/* faint gradient wash */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-slate-50/70 via-transparent to-transparent"
      />
      {/* colored glow blob — intensifies on hover */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-12 size-32 rounded-full opacity-[0.08] blur-2xl transition-opacity duration-500 group-hover:opacity-20"
        style={{ background: glow }}
      />
      <div className="relative z-10">{children}</div>
    </section>
  );
}

export function DashboardRightRail() {
  const [history, setHistory] = useState<ApiMockAttemptHistory[] | null>(null);
  const [accuracy, setAccuracy] = useState<ApiAccuracy | null>(null);
  const [schedule, setSchedule] = useState<ApiScheduledAssessment[] | null>(null);
  const [weakTopic, setWeakTopic] = useState<{ slug: string; name: string; pct: number } | null>(null);
  const [week, setWeek] = useState<Array<{ d: string; n: number; today: boolean; key: string }>>([]);

  useEffect(() => {
    let cancelled = false;
    getMockHistory()
      .then((rows) => !cancelled && setHistory(rows))
      .catch(() => !cancelled && setHistory([]));
    getPracticeAccuracy()
      .then((a) => !cancelled && setAccuracy(a))
      .catch(() => {});
    // Resolve the student's weakest practised topic so "Drill a weak topic"
    // deep-links into that topic's adaptive drill (not the generic page).
    getTopicAccuracy()
      .then((rows) => {
        if (cancelled) return;
        const attempted = rows.filter((r) => r.total > 0);
        const weak =
          attempted.filter((r) => r.total >= 3 && r.accuracyPct < 60).sort((a, b) => a.accuracyPct - b.accuracyPct)[0] ??
          [...attempted].sort((a, b) => a.accuracyPct - b.accuracyPct)[0];
        if (weak) setWeakTopic({ slug: weak.topicSlug, name: weak.topicName, pct: weak.accuracyPct });
      })
      .catch(() => {});
    getMySchedule()
      .then((rows) => !cancelled && setSchedule(rows))
      .catch(() => !cancelled && setSchedule([]));

    // Build the real current week (Mon–Sun) client-side so "today" is true.
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    setWeek(
      labels.map((d, i) => {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        return { d, n: date.getDate(), today: date.toDateString() === now.toDateString(), key: dayKey(date) };
      }),
    );
    return () => {
      cancelled = true;
    };
  }, []);

  // Days this week that have a scheduled assessment (for the calendar dots).
  const scheduledDays = new Set((schedule ?? []).map((s) => dayKey(new Date(s.scheduledAt))));

  return (
    <Stagger className="space-y-5">
      {/* Up next — live feature entry points */}
      <StaggerItem>
        <RailCard glow="#f37021">
          <RailLabel>Up Next</RailLabel>
          <div className="space-y-2.5">
            {UP_NEXT.map((item) => {
              const { id, icon: Icon, title, from, to } = item;
              // "Drill a weak topic" deep-links into the student's weakest topic
              // (adaptive drill), falling back to the practice page until they've
              // practised enough to have one.
              const href =
                id === 'weak' && weakTopic
                  ? `/dashboard/quiz/adaptive?topic=${encodeURIComponent(weakTopic.slug)}`
                  : item.href;
              const meta =
                id === 'weak' && weakTopic
                  ? `${weakTopic.name} · ${weakTopic.pct}% — drill to improve`
                  : item.meta;
              return (
              <motion.div key={title} whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
                <Link
                  href={href}
                  className="group/item relative flex items-center gap-3.5 overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-3.5 transition-colors hover:border-transparent hover:bg-slate-50/80"
                >
                  {/* gradient-filled icon chip */}
                  <span
                    className="grid size-10 shrink-0 place-items-center rounded-xl text-white shadow-sm transition-transform duration-200 group-hover/item:scale-105"
                    style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
                  >
                    <Icon className="size-[18px]" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold leading-snug text-navy">{title}</span>
                    <span className="mt-0.5 block text-xs leading-snug text-slate-500">{meta}</span>
                  </span>
                  <ArrowUpRight
                    className="size-4 shrink-0 -translate-x-1 text-slate-300 opacity-0 transition-all duration-200 group-hover/item:translate-x-0 group-hover/item:text-orange group-hover/item:opacity-100"
                    aria-hidden="true"
                  />
                </Link>
              </motion.div>
              );
            })}
          </div>
        </RailCard>
      </StaggerItem>

      {/* This Week — real calendar */}
      <StaggerItem>
        <RailCard glow="#2563eb">
          <RailLabel icon={Calendar}>This Week</RailLabel>
          <div className="flex justify-between">
            {week.map((day, i) => (
              <motion.div
                key={day.d}
                className="flex flex-col items-center gap-1.5"
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: i * 0.04 }}
              >
                <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  {day.d}
                </span>
                <span
                  className={cn(
                    'relative grid size-8 place-items-center rounded-xl text-[13px] font-bold tabular-nums transition-colors sm:size-9',
                    day.today
                      ? 'bg-gradient-to-b from-[#1f2d4d] to-[#0b1220] text-white shadow-[0_8px_18px_-8px_rgba(11,18,32,0.7)]'
                      : 'text-slate-600 hover:bg-slate-100',
                  )}
                >
                  {day.today && (
                    <motion.span
                      aria-hidden
                      layoutId="today-glow"
                      className="absolute inset-0 -z-10 rounded-xl bg-gradient-to-b from-orange/30 to-orange/0 blur-md"
                    />
                  )}
                  {day.n}
                </span>
                {scheduledDays.has(day.key) ? (
                  <span aria-hidden title="Assessment scheduled" className="size-1.5 rounded-full bg-orange shadow-[0_0_6px_rgba(243,112,33,0.8)]" />
                ) : day.today ? (
                  <span aria-hidden className="size-1 rounded-full bg-slate-300" />
                ) : (
                  <span aria-hidden className="size-1.5" />
                )}
              </motion.div>
            ))}
          </div>
          {(() => {
            const weekKeys = new Set(week.map((d) => d.key));
            const weekCount = (schedule ?? []).filter((s) => weekKeys.has(dayKey(new Date(s.scheduledAt)))).length;
            return (
              <div className="mt-4 space-y-1.5">
                {weekCount > 0 ? (
                  <div className="flex items-center gap-1.5 rounded-xl border border-orange/20 bg-orange/[0.06] px-3 py-2">
                    <CalendarClock className="size-3.5 text-orange" />
                    <p className="text-[11px] font-semibold text-navy">
                      {weekCount} assessment{weekCount > 1 ? 's' : ''} this week
                    </p>
                  </div>
                ) : null}
                <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5">
                  <p className="text-[11px] leading-relaxed text-slate-500">
                    {accuracy && accuracy.total > 0 ? (
                      <>
                        <span className="font-bold text-navy tabular-nums">{accuracy.total}</span> questions
                        practised overall ·{' '}
                        <span className="font-bold text-emerald-600 tabular-nums">{accuracy.accuracyPct}%</span>{' '}
                        accuracy
                      </>
                    ) : (
                      'Your practice totals appear here as you attempt questions.'
                    )}
                  </p>
                </div>
              </div>
            );
          })()}
        </RailCard>
      </StaggerItem>

      {/* Recent Activity — real mock attempts */}
      <StaggerItem>
        <RailCard glow="#6d3bf5">
          <RailLabel>Recent Activity</RailLabel>
          {history === null ? (
            <div className="space-y-3">
              {[0, 1, 2].map((k) => (
                <div key={k} className="flex gap-3">
                  <div className="mt-1.5 size-2 shrink-0 animate-pulse rounded-full bg-slate-200" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-3/4 animate-pulse rounded bg-slate-100" />
                    <div className="h-2.5 w-1/2 animate-pulse rounded bg-slate-100" />
                  </div>
                </div>
              ))}
            </div>
          ) : history.length === 0 ? (
            <p className="text-xs leading-relaxed text-slate-500">
              No assessments yet — your mock results will show up here.
            </p>
          ) : (
            <Reveal>
              <ul className="relative space-y-1">
                {/* connecting timeline spine */}
                <span
                  aria-hidden
                  className="absolute left-[3.5px] top-2 bottom-2 w-px bg-gradient-to-b from-slate-200 via-slate-200 to-transparent"
                />
                {history.slice(0, 4).map((a) => {
                  const tone = a.passed
                    ? { dot: 'bg-emerald-500', ring: 'ring-emerald-500/20' }
                    : a.status === 'EXPIRED'
                      ? { dot: 'bg-amber-500', ring: 'ring-amber-500/20' }
                      : { dot: 'bg-orange', ring: 'ring-orange/20' };
                  return (
                    <li key={a.attemptId} className="relative">
                      <Link
                        href={`/dashboard/quiz?report=${a.attemptId}`}
                        className="flex gap-3 rounded-xl px-2 py-2 -mx-2 transition-colors hover:bg-slate-50"
                      >
                        <span
                          className={cn(
                            'relative mt-[5px] size-2 shrink-0 rounded-full ring-4 ring-white',
                            tone.dot,
                          )}
                          aria-hidden="true"
                        >
                          <span
                            className={cn(
                              'absolute inset-0 rounded-full ring-2',
                              tone.ring,
                            )}
                          />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="flex items-baseline justify-between gap-2">
                            <span className="truncate text-[13px] font-semibold leading-snug text-navy">
                              {a.title}
                            </span>
                            <span className="shrink-0 text-[13px] font-extrabold tabular-nums text-slate-700">
                              {a.pct}%
                            </span>
                          </p>
                          <p className="mt-0.5 text-[11px] text-slate-400">
                            {formatDateIN(a.submittedAt, { year: false })} · {a.percentile}th
                            percentile
                          </p>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Reveal>
          )}
        </RailCard>
      </StaggerItem>
    </Stagger>
  );
}
