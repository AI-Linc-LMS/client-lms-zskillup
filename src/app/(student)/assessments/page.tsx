'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ProfileLockGate } from '@/components/student/ProfileLockGate';
import { BriefingHeroCanvas } from '@/components/student/BriefingHeroCanvas';
import {
  CalendarDays,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  ShieldCheck,
  Sparkles,
  Trophy,
  Video,
} from 'lucide-react';
import {
  getMySchedule,
  type ApiScheduledAssessment,
} from '@/lib/api/scheduling';
import { getMockHistory } from '@/lib/api/mocks';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { Reveal, Stagger, StaggerItem } from '@/components/motion/primitives';
import { cn } from '@/lib/utils';
import { MockHistory } from '@/components/practice/MockHistory';
import { MyRankingPanel } from '@/components/student/MyRankingPanel';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}
function countdown(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms < 0) return 'Past';
  const days = Math.floor(ms / 86400000);
  if (days >= 1) return `in ${days} day${days === 1 ? '' : 's'}`;
  const hrs = Math.floor(ms / 3600000);
  if (hrs >= 1) return `in ${hrs}h`;
  const mins = Math.floor(ms / 60000);
  if (mins >= 1) return `in ${mins}m`;
  return 'starting now';
}

/** Student assessment calendar (assessment lifecycle, Phase 2). Scheduled drives
 *  for the companies the student registered for — a premium navy hero with live
 *  stats, an interactive month grid, and a timeline of upcoming drives. */
