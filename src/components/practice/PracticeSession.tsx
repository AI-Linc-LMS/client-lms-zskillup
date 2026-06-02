'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Lightbulb, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  listPracticeQuestions,
  requestPracticeHint,
  submitPracticeAttempt,
  type ApiAttemptResult,
  type ApiQuestion,
} from '@/lib/api/practice';

/**
 * Practice session — the canonical Sprint 3 frontend surface.
 *
 * Loads a batch of published questions from `/practice/questions`, then for each
 * the student selects an option and submits. The backend grades server-side
 * (the client never receives `isCorrect` on the question itself), returns the
 * verdict + explanation, and the UI shows correct/incorrect feedback with a
 * "Reveal hint" button.
 *
 * Idempotency: each question gets a client-side `clientAttemptId` so accidental
 * double-submits don't double-count.
 */
export function PracticeSession({
  topicSlug,
  companySlug,
  limit = 10,
}: {
  topicSlug?: string;
  companySlug?: string;
  limit?: number;
}) {
  const [questions, setQuestions] = useState<ApiQuestion[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Per-question state, keyed by question id
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [results, setResults] = useState<Record<string, ApiAttemptResult>>({});
  const [hints, setHints] = useState<Record<string, string | null>>({});
  const [submitting, setSubmitting] = useState(false);
  const [hintLoading, setHintLoading] = useState(false);
  const startedAtRef = useRef<number>(Date.now());

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    listPracticeQuestions({ topic: topicSlug, company: companySlug, limit })
      .then((qs) => {
        if (cancelled) return;
        setQuestions(qs);
        startedAtRef.current = Date.now();
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [topicSlug, companySlug, limit]);

  const current = questions?.[idx];
  const currentResult = current ? results[current.id] : undefined;
  const currentHint = current ? hints[current.id] : null;

  const toggleOption = useCallback(
    (qId: string, optionId: string, multi: boolean) => {
      if (results[qId]) return; // locked once submitted
      setSelected((prev) => {
        const list = prev[qId] ?? [];
        if (multi) {
          return {
            ...prev,
            [qId]: list.includes(optionId) ? list.filter((id) => id !== optionId) : [...list, optionId],
          };
        }
        return { ...prev, [qId]: [optionId] };
      });
    },
    [results],
  );

  const submit = useCallback(async () => {
    if (!current) return;
    const chosen = selected[current.id] ?? [];
    if (chosen.length === 0) return;
    setSubmitting(true);
    try {
      const elapsed = Math.max(0, Math.floor((Date.now() - startedAtRef.current) / 1000));
      const result = await submitPracticeAttempt({
        questionId: current.id,
        selectedOptionIds: chosen,
        timeTakenSec: elapsed,
        usedHint: !!hints[current.id],
        clientAttemptId: `${current.id}-${startedAtRef.current}`,
      });
      setResults((prev) => ({ ...prev, [current.id]: result }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed. Try again.');
    } finally {
      setSubmitting(false);
    }
  }, [current, selected, hints]);

  const revealHint = useCallback(async () => {
    if (!current || !currentResult) return;
    setHintLoading(true);
    try {
      const res = await requestPracticeHint(currentResult.attemptId);
      setHints((prev) => ({ ...prev, [current.id]: res.hint }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load hint.');
    } finally {
      setHintLoading(false);
    }
  }, [current, currentResult]);

  const goNext = useCallback(() => {
    if (!questions) return;
    if (idx < questions.length - 1) {
      setIdx(idx + 1);
      startedAtRef.current = Date.now();
    }
  }, [idx, questions]);

  const goPrev = useCallback(() => {
    setIdx((i) => Math.max(0, i - 1));
  }, []);

  const answeredCount = useMemo(() => Object.keys(results).length, [results]);
  const correctCount = useMemo(
    () => Object.values(results).filter((r) => r.isCorrect).length,
    [results],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white p-16">
        <Loader2 className="size-5 animate-spin text-slate-400" aria-hidden="true" />
      </div>
    );
  }

  if (error && !questions) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (!questions || questions.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
        <p className="text-sm font-semibold text-navy">No questions in this set yet.</p>
        <p className="mt-1 text-xs text-slate-500">
          We&apos;re still building out questions for this topic.
        </p>
      </div>
    );
  }

  if (!current) return null;

  return (
    <div className="space-y-5">
      {/* Progress bar + counter */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Question {idx + 1} of {questions.length}
          <span className="ml-2 text-slate-300">·</span>
          <span className="ml-2 font-bold text-navy">{correctCount}</span>
          <span className="ml-1 text-slate-400">/ {answeredCount} correct</span>
        </p>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            {current.difficulty.toLowerCase()}
          </span>
        </div>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-navy transition-all"
          style={{ width: `${((idx + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* Question card */}
      <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-base font-semibold leading-relaxed text-navy">{current.stem}</p>

        <div className="mt-5 space-y-2.5">
          {current.options.map((opt) => {
            const isSelected = (selected[current.id] ?? []).includes(opt.id);
            const isCorrect = currentResult?.correctOptionIds.includes(opt.id);
            const isWrongSelection = currentResult && isSelected && !isCorrect;
            const showsCorrect = currentResult && isCorrect;
            const showsWrong = currentResult && isWrongSelection;

            return (
              <button
                key={opt.id}
                type="button"
                disabled={!!currentResult}
                onClick={() => toggleOption(current.id, opt.id, current.type === 'MULTI_SELECT')}
                aria-pressed={isSelected}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg border p-3 text-left text-sm transition-colors',
                  showsCorrect && 'border-emerald-300 bg-emerald-50 text-emerald-900',
                  showsWrong && 'border-red-300 bg-red-50 text-red-900',
                  !currentResult && isSelected && 'border-orange bg-orange/5 text-navy',
                  !currentResult && !isSelected && 'border-slate-200 bg-white text-slate-700 hover:border-slate-300',
                  currentResult && !isCorrect && !isWrongSelection && 'border-slate-200 bg-white text-slate-500',
                )}
              >
                <span
                  className={cn(
                    'grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold',
                    showsCorrect && 'bg-emerald-600 text-white',
                    showsWrong && 'bg-red-600 text-white',
                    !currentResult && isSelected && 'bg-orange text-white',
                    !currentResult && !isSelected && 'bg-slate-100 text-slate-500',
                    currentResult && !isCorrect && !isWrongSelection && 'bg-slate-100 text-slate-400',
                  )}
                >
                  {String.fromCharCode(65 + opt.orderIndex)}
                </span>
                <span className="flex-1">{opt.text}</span>
              </button>
            );
          })}
        </div>

        {/* Verdict + explanation */}
        {currentResult ? (
          <div
            className={cn(
              'mt-5 rounded-lg p-4',
              currentResult.isCorrect
                ? 'bg-emerald-50 ring-1 ring-emerald-200'
                : 'bg-red-50 ring-1 ring-red-200',
            )}
          >
            <p
              className={cn(
                'text-sm font-bold',
                currentResult.isCorrect ? 'text-emerald-700' : 'text-red-700',
              )}
            >
              {currentResult.isCorrect ? '✓ Correct' : '✗ Not quite'}
            </p>
            {currentResult.explanation ? (
              <p className="mt-1 text-sm leading-relaxed text-slate-700">
                {currentResult.explanation}
              </p>
            ) : null}
          </div>
        ) : null}

        {/* Hint */}
        {currentResult ? (
          currentHint ? (
            <div className="mt-3 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <Lightbulb className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden="true" />
              <span>{currentHint}</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={revealHint}
              disabled={hintLoading}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition-colors hover:text-navy disabled:opacity-50"
            >
              {hintLoading ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Lightbulb className="size-3.5" aria-hidden="true" />
              )}
              Reveal hint
            </button>
          )
        ) : null}

        {/* Action row */}
        <div className="mt-5 flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={goPrev} disabled={idx === 0}>
            <ChevronLeft className="size-4" /> Previous
          </Button>
          {currentResult ? (
            idx === questions.length - 1 ? (
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600">
                <Sparkles className="size-4" /> All done
              </span>
            ) : (
              <Button onClick={goNext}>
                Next question <ChevronRight className="size-4" />
              </Button>
            )
          ) : (
            <Button onClick={submit} disabled={submitting || !(selected[current.id]?.length > 0)}>
              {submitting ? <Loader2 className="size-4 animate-spin" /> : 'Submit answer'}
            </Button>
          )}
        </div>
      </article>

      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
