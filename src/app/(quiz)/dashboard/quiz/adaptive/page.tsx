'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Compass,
  Flag,
  Gauge,
  Lightbulb,
  Loader2,
  PlayCircle,
  RotateCcw,
  Sparkles,
  Target,
  TrendingUp,
  XCircle,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PyqTag } from '@/components/practice/PyqTag';
import { cn } from '@/lib/utils';
import { useAdaptiveSession } from '@/hooks/useAdaptiveSession';
import { PaywallCard } from '@/components/billing/PaywallCard';
import { LivePointsMeter } from '@/components/adaptive/LivePointsMeter';
import { PointsBurst } from '@/components/adaptive/PointsBurst';
import type { AdaptiveOption } from '@/lib/api/adaptive';
import { getQuestionSolution, type QuestionSolutionDto } from '@/lib/api/question-solutions';
import { MarkdownLite } from '@/components/ui/MarkdownLite';

/* Brand quiz palette — light surface with an orange accent. */
const BRAND_GRAD = 'linear-gradient(135deg,#f7a14e 0%,#f37021 100%)';
const EASE = [0.16, 1, 0.3, 1] as const;

const masteryPct = (theta: number) => Math.round((1 / (1 + Math.exp(-1.3 * theta))) * 100);
function band(pct: number): { label: string; color: string } {
  if (pct >= 75) return { label: 'Mastered', color: '#059669' };
  if (pct >= 55) return { label: 'Proficient', color: '#4f46e5' };
  if (pct >= 35) return { label: 'Developing', color: '#d97706' };
  return { label: 'Needs work', color: '#dc2626' };
}
function certaintyBand(answered: number): { label: string; color: string } {
  if (answered < 2) return { label: 'Warming up', color: '#d97706' };
  if (answered < 5) return { label: 'Building a picture', color: '#4f46e5' };
  if (answered < 9) return { label: 'Getting clearer', color: '#059669' };
  return { label: 'Confident read', color: '#059669' };
}

const DIFF_TONE: Record<string, { text: string; ring: string; bg: string }> = {
  EASY: { text: 'text-emerald-700', ring: 'ring-emerald-200', bg: 'bg-emerald-50' },
  MEDIUM: { text: 'text-indigo-700', ring: 'ring-indigo-200', bg: 'bg-indigo-50' },
  HARD: { text: 'text-rose-700', ring: 'ring-rose-200', bg: 'bg-rose-50' },
};

const CONFIDENCE = [
  { value: 1, label: 'Guessing', emoji: '🤷' },
  { value: 2, label: 'Unsure', emoji: '🤔' },
  { value: 3, label: 'Pretty sure', emoji: '🙂' },
  { value: 4, label: 'Certain', emoji: '💯' },
];

/* Clean brand mark — orange disc with a soft halo (no flashy ping). */
function QuizMark({ size = 32 }: { size?: number }) {
  return (
    <span className="relative inline-flex" style={{ width: size, height: size }}>
      <span className="absolute inset-0 rounded-full opacity-30 blur-md" style={{ background: BRAND_GRAD }} />
      <span className="relative inline-flex size-full items-center justify-center rounded-full" style={{ background: BRAND_GRAD }}>
        <Target className="size-1/2 text-white" />
      </span>
    </span>
  );
}

