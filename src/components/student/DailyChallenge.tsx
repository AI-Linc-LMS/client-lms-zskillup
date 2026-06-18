'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Calendar, Check, Loader2, Trophy, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { submitPracticeAttempt, type ApiAttemptResult, type ApiQuestion } from '@/lib/api/practice';
import {
  completeDailyChallenge,
  getDailyChallenge,
  type ApiDailyChallenge,
} from '@/lib/api/challenges';
import type { GamificationSummary } from '@/lib/api/gamification-types';
import { RewardOverlay } from '@/components/gamification/RewardOverlay';

/**
 * Daily Challenge ("Today's Questions") — a once-a-day curated set. Each answer
 * grades through the practice path (per-question XP); finishing the set marks it
 * complete and awards a bonus XP, revealed with the Duolingo-style overlay.
 */
export function DailyChallenge() {
  const [ch, setCh] = useState<ApiDailyChallenge | null>(null);
  const [started, setStarted] = useState(false);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [result, setResult] = useState<ApiAttemptResult | null>(null);
  const [correct, setCorrect] = useState(0);
  const [busy, setBusy] = useState(false);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [reward, setReward] = useState<GamificationSummary | null>(null);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getDailyChallenge()
      .then((d) => {
        if (cancelled) return;
        setCh(d);
        setCompleted(d.status === 'COMPLETED');
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ch) return null;

  const q: ApiQuestion | undefined = ch.questions[idx];
  const multi = q?.type === 'MULTI_SELECT';
  const total = ch.questions.length;

  const toggle = (id: string) => {
    if (result) return;
    setSelected((p) => (multi ? (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]) : [id]));
  };

  const check = async () => {
    if (!q || selected.length === 0) return;
    setBusy(true);
    try {
      const r = await submitPracticeAttempt({
        questionId: q.id,
        selectedOptionIds: selected,
        timeTakenSec: Math.min(7200, Math.round((Date.now() - startedAt) / 1000)),
        usedHint: false,
        clientAttemptId: crypto.randomUUID(),
      });
      setResult(r);
      if (r.isCorrect) setCorrect((c) => c + 1);
    } catch {
      /* resilient */
    } finally {
      setBusy(false);
    }
  };

  const next = async () => {
    if (idx + 1 < total) {
      setResult(null);
      setSelected([]);
      setStartedAt(Date.now());
      setIdx((i) => i + 1);
      return;
    }
    // finished the set → finalize for the bonus
    setBusy(true);
    try {
      const summary = await completeDailyChallenge(correct);
      setCompleted(true);
      if (summary) setReward(summary);
    } catch {
      setCompleted(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
      {reward ? (
        <RewardOverlay summary={reward} onClose={() => setReward(null)} passed />
      ) : null}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-12 size-36 rounded-full bg-sky-300/20 blur-2xl"
      />
      <div className="relative mb-3 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-sky-500">
          <Calendar className="size-3.5" /> Today&apos;s challenge
        </p>
        {started && !completed ? (
          <span className="text-[11px] font-semibold text-slate-400">
            {idx + 1} / {total}
          </span>
        ) : null}
      </div>

      {completed ? (
        <div className="relative flex items-center gap-3 py-2">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white">
            <Trophy className="size-5" />
          </span>
          <div>
            <p className="text-sm font-bold text-navy">Challenge complete! 🎉</p>
            <p className="text-xs text-slate-500">Come back tomorrow for a fresh set.</p>
          </div>
        </div>
      ) : !started ? (
        <div className="relative flex items-center justify-between gap-4">
          <div>
            <p className="text-[15px] font-extrabold text-navy">
              {total} questions · +{ch.xpReward} XP bonus
            </p>
            <p className="mt-0.5 text-sm text-slate-500">
              Finish today&apos;s set to keep your streak and bank bonus XP.
            </p>
          </div>
          <button
            onClick={() => {
              setStarted(true);
              setStartedAt(Date.now());
            }}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-sky-600 px-4 py-2 text-sm font-bold text-white hover:bg-sky-700"
          >
            Start <ArrowRight className="size-4" />
          </button>
        </div>
      ) : q ? (
        <div className="relative">
          <p className="text-[15px] font-semibold leading-relaxed text-navy">{q.stem}</p>
          {multi ? <p className="mt-1 text-xs text-slate-400">Select all that apply.</p> : null}
          <div className="mt-3 space-y-2">
            {q.options.map((opt, i) => {
              const isSel = selected.includes(opt.id);
              const isCorrect = result?.correctOptionIds.includes(opt.id);
              const tone = result
                ? isCorrect
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                  : isSel
                    ? 'border-red-300 bg-red-50 text-red-900'
                    : 'border-slate-200 bg-white text-slate-500'
                : isSel
                  ? 'border-sky-400 bg-sky-50 text-navy'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300';
              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={!!result}
                  onClick={() => toggle(opt.id)}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-xl border p-2.5 text-left text-sm transition-colors',
                    tone,
                  )}
                >
                  <span
                    className={cn(
                      'grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold',
                      result && isCorrect
                        ? 'bg-emerald-500 text-white'
                        : result && isSel
                          ? 'bg-red-500 text-white'
                          : isSel
                            ? 'bg-sky-500 text-white'
                            : 'bg-slate-100 text-slate-500',
                    )}
                  >
                    {result && isCorrect ? (
                      <Check className="size-3.5" />
                    ) : result && isSel ? (
                      <X className="size-3.5" />
                    ) : (
                      String.fromCharCode(65 + i)
                    )}
                  </span>
                  <span className="flex-1">{opt.text}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-4 flex items-center justify-end">
            {result ? (
              <button
                onClick={next}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-full bg-sky-600 px-4 py-1.5 text-sm font-bold text-white hover:bg-sky-700 disabled:opacity-60"
              >
                {busy ? <Loader2 className="size-3.5 animate-spin" /> : null}
                {idx + 1 < total ? 'Next' : 'Finish'}
                {!busy ? <ArrowRight className="size-3.5" /> : null}
              </button>
            ) : (
              <button
                onClick={check}
                disabled={selected.length === 0 || busy}
                className="inline-flex items-center gap-1.5 rounded-full bg-sky-600 px-4 py-1.5 text-sm font-bold text-white hover:bg-sky-700 disabled:opacity-50"
              >
                {busy ? <Loader2 className="size-3.5 animate-spin" /> : null} Check
              </button>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
