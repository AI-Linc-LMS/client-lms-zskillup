'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  BookOpen,
  Brain,
  Calculator,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Compass,
  Cpu,
  Eraser,
  Flag,
  Layers,
  Loader2,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Timer,
  Trophy,
  Video,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { QuestionStem } from '@/components/practice/QuestionStem';
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
import { ApiRequestError } from '@/lib/api/types';
import { UpgradeModal } from '@/components/billing/UpgradeModal';
import { MockCodingPanel } from '@/components/practice/MockCodingPanel';
import { PyqTag } from '@/components/practice/PyqTag';
import { useProctoring } from '@/lib/proctoring/useProctoring';
import { ProctorOverlay } from '@/components/proctoring/ProctorOverlay';
import { CalibrationResults } from '@/components/student/CalibrationResults';

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
  /** Server's 403 PAYWALL message when the free-mock allowance is spent. */
  const [upgradeMsg, setUpgradeMsg] = useState<string | null>(null);

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
      // Free-mock allowance spent (backend 403 PAYWALL). Convert the block into an
      // upgrade prompt rather than a red error string — this is the moment that converts,
      // and "Could not start the mock test" tells the student nothing about why.
      if (err instanceof ApiRequestError && err.code === 'PAYWALL') {
        setUpgradeMsg(err.message);
      } else {
        setError(err instanceof Error ? err.message : 'Could not start the mock test.');
      }
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

  // Safety net: once the report is shown the assessment is over — release the
  // camera/mic even if the submit-path stop() was somehow missed (so the laptop
  // camera light never lingers after results). `stop` is a stable callback.
  const stopProctor = proctor.stop;
  useEffect(() => {
    if (phase === 'report') stopProctor();
  }, [phase, stopProctor]);

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

  /** NTA-style "Clear Response": drop the current MCQ answer (persisted as empty). */
  const clearResponse = useCallback(
    (questionId: string) => {
      if (!start || submittedRef.current) return;
      setAnswers((prev) => {
        if (!(prev[questionId]?.length)) return prev;
        saveQueueRef.current = saveQueueRef.current
          .then(() => answerMock(start.attemptId, { questionId, selectedOptionIds: [] }))
          .then(() => {
            ackedRef.current.set(questionId, JSON.stringify([]));
          })
          .catch(() => {});
        return { ...prev, [questionId]: [] };
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
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="size-6 animate-spin text-slate-500" aria-hidden="true" />
      </div>
    );
  }

  if (error && !mock) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-6">
        <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-red-50 text-red-600">
            <AlertTriangle className="size-6" aria-hidden="true" />
          </span>
          <p className="mt-4 text-sm font-semibold text-navy">{error}</p>
          <Button variant="outline" className="mt-5" asChild>
            <Link href="/mock-assessment">Back to mock tests</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (phase === 'report' && report) {
    if (report.isCalibration) return <CalibrationResults report={report} reward={reward} />;
    return <MockReportView report={report} reward={reward} kind={proctored ? 'assessment' : 'test'} />;
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
          proctored={proctored}
          onSelect={selectOption}
          onClear={clearResponse}
          onCodeSubmitted={onCodeSubmitted}
          onSubmit={finishAttempt}
        />
        {proctored ? <ProctorOverlay controller={proctor} /> : null}
      </>
    );
  }

  // ── intro ──────────────────────────────────────────────────────────────────
  const m = mock!;
  const kind = proctored ? 'assessment' : 'test';
  // The Placement Readiness Test (calibration) is the one-time baseline. It gets a
  // richer, purpose-specific intro. Detected by its title (the only mock named so);
  // the server still gates it by the is_calibration flag, not the name.
  const isCalibration = /placement readiness/i.test(m.title);
  const stats = [
    { icon: BookOpen, label: 'Questions', value: String(m.totalQuestions) },
    { icon: Timer, label: 'Duration', value: `${m.durationMinutes} min` },
    // A baseline has no pass/fail — show what it spans instead.
    isCalibration
      ? { icon: Layers, label: 'Sections', value: '4' }
      : { icon: Star, label: 'Pass mark', value: `${m.passingScore}%` },
    {
      icon: proctored ? ShieldCheck : Sparkles,
      label: 'Format',
      value: proctored ? 'Proctored' : isCalibration ? 'Baseline' : 'Timed',
    },
  ];

  // What the Placement Readiness Test measures + what completing it unlocks.
  const CALIBRATION_SECTIONS = [
    { icon: Calculator, name: 'Numerical Ability', desc: 'Arithmetic, data interpretation, speed math' },
    { icon: Brain, name: 'Logical Reasoning', desc: 'Patterns, puzzles, Venn, seating' },
    { icon: BookOpen, name: 'Verbal Ability', desc: 'Grammar, comprehension, vocabulary' },
    { icon: Cpu, name: 'Technical MCQs', desc: 'CS fundamentals, output & coding logic' },
  ];
  const CALIBRATION_UNLOCKS = [
    { icon: Compass, text: 'A personalized study plan matched to your weakest areas' },
    { icon: Target, text: 'Question recommendations tuned to your real level' },
    { icon: BarChart3, text: 'A section-wise percentile and full answer review' },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#1f2d4d] via-[#16223f] to-[#0a0a0c] text-white">
      {/* Free-mock allowance spent - the server refused the start. Portalled, so the dark
          full-bleed runner backdrop can't clip or tint it. */}
      <UpgradeModal
        open={upgradeMsg !== null}
        onClose={() => setUpgradeMsg(null)}
        title="Upgrade for unlimited mocks"
        message={upgradeMsg ?? undefined}
      />

      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -left-1/4 -top-1/3 size-[55vw] rounded-full bg-[#f5b400]/15 blur-[130px]" />
        <div className="absolute -right-1/4 top-1/4 size-[45vw] rounded-full bg-[#f5b400]/15 blur-[130px]" />
      </div>

      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 px-5 py-6 sm:px-10">
        <Link
          href="/mock-assessment"
          className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-4 py-1.5 text-xs font-semibold text-white/85 backdrop-blur transition-colors hover:bg-white/[0.12]"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" /> Exit
        </Link>
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.18em] ring-1 ring-inset',
            proctored
              ? 'bg-violet-500/15 text-violet-200 ring-violet-400/30'
              : 'bg-white/[0.06] text-white/70 ring-white/15',
          )}
        >
          {proctored ? <Video className="size-3" /> : <Sparkles className="size-3 text-[#ffc42d]" />}
          {proctored ? 'Proctored Assessment' : 'Mock Test'}
        </span>
      </div>

      <main className="relative z-10 mx-auto max-w-5xl px-5 pb-16 pt-2 sm:px-10">
        <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr] lg:gap-12">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#ffc42d]">
              {proctored ? 'ZSkillup placement assessment' : isCalibration ? 'ZSkillup placement readiness' : 'ZSkillup mock drive'}
            </p>
            <h1 className="mt-3 text-3xl font-black leading-[1.08] tracking-tight sm:text-4xl sm:leading-[1.05] md:text-[52px]">
              {m.title}
            </h1>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-white/65">
              {isCalibration
                ? 'A one-time baseline across all four placement sections. There is no pass or fail - your results map exactly where you stand today and personalise everything that follows. '
                : `${m.totalQuestions} questions · ${m.durationMinutes} minutes. `}
              {proctored
                ? 'This is a strict, server-timed assessment with camera + microphone proctoring. '
                : 'The clock is enforced by the server. '}
              When time runs out it submits automatically - your answers are saved as you go.
            </p>

            <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {stats.map(({ icon: Icon, label, value }) => (
                <div
                  key={label}
                  className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur"
                >
                  <Icon className="size-4 text-[#ffc42d]" aria-hidden="true" />
                  <p className="mt-3 text-[10px] font-bold uppercase tracking-widest text-white/45">{label}</p>
                  <p className="mt-1 text-xl font-black text-white">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={beginAttempt}
                disabled={starting}
                className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-gradient-to-b from-[#ffd24d] to-[#f5b400] px-7 py-3.5 text-[15px] font-extrabold text-[#171717] shadow-[0_18px_40px_-14px_rgba(245,180,0,0.9)] transition-transform hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-60"
              >
                <span aria-hidden className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                {starting ? <Loader2 className="size-4 animate-spin" /> : proctored ? <ShieldCheck className="size-4" /> : <Timer className="size-4" />}
                {starting ? 'Starting…' : proctored ? 'Start assessment' : 'Start test'}
              </button>
              <Link
                href="/mock-assessment"
                className="inline-flex h-[52px] items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-6 text-[15px] font-bold text-white/85 backdrop-blur transition-colors hover:bg-white/[0.12]"
              >
                Maybe later
              </Link>
            </div>

            <p className="mt-3 flex items-center gap-1.5 text-[11px] text-white/45">
              <AlertTriangle className="size-3.5 shrink-0" aria-hidden="true" />
              Once started, the timer can&apos;t be paused. Final submit is one-way.
            </p>
            {error ? <p role="alert" className="mt-2 text-sm text-rose-300">{error}</p> : null}

            {isCalibration ? (
              <div className="mt-9">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/45">What this measures</p>
                <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                  {CALIBRATION_SECTIONS.map(({ icon: Icon, name, desc }) => (
                    <div
                      key={name}
                      className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3.5 backdrop-blur"
                    >
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#f5b400]/15 text-[#ffc42d]">
                        <Icon className="size-4" aria-hidden="true" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-bold text-white">{name}</span>
                        <span className="mt-0.5 block text-xs leading-snug text-white/55">{desc}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <aside className="space-y-4">
            {proctored ? (
              <div className="rounded-2xl border border-violet-400/25 bg-violet-500/[0.08] p-5 backdrop-blur">
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-violet-200">
                  <Video className="size-3.5" /> Proctoring required
                </p>
                <ul className="mt-3 space-y-2.5 text-[13px] leading-snug text-white/75">
                  <li className="flex gap-2.5"><Video className="mt-0.5 size-4 shrink-0 text-violet-300" /> Camera &amp; microphone stay on for the full {kind}.</li>
                  <li className="flex gap-2.5"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-violet-300" /> Stay on this tab in fullscreen - switches are logged.</li>
                </ul>
                <p className="mt-3 text-[11px] text-white/45">You&apos;ll grant camera/mic access right after you start.</p>
              </div>
            ) : null}
            {isCalibration ? (
              <div className="rounded-2xl border border-[#f5b400]/25 bg-[#f5b400]/[0.06] p-5 backdrop-blur">
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#ffc42d]">
                  <Sparkles className="size-3.5" /> What you unlock
                </p>
                <ul className="mt-3 space-y-3 text-[13px] leading-snug text-white/80">
                  {CALIBRATION_UNLOCKS.map(({ icon: Icon, text }) => (
                    <li key={text} className="flex gap-3">
                      <Icon className="mt-0.5 size-4 shrink-0 text-[#ffc42d]" aria-hidden="true" /> {text}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-[11px] text-white/45">
                  Take it once - you can always practise the sections afterwards.
                </p>
              </div>
            ) : null}
            <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-5 backdrop-blur">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/45">What to expect</p>
              <ul className="mt-3 space-y-3 text-[13px] leading-snug text-white/75">
                <li className="flex gap-3"><Clock className="mt-0.5 size-4 shrink-0 text-[#ffc42d]" /> A single countdown for the whole {kind} - pace yourself.</li>
                <li className="flex gap-3"><Target className="mt-0.5 size-4 shrink-0 text-[#ffc42d]" /> Jump between questions freely; change answers until you submit.</li>
                <li className="flex gap-3"><BarChart3 className="mt-0.5 size-4 shrink-0 text-[#ffc42d]" /> Get a percentile, topic breakdown, and full answer review.</li>
              </ul>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

// ── NTA-style question status model ─────────────────────────────────────────

type QStatus = 'answered' | 'answeredMarked' | 'marked' | 'notAnswered' | 'notVisited';

const STATUS_META: Record<QStatus, { label: string; cell: string; swatch: string }> = {
  answered: { label: 'Answered', cell: 'bg-emerald-500 text-white', swatch: 'bg-emerald-500' },
  answeredMarked: { label: 'Answered & marked', cell: 'bg-violet-600 text-white', swatch: 'bg-violet-600' },
  marked: { label: 'Marked for review', cell: 'bg-violet-500 text-white', swatch: 'bg-violet-500' },
  notAnswered: { label: 'Not answered', cell: 'bg-rose-500 text-white', swatch: 'bg-rose-500' },
  notVisited: {
    label: 'Not visited',
    cell: 'bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200',
    swatch: 'bg-slate-200',
  },
};
/** Legend / summary order (NTA convention). */
const STATUS_ORDER: QStatus[] = ['answered', 'notAnswered', 'notVisited', 'marked', 'answeredMarked'];

function statusOf(answered: boolean, visited: boolean, marked: boolean): QStatus {
  if (answered && marked) return 'answeredMarked';
  if (marked) return 'marked';
  if (answered) return 'answered';
  if (visited) return 'notAnswered';
  return 'notVisited';
}

/** Mark-for-review + visited state persists per attempt so resume keeps the palette. */
function loadReview(attemptId: string): { marked: string[]; visited: string[] } {
  if (typeof window === 'undefined') return { marked: [], visited: [] };
  try {
    const raw = window.localStorage.getItem(`mock-review:${attemptId}`);
    if (raw) {
      const p = JSON.parse(raw) as { marked?: string[]; visited?: string[] };
      return { marked: p.marked ?? [], visited: p.visited ?? [] };
    }
  } catch {
    /* ignore malformed cache */
  }
  return { marked: [], visited: [] };
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
  proctored,
  onSelect,
  onClear,
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
  proctored: boolean;
  onSelect: (questionId: string, optionId: string, multi: boolean) => void;
  onClear: (questionId: string) => void;
  onCodeSubmitted: (
    problemId: string,
    r: { verdict: string; passed: number; total: number; isCorrect: boolean },
  ) => void;
  onSubmit: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  // Per-problem unsaved editor drafts, kept across question navigation so the
  // coding panel can remount (resetting run/submit results) without losing code.
  const codeDraftsRef = useRef<Record<string, { source: string; language: string }>>({});
  const kind = proctored ? 'assessment' : 'test';
  const question = start.questions[idx];
  const total = start.questions.length;
  const isAnswered = (q: ApiMockStart['questions'][number]) =>
    q.type === 'CODING' ? !!codingResults[q.id] : (answers[q.id]?.length ?? 0) > 0;
  const answeredCount = useMemo(
    () => start.questions.filter((q) => isAnswered(q)).length,
    [start.questions, answers, codingResults],
  );

  // NTA question-status model: `visited` + `marked` persist per attempt so a
  // resumed run restores the palette exactly.
  const [marked, setMarked] = useState<Set<string>>(() => new Set(loadReview(start.attemptId).marked));
  const [visited, setVisited] = useState<Set<string>>(() => new Set(loadReview(start.attemptId).visited));

  useEffect(() => {
    const qid = start.questions[idx]?.id;
    if (!qid) return;
    setVisited((prev) => (prev.has(qid) ? prev : new Set(prev).add(qid)));
  }, [idx, start.questions]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        `mock-review:${start.attemptId}`,
        JSON.stringify({ marked: [...marked], visited: [...visited] }),
      );
    } catch {
      /* storage disabled/full — non-fatal, palette just won't survive a reload */
    }
  }, [marked, visited, start.attemptId]);

  const questionStatus = useCallback(
    (q: ApiMockStart['questions'][number]): QStatus =>
      statusOf(isAnswered(q), visited.has(q.id), marked.has(q.id)),
    // isAnswered closes over answers/codingResults; list them so status recomputes.
    [visited, marked, answers, codingResults], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const counts = useMemo(() => {
    const c: Record<QStatus, number> = {
      answered: 0,
      answeredMarked: 0,
      marked: 0,
      notAnswered: 0,
      notVisited: 0,
    };
    for (const q of start.questions) c[questionStatus(q)] += 1;
    return c;
  }, [start.questions, questionStatus]);

  const toggleMark = useCallback(() => {
    const qid = start.questions[idx]?.id;
    if (!qid) return;
    setMarked((prev) => {
      const n = new Set(prev);
      if (n.has(qid)) n.delete(qid);
      else n.add(qid);
      return n;
    });
  }, [idx, start.questions]);

  const jumpToStatus = useCallback(
    (target: QStatus) => {
      const found = start.questions.findIndex((q) => questionStatus(q) === target);
      if (found >= 0) {
        setIdx(() => found);
        setConfirming(false);
      }
    },
    [start.questions, questionStatus, setIdx],
  );

  // NTA-style sections: MCQs grouped by their ROOT SECTION (Quant / Logical /
  // Verbal / Technical), coding last. Each section holds its questions with their
  // GLOBAL index so the palette + nav can jump correctly. Falls back to a single
  // "Quiz" section for mocks whose questions carry no section (older payloads).
  const sections = useMemo(() => {
    const SHORT: Record<string, string> = {
      'Numerical Ability': 'Quant',
      'Logical Reasoning': 'Logical Reasoning',
      'Verbal Ability': 'Verbal',
      'Technical MCQs': 'Technical',
    };
    const items = start.questions.map((q, i) => ({ q, i }));
    const order: string[] = [];
    const byKey = new Map<string, typeof items>();
    for (const it of items) {
      const key = it.q.type === 'CODING' ? 'Coding' : it.q.section || 'Quiz';
      if (!byKey.has(key)) {
        byKey.set(key, []);
        order.push(key);
      }
      byKey.get(key)!.push(it);
    }
    order.sort((a, b) => Number(a === 'Coding') - Number(b === 'Coding')); // coding always last
    return order.map((key) => ({ key, label: SHORT[key] ?? key, items: byKey.get(key)! }));
  }, [start.questions]);

  const activeKey = question
    ? question.type === 'CODING'
      ? 'Coding'
      : question.section || 'Quiz'
    : (sections[0]?.key ?? 'Quiz');
  const activeSection = sections.find((s) => s.key === activeKey);
  const activeLabel = activeSection?.label ?? activeKey;
  const activeSectionIdx = Math.max(0, sections.findIndex((s) => s.key === activeKey));
  const activeItems = activeSection?.items ?? [];
  const posInSec = activeItems.findIndex((x) => x.i === idx);
  const isLastInSection = posInSec >= activeItems.length - 1;
  const isLastSection = activeSectionIdx >= sections.length - 1;
  const nextSection = !isLastSection ? sections[activeSectionIdx + 1] : null;

  const low = remaining <= 60;
  const mid = remaining <= 300 && remaining > 60;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm sm:px-6">
        <span className="flex min-w-0 items-center gap-1.5 truncate text-sm font-bold text-navy">
          <Sparkles className="size-4 shrink-0 text-orange" aria-hidden="true" />
          <span className="truncate">{start.title}</span>
        </span>
        <div className="flex shrink-0 items-center gap-3">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-extrabold ring-1 tabular-nums',
              low ? 'bg-red-50 text-red-600 ring-red-200' : mid ? 'bg-amber-50 text-amber-700 ring-amber-200' : 'bg-slate-100 text-navy ring-slate-200',
            )}
            role="timer"
            aria-live={low ? 'assertive' : 'off'}
          >
            <Clock className="size-3.5" aria-hidden="true" /> {formatClock(remaining)}
          </span>
          <span className="hidden text-[11px] font-semibold text-slate-600 sm:inline">Q {idx + 1} / {total}</span>
        </div>
      </header>

      {/* Section tabs (NTA-style) - one per section, coding last, with live
          per-section progress. Horizontally scrollable so 5 tabs fit on phones. */}
      {sections.length > 1 ? (
        <div className="scroll-soft sticky top-14 z-10 flex gap-2 overflow-x-auto border-b border-slate-200 bg-white px-4 py-2.5 sm:px-6">
          {sections.map((s) => {
            const done = s.items.filter((x) => isAnswered(x.q)).length;
            const active = s.key === activeKey;
            const complete = s.items.length > 0 && done === s.items.length;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => setIdx(() => s.items[0].i)}
                aria-current={active ? 'true' : undefined}
                className={cn(
                  'relative flex shrink-0 items-center gap-2 overflow-hidden rounded-xl px-4 py-2 text-sm font-bold transition-all',
                  active
                    ? 'bg-gradient-to-r from-[#ffd24d] to-[#f5b400] text-[#171717] shadow-[0_8px_20px_-8px_rgba(245,180,0,0.7)]'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                )}
              >
                {s.label}
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums',
                    active ? 'bg-white/25 text-[#171717]' : complete ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-slate-600',
                  )}
                >
                  {done}/{s.items.length}
                </span>
                <span
                  aria-hidden
                  className={cn('absolute inset-x-0 bottom-0 h-0.5 origin-left transition-transform duration-500', active ? 'bg-white/50' : 'bg-orange/50')}
                  style={{ transform: `scaleX(${s.items.length ? done / s.items.length : 0})` }}
                />
              </button>
            );
          })}
        </div>
      ) : null}

      <main
        className={cn(
          'mx-auto grid w-full max-w-6xl flex-1 gap-5 px-4 pb-6 sm:px-6 lg:grid-cols-[1fr_17rem]',
          // When proctored, the fixed top-center camera bar needs clearance. The
          // section-tabs row already provides it; without tabs, reserve top space.
          proctored && sections.length <= 1 ? 'pt-28' : 'pt-6',
        )}
      >
        {/* Question card (left/main) */}
        <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              {sections.length > 1 ? `${activeLabel} · ` : ''}
              Question {posInSec + 1} of {activeItems.length}
            </p>
            {/* Right column: mark/difficulty controls with the PYQ "Asked in…" tag beneath. */}
            <div className="flex shrink-0 flex-col items-end gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleMark}
                  aria-pressed={marked.has(question.id)}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1 ring-inset transition-colors',
                    marked.has(question.id)
                      ? 'bg-violet-100 text-violet-700 ring-violet-300'
                      : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50',
                  )}
                >
                  <Flag className={cn('size-3', marked.has(question.id) && 'fill-violet-500 text-violet-600')} aria-hidden="true" />
                  {marked.has(question.id) ? 'Marked' : 'Mark for review'}
                </button>
                <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ring-1', DIFFICULTY_RING[question.difficulty] ?? 'bg-slate-100 text-slate-600 ring-slate-200')}>
                  {question.difficulty.toLowerCase()}
                </span>
              </div>
              <PyqTag companyIds={question.companyIds ?? []} years={question.yearTags ?? []} />
            </div>
          </div>
          {question.type === 'CODING' ? (
            <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-600">Coding problem</p>
          ) : null}
          <QuestionStem text={question.stem} imageUrl={question.imageUrl} className="mt-4 text-base font-semibold leading-relaxed text-navy" />
          {question.type === 'MULTI_SELECT' ? <p className="mt-1 text-xs text-slate-500">Select all that apply.</p> : null}

          {question.type === 'CODING' && question.coding ? (
            // key={question.id} remounts per problem so run/submit results never
            // leak between problems; codeDraftsRef preserves unsaved code.
            <MockCodingPanel
              key={question.id}
              attemptId={start.attemptId}
              question={question}
              saved={codingResults[question.id]}
              draft={codeDraftsRef.current[question.id]}
              onDraftChange={(d) => {
                codeDraftsRef.current[question.id] = d;
              }}
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
                      isSelected ? 'border-orange bg-orange/5 text-navy' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300',
                    )}
                  >
                    <span className={cn('grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold', isSelected ? 'bg-orange text-[#171717]' : 'bg-slate-100 text-slate-600')}>
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="flex-1">{opt.text}</span>
                    {isSelected ? <Check className="size-4 shrink-0 text-orange" aria-hidden="true" /> : null}
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => posInSec > 0 && setIdx(() => activeItems[posInSec - 1].i)} disabled={posInSec <= 0}>
                <ChevronLeft className="size-4" aria-hidden="true" /> Previous
              </Button>
              {question.type !== 'CODING' ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onClear(question.id)}
                  disabled={!(answers[question.id]?.length)}
                >
                  <Eraser className="size-4" aria-hidden="true" /> Clear
                </Button>
              ) : null}
            </div>
            {!isLastInSection ? (
              <Button size="sm" onClick={() => setIdx(() => activeItems[posInSec + 1].i)}>
                Save &amp; Next <ChevronRight className="size-4" aria-hidden="true" />
              </Button>
            ) : nextSection ? (
              // End of a non-final section → advance to the next section instead
              // of submitting, so a student can't end the whole assessment early.
              <Button size="sm" onClick={() => setIdx(() => nextSection.items[0].i)}>
                Next section: {nextSection.label} <ChevronRight className="size-4" aria-hidden="true" />
              </Button>
            ) : (
              <Button size="sm" onClick={() => setConfirming(true)} disabled={submitting}>
                Review &amp; submit
              </Button>
            )}
          </div>
          {error ? <p role="alert" className="mt-3 text-sm text-red-600">{error}</p> : null}
        </article>

        {/* Question palette (right, NTA-style) */}
        <aside className="lg:sticky lg:top-[7.5rem] lg:self-start">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                {sections.length > 1 ? activeLabel : 'Questions'}
              </p>
              <span className="text-[11px] font-bold text-slate-600">{answeredCount}/{total} answered</span>
            </div>
            <div className="mt-3 grid max-h-[14rem] grid-cols-5 gap-2 overflow-y-auto pr-1">
              {activeItems.map(({ q, i }, local) => {
                const s = questionStatus(q);
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setIdx(() => i)}
                    aria-current={i === idx}
                    aria-label={`Question ${local + 1} - ${STATUS_META[s].label}`}
                    className={cn(
                      'relative grid size-9 place-items-center rounded-lg text-[12px] font-bold transition-colors',
                      STATUS_META[s].cell,
                      i === idx && 'ring-2 ring-orange ring-offset-1',
                    )}
                  >
                    {local + 1}
                    {s === 'answeredMarked' ? (
                      <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-emerald-400 ring-1 ring-white" aria-hidden="true" />
                    ) : null}
                  </button>
                );
              })}
            </div>
            {/* legend - full NTA status set with live counts */}
            <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[10px] font-semibold text-slate-600">
              {STATUS_ORDER.map((s) => (
                <span key={s} className="flex items-center gap-1.5">
                  <span className={cn('relative size-2.5 shrink-0 rounded', STATUS_META[s].swatch)}>
                    {s === 'answeredMarked' ? (
                      <span className="absolute -right-1 -top-1 size-1.5 rounded-full bg-emerald-400 ring-1 ring-white" />
                    ) : null}
                  </span>
                  {STATUS_META[s].label} ({counts[s]})
                </span>
              ))}
            </div>
            <Button className="mt-4 w-full" size="sm" onClick={() => setConfirming(true)} disabled={submitting}>
              Submit {kind}
            </Button>
            <Button variant="ghost" size="sm" asChild className="mt-1.5 w-full">
              <Link href="/mock-assessment"><ArrowLeft className="size-3.5" aria-hidden="true" /> Exit</Link>
            </Button>
          </div>
        </aside>
      </main>

      {/* Review summary before submit (NTA-style) - tap a status to revisit */}
      {confirming ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-navy/40 px-6">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
            <h2 className="text-base font-bold text-navy">Review before you submit</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
              You&apos;ve answered{' '}
              <span className="font-semibold text-navy">{counts.answered + counts.answeredMarked}</span> of{' '}
              {total}. Tap a status to jump back and revisit those questions - submitting is final.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {STATUS_ORDER.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => jumpToStatus(s)}
                  disabled={counts[s] === 0}
                  className={cn(
                    'flex items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2 text-left text-xs font-semibold transition-colors',
                    counts[s] > 0 ? 'hover:border-slate-300 hover:bg-slate-50' : 'cursor-default opacity-50',
                  )}
                >
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <span className={cn('relative size-2.5 shrink-0 rounded', STATUS_META[s].swatch)}>
                      {s === 'answeredMarked' ? (
                        <span className="absolute -right-1 -top-1 size-1.5 rounded-full bg-emerald-400 ring-1 ring-white" />
                      ) : null}
                    </span>
                    {STATUS_META[s].label}
                  </span>
                  <span className="tabular-nums text-navy">{counts[s]}</span>
                </button>
              ))}
            </div>
            {counts.notAnswered + counts.notVisited > 0 ? (
              <p className="mt-3 flex items-center gap-1.5 text-[12px] font-medium text-amber-600">
                <AlertTriangle className="size-3.5 shrink-0" aria-hidden="true" />
                {counts.notAnswered + counts.notVisited} question(s) still unanswered.
              </p>
            ) : null}
            <div className="mt-5 flex items-center justify-end gap-3">
              <Button variant="outline" size="sm" onClick={() => setConfirming(false)} disabled={submitting}>
                Keep going
              </Button>
              <Button size="sm" onClick={onSubmit} disabled={submitting}>
                {submitting ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : `Submit ${kind}`}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ── Report view ─────────────────────────────────────────────────────────────