export default function AssessmentsPage() {
  const [items, setItems] = useState<ApiScheduledAssessment[] | null>(null);
  const [cursor, setCursor] = useState(() => {
    const n = new Date();
    return { year: n.getFullYear(), month: n.getMonth() };
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  // mockTestId → finalized attemptId, so a completed drive shows "View result"
  // instead of "Start" (only one attempt per assessment is allowed server-side).
  const [attempts, setAttempts] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    getMySchedule()
      .then(setItems)
      .catch(() => setItems([]));
    getMockHistory('assessment')
      .then((rows) => {
        const map = new Map<string, string>();
        for (const r of rows) if (!map.has(r.mockTestId)) map.set(r.mockTestId, r.attemptId);
        setAttempts(map);
      })
      .catch(() => {});
  }, []);

  const byDay = useMemo(() => {
    const map = new Map<string, ApiScheduledAssessment[]>();
    for (const it of items ?? []) {
      const k = dayKey(new Date(it.scheduledAt));
      const list = map.get(k);
      if (list) list.push(it);
      else map.set(k, [it]);
    }
    return map;
  }, [items]);

  const upcoming = useMemo(
    () =>
      (items ?? [])
        .filter((i) => new Date(i.scheduledAt).getTime() >= Date.now() - 86400000)
        .sort((a, b) => +new Date(a.scheduledAt) - +new Date(b.scheduledAt)),
    [items],
  );

  // Hero stats — derived live from the schedule.
  const stats = useMemo(() => {
    const monthCount = (items ?? []).filter((i) => {
      const d = new Date(i.scheduledAt);
      return d.getFullYear() === cursor.year && d.getMonth() === cursor.month;
    }).length;
    const proctored = upcoming.filter((i) => i.proctored).length;
    return { next: upcoming[0] ?? null, upcomingCount: upcoming.length, monthCount, proctored };
  }, [items, upcoming, cursor]);

  // Build the month grid.
  const cells = useMemo(() => {
    const first = new Date(cursor.year, cursor.month, 1);
    const startDow = first.getDay();
    const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
    const out: (Date | null)[] = [];
    for (let i = 0; i < startDow; i += 1) out.push(null);
    for (let d = 1; d <= daysInMonth; d += 1) out.push(new Date(cursor.year, cursor.month, d));
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [cursor]);

  const todayKey = dayKey(new Date());
  const now = new Date();
  const isCurrentMonth = cursor.year === now.getFullYear() && cursor.month === now.getMonth();

  return (
    <div className="w-full">
      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Assessments' }]} />

      <ProfileLockGate feature="Assessments">
      {/* ── AI-Briefing black hero + golden mesh, with live stats ─────────── */}
      <Reveal>
        <section data-tour="assess:hero" className="relative isolate mt-4 overflow-hidden rounded-2xl border border-white/10 p-6 text-white sm:p-8">
          <BriefingHeroCanvas />
          <div className="relative z-10">
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-2xl bg-[#ffc42d] ring-4 ring-[#ffc42d]/15">
                <CalendarDays className="size-5 text-[#171717]" strokeWidth={2.4} />
              </span>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-white/50">
                  Your drives · 2026
                </p>
                <h1 className="text-2xl font-black tracking-tight sm:text-[28px]">Assessment calendar</h1>
              </div>
            </div>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/60">
              Every drive for the companies you&apos;ve registered for, blocked on your calendar so
              nothing slips. Start live assessments straight from here.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <HeroStat
                icon={CalendarClock}
                label="Next drive"
                value={stats.next ? countdown(stats.next.scheduledAt) : '-'}
                sub={stats.next?.companyName ?? 'Nothing scheduled'}
              />
              <HeroStat
                icon={Sparkles}
                label="Upcoming"
                value={String(stats.upcomingCount)}
                sub={stats.upcomingCount === 1 ? 'assessment' : 'assessments'}
              />
              <HeroStat
                icon={Video}
                label="Proctored"
                value={String(stats.proctored)}
                sub="need a webcam"
                className="hidden sm:flex"
              />
            </div>
          </div>
        </section>
      </Reveal>

      {items === null ? (
        <div className="grid place-items-center py-24">
          <Loader2 className="size-6 animate-spin text-slate-400" />
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-6">
          {/* ── Month grid ──────────────────────────────────────────────── */}
          <Reveal className="order-2">
            <div data-tour="assess:calendar" className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                    Month view
                  </p>
                  <h2 className="text-lg font-extrabold text-navy">
                    {MONTHS[cursor.month]} {cursor.year}
                  </h2>
                </div>
                <div className="flex items-center gap-1.5">
                  {!isCurrentMonth && (
                    <button
                      type="button"
                      onClick={() => setCursor({ year: now.getFullYear(), month: now.getMonth() })}
                      className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                    >
                      Today
                    </button>
                  )}
                  <button
                    type="button"
                    aria-label="Previous month"
                    onClick={() =>
                      setCursor((c) =>
                        c.month === 0 ? { year: c.year - 1, month: 11 } : { ...c, month: c.month - 1 },
                      )
                    }
                    className="grid size-8 place-items-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-navy"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Next month"
                    onClick={() =>
                      setCursor((c) =>
                        c.month === 11 ? { year: c.year + 1, month: 0 } : { ...c, month: c.month + 1 },
                      )
                    }
                    className="grid size-8 place-items-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-navy"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1.5 text-center sm:gap-2">
                {DOW.map((d) => (
                  <div
                    key={d}
                    className="pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400"
                  >
                    {d}
                  </div>
                ))}
                {cells.map((date, i) => {
                  if (!date) return <div key={`e${i}`} />;
                  const k = dayKey(date);
                  const dayItems = byDay.get(k) ?? [];
                  const has = dayItems.length > 0;
                  const isToday = k === todayKey;
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                  const selected = selectedDay === k;
                  return (
                    <button
                      type="button"
                      key={k}
                      disabled={!has}
                      onClick={() => setSelectedDay((s) => (s === k ? null : k))}
                      className={cn(
                        'relative flex min-h-[3.75rem] flex-col rounded-xl border p-1.5 text-left transition-all sm:min-h-[4.75rem] sm:p-2',
                        has
                          ? 'cursor-pointer border-orange/40 bg-orange/[0.06] hover:border-orange/70 hover:bg-orange/[0.1]'
                          : 'cursor-default border-slate-100 bg-white',
                        selected && 'border-orange ring-2 ring-orange/30',
                        isToday && !selected && 'ring-2 ring-navy/25',
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={cn(
                            'grid size-5 place-items-center rounded-md text-[11px] font-bold',
                            isToday
                              ? 'bg-navy text-white'
                              : has
                                ? 'text-[#f5b400]'
                                : isWeekend
                                  ? 'text-slate-300'
                                  : 'text-slate-500',
                          )}
                        >
                          {date.getDate()}
                        </span>
                        {has && (
                          <span className="size-1.5 rounded-full bg-orange shadow-[0_0_0_3px_rgba(255,196,45,0.2)]" />
                        )}
                      </div>
                      {has ? (
                        <span className="mt-1 line-clamp-2 text-[9px] font-semibold leading-tight text-navy sm:text-[10px]">
                          {dayItems[0].companyName}
                          {dayItems.length > 1 ? ` +${dayItems.length - 1}` : ''}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 flex items-center gap-4 border-t border-slate-100 pt-3 text-[11px] font-medium text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-orange" /> Drive scheduled
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-md bg-navy" /> Today
                </span>
                {selectedDay && (
                  <button
                    type="button"
                    onClick={() => setSelectedDay(null)}
                    className="ml-auto font-semibold text-[#f5b400] hover:underline"
                  >
                    Clear selection
                  </button>
                )}
              </div>
            </div>
          </Reveal>

          {/* ── Upcoming timeline ───────────────────────────────────────── */}
          <aside data-tour="assess:upcoming" className="order-1 space-y-3">
            <h2 className="px-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              {selectedDay ? fmtDate(`${selectedDay}T00:00:00`) : 'Upcoming drives'}
            </h2>
            {upcoming.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center">
                <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-slate-50 text-slate-300 ring-1 ring-slate-100">
                  <CalendarDays className="size-6" />
                </span>
                <p className="mt-3 text-sm font-bold text-navy">No assessments scheduled</p>
                <p className="mt-1 text-xs text-slate-500">
                  Register for a company drive to see it blocked here.
                </p>
                <Link
                  href="/dashboard/company"
                  className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#f5b400] hover:underline"
                >
                  Browse companies →
                </Link>
              </div>
            ) : (
              <Stagger className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {upcoming.map((it) => {
                  const dimmed =
                    selectedDay !== null && dayKey(new Date(it.scheduledAt)) !== selectedDay;
                  const startMs = new Date(it.scheduledAt).getTime();
                  const endMs = startMs + it.durationMinutes * 60_000;
                  const live = Date.now() >= startMs && Date.now() <= endMs;
                  // Leaderboard is only meaningful once the assessment window has
                  // fully closed and submissions are in — hiding it for upcoming/
                  // live drives (a ranking before anyone has finished is misleading).
                  const ended = Date.now() > endMs;
                  return (
                    <StaggerItem key={it.id}>
                      <div
                        className={cn(
                          'relative overflow-hidden rounded-2xl border bg-white p-4 transition-all',
                          live ? 'border-orange/40' : 'border-slate-200',
                          dimmed ? 'opacity-40' : 'opacity-100',
                        )}
                      >
                        {live && (
                          <span
                            aria-hidden
                            className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-[#ffd24d] via-[#ffc42d] to-[#f5b400]"
                          />
                        )}
                        <div className="flex items-center gap-2.5">
                          <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-lg border border-slate-200 bg-white">
                            {it.companyLogoUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={it.companyLogoUrl}
                                alt=""
                                className="max-h-5 max-w-full object-contain"
                              />
                            ) : (
                              <span className="text-[10px] font-bold text-slate-500">
                                {it.companyName.slice(0, 2).toUpperCase()}
                              </span>
                            )}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-navy">{it.companyName}</p>
                            <p className="truncate text-xs text-slate-500">{it.title}</p>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium text-slate-500">
                          <span className="flex items-center gap-1">
                            <CalendarDays className="size-3.5" /> {fmtDate(it.scheduledAt)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="size-3.5" /> {fmtTime(it.scheduledAt)} · {it.durationMinutes}m
                          </span>
                          {it.proctored ? (
                            <span className="flex items-center gap-1 text-violet-600">
                              <Video className="size-3.5" /> Proctored
                            </span>
                          ) : null}
                        </div>
                        {live && it.mockTestId && attempts.has(it.mockTestId) ? (
                          <Link
                            href={`/dashboard/quiz?report=${attempts.get(it.mockTestId)}`}
                            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-extrabold text-emerald-700 transition-colors hover:bg-emerald-100"
                          >
                            <ShieldCheck className="size-4" /> Completed · View result
                          </Link>
                        ) : live && it.mockTestId ? (
                          <Link
                            href={`/dashboard/quiz?mock=${it.mockTestId}${it.proctored ? '&proctored=1' : ''}`}
                            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-[#ffd24d] via-[#ffc42d] to-[#f5b400] px-3 py-2 text-xs font-extrabold text-[#171717] transition-transform hover:brightness-105"
                          >
                            <ShieldCheck className="size-4" /> Start assessment now
                          </Link>
                        ) : (
                          <div className="mt-3 flex items-center justify-between">
                            <span
                              className={cn(
                                'rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1',
                                live
                                  ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                                  : 'bg-amber-50 text-amber-700 ring-amber-200',
                              )}
                            >
                              {countdown(it.scheduledAt)}
                            </span>
                            {it.companySlug ? (
                              <Link
                                href={`/dashboard/company/${it.companySlug}`}
                                className="flex items-center gap-1 text-xs font-bold text-navy transition-colors hover:text-[#f5b400]"
                              >
                                <ShieldCheck className="size-3.5" /> View hub
                              </Link>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-0.5 text-[11px] font-bold text-violet-600">
                                🌐 Platform-wide
                              </span>
                            )}
                          </div>
                        )}
                        {ended ? (
                          <Link
                            href={`/assessments/${it.id}/leaderboard`}
                            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-[11px] font-bold text-slate-600 transition-colors hover:bg-slate-50"
                          >
                            <Trophy className="size-3.5 text-amber-500" /> Leaderboard
                          </Link>
                        ) : null}
                      </div>
                    </StaggerItem>
                  );
                })}
              </Stagger>
            )}
          </aside>
        </div>
      )}

      {/* ── Past assessments + your ranking ──────────────────────────────── */}
      <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div data-tour="assess:history" className="min-w-0">
          <MockHistory scope="assessment" />
        </div>
        <aside data-tour="assess:ranking" className="min-w-0">
          <h2 className="mb-3 text-lg font-extrabold tracking-tight text-navy">Your ranking</h2>
          <MyRankingPanel />
        </aside>
      </div>
      </ProfileLockGate>
    </div>
  );
}

/* ── Hero stat chip (dark premium surface) ──────────────────────────────────── */
function HeroStat({
  icon: Icon,
  label,
  value,
  sub,
  className,
}: {
  icon: typeof CalendarClock;
  label: string;
  value: string;
  sub: string;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col rounded-xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur transition-colors hover:border-[#ffc42d]/30', className)}>
      <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/40">
        <Icon className="size-3.5 text-[#ffc42d]" /> {label}
      </span>
      <span className="mt-1.5 truncate text-lg font-extrabold leading-none text-white">{value}</span>
      <span className="mt-1 truncate text-[11px] text-white/45">{sub}</span>
    </div>
  );
}