function AdaptiveQuizRunner({
  mockId,
  topicSlug,
  companySlug,
  asWishTopic,
  requizSourceId,
  year,
}: {
  mockId: string | null;
  topicSlug: string | null;
  companySlug: string | null;
  asWishTopic: string | null;
  requizSourceId: string | null;
  year: number | null;
}) {
  const router = useRouter();
  const {
    phase,
    sessionId,
    sessionMeta,
    currentQuestion,
    progress,
    abilityState,
    hintState,
    hintLoading,
    error,
    answeredCount,
    submitting,
    submitAnswer,
    advance,
    lastAnswer,
    revealed,
    pendingComplete,
    pendingPaywall,
    askHint,
    finish,
    sessionPoints,
    lastPoints,
    resumed,
    paywall,
    continueAfterUnlock,
  } = useAdaptiveSession({ mockTestId: mockId, topicSlug, companySlug, asWishTopic, requizSourceId, year });

  const [selected, setSelected] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const prevQuestionId = useRef<string | null>(null);
  useEffect(() => {
    if (currentQuestion && currentQuestion.questionId !== prevQuestionId.current) {
      prevQuestionId.current = currentQuestion.questionId;
      setSelected(null);
      setConfidence(null);
      setElapsed(0);
    }
  }, [currentQuestion]);

  // Per-question elapsed timer — anchored to the server `servedAt` so a resumed
  // question shows the real elapsed time (matches the live points meter), not 0.
  useEffect(() => {
    if (!currentQuestion || revealed) return; // freeze the clock once answered
    const anchor = Date.parse(currentQuestion.servedAt);
    const base = Number.isFinite(anchor) ? anchor : Date.now();
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - base) / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [currentQuestion, revealed]);

  useEffect(() => {
    if (phase === 'complete' && sessionId) {
      router.replace(`/dashboard/quiz/adaptive/results?session=${sessionId}`);
    }
  }, [phase, sessionId, router]);

  if (phase === 'loading' || phase === 'complete') {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <QuizMark size={44} />
          <p className="text-sm">{phase === 'complete' ? 'Composing your results…' : 'Starting your practice…'}</p>
        </div>
      </div>
    );
  }
  if (phase === 'error') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background text-navy">
        <p className="text-rose-600">{error ?? 'Something went wrong.'}</p>
        <Button
          variant="secondary"
          onClick={() => router.replace(companySlug ? `/dashboard/company/${companySlug}` : '/practice')}
        >
          {companySlug ? 'Back to Company Hubs' : 'Back to Practice'}
        </Button>
      </div>
    );
  }
  if (phase === 'paywalled' && paywall) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-4 py-10">
        <div className="w-full">
          <div className="mx-auto mb-5 flex max-w-lg justify-end">
            <Button
              variant="secondary"
              onClick={() => router.replace(asWishTopic ? '/practice-wish' : '/practice')}
            >
              Exit
            </Button>
          </div>
          <PaywallCard paywall={paywall} onUnlocked={() => void continueAfterUnlock()} />
        </div>
      </div>
    );
  }
  if (!currentQuestion) return null;

  const mode = sessionMeta?.mode ?? (mockId ? 'MOCK' : 'PRACTICE');
  const unbounded = sessionMeta?.maxQuestions == null || mode === 'AS_WISH';
  const modeLabel = mode === 'AS_WISH' ? 'Practice as-wish' : mode === 'MOCK' ? 'Mock Quiz' : 'Practice';
  const exitHref = mode === 'AS_WISH' ? '/practice-wish' : '/practice';
  const maxQ = sessionMeta?.maxQuestions ?? 15;
  const minQ = sessionMeta?.minQuestions ?? 8;
  const answered = progress?.answered ?? answeredCount;
  // During the reveal step `answered` is already incremented, so the number we
  // display for the on-screen (just-answered) question is `answered`; otherwise
  // it's the next question to attempt, `answered + 1`.
  const questionNumber = revealed ? answered : answered + 1;
  const shownElapsed = revealed && lastAnswer ? Math.round(lastAnswer.timeMs / 1000) : elapsed;
  const q = currentQuestion;
  const diff = DIFF_TONE[q.difficultyLabel] ?? DIFF_TONE.MEDIUM;
  const cert = certaintyBand(answered);
  // Difficulty-meter marker: driven by the QUESTION'S difficulty band (which
  // visibly adapts EASY↔MEDIUM↔HARD), nudged slightly by predicted correctness.
  // (The selector targets p≈0.5 by design, so predictedPCorrect alone would keep
  // the marker glued to the centre — the band is what actually moves.)
  const DIFF_POS: Record<string, number> = { EASY: 0.16, MEDIUM: 0.5, HARD: 0.84 };
  const markerFrac = Math.min(
    0.94,
    Math.max(0.06, (DIFF_POS[q.difficultyLabel] ?? 0.5) + (0.5 - (q.predictedPCorrect ?? 0.5)) * 0.18),
  );
  const markerLeft = `${Math.round(markerFrac * 100)}%`;
  const confidenceRequired = !!sessionMeta?.confidencePromptEnabled;
  const canSubmit = !!selected && (!confidenceRequired || confidence !== null) && !submitting;
  const progressPct = unbounded
    ? Math.min(95, 15 + answered * 6)
    : Math.min(100, Math.round((answered / maxQ) * 100));

  const handleSubmit = async () => {
    if (!canSubmit || !selected) return;
    await submitAnswer(selected, confidence ?? undefined);
  };

  // "Next" during the reveal step. When the session just finished, advance() flips
  // the phase to 'complete' and the effect above routes to the results page.
  const nextCta = pendingPaywall ? 'Continue' : pendingComplete ? 'See results' : 'Next question';
  const handleAdvance = () => advance();

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-navy">
      {/* radial glow backdrop */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -left-1/4 -top-1/4 size-[60vw] rounded-full bg-[#f37021]/[0.05] blur-[120px]" />
        <div className="absolute -right-1/4 -top-1/3 size-[55vw] rounded-full bg-[#2563eb]/[0.05] blur-[120px]" />
      </div>

      {/* points earned burst — stays mounted across questions so it fires on submit */}
      <PointsBurst earned={lastPoints?.earned} nonce={lastPoints?.nonce ?? 0} />

      <div className="relative z-10 mx-auto max-w-[1200px] px-4 py-6 sm:px-6">
        {/* header */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => router.replace(exitHref)}
            title="Your progress is saved — resume this quiz any time from where you left off."
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 transition-colors hover:text-navy"
          >
            <ArrowLeft className="size-3.5" /> Save &amp; exit
          </button>
          <div className="flex items-center gap-2">
            {/* running session points */}
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-600 ring-1 ring-inset ring-amber-200 tabular-nums">
              <Zap className="size-3.5 fill-amber-400 text-amber-500" /> {sessionPoints} pts
            </span>
            {unbounded ? (
              <button
                onClick={() => void finish().then(() => sessionId && router.replace(`/dashboard/quiz/adaptive/results?session=${sessionId}`))}
                className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-emerald-700"
              >
                <Flag className="size-3.5" /> I&apos;m done
              </button>
            ) : (
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">{modeLabel}</span>
            )}
          </div>
        </div>

        {/* resume banner */}
        {resumed ? (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-[12px] font-medium text-indigo-700">
            <RotateCcw className="size-4 shrink-0" />
            Picking up where you left off — the clock&apos;s been running.
          </div>
        ) : null}

        {/* hero */}
        <div className="mt-4 flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-2xl" style={{ background: BRAND_GRAD }}>
            {mode === 'AS_WISH' ? <Sparkles className="size-6 text-white" /> : <Target className="size-6 text-white" />}
          </span>
          <div>
            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-orange">
              <span className="size-1.5 animate-pulse rounded-full bg-orange" /> Live · {modeLabel}
            </p>
            <h1 className="text-xl font-black tracking-tight">{sessionMeta?.title ?? modeLabel}</h1>
          </div>
        </div>

        {/* progress bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-600">
              Question <span className="font-extrabold text-navy">{questionNumber}</span>
              <span className="text-slate-400"> · {unbounded ? 'unlimited' : `~${minQ}–${maxQ}`}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-slate-400">Difficulty read:</span>
              <span className="font-bold" style={{ color: cert.color }}>{cert.label}</span>
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <motion.div
              className="h-full rounded-full"
              style={{ background: BRAND_GRAD }}
              initial={false}
              animate={{ width: `${progressPct}%` }}
              transition={{ type: 'spring', stiffness: 180, damping: 26 }}
            />
          </div>
        </div>

        {/* difficulty meter */}
        <div className="mt-4 flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <QuizMark size={34} />
          <div className="min-w-0 flex-1">
            <p className="text-[12px] text-slate-600">
              Testing{' '}
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-navy">
                {prettySkill(q.targetSkill)}
              </span>{' '}
              <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset', diff.text, diff.ring, diff.bg)}>
                {q.difficultyLabel}
              </span>{' '}
              · ~{Math.round((q.predictedPCorrect ?? 0.5) * 100)}% chance you&apos;ll get this right
            </p>
            <div className="relative mt-2 h-2 rounded-full" style={{ background: 'linear-gradient(90deg,#34d399,#818cf8 50%,#f87171)' }}>
              <motion.span
                className="absolute top-1/2 size-3.5 -translate-y-1/2 rounded-full bg-white shadow ring-2 ring-[#f37021]"
                initial={false}
                animate={{ left: markerLeft }}
                transition={{ type: 'spring', stiffness: 220, damping: 26 }}
                style={{ marginLeft: -7 }}
              />
            </div>
            <div className="mt-1 flex justify-between text-[9px] font-bold uppercase tracking-wider text-slate-400">
              <span>Easy</span><span>Hard</span>
            </div>
          </div>
        </div>

        {/* 3-column work area */}
        <div className="mt-5 grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)_300px]">
          {/* LEFT — live points + timer + skill confidence */}
          <aside className="order-2 space-y-4 lg:order-none">
            {revealed && lastAnswer ? (
              <EarnedCard earned={lastAnswer.pointsEarned} base={lastAnswer.pointsBase} correct={lastAnswer.isCorrect} />
            ) : (
              <LivePointsMeter points={q.points} servedAt={q.servedAt} hinted={!!hintState} />
            )}
            <Panel>
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                <Clock className="size-3.5" /> {revealed ? 'Time on this question' : 'On this question'}
              </div>
              <p className="mt-2 text-2xl font-black tabular-nums">
                {Math.floor(shownElapsed / 60)}:{String(shownElapsed % 60).padStart(2, '0')}
              </p>
            </Panel>
            <Panel>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Skill confidence</p>
              <div className="mt-3 space-y-3">
                {Object.entries(abilityState).map(([skill, theta]) => {
                  const pct = masteryPct(theta);
                  const b = band(pct);
                  const targeting = skill === q.targetSkill;
                  return (
                    <div key={skill}>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className={cn('truncate', targeting ? 'font-bold text-orange' : 'text-slate-600')}>
                          {prettySkill(skill)}{targeting ? ' · targeting' : ''}
                        </span>
                        <span className="font-bold" style={{ color: b.color }}>{pct}%</span>
                      </div>
                      <div className="mt-1 h-2 rounded-full bg-slate-100">
                        <motion.div
                          className="h-full rounded-full"
                          initial={false}
                          animate={{ width: `${pct}%` }}
                          transition={{ type: 'spring', stiffness: 180, damping: 24 }}
                          style={{ background: b.color }}
                        />
                      </div>
                    </div>
                  );
                })}
                {Object.keys(abilityState).length === 0 ? (
                  <p className="text-[11px] text-slate-400">Building your skill profile…</p>
                ) : null}
              </div>
            </Panel>
          </aside>

          {/* CENTER — question card */}
          <motion.div
            key={q.questionId}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="order-1 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:order-none"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <Chip>{unbounded ? `Q${questionNumber}` : `Q${questionNumber} / ~${maxQ}`}</Chip>
                <span className={cn('rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ring-1 ring-inset', diff.text, diff.ring, diff.bg)}>
                  {q.difficultyLabel}
                </span>
                <Chip>{prettySkill(q.targetSkill)}</Chip>
              </div>
              {!revealed && q.hintTokensRemaining > 0 && !hintState ? (
                <button
                  onClick={askHint}
                  disabled={hintLoading || submitting}
                  className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-orange/50 px-3 py-1.5 text-[11px] font-bold text-orange transition-colors hover:bg-orange/10 disabled:opacity-50"
                >
                  {hintLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Lightbulb className="size-3.5" />}
                  Ask for a hint · {q.hintTokensRemaining} left
                </button>
              ) : null}
            </div>

            <PyqTag companyIds={q.companyIds ?? []} years={q.yearTags ?? []} className="mt-5" />
            <h2 className="mt-2 text-lg font-semibold leading-relaxed text-navy">{q.stem}</h2>

            <div className="mt-5 space-y-2.5">
              {q.options.map((opt: AdaptiveOption, i: number) => {
                const isSel = selected === opt.id;
                // Reveal coloring: the correct option greens; a wrong pick reds.
                const isCorrectOpt = revealed && lastAnswer?.correctOptionId === opt.id;
                const isChosenWrong =
                  revealed && lastAnswer?.selectedOptionId === opt.id && !isCorrectOpt;
                const locked = submitting || revealed;
                return (
                  <button
                    key={opt.id}
                    onClick={() => !locked && setSelected(opt.id)}
                    disabled={locked}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-left text-sm transition-colors',
                      isCorrectOpt
                        ? 'border-emerald-300 bg-emerald-50'
                        : isChosenWrong
                          ? 'border-rose-300 bg-rose-50'
                          : isSel && !revealed
                            ? 'border-orange bg-orange/10'
                            : revealed
                              ? 'border-slate-200 bg-white opacity-70'
                              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50',
                      revealed && 'cursor-default',
                    )}
                  >
                    <span className={cn(
                      'grid size-7 shrink-0 place-items-center rounded-full text-[11px] font-bold ring-1 ring-inset',
                      isCorrectOpt
                        ? 'bg-emerald-100 text-emerald-700 ring-emerald-300'
                        : isChosenWrong
                          ? 'bg-rose-100 text-rose-700 ring-rose-300'
                          : isSel && !revealed
                            ? 'bg-orange/15 text-orange ring-orange/40'
                            : 'text-slate-400 ring-slate-200',
                    )}>
                      {isCorrectOpt ? (
                        <CheckCircle2 className="size-4" />
                      ) : isChosenWrong ? (
                        <XCircle className="size-4" />
                      ) : (
                        String.fromCharCode(65 + i)
                      )}
                    </span>
                    <span className={cn(
                      isCorrectOpt
                        ? 'font-semibold text-emerald-900'
                        : isChosenWrong
                          ? 'text-rose-900'
                          : isSel && !revealed
                            ? 'text-navy'
                            : 'text-slate-700',
                    )}>
                      {opt.text}
                    </span>
                  </button>
                );
              })}
            </div>

            {hintState ? (
              <div className="mt-4 rounded-2xl border border-orange/30 bg-orange/10 p-3.5">
                <p className="mb-1 flex items-center gap-1.5 text-[11px] font-bold text-orange">
                  <Lightbulb className="size-3.5" /> Hint
                </p>
                <p className="text-sm text-slate-700">{hintState.hint}</p>
              </div>
            ) : null}

            {/* Instant inline solution — revealed the moment you submit. */}
            {revealed && lastAnswer ? <SolutionReveal result={lastAnswer} questionId={q.questionId} /> : null}

            {!revealed && (
            <div className="mt-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                How confident are you before submitting?
                {!confidenceRequired ? <span className="ml-1 font-semibold normal-case tracking-normal text-slate-300">(optional)</span> : null}
              </p>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {CONFIDENCE.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setConfidence((prev) => (prev === c.value ? null : c.value))}
                    aria-pressed={confidence === c.value}
                    className={cn(
                      'flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-[11px] font-semibold transition-colors',
                      confidence === c.value
                        ? 'border-orange bg-orange/10 text-orange'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
                    )}
                  >
                    <span className="text-base leading-none">{c.emoji}</span>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
            )}

            <div className="mt-6 flex justify-end">
              {revealed ? (
                <button
                  onClick={handleAdvance}
                  className="inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-extrabold text-white transition-[filter] hover:brightness-105"
                  style={{ background: BRAND_GRAD }}
                >
                  {nextCta} <ArrowRight className="size-4" />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className="inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-extrabold text-white transition-[filter] enabled:hover:brightness-105 disabled:opacity-40"
                  style={{ background: BRAND_GRAD }}
                >
                  {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
                  {submitting ? 'Scoring…' : 'Submit answer'}
                </button>
              )}
            </div>
          </motion.div>

          {/* RIGHT — coaching sidecar */}
          <aside className="order-3 lg:order-none lg:sticky lg:top-6 lg:self-start">
            <Panel>
              <div className="flex items-center gap-2">
                <span className="grid size-8 place-items-center rounded-lg bg-orange/10 text-orange">
                  <Compass className="size-4" />
                </span>
                <div>
                  <p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-orange">Coach</p>
                  <p className="text-[11px] font-bold text-slate-600">Insight on this question</p>
                </div>
              </div>

              <Pill className="mt-4">Why this question</Pill>
              <p className="mt-1.5 text-[12px] leading-relaxed text-slate-600">
                Testing <span className="font-semibold text-navy">{prettySkill(q.targetSkill)}</span> at the{' '}
                <span className="font-semibold">{q.difficultyLabel.toLowerCase()}</span> level ·{' '}
                ~{Math.round((q.predictedPCorrect ?? 0.5) * 100)}% predicted.
              </p>

              <Pill className="mt-4">What comes next</Pill>
              <div className="mt-1.5 space-y-1.5">
                <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/70 p-2">
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                  <p className="text-[12px] font-semibold leading-snug text-slate-700">
                    If you answer ✓:{' '}
                    <span className="font-extrabold text-emerald-600">
                      {q.difficultyLabel === 'HARD'
                        ? `Stretch question on ${prettySkill(q.targetSkill)}`
                        : `Harder question on ${prettySkill(q.targetSkill)}`}
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50/70 p-2">
                  <RotateCcw className="size-4 shrink-0 text-rose-500" />
                  <p className="text-[12px] font-semibold leading-snug text-slate-700">
                    If you answer ✗:{' '}
                    <span className="font-extrabold text-rose-500">
                      Easier {prettySkill(q.targetSkill)} warm-up
                    </span>
                  </p>
                </div>
              </div>
              {q.selectorRationale ? (
                <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-400">
                  <TrendingUp className="mt-0.5 size-3 shrink-0 text-slate-300" />
                  {q.selectorRationale}
                </p>
              ) : null}

              {q.hintTokensRemaining > 0 && !hintState ? (
                <>
                  <Pill className="mt-4">Hint</Pill>
                  <button
                    onClick={askHint}
                    disabled={hintLoading || submitting}
                    className="mt-1.5 w-full rounded-xl border border-dashed border-orange/40 px-3 py-2 text-[11px] font-bold text-orange transition-colors hover:bg-orange/10 disabled:opacity-50"
                  >
                    {hintLoading ? 'Thinking…' : `Spend 1 hint · ${q.hintTokensRemaining} left`}
                  </button>
                </>
              ) : null}

              <p className="mt-4 text-center text-[10px] italic text-slate-400">
                Difficulty tunes to your level as you answer.
              </p>
            </Panel>
          </aside>
        </div>
      </div>
    </div>
  );
}

