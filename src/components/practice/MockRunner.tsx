'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  Sparkles,
  Star,
  Target,
  Timer,
  Trophy,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatClock, formatDuration } from '@/lib/format';
import { DIFFICULTY_RING } from '@/lib/ui-maps';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/ui/progress-bar';
import { StatTile } from '@/components/ui/stat-tile';
import {
  answerMock,
  getMock,
  getMockReport,
  startMock,
  submitMock,
  type ApiMockReport,
  type ApiMockSavedCoding,
  type ApiMockStart,
  type ApiMockSummary,
} from '@/lib/api/mocks';
import type { GamificationSummary } from '@/lib/api/gamification-types';
import { RewardOverlay } from '@/components/gamification/RewardOverlay';
import { MockCodingPanel } from '@/components/practice/MockCodingPanel';
import { useProctoring } from '@/lib/proctoring/useProctoring';
import { ProctorOverlay } from '@/components/proctoring/ProctorOverlay';

/**
 * Mock-test runner — the Sprint 4 timed assessment surface (Zone B → focused
 * full-screen, no AppShell). Three phases:
 *
 *   intro    — premium dark pre-start with the mock's real metadata.
 *   running  — one question at a time, a server-authoritative countdown
 *              (driven by `expiresAt`), answers persisted as they're chosen.
 *   report   — server-graded score, percentile, pass/fail, topic breakdown,
 *              and a per-question review with the answer key + explanations.
 *
 * The clock is NOT trusted client-side: the deadline comes from the backend and
 * the server re-checks it on every answer/submit. When the countdown hits zero
 * the run auto-submits; the server finalizes it as EXPIRED if it is past time.
 */

type Phase = 'intro' | 'running' | 'report';

