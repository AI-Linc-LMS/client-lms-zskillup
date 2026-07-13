'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Check, Lock, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PHASE_META, unlockCopy } from './study-ui';
import { PhaseGlyph } from './illustrations';
import type { StudyDayNodeDto as DayNode, StudyPhase } from '@/shared/dto/study-plan.dto';

const PHASES: StudyPhase[] = ['foundation', 'practice', 'interview'];

/**
 * The 90-step roadmap as a vertical journey — phase-banded, with a coloured spine.
 * Completed days glow in their phase colour with a check, today pulses orange with
 * a flag, unlocked past days invite catch-up, and future days sit in soft locked
 * cards with an unlock countdown. Weekly checkpoints get a star.
 */
export function RoadmapRail({
  days,
  onSelect,
}: {
  days: DayNode[];
  onSelect: (dayNumber: number) => void;
}) {
  const reduce = useReducedMotion();
  const byPhase = PHASES.map((p) => ({ phase: p, list: days.filter((d) => d.phase === p) }));

  return (
    <div className="space-y-9">
      {byPhase.map(({ phase, list }) => {
        if (list.length === 0) return null;
        const meta = PHASE_META[phase];
        const done = list.filter((d) => d.status === 'completed').length;
        return (
          <section key={phase}>
            {/* Phase band header */}
            <div className={cn('mb-4 flex items-center gap-3 rounded-2xl p-3', meta.soft)}>
              <span className={cn('grid size-11 place-items-center rounded-xl bg-gradient-to-br text-white shadow-[0_8px_20px_-8px_rgba(0,0,0,0.4)]', meta.grad)}>
                <PhaseGlyph phase={phase} className="size-6 text-white" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-baseline gap-x-2 font-display text-sm font-black tracking-tight text-navy">
                  {meta.label}
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Days {list[0].dayNumber}–{list[list.length - 1].dayNumber} · {meta.tagline}
                  </span>
                </p>
                <div className="mt-1.5 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-white/70">
                  <div className={cn('h-full rounded-full bg-gradient-to-r', meta.grad)} style={{ width: `${(done / list.length) * 100}%` }} />
                </div>
              </div>
              <span className={cn('shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-black tabular-nums shadow-sm', meta.text)}>
                {done}/{list.length}
              </span>
            </div>

            {/* Ladder */}
            <ol className="relative ml-1">
              <span aria-hidden className={cn('absolute bottom-5 left-[21px] top-5 w-1.5 rounded-full bg-gradient-to-b opacity-40', meta.grad)} />
              {list.map((d, i) => (
                <motion.li
                  key={d.dayNumber}
                  className="relative flex items-center gap-3 py-1.5"
                  initial={reduce ? false : { opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.35, delay: Math.min(i * 0.01, 0.18), ease: [0.22, 1, 0.36, 1] }}
                >
                  <RoadNode day={d} phase={phase} onSelect={onSelect} />
                  <RoadCard day={d} phase={phase} onSelect={onSelect} />
                </motion.li>
              ))}
            </ol>
          </section>
        );
      })}
    </div>
  );
}

const isCheckpoint = (d: DayNode) => d.dayNumber % 7 === 0;

function RoadNode({ day, phase, onSelect }: { day: DayNode; phase: StudyPhase; onSelect: (n: number) => void }) {
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
        'relative z-10 grid size-11 shrink-0 place-items-center rounded-full border-2 text-sm font-black tabular-nums transition',
        completed && cn('border-transparent bg-gradient-to-br text-white shadow-lg ring-4', meta.grad, ringSoft(phase)),
        today && 'border-orange bg-white text-orange shadow-[0_0_0_5px_rgba(243,112,33,0.15)]',
        day.status === 'available' && cn('border-current bg-white shadow-sm hover:scale-110', meta.text),
        locked && 'cursor-not-allowed border-slate-200 bg-white text-slate-300',
      )}
    >
      {today && <span aria-hidden className="absolute inset-0 -z-10 animate-ping rounded-full bg-orange/25" />}
      {completed ? (
        <Check className="size-5" strokeWidth={2.6} />
      ) : locked ? (
        <Lock className="size-4" />
      ) : checkpoint ? (
        <Star className={cn('size-4', today ? 'fill-orange text-orange' : meta.text)} />
      ) : (
        day.dayNumber
      )}
    </button>
  );
}

function RoadCard({ day, phase, onSelect }: { day: DayNode; phase: StudyPhase; onSelect: (n: number) => void }) {
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
        'group flex min-w-0 flex-1 items-center gap-3 rounded-2xl border px-4 py-3 text-left transition',
        today && 'border-orange/40 bg-gradient-to-r from-orange-50 to-white shadow-[0_10px_28px_-18px_rgba(243,112,33,0.7)]',
        completed && 'border-slate-200 bg-white hover:shadow-sm',
        day.status === 'available' && 'border-slate-200 bg-white hover:-translate-y-px hover:border-slate-300 hover:shadow-sm',
        locked && 'cursor-not-allowed border-slate-100 bg-slate-50/70',
      )}
    >
      {/* phase accent */}
      {!locked && <span aria-hidden className={cn('h-9 w-1 shrink-0 rounded-full bg-gradient-to-b', meta.grad, completed ? 'opacity-100' : 'opacity-70')} />}
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2">
          <span className={cn('text-[10px] font-black uppercase tracking-wide', locked ? 'text-slate-300' : meta.text)}>Day {day.dayNumber}</span>
          {today && <span className="rounded-full bg-orange px-1.5 py-px text-[9px] font-black uppercase tracking-wide text-[#171717] shadow-sm">Today</span>}
          {isCheckpoint(day) && !locked && <span className="rounded-full bg-amber-100 px-1.5 py-px text-[9px] font-black uppercase tracking-wide text-amber-700">Checkpoint</span>}
        </p>
        <p className={cn('truncate text-sm font-bold', locked ? 'text-slate-400' : 'text-navy')}>{day.theme}</p>
      </div>
      <div className="shrink-0 text-right">
        {locked ? (
          <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-slate-400 ring-1 ring-slate-200">{unlockCopy(day.unlockDate)}</span>
        ) : completed ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-600">
            <Check className="size-3" /> Done
          </span>
        ) : (
          <span className="text-[11px] font-semibold tabular-nums text-slate-400">{day.doneCount}/{day.taskCount} · {day.xp} XP</span>
        )}
      </div>
    </button>
  );
}

function ringSoft(phase: StudyPhase): string {
  return phase === 'foundation' ? 'ring-sky-500/15' : phase === 'practice' ? 'ring-orange/15' : 'ring-violet-500/15';
}