export function MockReportView({
  report,
  reward = null,
  kind = 'test',
}: {
  report: ApiMockReport;
  reward?: GamificationSummary | null;
  kind?: 'assessment' | 'test';
}) {
  const isAssessment = kind === 'assessment';
  const backHref = isAssessment ? '/assessments' : '/mock-assessment';
  const backLabel = isAssessment ? 'Assessments' : 'Mock tests';
  const tone = report.passed ? 'emerald' : report.pct >= 40 ? 'amber' : 'red';
  // Show the reward reveal first (only when we actually awarded this submission).
  const [showReward, setShowReward] = useState<boolean>(!!reward);
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {showReward && reward ? (
        <RewardOverlay summary={reward} passed={report.passed} onClose={() => setShowReward(false)} />
      ) : null}
      <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm sm:px-6">
        <span className="flex min-w-0 items-center gap-1.5 truncate text-sm font-bold text-navy">
          <Trophy className="size-4 shrink-0 text-amber-500" aria-hidden="true" /> {isAssessment ? 'Assessment report' : 'Mock report'}
        </span>
        <Button variant="ghost" size="sm" asChild>
          <Link href={backHref}>
            <ArrowLeft className="size-3.5" aria-hidden="true" /> {backLabel}
          </Link>
        </Button>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        {/* Score hero */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
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
          <p className="mt-2 text-sm text-slate-600">
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
              Time expired - graded on the answers recorded before the deadline.
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
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
              >
                <Sparkles className="size-4" aria-hidden="true" /> Replay
              </button>
            </div>
          ) : null}
        </section>

        {/* Topic breakdown */}
        {report.topicBreakdown.length > 0 ? (
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Topic breakdown
            </p>
            <ul className="mt-4 space-y-4">
              {report.topicBreakdown.map((t) => {
                const pct = t.total === 0 ? 0 : Math.round((t.correct / t.total) * 100);
                return (
                  <li key={t.topic}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-navy">{t.topic}</span>
                      <span className="text-slate-600">
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
            <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
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
                  <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">{s.label}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-600">
              {report.proctoring.violations === 0
                ? 'No integrity flags - this attempt was clean.'
                : `${report.proctoring.violations} integrity event(s) logged (lenient - not penalised).`}
            </p>
          </section>
        ) : null}

        {/* Question review */}
        <section>
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Answer review
          </p>
          <div className="space-y-4">
            {report.questions.map((q, qi) => (
              <article key={q.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold leading-relaxed text-navy">
                    <span className="text-slate-500">{qi + 1}.</span> {q.stem}
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

                {q.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={q.imageUrl}
                    alt="Question diagram"
                    loading="lazy"
                    className="mt-3 max-h-72 w-auto max-w-full rounded-lg border border-slate-200 bg-white object-contain"
                  />
                ) : null}

                {q.type === 'CODING' && q.coding ? (
                  <div className="mt-3 space-y-2">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-full bg-indigo-50 px-2 py-0.5 font-bold text-indigo-600">Coding problem</span>
                      <span className="text-slate-600">
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
                      <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">No solution submitted.</p>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Your-answer summary */}
                    <p className="mt-2 text-xs text-slate-600">
                      <span className="font-bold text-navy">Your answer: </span>
                      {q.yourOptionIds.length ? (
                        q.options.filter((o) => q.yourOptionIds.includes(o.id)).map((o) => o.text).join(', ')
                      ) : (
                        <span className="font-semibold text-amber-600">Not answered</span>
                      )}
                    </p>
                    <div className="mt-2 space-y-2">
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
                                !correct && !chosen && 'bg-slate-100 text-slate-600',
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
            <Link href={backHref}>
              <Timer className="size-4" aria-hidden="true" /> {isAssessment ? 'Back to assessments' : 'Take another mock'}
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
 * (the "View report" action on /mock-assessment history). Fetches the persisted
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
            <Link href="/mock-assessment">Back to mock tests</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="size-6 animate-spin text-slate-500" aria-hidden="true" />
      </div>
    );
  }

  if (report.isCalibration) return <CalibrationResults report={report} />;
  return <MockReportView report={report} />;
}
