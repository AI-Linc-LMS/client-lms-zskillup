'use client';

import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Clock, Loader2, Lock, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getRoadmapDay, toggleRoadmapTask, type StudyDayDto } from '@/lib/api/roadmap';
import { PHASE_META, unlockCopy } from './study-ui';
import { TaskRow } from './StudyBits';

/** Slide-over detail for a single roadmap day — its tasks, togglable when unlocked. */
export function DayDrawer({
  dayNumber,
  onClose,
  onChanged,
}: {
  dayNumber: number;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [day, setDay] = useState<StudyDayDto | null>(null);
  const [locked, setLocked] = useState<{ unlockDate?: string } | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  const load = useCallback(() => {
    getRoadmapDay(dayNumber)
      .then((d) => {
        setDay(d);
        setLocked(null);
      })
      .catch((e: unknown) => {
        const details = (e as { details?: { unlockDate?: string } })?.details;
        setLocked(details ?? {});
      });
  }, [dayNumber]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const toggle = async (taskIndex: number, done: boolean) => {
    if (!day) return;
    setBusy(taskIndex);
    try {
      await toggleRoadmapTask(dayNumber, taskIndex, done);
      load();
      onChanged();
    } finally {
      setBusy(null);
    }
  };

  const meta = day ? PHASE_META[day.phase] : PHASE_META.foundation;

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <motion.div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.aside
        className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 380, damping: 40 }}
      >
        <header className={cn('flex items-start gap-3 bg-gradient-to-br p-5 text-white', meta.grad)}>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/70">
              {day ? `${meta.label} · Day ${day.dayNumber}` : `Day ${dayNumber}`}
            </p>
            <h2 className="mt-0.5 text-lg font-black tracking-tight">{day?.theme ?? '…'}</h2>
            {day && (
              <p className="mt-1 flex items-center gap-3 text-xs font-semibold text-white/80">
                <span className="inline-flex items-center gap-1"><Clock className="size-3.5" /> ~{day.estMinutes} min</span>
                <span className="inline-flex items-center gap-1"><Sparkles className="size-3.5" /> {day.xp} XP</span>
              </p>
            )}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full bg-white/15 p-1.5 transition hover:bg-white/25">
            <X className="size-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5">
          {locked ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <span className="grid size-14 place-items-center rounded-2xl bg-slate-100 text-slate-400">
                <Lock className="size-6" />
              </span>
              <p className="text-sm font-bold text-navy">This day is still locked</p>
              <p className="max-w-xs text-xs text-slate-500">
                Your roadmap unlocks one day at a time. {locked.unlockDate ? unlockCopy(locked.unlockDate) : 'Come back soon'}.
              </p>
            </div>
          ) : !day ? (
            <div className="grid h-full place-items-center">
              <Loader2 className="size-5 animate-spin text-slate-300" />
            </div>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  {day.doneCount}/{day.taskCount} done
                </p>
                {day.status === 'completed' && (
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">Day complete 🎉</span>
                )}
              </div>
              <ul className="space-y-2.5">
                {day.tasks.map((t) => (
                  <li key={t.index}>
                    <TaskRow task={t} onToggle={(d) => toggle(t.index, d)} busy={busy === t.index} />
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-center text-[11px] text-slate-400">
                Tasks tick off automatically when you finish the linked practice or mock - or check them yourself.
              </p>
            </>
          )}
        </div>
      </motion.aside>
    </div>
  );
}

/** Wrap in AnimatePresence at the call site so exit animations play. */
export function DayDrawerPortal({
  dayNumber,
  onClose,
  onChanged,
}: {
  dayNumber: number | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  return (
    <AnimatePresence>
      {dayNumber !== null && <DayDrawer key={dayNumber} dayNumber={dayNumber} onClose={onClose} onChanged={onChanged} />}
    </AnimatePresence>
  );
}
