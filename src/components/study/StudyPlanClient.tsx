'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  Brain,
  CheckCircle2,
  Flame,
  Loader2,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCalibrationStatus } from '@/hooks/useCalibrationStatus';
import {
  generateRoadmap,
  getRoadmap,
  toggleRoadmapTask,
  type StudyPlanOverviewDto,
} from '@/lib/api/roadmap';
import { PHASE_META } from './study-ui';
import { ProgressRing, TaskRow } from './StudyBits';
import { RoadmapRail } from './RoadmapRail';
import { DayDrawerPortal } from './DayDrawer';
import { Confetti } from './Confetti';
import { CalibrationScope, RoadmapJourney } from './illustrations';
import { StudyArt } from './StudyArt';

export function StudyPlanClient() {
  const [ov, setOv] = useState<StudyPlanOverviewDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [busyTask, setBusyTask] = useState<number | null>(null);
  const [celebrate, setCelebrate] = useState<{ day: number; xp: number } | null>(null);
  const cal = useCalibrationStatus();

  const load = useCallback(() => {
    return getRoadmap()
      .then(setOv)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Re-fetch on tab focus so tasks auto-verified while you practised elsewhere show up.
  useEffect(() => {
    const onFocus = () => document.visibilityState === 'visible' && load();
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [load]);

  useEffect(() => {
    if (!celebrate) return;
    const t = setTimeout(() => setCelebrate(null), 4500);
    return () => clearTimeout(t);
  }, [celebrate]);

  const generate = async () => {
    setGenerating(true);
    try {
      setOv(await generateRoadmap());
    } catch {
      /* surfaced via reload */
    } finally {
      setGenerating(false);
    }
  };

  const toggleToday = async (i: number, done: boolean) => {
    if (!ov?.today) return;
    setBusyTask(i);
    try {
      const res = await toggleRoadmapTask(ov.today.dayNumber, i, done);
      if (res.dayCompleted) setCelebrate({ day: res.dayNumber, xp: res.xpAwarded });
      await load();
    } finally {
      setBusyTask(null);
    }
  };

  if (loading) {
    return (
      <div className="grid h-64 place-items-center">
        <Loader2 className="size-6 animate-spin text-slate-300" />
      </div>
    );
  }

  const s = ov?.summary;
  if (!s?.calibrated) return <NotCalibrated mockId={cal.mockTestId} />;
  if (!s.exists) return <GenerateHero generating={generating} onGenerate={generate} />;

  return (
    <div className="mt-4 space-y-6">
      <Hero ov={ov!} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        {/* Today */}
        <div data-tour="plan:today" className="lg:sticky lg:top-20 lg:self-start">
          {ov!.today && <TodayPanel today={ov!.today} onToggle={toggleToday} busyTask={busyTask} />}
        </div>

        {/* The roadmap */}
        <section data-tour="plan:roadmap" className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="relative overflow-hidden bg-gradient-to-br from-[#1f2d4d] via-[#16223f] to-[#0b1220] px-5 py-4 text-white">
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-[0.12]"
              style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '16px 16px' }}
            />
            <StudyArt
              name="man-riding-a-rocket"
              className="pointer-events-none absolute -right-3 -top-4 hidden h-28 w-28 opacity-90 drop-shadow-lg sm:block"
              fallback={<RoadmapJourney className="pointer-events-none absolute right-0 top-1 hidden h-24 opacity-30 sm:block" />}
            />
            <div className="relative">
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#ffb877]">
                <Trophy className="size-3.5" /> The journey
              </p>
              <h2 className="mt-1 font-display text-lg font-black tracking-tight">Your 90-day roadmap</h2>
              <p className="mt-0.5 text-[11px] text-white/60">
                Day {ov!.summary.currentDay} of {ov!.summary.totalDays} · one unlocks each day
              </p>
            </div>
          </div>
          <div className="p-5">
            <RoadmapRail days={ov!.days} onSelect={setSelected} />
          </div>
        </section>
      </div>

      <DayDrawerPortal dayNumber={selected} onClose={() => setSelected(null)} onChanged={load} />

      {/* Day-complete celebration */}
      {celebrate && <Confetti />}
      <AnimatePresence>
        {celebrate && (
          <motion.div
            className="fixed inset-x-0 bottom-6 z-[70] mx-auto w-fit"
            initial={{ opacity: 0, y: 24, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 320, damping: 24 }}
          >
            <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-br from-[#1f2d4d] to-[#0b1220] px-5 py-3 text-white shadow-2xl">
              <span className="grid size-9 place-items-center rounded-full bg-orange text-white">
                <Sparkles className="size-4" />
              </span>
              <div>
                <p className="text-sm font-black">Day {celebrate.day} complete!</p>
                <p className="text-xs text-white/70">+{celebrate.xp} XP · streak kept alive 🔥</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Hero ────────────────────────────────────────────────────────────────────────
function Hero({ ov }: { ov: StudyPlanOverviewDto }) {
  const s = ov.summary;
  const phase = s.currentPhase ? PHASE_META[s.currentPhase] : PHASE_META.foundation;
  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#1f2d4d] via-[#16223f] to-[#0b1220] p-6 text-white shadow-[0_24px_60px_-30px_rgba(11,18,32,0.85)] sm:p-8">
      <span aria-hidden className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-[#f37021]/20 blur-3xl" />
      <span aria-hidden className="pointer-events-none absolute -bottom-24 -left-10 size-56 rounded-full bg-sky-500/10 blur-3xl" />
      <RoadmapJourney className="pointer-events-none absolute -bottom-4 right-1 hidden w-72 opacity-[0.22] xl:block" />
      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-[#ffb877]">
            <Sparkles className="size-3.5" /> Your 90-day placement roadmap
            {s.generatedByAi && <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px] tracking-normal text-white/70">AI-personalised</span>}
          </p>
          <h1 className="relative mt-2 font-display text-2xl font-black tracking-tight sm:text-3xl">
            {phase.label} phase · Day {s.currentDay} of {s.totalDays}
          </h1>
          {s.goalSummary && <p className="relative mt-2 max-w-xl text-sm leading-relaxed text-white/70">{s.goalSummary}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            <Chip icon={<Flame className="size-3.5" />} label={`${s.streakDays}-day streak`} tone="orange" />
            <Chip icon={<CheckCircle2 className="size-3.5" />} label={`${s.daysCompleted}/${s.totalDays} days done`} />
            <Chip icon={<Trophy className="size-3.5" />} label={`${s.planXp} plan XP`} />
            {s.bandLabel && <Chip icon={<Brain className="size-3.5" />} label={s.bandLabel} />}
          </div>
        </div>
        <ProgressRing pct={s.progressPct}>
          <span className="text-3xl font-black tabular-nums leading-none">{s.progressPct}%</span>
          <span className="mt-1 text-[10px] font-bold uppercase tracking-wide text-white/50">complete</span>
        </ProgressRing>
      </div>

      {/* phase mini-progress */}
      <div className="relative mt-6 grid grid-cols-3 gap-2">
        {s.phases.map((p) => {
          const m = PHASE_META[p.key];
          const total = p.endDay - p.startDay + 1;
          return (
            <div key={p.key} className="rounded-2xl bg-white/[0.06] p-3">
              <p className="flex items-center justify-between text-[11px] font-bold text-white/80">
                <span>{m.label}</span>
                <span className="tabular-nums text-white/50">{p.daysCompleted}/{total}</span>
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className={cn('h-full rounded-full bg-gradient-to-r', m.grad)} style={{ width: `${(p.daysCompleted / total) * 100}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Chip({ icon, label, tone }: { icon: React.ReactNode; label: string; tone?: 'orange' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold',
        tone === 'orange' ? 'bg-orange/20 text-[#ffb877]' : 'bg-white/10 text-white/80',
      )}
    >
      {icon}
      {label}
    </span>
  );
}

// ── Today ───────────────────────────────────────────────────────────────────────
function TodayPanel({
  today,
  onToggle,
  busyTask,
}: {
  today: NonNullable<StudyPlanOverviewDto['today']>;
  onToggle: (i: number, done: boolean) => void;
  busyTask: number | null;
}) {
  const meta = PHASE_META[today.phase];
  const allDone = today.doneCount >= today.taskCount && today.taskCount > 0;
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className={cn('relative overflow-hidden bg-gradient-to-br p-5 text-white', meta.grad)}>
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.14]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1.1px, transparent 0)', backgroundSize: '15px 15px' }}
        />
        <div className="relative flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em]">
              <Sparkles className="size-3" /> Today · Day {today.dayNumber}
            </span>
            <h2 className="mt-2 text-xl font-black tracking-tight drop-shadow-sm">{today.theme}</h2>
            <p className="mt-1 text-[11px] font-bold text-white/75">
              {today.estMinutes} min · {today.xp} XP · {meta.label}
            </p>
          </div>
          <DayRing done={today.doneCount} total={today.taskCount} />
        </div>
      </div>
      <div className="p-4">
        {allDone && (
          <div className="mb-3 flex items-center gap-3 rounded-2xl bg-emerald-50 p-3">
            <StudyArt name="success" className="h-14 w-14 shrink-0" fallback={<CheckCircle2 className="size-9 text-emerald-500" />} />
            <div>
              <p className="text-sm font-black text-emerald-700">Today’s done!</p>
              <p className="text-xs font-medium text-emerald-600/80">Come back tomorrow for Day {today.dayNumber + 1}.</p>
            </div>
          </div>
        )}
        <ul className="space-y-2.5">
          {today.tasks.map((t) => (
            <li key={t.index}>
              <TaskRow task={t} onToggle={(d) => onToggle(t.index, d)} busy={busyTask === t.index} />
            </li>
          ))}
        </ul>
        <p className="mt-3 text-center text-[11px] text-slate-400">
          Finishing the linked practice or mock ticks a task automatically — or check it off yourself.
        </p>
      </div>
    </section>
  );
}

/** Small white progress ring for the Today card (on the phase-gradient header). */
function DayRing({ done, total }: { done: number; total: number }) {
  const frac = total ? done / total : 0;
  const r = 22;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid size-14 shrink-0 place-items-center">
      <svg viewBox="0 0 56 56" className="size-14 -rotate-90">
        <circle cx="28" cy="28" r={r} className="fill-none stroke-white/25" strokeWidth="5" />
        <motion.circle
          cx="28"
          cy="28"
          r={r}
          className="fill-none stroke-white"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - frac) }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <span className="absolute text-xs font-black tabular-nums">
        {done}/{total}
      </span>
    </div>
  );
}

// ── Gates ───────────────────────────────────────────────────────────────────────
function NotCalibrated({ mockId }: { mockId: string | null }) {
  return (
    <div className="mt-4 grid place-items-center rounded-3xl border border-dashed border-slate-200 bg-gradient-to-b from-white to-slate-50/60 p-10 text-center">
      <CalibrationScope className="w-40 sm:w-44" />
      <h2 className="mt-3 font-display text-xl font-black tracking-tight text-navy">First, take your calibration</h2>
      <p className="mt-2 max-w-md text-sm text-slate-500">
        Your 90-day roadmap is built from one short calibration assessment — it finds your strong and weak areas so every
        day targets exactly what will move your placement readiness fastest.
      </p>
      <Link
        href={mockId ? `/dashboard/quiz?mock=${mockId}` : '/dashboard'}
        className="mt-5 inline-flex items-center gap-2 rounded-full bg-orange px-5 py-2.5 text-sm font-bold text-white transition hover:bg-orange/90"
      >
        Start calibration <ArrowRight className="size-4" />
      </Link>
    </div>
  );
}

function GenerateHero({ generating, onGenerate }: { generating: boolean; onGenerate: () => void }) {
  return (
    <div className="mt-4 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#1f2d4d] via-[#16223f] to-[#0b1220] p-8 text-center text-white shadow-[0_24px_60px_-30px_rgba(11,18,32,0.85)] sm:p-12">
      <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 mx-auto size-64 rounded-full bg-[#f37021]/20 blur-3xl" />
      <StudyArt
        name="man-riding-a-rocket"
        alt=""
        className="relative mx-auto h-40 w-auto sm:h-48"
        fallback={<RoadmapJourney className="mx-auto w-60 sm:w-72" />}
      />
      <h2 className="relative mt-3 font-display text-2xl font-black tracking-tight sm:text-3xl">
        Build your 90-day roadmap
      </h2>
      <p className="relative mx-auto mt-2 max-w-lg text-sm leading-relaxed text-white/70">
        We’ll turn your calibration result into a fixed, day-by-day plan — front-loading your weak areas, with practice,
        timed quizzes, weekly mocks and coding, all the way to placement-ready. One day unlocks at a time.
      </p>
      <button
        type="button"
        onClick={onGenerate}
        disabled={generating}
        className="relative mt-6 inline-flex items-center gap-2 rounded-full bg-orange px-6 py-3 text-sm font-black text-white transition hover:bg-orange/90 disabled:opacity-70"
      >
        {generating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
        {generating ? 'Generating your plan…' : 'Generate my roadmap'}
      </button>
    </div>
  );
}
