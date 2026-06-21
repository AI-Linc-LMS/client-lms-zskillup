'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Check, Loader2, RefreshCw, Sparkles, X, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getQuickAptitude,
  submitPracticeAttempt,
  type ApiAttemptResult,
  type ApiQuestion,
} from '@/lib/api/practice';
import { notifyXpUpdated } from '@/lib/xp-events';

/**
 * Quick Aptitude — a compact, interactive dashboard warm-up. Pulls a small
 * random set from the question bank (GET /practice/quick-aptitude), runs one
 * question at a time inline, and grades each via the normal practice attempt —
 * which awards XP + streak server-side (shown as a little +XP pop).
 */
export function QuickAptitude() {
  const [questions, setQuestions] = useState<ApiQuestion[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [result, setResult] = useState<ApiAttemptResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [startedAt, setStartedAt] = useState(() => Date.now());

  const load = useCallback(() => {
    setQuestions(null);
    setIdx(0);
    setSelected([]);
    setResult(null);
    setStartedAt(Date.now());
    getQuickAptitude(5)
      .then((qs) => setQuestions(qs))
      .catch(() => setQuestions([]));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const q = questions?.[idx];
  const multi = q?.type === 'MULTI_SELECT';
  const done = !!questions && idx >= questions.length;

  const toggle = (optId: string) => {
    if (result) return;
    setSelected((prev) =>
      multi ? (prev.includes(optId) ? prev.filter((i) => i !== optId) : [...prev, optId]) : [optId],
    );
  };

  const submit = async () => {
    if (!q || selected.length === 0) return;
    setSubmitting(true);
    try {
      const r = await submitPracticeAttempt({
        questionId: q.id,
        selectedOptionIds: selected,
        timeTakenSec: Math.min(7200, Math.round((Date.now() - startedAt) / 1000)),
        usedHint: false,
        clientAttemptId: crypto.randomUUID(),
      });
      setResult(r);
      if (r.gamification) notifyXpUpdated();
    } catch {
      /* swallow — keep the widget resilient */
    } finally {
      setSubmitting(false);
    }
  };

  const next = () => {
    setResult(null);
    setSelected([]);
    setStartedAt(Date.now());
    setIdx((i) => i + 1);
  };

  return (
    <section className="relative overflow-hidden rounded-3xl border border-violet-200/70 bg-white p-6 shadow-[0_18px_50px_-30px_rgba(124,58,237,0.45)] sm:p-7">
      <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-500 via-indigo-500 to-violet-400" />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 size-36 rounded-full bg-violet-300/25 blur-3xl"
      />
      <div className="relative mb-5 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-2xl font-black tracking-tight text-navy">
          <Zap className="size-5 text-violet-500" /> Quick aptitude
        </h3>
        {questions && questions.length > 0 && !done ? (
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold tabular-nums text-slate-500">
            {idx + 1} / {questions.length}
          </span>
        ) : null}
      </div>

      {!questions ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="size-5 animate-spin text-slate-400" />
        </div>
      ) : questions.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">No questions available right now.</p>
      ) : done ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white">
            <Sparkles className="size-6" />
          </span>
          <p className="text-sm font-bold text-navy">Warm-up complete!</p>
          <div className="flex gap-2">
            <button
              onClick={load}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              <RefreshCw className="size-3.5" /> New set
            </button>
            <Link
              href="/practice"
              className="inline-flex items-center gap-1.5 rounded-full bg-violet-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-violet-700"
            >
              Full practice <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      ) : q ? (
        <div className="relative">
          <p className="text-lg font-bold leading-relaxed text-navy">{q.stem}</p>
          {multi ? <p className="mt-1 text-xs text-slate-400">Select all that apply.</p> : null}

          <div className="mt-4 space-y-2.5">
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
                  ? 'border-violet-400 bg-violet-50 text-navy ring-1 ring-violet-200'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-violet-300 hover:bg-violet-50/40';
              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={!!result}
                  onClick={() => toggle(opt.id)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl border p-3.5 text-left text-[15px] font-medium transition-colors',
                    tone,
                  )}
                >
                  <span
                    className={cn(
                      'grid size-7 shrink-0 place-items-center rounded-lg text-xs font-bold',
                      result && isCorrect
                        ? 'bg-emerald-500 text-white'
                        : result && isSel
                          ? 'bg-red-500 text-white'
                          : isSel
                            ? 'bg-violet-500 text-white'
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

          {/* result / actions */}
          <div className="mt-4 flex items-center justify-between gap-3">
            <AnimatePresence mode="wait">
              {result ? (
                <motion.div
                  key="verdict"
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-2"
                >
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold',
                      result.isCorrect
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-red-50 text-red-700',
                    )}
                  >
                    {result.isCorrect ? <Check className="size-3" /> : <X className="size-3" />}
                    {result.isCorrect ? 'Correct' : 'Incorrect'}
                  </span>
                  {result.gamification && result.gamification.xpEarned > 0 ? (
                    <motion.span
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-600"
                    >
                      <Zap className="size-3 fill-amber-400 text-amber-500" /> +
                      {result.gamification.xpEarned} XP
                    </motion.span>
                  ) : null}
                </motion.div>
              ) : (
                <span key="spacer" />
              )}
            </AnimatePresence>

            {result ? (
              <button
                onClick={next}
                className="inline-flex items-center gap-1.5 rounded-full bg-violet-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-violet-700"
              >
                {idx + 1 < (questions?.length ?? 0) ? 'Next' : 'Finish'}
                <ArrowRight className="size-3.5" />
              </button>
            ) : (
              <button
                onClick={submit}
                disabled={selected.length === 0 || submitting}
                className="inline-flex items-center gap-1.5 rounded-full bg-violet-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-violet-700 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="size-3.5 animate-spin" /> : null} Check
              </button>
            )}
          </div>

          {result?.explanation ? (
            <p className="mt-3 rounded-lg bg-slate-50 p-2.5 text-xs leading-relaxed text-slate-600">
              <span className="font-semibold text-navy">Why: </span>
              {result.explanation}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