function fmtSecs(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec));
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`;
}

const SPEED_LABEL: Record<'fast' | 'on_par' | 'slow', string> = {
  fast: 'Fast',
  on_par: 'On pace',
  slow: 'Took your time',
};

/** One-line note tying the outcome + speed back to how the engine just adapted. */
function adaptNote(correct: boolean, speed: 'fast' | 'on_par' | 'slow'): string {
  if (correct) {
    if (speed === 'fast') return 'Quick and correct — the engine nudges your level up.';
    if (speed === 'slow') return 'Correct, but it took a while — we hold the level steady.';
    return 'Correct — your level ticks up.';
  }
  if (speed === 'fast') return 'A fast miss reads as a slip, so it barely moves your level.';
  if (speed === 'slow') return 'A tricky one — the engine eases the difficulty next.';
  return 'We ease the difficulty on the next question.';
}

type SolTab = 'detailed' | 'shortcut' | 'video';

/** The instant inline solution shown below the question the moment you answer.
 *  Three sections: Detailed (bank/AI), Shortcut (AI, platform-cached), and a
 *  Concept Video placeholder (coming soon). */
function SolutionReveal({
  result,
  questionId,
}: {
  result: {
    isCorrect: boolean;
    explanation: string;
    timeMs: number;
    speedLabel: 'fast' | 'on_par' | 'slow';
    pointsEarned: number;
  };
  questionId: string;
}) {
  const ok = result.isCorrect;
  const [tab, setTab] = useState<SolTab>('detailed');
  const [sol, setSol] = useState<QuestionSolutionDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setSol(null);
    setLoading(true);
    setTab('detailed');
    getQuestionSolution(questionId)
      .then((s) => alive && setSol(s))
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [questionId]);

  const detailed = sol?.detailed || result.explanation || '';
  const TABS: { key: SolTab; label: string; icon: typeof BookOpen }[] = [
    { key: 'detailed', label: 'Detailed', icon: BookOpen },
    { key: 'shortcut', label: 'Shortcut', icon: Zap },
    { key: 'video', label: 'Concept Video', icon: PlayCircle },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE }}
      className={cn(
        'mt-5 overflow-hidden rounded-2xl border shadow-sm',
        ok ? 'border-emerald-200 bg-emerald-50/60' : 'border-rose-200 bg-rose-50/60',
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
        <div className="flex items-center gap-2">
          {ok ? <CheckCircle2 className="size-5 text-emerald-600" /> : <XCircle className="size-5 text-rose-500" />}
          <span className={cn('text-sm font-black', ok ? 'text-emerald-700' : 'text-rose-600')}>
            {ok ? 'Correct!' : 'Not quite'}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-bold text-slate-600 ring-1 ring-inset ring-slate-200 tabular-nums">
            <Clock className="size-3" /> {fmtSecs(result.timeMs / 1000)}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-bold text-slate-600 ring-1 ring-inset ring-slate-200">
            <Gauge className="size-3" /> {SPEED_LABEL[result.speedLabel] ?? SPEED_LABEL.on_par}
          </span>
          {ok && result.pointsEarned > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-black text-amber-600 ring-1 ring-inset ring-amber-200 tabular-nums">
              <Zap className="size-3 fill-amber-400 text-amber-500" /> +{result.pointsEarned}
            </span>
          ) : null}
        </div>
      </div>

      <div className="border-t border-white/60 bg-white/80 px-4 py-3">
        {/* Section tabs */}
        <div className="mb-3 flex gap-1.5">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-colors',
                  active ? 'bg-navy text-white shadow-sm' : 'bg-white text-slate-500 ring-1 ring-inset ring-slate-200 hover:text-navy',
                )}
              >
                <Icon className="size-3.5" /> {t.label}
              </button>
            );
          })}
        </div>

        {/* Detailed */}
        {tab === 'detailed' &&
          (detailed ? (
            <MarkdownLite text={detailed} />
          ) : loading ? (
            <SolLoading label="Working out the solution…" />
          ) : (
            <p className="text-[13px] text-slate-500">
              {ok ? 'Nicely done — that was the correct option.' : 'The correct option is highlighted in green above.'}
            </p>
          ))}

        {/* Shortcut */}
        {tab === 'shortcut' &&
          (loading && !sol ? (
            <SolLoading label="Finding a faster trick…" />
          ) : sol?.shortcut ? (
            <div>
              <p className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-amber-600">
                <Zap className="size-3.5 fill-amber-400" /> Exam-time shortcut
              </p>
              <MarkdownLite text={sol.shortcut} />
            </div>
          ) : (
            <p className="text-[13px] text-slate-500">
              No quicker route than the detailed method for this one — solve it step by step.
            </p>
          ))}

        {/* Concept video — coming soon */}
        {tab === 'video' && (
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 bg-white/60 py-7 text-center">
            <span className="grid size-11 place-items-center rounded-full bg-navy/5 text-navy">
              <PlayCircle className="size-6" />
            </span>
            <p className="text-sm font-bold text-navy">Concept video — coming soon</p>
            <p className="max-w-xs text-xs text-slate-500">
              We&apos;re adding short concept videos for each topic. You&apos;ll be able to watch the idea behind this
              question right here.
            </p>
          </div>
        )}

        <p className="mt-3 flex items-center gap-1.5 border-t border-slate-100 pt-2.5 text-[11.5px] font-medium text-slate-500">
          <TrendingUp className="size-3.5 shrink-0 text-slate-400" />
          {adaptNote(ok, result.speedLabel)}
        </p>
      </div>
    </motion.div>
  );
}

function SolLoading({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 py-4 text-[13px] text-slate-500">
      <Loader2 className="size-4 animate-spin text-slate-400" /> {label}
    </div>
  );
}

/** Left-rail replacement for the live meter once a question is answered. */
function EarnedCard({ earned, base, correct }: { earned: number; base: number; correct: boolean }) {
  return (
    <div className={cn('rounded-2xl border p-4 shadow-sm', correct ? 'border-emerald-200 bg-emerald-50/70' : 'border-slate-200 bg-white')}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Earned this question</p>
      <p className={cn('mt-1 text-3xl font-black tabular-nums', correct ? 'text-emerald-600' : 'text-slate-400')}>
        {correct ? `+${earned}` : '0'}
        <span className="ml-1 text-sm font-bold text-slate-400">/ {base} pts</span>
      </p>
      <p className="mt-1 text-[11px] text-slate-400">
        {correct ? 'Answer faster to bank more next time.' : 'No points this time — keep going.'}
      </p>
    </div>
  );
}

function prettySkill(s: string): string {
  return (s || '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (m) => m.toUpperCase())
    .replace(/Section \d+\s*/i, '')
    .trim();
}

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">{children}</div>;
}
function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">{children}</span>
  );
}
function Pill({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn('inline-block rounded-full px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-widest text-white', className)}
      style={{ background: BRAND_GRAD }}
    >
      {children}
    </span>
  );
}

function AdaptiveQuizLanding() {
  const router = useRouter();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 text-center text-navy">
      <QuizMark size={48} />
      <h1 className="text-2xl font-black">Practice</h1>
      <p className="max-w-sm text-sm text-slate-500">
        No practice scope selected. Choose a company, topic or section to begin.
      </p>
      <Button onClick={() => router.replace('/practice')}>Choose what to practice</Button>
    </div>
  );
}

function AdaptivePage() {
  const searchParams = useSearchParams();
  const mockId = searchParams.get('mock');
  const topicSlug = searchParams.get('topic');
  const companySlug = searchParams.get('company');
  const asWishTopic = searchParams.get('aswish');
  const requizSourceId = searchParams.get('requiz');
  const yearParam = searchParams.get('year');
  const year = yearParam ? parseInt(yearParam, 10) || null : null;
  if (!mockId && !topicSlug && !companySlug && !asWishTopic && !requizSourceId)
    return <AdaptiveQuizLanding />;
  return (
    <AdaptiveQuizRunner
      mockId={mockId}
      topicSlug={topicSlug}
      companySlug={companySlug}
      asWishTopic={asWishTopic}
      requizSourceId={requizSourceId}
      year={year}
    />
  );
}

export default function AdaptiveQuizPage() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-screen place-items-center bg-background">
          <Loader2 className="size-8 animate-spin text-slate-400" />
        </div>
      }
    >
      <AdaptivePage />
    </Suspense>
  );
}
