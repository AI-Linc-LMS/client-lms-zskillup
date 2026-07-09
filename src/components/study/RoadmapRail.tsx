'use client';

import { Fragment } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Check, Flag, Lock, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PHASE_META, unlockCopy } from './study-ui';
import type { StudyDayNodeDto, StudyPhase } from '@/shared/dto/study-plan.dto';

const PHASES: StudyPhase[] = ['foundation', 'practice', 'interview'];

/**
 * The 90-step roadmap as a vertical journey — a phase-banded ladder of day-nodes.
 * Completed days fill with their phase colour + a check; today pulses orange;
 * unlocked past days invite catch-up; future days are locked with an "unlocks in N
 * days" note. Weekly checkpoints get a milestone star. Tapping an unlocked node
 * opens that day.
 */
export function RoadmapRail({
  days,
  onSelect,
}: {
  days: StudyDayNodeDto[];
  onSelect: (dayNumber: number) => void;
}) {
  const reduce = useReducedMotion();
  const byPhase = PHASES.map((p) => ({ phase: p, list: days.filter((d) => d.phase === p) }));

  return (
    <div className="space-y-8">
      {byPhase.map(({ phase, list }) => {
        if (list.length === 0) return null;
        const meta = PHASE_META[phase];
        const done = list.filter((d) => d.status === 'completed').length;
        return (
          <section key={phase}>
            {/* Phase band header */}
            <div className="mb-4 flex items-center gap-3">
              <span className={cn('grid size-9 place-items-center rounded-xl bg-gradient-to-br text-white shadow-sm', meta.grad)}>
                <Flag className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-baseline gap-2 font-display text-sm font-black tracking-tight text-navy">
                  {meta.label}
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Days {list[0].dayNumber}–{list[list.length - 1].dayNumber} · {meta.tagline}
                  </span>
                </p>
                <div className="mt-1.5 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-slate-100">
                  <div className={cn('h-full rounded-full bg-gradient-to-r', meta.grad)} style={{ width: `${(done / list.length) * 100}%` }} />
                </div>
              </div>
              <span className="shrink-0 text-[11px] font-bold tabular-nums text-slate-400">
                {done}/{list.length}
              </span>
            </div>

            {/* Ladder */}
            <ol className="relative ml-1">
              {/* the road */}
              <span aria-hidden className={cn('absolute bottom-4 left-[19px] top-4 w-1 rounded-full', meta.soft)} />
              {list.map((d, i) => (
                <Fragment key={d.dayNumber}>
                  <motion.li
                    className="relative flex items-center gap-3 py-1.5"
                    initial={reduce ? false : { opacity: 0, x: -8 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: '-40px' }}
                    transition={{ duration: 0.35, delay: Math.min(i * 0.012, 0.2), ease: [0.22, 1, 0.36, 1] }}
                  >
                    <RoadNode day={d} phase={phase} onSelect={onSelect} />
                    <RoadCard day={d} phase={phase} onSelect={onSelect} />
                  </motion.li>
                </Fragment>
              ))}
            </ol>
          </section>
        );
      })}
    </div>
  );
}

const isCheckpoint = (d: StudyDayNodeDto) => d.dayNumber % 7 === 0;

function RoadNode({
  day,
  phase,
  onSelect,
}: {
  day: StudyDayNodeDto;
  phase: StudyPhase;
  onSelect: (n: number) => void;
}) {
  const meta = PHASE_META[phase];
  const locked = day.status === 'locked';
  const completed = day.status === 'completed';
  const today = day.status === 'today';
  const checkpoint = isCheckpoint(day);
  return (
    <button
      type="button"
      onClick={() => !locked && onSelect(day.dayNumber)}
      disabled={locked}
      aria-label={`Day ${day.dayNumber}${locked ? ' (locked)' : ''}`}
      className={cn(
        'relative z-10 grid size-10 shrink-0 place-items-center rounded-full border-2 text-xs font-black tabular-nums transition',
        completed && cn('border-transparent bg-gradient-to-br text-white shadow-md', meta.grad),
        today && 'border-orange bg-white text-orange shadow-[0_0_0_4px_rgba(243,112,33,0.15)]',
        day.status === 'available' && cn('border-current bg-white', meta.text, 'hover:scale-105'),
        locked && 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-300',
      )}
    >
      {today && (
        <span aria-hidden className="absolute inset-0 -z-10 animate-ping rounded-full bg-orange/25" />
      )}
      {completed ? (
        <Check className="size-5" />
      ) : locked ? (
        <Lock className="size-3.5" />
      ) : checkpoint ? (
        <Star className={cn('size-4', today ? 'fill-orange text-orange' : meta.text)} />
      ) : (
        day.dayNumber
      )}
    </button>
  );
}

function RoadCard({
  day,
  phase,
  onSelect,
}: {
  day: StudyDayNodeDto;
  phase: StudyPhase;
  onSelect: (n: number) => void;
}) {
  const meta = PHASE_META[phase];
  const locked = day.status === 'locked';
  const completed = day.status === 'completed';
  const today = day.status === 'today';
  return (
    <button
      type="button"
      onClick={() => !locked && onSelect(day.dayNumber)}
      disabled={locked}
      className={cn(
        'group flex min-w-0 flex-1 items-center gap-3 rounded-2xl border px-3.5 py-2.5 text-left transition',
        today && 'border-orange/40 bg-orange-50/60 shadow-sm',
        completed && 'border-slate-200 bg-white',
        day.status === 'available' && 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm',
        locked && 'cursor-not-allowed border-dashed border-slate-200 bg-slate-50/60',
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2">
          <span className={cn('text-[10px] font-bold uppercase tracking-wide', locked ? 'text-slate-300' : meta.text)}>
            Day {day.dayNumber}
          </span>
          {today && <span className="rounded-full bg-orange px-1.5 py-px text-[9px] font-black uppercase tracking-wide text-white">Today</span>}
        </p>
        <p className={cn('truncate text-sm font-bold', locked ? 'text-slate-400' : 'text-navy')}>{day.theme}</p>
      </div>
      <div className="shrink-0 text-right">
        {locked ? (
          <span className="text-[11px] font-semibold text-slate-400">{unlockCopy(day.unlockDate)}</span>
        ) : completed ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
            <Check className="size-3" /> Done
          </span>
        ) : (
          <span className="text-[11px] font-semibold tabular-nums text-slate-400">
            {day.doneCount}/{day.taskCount} · {day.xp} XP
          </span>
        )}
      </div>
    </button>
  );
}