export function MockRunner({ mockId, proctored = false }: { mockId: string; proctored?: boolean }) {
  const proctor = useProctoring(proctored);
  const [phase, setPhase] = useState<Phase>('intro');
  const [mock, setMock] = useState<ApiMockSummary | null>(null);
  const [start, setStart] = useState<ApiMockStart | null>(null);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  // Coding answers (keyed by problemId) — recorded server-side on submit, mirrored
  // here so the navigator + answered count reflect coding questions too.
  const [codingResults, setCodingResults] = useState<Record<string, ApiMockSavedCoding>>({});
  const [idx, setIdx] = useState(0);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [report, setReport] = useState<ApiMockReport | null>(null);
  const [reward, setReward] = useState<GamificationSummary | null>(null);

  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deadlineRef = useRef<number | null>(null);
  const submittedRef = useRef(false);
  const answersRef = useRef(answers);
  answersRef.current = answers;
  // Autosaves run through a single promise chain so they reach the server in
  // click order (concurrent POSTs raced and could finish out of order). `acked`
  // remembers the last selection the server confirmed per question; submit only
  // flushes the diff instead of re-sending all answers (which at 100 questions
  // would hammer the rate limit for no reason).
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const ackedRef = useRef<Map<string, string>>(new Map());

  // ── Load mock metadata for the intro screen ───────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getMock(mockId)
      .then((m) => {
        if (!cancelled) setMock(m);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message || 'This mock test is not available.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mockId]);

  const beginAttempt = useCallback(async () => {
    setStarting(true);
    setError(null);
    try {
      const s = await startMock(mockId);
      const hydrated: Record<string, string[]> = {};
      ackedRef.current = new Map();
      for (const a of s.savedAnswers) {
        hydrated[a.questionId] = a.selectedOptionIds;
        // Resumed answers are already on the server — no need to re-flush them.
        ackedRef.current.set(a.questionId, JSON.stringify(a.selectedOptionIds));
      }
      setStart(s);
      setAnswers(hydrated);
      setCodingResults(
        Object.fromEntries((s.savedCoding ?? []).map((c) => [c.problemId, c])),
      );
      setIdx(0);
      deadlineRef.current = new Date(s.expiresAt).getTime();
      setRemaining(Math.max(0, Math.round((deadlineRef.current - Date.now()) / 1000)));
      if (proctored) void proctor.start();
      setPhase('running');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start the mock test.');
    } finally {
      setStarting(false);
    }
  }, [mockId]);

  const finishAttempt = useCallback(async () => {
    if (!start || submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    setError(null);
    try {
      // Let in-flight autosaves land, then flush only the answers the server
      // hasn't confirmed (failed saves, or selections racing the deadline).
      await saveQueueRef.current.catch(() => {});
      const unsynced = Object.entries(answersRef.current).filter(
        ([questionId, selectedOptionIds]) =>
          ackedRef.current.get(questionId) !== JSON.stringify(selectedOptionIds),
      );
      await Promise.allSettled(
        unsynced.map(([questionId, selectedOptionIds]) =>
          answerMock(start.attemptId, { questionId, selectedOptionIds }),
        ),
      );
      const result = await submitMock(
        start.attemptId,
        proctored ? proctor.summary() : undefined,
      );
      if (proctored) proctor.stop();
      setReward(result.gamification ?? null);
      const r = await getMockReport(start.attemptId);
      setReport(r);
      setPhase('report');
    } catch (err) {
      // Allow a retry if submit failed for a transient reason.
      submittedRef.current = false;
      setError(err instanceof Error ? err.message : 'Could not submit the mock test.');
    } finally {
      setSubmitting(false);
    }
  }, [start, proctored, proctor]);

  // ── Server-authoritative countdown ────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'running' || deadlineRef.current === null) return;
    const tick = () => {
      const left = Math.max(0, Math.round((deadlineRef.current! - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) void finishAttempt();
    };
    tick();
    const handle = window.setInterval(tick, 1000);
    return () => window.clearInterval(handle);
  }, [phase, finishAttempt]);

  const selectOption = useCallback(
    (questionId: string, optionId: string, multi: boolean) => {
      if (!start || submittedRef.current) return;
      setAnswers((prev) => {
        const current = prev[questionId] ?? [];
        const next = multi
          ? current.includes(optionId)
            ? current.filter((id) => id !== optionId)
            : [...current, optionId]
          : [optionId];
        // Persist in click order through the save queue; on ack remember what
        // the server has, so submit only needs to flush the diff.
        saveQueueRef.current = saveQueueRef.current
          .then(() => answerMock(start.attemptId, { questionId, selectedOptionIds: next }))
          .then(() => {
            ackedRef.current.set(questionId, JSON.stringify(next));
          })
          .catch(() => {});
        return { ...prev, [questionId]: next };
      });
    },
    [start],
  );

  const onCodeSubmitted = useCallback(
    (problemId: string, r: { verdict: string; passed: number; total: number; isCorrect: boolean }) => {
      setCodingResults((prev) => ({
        ...prev,
        [problemId]: {
          problemId,
          language: prev[problemId]?.language ?? null,
          sourceCode: prev[problemId]?.sourceCode ?? null,
          verdict: r.verdict,
          passed: r.passed,
          total: r.total,
          isCorrect: r.isCorrect,
        },
      }));
    },
    [],
  );

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-navy">
        <Loader2 className="size-6 animate-spin text-white/60" aria-hidden="true" />
      </div>
    );
  }

  if (error && !mock) {
    return (
      <div className="grid min-h-screen place-items-center bg-navy px-6">
        <div className="max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-red-500/15 text-red-300">
            <AlertTriangle className="size-6" aria-hidden="true" />
          </span>
          <p className="mt-4 text-sm font-semibold text-white">{error}</p>
          <Button variant="outline" className="mt-5" asChild>
            <Link href="/mock-tests">Back to mock tests</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (phase === 'report' && report) {
    return <MockReportView report={report} reward={reward} />;
  }

  if (phase === 'running' && start) {
    return (
      <>
        <MockRunningView
          start={start}
          idx={idx}
          setIdx={setIdx}
          answers={answers}
          codingResults={codingResults}
          remaining={remaining ?? 0}
          submitting={submitting}
          error={error}
          onSelect={selectOption}
          onCodeSubmitted={onCodeSubmitted}
          onSubmit={finishAttempt}
        />
        {proctored ? <ProctorOverlay controller={proctor} /> : null}
      </>
    );
  }

  // ── intro ──────────────────────────────────────────────────────────────────
  const m = mock!;
  const stats = [
    { icon: BookOpen, label: 'Questions', value: String(m.totalQuestions) },
    { icon: Timer, label: 'Duration', value: `${m.durationMinutes} min` },
    { icon: Star, label: 'Pass mark', value: `${m.passingScore}%` },
    { icon: Sparkles, label: 'Format', value: 'Timed · Strict' },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-navy text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_-10%,rgba(243,112,33,0.15),transparent),radial-gradient(50%_50%_at_100%_100%,rgba(56,189,248,0.12),transparent)]"
      />
      <div className="relative z-10 flex items-center justify-between px-8 py-6">
        <Link
          href="/mock-tests"
          className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-1.5 text-xs font-semibold text-white/90 transition-colors hover:bg-white/10"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Exit to mock tests
        </Link>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-white/70">
          <Sparkles className="size-3" aria-hidden="true" /> Assessment mode
        </span>
      </div>

      <main className="relative z-10 mx-auto max-w-5xl px-8 pb-16 pt-4">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/50">
              ZSkillup mock drive
            </p>
            <h1 className="mt-3 text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">
              {m.title}
            </h1>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-white/70">
              {m.totalQuestions} questions in {m.durationMinutes} minutes. The clock is enforced by
              the server — when time runs out the test submits automatically. Your answers are saved
              as you go.
            </p>

            <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {stats.map(({ icon: Icon, label, value }) => (
                <div key={label} className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <Icon className="size-4 text-white/60" aria-hidden="true" />
                  <p className="mt-3 text-[10px] font-semibold uppercase tracking-widest text-white/50">
                    {label}
                  </p>
                  <p className="mt-1 text-xl font-extrabold text-white">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Button size="lg" onClick={beginAttempt} disabled={starting}>
                {starting ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Timer className="size-4" aria-hidden="true" />
                )}
                Start mock test
              </Button>
              <Link
                href="/mock-tests"
                className="inline-flex h-12 items-center gap-1.5 rounded-full border border-white/20 px-6 text-[15px] font-semibold text-white/90 transition-colors hover:bg-white/10"
              >
                Maybe later
              </Link>
            </div>

            <p className="mt-3 flex items-center gap-1.5 text-[11px] text-white/40">
              <AlertTriangle className="size-3.5 shrink-0" aria-hidden="true" />
              Once started, the timer can&apos;t be paused. Final submit is one-way.
            </p>
            {error ? (
              <p role="alert" className="mt-2 text-sm text-red-300">
                {error}
              </p>
            ) : null}
          </div>

          <aside className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-white/5 p-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">
                What to expect
              </p>
              <ul className="mt-3 space-y-3 text-[13px] leading-snug text-white/80">
                <li className="flex gap-3">
                  <Clock className="mt-0.5 size-4 shrink-0 text-orange" aria-hidden="true" />
                  <span>A single countdown for the whole test — pace yourself across all questions.</span>
                </li>
                <li className="flex gap-3">
                  <Target className="mt-0.5 size-4 shrink-0 text-orange" aria-hidden="true" />
                  <span>Jump between questions freely; revisit and change answers until you submit.</span>
                </li>
                <li className="flex gap-3">
                  <BarChart3 className="mt-0.5 size-4 shrink-0 text-orange" aria-hidden="true" />
                  <span>Get a percentile, a topic-by-topic breakdown, and a full answer review.</span>
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

// ── Running view ──────────────────────────────────────────────────────────────

function MockRunningView({
  start,
  idx,
  setIdx,
  answers,
  codingResults,
  remaining,
  submitting,
  error,
  onSelect,
  onCodeSubmitted,
  onSubmit,
}: {
  start: ApiMockStart;
  idx: number;
  setIdx: (updater: (i: number) => number) => void;
  answers: Record<string, string[]>;
  codingResults: Record<string, ApiMockSavedCoding>;
  remaining: number;
  submitting: boolean;
  error: string | null;
  onSelect: (questionId: string, optionId: string, multi: boolean) => void;
  onCodeSubmitted: (
    problemId: string,
    r: { verdict: string; passed: number; total: number; isCorrect: boolean },
  ) => void;
  onSubmit: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const question = start.questions[idx];
  const total = start.questions.length;
  const isAnswered = (q: ApiMockStart['questions'][number]) =>
    q.type === 'CODING' ? !!codingResults[q.id] : (answers[q.id]?.length ?? 0) > 0;
  const answeredCount = useMemo(
    () => start.questions.filter((q) => isAnswered(q)).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [start.questions, answers, codingResults],
  );
  const low = remaining <= 60;
  const mid = remaining <= 300 && remaining > 60;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-6 shadow-sm">
        <span className="flex items-center gap-1.5 text-sm font-bold text-navy">
          <Sparkles className="size-4 text-orange" aria-hidden="true" /> {start.title}
        </span>
        <div className="flex items-center gap-3">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold ring-1 tabular-nums',
              low
                ? 'bg-red-50 text-red-600 ring-red-200'
                : mid
                  ? 'bg-amber-50 text-amber-700 ring-amber-200'
                  : 'bg-slate-100 text-navy ring-slate-200',
            )}
            role="timer"
            aria-live={low ? 'assertive' : 'off'}
          >
            <Clock className="size-3.5" aria-hidden="true" /> {formatClock(remaining)}
          </span>
          <span className="text-[11px] font-semibold text-slate-500">
            Q {idx + 1} / {total}
          </span>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-6 py-8">
        {/* Question navigator — scrolls past ~3 rows so a 100-Q grid stays compact */}
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              Questions
            </p>
            <span className="text-[11px] font-semibold text-slate-500">
              {answeredCount}/{total} answered
            </span>
          </div>
          <div className="mt-2 flex max-h-[6.25rem] flex-wrap items-center gap-1.5 overflow-y-auto pr-1">
            {start.questions.map((q, i) => {
              const done = isAnswered(q);
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setIdx(() => i)}
                  aria-label={`Go to question ${i + 1}${done ? ' (answered)' : ''}`}
                  aria-current={i === idx}
                  className={cn(
                    'grid size-7 place-items-center rounded-lg text-[11px] font-bold transition-colors',
                    i === idx
                      ? 'bg-navy text-white'
                      : done
                        ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                        : 'bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50',
                  )}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
        </div>

        {/* Question card */}
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              Question {idx + 1} of {total}
            </p>
            <span
              className={cn(
                'rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ring-1',
                DIFFICULTY_RING[question.difficulty] ?? 'bg-slate-100 text-slate-600 ring-slate-200',
              )}
            >
              {question.difficulty.toLowerCase()}
            </span>
          </div>
          <p className="mt-3 text-base font-semibold leading-relaxed text-navy">{question.stem}</p>
          {question.type === 'MULTI_SELECT' ? (
            <p className="mt-1 text-xs text-slate-400">Select all that apply.</p>
          ) : null}
          {question.type === 'CODING' ? (
            <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-600">
              Coding problem
            </p>
          ) : null}

          {question.type === 'CODING' && question.coding ? (
            <MockCodingPanel
              attemptId={start.attemptId}
              question={question}
              saved={codingResults[question.id]}
              onSubmitted={(r) => onCodeSubmitted(question.id, r)}
            />
          ) : (
            <div className="mt-5 space-y-2.5">
              {question.options.map((opt, i) => {
                const isSelected = (answers[question.id] ?? []).includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onSelect(question.id, opt.id, question.type === 'MULTI_SELECT')}
                    aria-pressed={isSelected}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg border p-3 text-left text-sm transition-colors',
                      isSelected
                        ? 'border-orange bg-orange/5 text-navy'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300',
                    )}
                  >
                    <span
                      className={cn(
                        'grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold',
                        isSelected ? 'bg-orange text-white' : 'bg-slate-100 text-slate-500',
                      )}
                    >
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="flex-1">{opt.text}</span>
                    {isSelected ? (
                      <Check className="size-4 shrink-0 text-orange" aria-hidden="true" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-6 flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIdx((i) => Math.max(0, i - 1))}
              disabled={idx === 0}
            >
              <ChevronLeft className="size-4" aria-hidden="true" /> Previous
            </Button>
            {idx < total - 1 ? (
              <Button size="sm" onClick={() => setIdx((i) => Math.min(total - 1, i + 1))}>
                Next <ChevronRight className="size-4" aria-hidden="true" />
              </Button>
            ) : (
              <Button size="sm" onClick={() => setConfirming(true)} disabled={submitting}>
                Review &amp; submit
              </Button>
            )}
          </div>
        </article>

        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/mock-tests">
              <ArrowLeft className="size-3.5" aria-hidden="true" /> Exit
            </Link>
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setConfirming(true)} disabled={submitting}>
            Submit test
          </Button>
        </div>

        {error ? (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        ) : null}
      </main>

      {/* Submit confirmation */}
      {confirming ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-navy/40 px-6">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
            <h2 className="text-base font-bold text-navy">Submit this mock test?</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
              You&apos;ve answered <span className="font-semibold text-navy">{answeredCount}</span> of{' '}
              {total} questions. Submitting is final — you&apos;ll see your score and a full review
              right after.
            </p>
            <div className="mt-5 flex items-center justify-end gap-3">
              <Button variant="outline" size="sm" onClick={() => setConfirming(false)} disabled={submitting}>
                Keep going
              </Button>
              <Button size="sm" onClick={onSubmit} disabled={submitting}>
                {submitting ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : 'Submit now'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ── Report view ─────────────────────────────────────────────────────────────

function MockReportView({
  report,
  reward = null,
}: {
  report: ApiMockReport;
  reward?: GamificationSummary | null;
}) {
  const tone = report.passed ? 'emerald' : report.pct >= 40 ? 'amber' : 'red';
  // Show the reward reveal first (only when we actually awarded this submission).
  const [showReward, setShowReward] = useState<boolean>(!!reward);
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {showReward && reward ? (
        <RewardOverlay summary={reward} passed={report.passed} onClose={() => setShowReward(false)} />
      ) : null}
      <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-6 shadow-sm">
        <span className="flex items-center gap-1.5 text-sm font-bold text-navy">
          <Trophy className="size-4 text-amber-500" aria-hidden="true" /> Mock report
        </span>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/mock-tests">
            <ArrowLeft className="size-3.5" aria-hidden="true" /> Mock tests
          </Link>
        </Button>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-6 py-8">
        {/* Score hero */}
        <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            {report.title}
          </p>
          <span
            className={cn(
              'mx-auto mt-4 grid size-16 place-items-center rounded-full ring-1',
              tone === 'emerald' && 'bg-emerald-50 text-emerald-600 ring-emerald-100',
              tone === 'amber' && 'bg-amber-50 text-amber-600 ring-amber-100',
              tone === 'red' && 'bg-red-50 text-red-600 ring-red-100',
            )}
          >
            <Trophy className="size-7" aria-hidden="true" />
          </span>
          <h1 className="mt-4 text-[44px] font-extrabold leading-none text-navy">{report.pct}%</h1>
          <p className="mt-2 text-sm text-slate-500">
            {report.score} of {report.total} correct
          </p>
          <span
            className={cn(
              'mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold ring-1',
              report.passed
                ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                : 'bg-red-50 text-red-700 ring-red-200',
            )}
          >
            {report.passed ? (
              <>
                <Check className="size-3.5" aria-hidden="true" /> Passed · cleared {report.passingScore}%
              </>
            ) : (
              <>
                <X className="size-3.5" aria-hidden="true" /> Below {report.passingScore}% pass mark
              </>
            )}
          </span>
          {report.status === 'EXPIRED' ? (
            <p className="mt-3 text-xs font-medium text-amber-600">
              Time expired — graded on the answers recorded before the deadline.
            </p>
          ) : null}

          <div className="mx-auto mt-6 grid max-w-lg grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="Percentile" value={`${report.percentile}th`} />
            <StatTile label="Correct" value={`${report.score}/${report.total}`} />
            <StatTile label="Time" value={formatDuration(report.timeTakenSec)} />
            <StatTile label="Avg / question" value={`${report.avgSecPerQuestion}s`} />
          </div>

          {reward && (reward.xpEarned > 0 || reward.streakDays > 0) ? (
            <div className="mx-auto mt-5 flex max-w-lg flex-wrap items-center justify-center gap-2">
              {reward.xpEarned > 0 ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-sm font-bold text-amber-700 ring-1 ring-amber-200">
                  <Star className="size-4 fill-amber-400 text-amber-500" aria-hidden="true" /> +
                  {reward.xpEarned} XP
                </span>
              ) : null}
              {reward.streakDays > 0 ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1.5 text-sm font-bold text-orange-600 ring-1 ring-orange-200">
                  🔥 {reward.streakDays} day{reward.streakDays === 1 ? '' : 's'}
                </span>
              ) : null}
              {reward.leveledUp ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-bold text-emerald-700 ring-1 ring-emerald-200">
                  <Trophy className="size-4 text-emerald-600" aria-hidden="true" /> Level{' '}
                  {reward.level}
                </span>
              ) : null}
              <button
                onClick={() => setShowReward(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-50"
              >
                <Sparkles className="size-4" aria-hidden="true" /> Replay
              </button>
            </div>
          ) : null}
        </section>

        {/* Topic breakdown */}
        {report.topicBreakdown.length > 0 ? (
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              Topic breakdown
            </p>
            <ul className="mt-4 space-y-4">
              {report.topicBreakdown.map((t) => {
                const pct = t.total === 0 ? 0 : Math.round((t.correct / t.total) * 100);
                return (
                  <li key={t.topic}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-navy">{t.topic}</span>
                      <span className="text-slate-500">
                        {t.correct}/{t.total} · {pct}%
                      </span>
                    </div>
                    <ProgressBar value={pct} className="mt-1.5 h-1.5" label={`${t.topic} accuracy`} />
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        {/* Proctoring / integrity summary (proctored assessments only) */}
        {report.proctoring?.proctored ? (
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              Proctoring &amp; integrity
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: 'Camera', value: report.proctoring.cameraGranted ? 'On' : 'Off', bad: !report.proctoring.cameraGranted },
                { label: 'Microphone', value: report.proctoring.micGranted ? 'On' : 'Off', bad: !report.proctoring.micGranted },
                { label: 'Tab switches', value: String(report.proctoring.tabSwitches), bad: report.proctoring.tabSwitches > 0 },
                { label: 'Fullscreen exits', value: String(report.proctoring.fullscreenExits), bad: report.proctoring.fullscreenExits > 0 },
              ].map((s) => (
                <div key={s.label} className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                  <p className={cn('text-lg font-extrabold tabular-nums', s.bad ? 'text-amber-600' : 'text-emerald-600')}>
                    {s.value}
                  </p>
                  <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{s.label}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-500">
              {report.proctoring.violations === 0
                ? 'No integrity flags — this attempt was clean.'
                : `${report.proctoring.violations} integrity event(s) logged (lenient — not penalised).`}
            </p>
          </section>
        ) : null}

        {/* Question review */}
        <section>
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Answer review
          </p>
          <div className="space-y-4">
            {report.questions.map((q, qi) => (
              <article key={q.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold leading-relaxed text-navy">
                    <span className="text-slate-400">{qi + 1}.</span> {q.stem}
                  </p>
                  <span
                    className={cn(
                      'inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1',
                      q.isCorrect
                        ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                        : 'bg-red-50 text-red-700 ring-red-200',
                    )}
                  >
                    {q.isCorrect ? (
                      <>
                        <Check className="size-3" aria-hidden="true" /> Correct
                      </>
                    ) : (
                      <>
                        <X className="size-3" aria-hidden="true" /> Incorrect
                      </>
                    )}
                  </span>
                </div>

                {q.type === 'CODING' && q.coding ? (
                  <div className="mt-3 space-y-2">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-full bg-indigo-50 px-2 py-0.5 font-bold text-indigo-600">Coding problem</span>
                      <span className="text-slate-500">
                        {q.coding.passed}/{q.coding.total} tests passed
                        {q.coding.verdict ? ` · ${q.coding.verdict}` : ''}
                        {q.coding.language ? ` · ${q.coding.language}` : ''}
                      </span>
                    </div>
                    {q.coding.sourceCode ? (
                      <pre className="max-h-64 overflow-auto rounded-lg border border-slate-200 bg-navy p-3 font-mono text-[11px] leading-relaxed text-slate-100">
                        {q.coding.sourceCode}
                      </pre>
                    ) : (
                      <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">No solution submitted.</p>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="mt-3 space-y-2">
                      {q.options.map((opt, i) => {
                        const chosen = q.yourOptionIds.includes(opt.id);
                        const correct = opt.isCorrect;
                        return (
                          <div
                            key={opt.id}
                            className={cn(
                              'flex items-center gap-3 rounded-lg border p-2.5 text-sm',
                              correct && 'border-emerald-300 bg-emerald-50 text-emerald-900',
                              chosen && !correct && 'border-red-300 bg-red-50 text-red-900',
                              !correct && !chosen && 'border-slate-200 bg-white text-slate-600',
                            )}
                          >
                            <span
                              className={cn(
                                'grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold',
                                correct && 'bg-emerald-600 text-white',
                                chosen && !correct && 'bg-red-600 text-white',
                                !correct && !chosen && 'bg-slate-100 text-slate-500',
                              )}
                            >
                              {String.fromCharCode(65 + i)}
                            </span>
                            <span className="flex-1">{opt.text}</span>
                            {correct ? (
                              <span className="text-[11px] font-semibold text-emerald-700">Correct</span>
                            ) : chosen ? (
                              <span className="text-[11px] font-semibold text-red-700">Your answer</span>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>

                    {q.explanation ? (
                      <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm leading-relaxed text-slate-600">
                        <span className="font-semibold text-navy">Why: </span>
                        {q.explanation}
                      </p>
                    ) : null}
                  </>
                )}
              </article>
            ))}
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-center gap-3 pb-4">
          <Button asChild>
            <Link href="/mock-tests">
              <Timer className="size-4" aria-hidden="true" /> Take another mock
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}

/**
 * Standalone report view for the `/dashboard/quiz?report=<attemptId>` deep-link
 * (the "View report" action on /mock-tests history). Fetches the persisted
 * server-graded report for a finalized attempt.
 */
export function MockReportLoader({ attemptId }: { attemptId: string }) {
  const [report, setReport] = useState<ApiMockReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMockReport(attemptId)
      .then((r) => {
        if (!cancelled) setReport(r);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message || 'Could not load this report.');
      });
    return () => {
      cancelled = true;
    };
  }, [attemptId]);

  if (error) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-6">
        <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-red-50 text-red-600 ring-1 ring-red-100">
            <AlertTriangle className="size-6" aria-hidden="true" />
          </span>
          <p className="mt-4 text-sm font-semibold text-navy">{error}</p>
          <Button variant="outline" className="mt-5" asChild>
            <Link href="/mock-tests">Back to mock tests</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="size-6 animate-spin text-slate-400" aria-hidden="true" />
      </div>
    );
  }

  return <MockReportView report={report} />;
}
