'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Lightbulb,
  Loader2,
  Sparkles,
  Target,
  Trophy,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PyqTag } from '@/components/practice/PyqTag';
import { formatDuration } from '@/lib/format';
import { DIFFICULTY_RING } from '@/lib/ui-maps';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/ui/progress-bar';
import { StatTile } from '@/components/ui/stat-tile';
import {
  getQuestionHint,
  listPracticeQuestions,
  submitPracticeAttempt,
  type ApiAttemptResult,
  type ApiQuestion,
} from '@/lib/api/practice';

/**
 * Practice session — the canonical Sprint 3 surface.
 *
 * Loads a batch of published questions from `/practice/questions`, then for each
 * the student selects an option and submits. The backend grades server-side
 * (the client never receives `isCorrect` on the question), returns the verdict +
 * explanation. Hints are revealable BEFORE answering (one question at a time) so
 * `usedHint` stays meaningful. Finishing opens a results summary.
 *
 * Keyboard: A–D / 1–9 select an option, H reveals the hint, Enter submits / advances.
 * Idempotency: each question carries a stable `clientAttemptId`.
 */
export function PracticeSession({
  topicSlug,
  companySlug,
  year,
  limit = 10,
}: {
  topicSlug?: string;
  companySlug?: string;
  year?: number;
  limit?: number;
}) {
  const [questions, setQuestions] = useState<ApiQuestion[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [finished, setFinished] = useState(false);

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
    listPracticeQuestions({ subtopic: topicSlug, company: companySlug, year, limit })
      .then((qs) => {
        if (cancelled) return;
        setQuestions(qs);
        startedAtRef.current = Date.now();
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [topicSlug, companySlug, year, limit]);

  const current = questions?.[idx];
  const currentResult = current ? results[current.id] : undefined;
  const currentHint = current ? hints[current.id] : null;

  const answeredCount = useMemo(() => Object.keys(results).length, [results]);
  const correctCount = useMemo(
    () => Object.values(results).filter((r) => r.isCorrect).length,
    [results],
  );
  const totalSeconds = useMemo(
    () => Object.values(results).reduce((sum, r) => sum + (r.timeTakenSec || 0), 0),
    [results],
  );

  const contextLabel = companySlug
    ? companySlug.toUpperCase()
    : topicSlug
      ? topicSlug.split('-').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')
      : 'Mixed practice';

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
    if (chosen.length === 0 || results[current.id]) return;
    setSubmitting(true);
    try {
      const elapsed = Math.max(1, Math.floor((Date.now() - startedAtRef.current) / 1000));
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
  }, [current, selected, hints, results]);

  const revealHint = useCallback(async () => {
    if (!current || hints[current.id] !== undefined) return;
    setHintLoading(true);
    try {
      const res = await getQuestionHint(current.id);
      setHints((prev) => ({ ...prev, [current.id]: res.hint }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load hint.');
    } finally {
      setHintLoading(false);
    }
  }, [current, hints]);

  const goNext = useCallback(() => {
    setIdx((i) => (questions && i < questions.length - 1 ? i + 1 : i));
    startedAtRef.current = Date.now();
  }, [questions]);

  const goPrev = useCallback(() => setIdx((i) => Math.max(0, i - 1)), []);

  // Keyboard control
  useEffect(() => {
    if (finished || !current) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const key = e.key.toLowerCase();
      if (!currentResult) {
        const letterIdx = 'abcdefghij'.indexOf(key);
        const numIdx = /^[1-9]$/.test(key) ? Number(key) - 1 : -1;
        const optIdx = letterIdx >= 0 ? letterIdx : numIdx;
        if (optIdx >= 0 && optIdx < current.options.length) {
          e.preventDefault();
          toggleOption(current.id, current.options[optIdx].id, current.type === 'MULTI_SELECT');
          return;
        }
        if (key === 'h') {
          e.preventDefault();
          void revealHint();
          return;
        }
      }
      if (key === 'enter') {
        e.preventDefault();
        if (!currentResult) void submit();
        else if (idx < (questions?.length ?? 0) - 1) goNext();
        else setFinished(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [finished, current, currentResult, idx, questions, toggleOption, revealHint, submit, goNext]);

  // ── States ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white p-16">
        <Loader2 className="size-5 animate-spin text-slate-400" aria-hidden="true" />
      </div>
    );
  }

  if (error && !questions) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</div>
    );
  }

  if (!questions || questions.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
        <span className="mx-auto grid size-11 place-items-center rounded-xl bg-violet-50 text-violet-600 ring-1 ring-violet-100">
          <Target className="size-5" aria-hidden="true" />
        </span>
        <p className="mt-3 text-sm font-semibold text-navy">No questions in this set yet.</p>
        <p className="mt-1 text-xs text-slate-500">We&apos;re still building out questions for this topic.</p>
        <Button variant="outline" size="sm" className="mt-4" asChild>
          <Link href="/topic-mastery">Browse other topics</Link>
        </Button>
      </div>
    );
  }

  // ── Completion summary ──────────────────────────────────────────────────────
  if (finished) {
    const pct = answeredCount === 0 ? 0 : Math.round((correctCount / answeredCount) * 100);
    const tone =
      pct >= 80 ? 'emerald' : pct >= 50 ? 'amber' : 'red';
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <span
          className={cn(
            'mx-auto grid size-16 place-items-center rounded-full ring-1',
            tone === 'emerald' && 'bg-emerald-50 text-emerald-600 ring-emerald-100',
            tone === 'amber' && 'bg-amber-50 text-amber-600 ring-amber-100',
            tone === 'red' && 'bg-red-50 text-red-600 ring-red-100',
          )}
        >
          <Trophy className="size-7" aria-hidden="true" />
        </span>
        <p className="mt-4 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Session complete · {contextLabel}
        </p>
        <h2 className="mt-1 text-[40px] font-extrabold leading-none text-navy">{pct}%</h2>
        <p className="mt-2 text-sm text-slate-500">accuracy this session</p>

        <div className="mx-auto mt-6 grid max-w-sm grid-cols-3 gap-3">
          <StatTile label="Correct" value={`${correctCount}/${answeredCount}`} />
          <StatTile label="Questions" value={String(questions.length)} />
          <StatTile label="Time" value={formatDuration(totalSeconds)} />
        </div>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Button asChild>
            <Link href="/topic-mastery">
              <Target className="size-4" /> Practice another topic
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!current) return null;

  const hasSelection = (selected[current.id]?.length ?? 0) > 0;
  const isLast = idx === questions.length - 1;

  return (
    <div className="space-y-4">
      {/* Session header */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              {contextLabel}
            </p>
            <p className="mt-0.5 text-sm font-bold text-navy">
              Question {idx + 1} <span className="text-slate-400">of {questions.length}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ring-1',
                DIFFICULTY_RING[current.difficulty] ?? 'bg-slate-100 text-slate-600 ring-slate-200',
              )}
            >
              {current.difficulty.toLowerCase()}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
              <Target className="size-3 text-emerald-600" aria-hidden="true" />
              {correctCount}/{answeredCount} correct
            </span>
          </div>
        </div>
        <ProgressBar value={((idx + 1) / questions.length) * 100} className="mt-3 h-1.5" />
      </div>

      {/* Question card */}
      <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <PyqTag companyIds={current.companyTags.map((t) => t.companyId)} years={current.yearTags ?? []} className="mb-2" />
        <p className="text-base font-semibold leading-relaxed text-navy">{current.stem}</p>

        <div className="mt-5 space-y-2.5">
          {current.options.map((opt, i) => {
            const isSelected = (selected[current.id] ?? []).includes(opt.id);
            const isCorrect = currentResult?.correctOptionIds.includes(opt.id);
            const showsCorrect = currentResult && isCorrect;
            const showsWrong = currentResult && isSelected && !isCorrect;

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
                  currentResult && !isCorrect && !showsWrong && 'border-slate-200 bg-white text-slate-500',
                )}
              >
                <span
                  className={cn(
                    'grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold',
                    showsCorrect && 'bg-emerald-600 text-white',
                    showsWrong && 'bg-red-600 text-white',
                    !currentResult && isSelected && 'bg-orange text-white',
                    !currentResult && !isSelected && 'bg-slate-100 text-slate-500',
                    currentResult && !isCorrect && !showsWrong && 'bg-slate-100 text-slate-400',
                  )}
                >
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="flex-1">{opt.text}</span>
                {showsCorrect ? <Check className="size-4 shrink-0 text-emerald-600" aria-hidden="true" /> : null}
                {showsWrong ? <X className="size-4 shrink-0 text-red-600" aria-hidden="true" /> : null}
              </button>
            );
          })}
        </div>

        {/* Hint (revealable any time) */}
        {currentHint ? (
          <div className="mt-3 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <Lightbulb className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden="true" />
            <span>{currentHint}</span>
          </div>
        ) : currentHint === null && current.id in hints ? (
          <p className="mt-3 text-xs text-slate-400">No hint available for this question.</p>
        ) : !currentResult ? (
          <Button variant="ghost" size="sm" onClick={revealHint} disabled={hintLoading} className="mt-3">
            {hintLoading ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Lightbulb className="size-3.5" aria-hidden="true" />
            )}
            Need a hint?
          </Button>
        ) : null}

        {/* Verdict + explanation */}
        {currentResult ? (
          <div
            className={cn(
              'mt-4 rounded-lg p-4',
              currentResult.isCorrect ? 'bg-emerald-50 ring-1 ring-emerald-200' : 'bg-red-50 ring-1 ring-red-200',
            )}
          >
            <p
              className={cn(
                'flex items-center gap-1.5 text-sm font-bold',
                currentResult.isCorrect ? 'text-emerald-700' : 'text-red-700',
              )}
            >
              {currentResult.isCorrect ? (
                <>
                  <Check className="size-4" aria-hidden="true" /> Correct
                </>
              ) : (
                <>
                  <X className="size-4" aria-hidden="true" /> Not quite
                </>
              )}
            </p>
            {currentResult.explanation ? (
              <p className="mt-1 text-sm leading-relaxed text-slate-700">{currentResult.explanation}</p>
            ) : null}
          </div>
        ) : null}

        {/* Action row */}
        <div className="mt-5 flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={goPrev} disabled={idx === 0}>
            <ChevronLeft className="size-4" /> Previous
          </Button>
          {currentResult ? (
            isLast ? (
              <Button onClick={() => setFinished(true)}>
                <Sparkles className="size-4" /> See results
              </Button>
            ) : (
              <Button onClick={goNext}>
                Next question <ChevronRight className="size-4" />
              </Button>
            )
          ) : (
            <Button onClick={submit} disabled={submitting || !hasSelection}>
              {submitting ? <Loader2 className="size-4 animate-spin" /> : 'Submit answer'}
            </Button>
          )}
        </div>
      </article>

      {/* Keyboard hint */}
      <p className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
        <Clock className="size-3" aria-hidden="true" />
        Tip: press <kbd className="rounded border border-slate-200 bg-slate-50 px-1 font-mono">A</kbd>–
        <kbd className="rounded border border-slate-200 bg-slate-50 px-1 font-mono">D</kbd> to choose,{' '}
        <kbd className="rounded border border-slate-200 bg-slate-50 px-1 font-mono">Enter</kbd> to submit
      </p>

      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}

