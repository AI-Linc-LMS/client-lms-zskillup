'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Brain,
  Clock,
  Lightbulb,
  Loader2,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAdaptiveSession } from '@/hooks/useAdaptiveSession';
import type { AdaptiveOption } from '@/lib/api/adaptive';

/* AI Linc adaptive palette — indigo → purple → pink glass. */
const AI_GRAD = 'linear-gradient(135deg,#6366f1 0%,#a855f7 55%,#ec4899 100%)';
const EASE = [0.16, 1, 0.3, 1] as const;

const masteryPct = (theta: number) => Math.round((1 / (1 + Math.exp(-1.3 * theta))) * 100);
function band(pct: number): { label: string; color: string } {
  if (pct >= 75) return { label: 'Mastered', color: '#10b981' };
  if (pct >= 55) return { label: 'Proficient', color: '#6366f1' };
  if (pct >= 35) return { label: 'Developing', color: '#f59e0b' };
  return { label: 'Needs work', color: '#ef4444' };
}
function certaintyBand(answered: number): { label: string; color: string } {
  if (answered < 2) return { label: 'Getting to know you', color: '#a855f7' };
  if (answered < 5) return { label: 'Building a picture', color: '#6366f1' };
  if (answered < 9) return { label: 'Getting clearer', color: '#10b981' };
  return { label: 'Confident read', color: '#059669' };
}

const DIFF_TONE: Record<string, { text: string; ring: string; bg: string }> = {
  EASY: { text: 'text-emerald-600', ring: 'ring-emerald-400/30', bg: 'bg-emerald-400/10' },
  MEDIUM: { text: 'text-indigo-600', ring: 'ring-indigo-400/30', bg: 'bg-indigo-400/10' },
  HARD: { text: 'text-rose-600', ring: 'ring-rose-400/30', bg: 'bg-rose-400/10' },
};

const CONFIDENCE = [
  { value: 1, emoji: '🤷', label: 'Guessing' },
  { value: 2, emoji: '🤔', label: 'Unsure' },
  { value: 3, emoji: '🙂', label: 'Pretty sure' },
  { value: 4, emoji: '💯', label: 'Certain' },
];

function AIBeacon({ size = 32 }: { size?: number }) {
  return (
    <span className="relative inline-flex" style={{ width: size, height: size }}>
      <span className="absolute inset-0 animate-ping rounded-full opacity-40" style={{ background: AI_GRAD }} />
      <span className="relative inline-flex size-full items-center justify-center rounded-full" style={{ background: AI_GRAD }}>
        <Sparkles className="size-1/2 text-white" />
      </span>
    </span>
  );
}

function AdaptiveQuizRunner({ mockId }: { mockId: string }) {
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
    askHint,
    abandon,
  } = useAdaptiveSession(mockId);

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

  // Per-question elapsed timer.
  useEffect(() => {
    if (!currentQuestion) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [currentQuestion]);

  useEffect(() => {
    if (phase === 'complete' && sessionId) {
      router.replace(`/dashboard/quiz/adaptive/results?session=${sessionId}`);
    }
  }, [phase, sessionId, router]);

  if (phase === 'loading' || phase === 'complete') {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <AIBeacon size={44} />
          <p className="text-sm">{phase === 'complete' ? 'Composing your diagnostic…' : 'Starting your adaptive quiz…'}</p>
        </div>
      </div>
    );
  }
  if (phase === 'error') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background text-navy">
        <p className="text-rose-600">{error ?? 'Something went wrong.'}</p>
        <Button variant="secondary" onClick={() => router.replace('/mock-tests')}>Back to mock quizzes</Button>
      </div>
    );
  }
  if (!currentQuestion) return null;

  const maxQ = sessionMeta?.maxQuestions ?? 15;
  const minQ = sessionMeta?.minQuestions ?? 8;
  const answered = progress?.answered ?? answeredCount;
  const q = currentQuestion;
  const diff = DIFF_TONE[q.difficultyLabel] ?? DIFF_TONE.MEDIUM;
  const cert = certaintyBand(answered);
  const markerLeft = `${Math.round((1 - (q.predictedPCorrect ?? 0.5)) * 100)}%`;
  const confidenceRequired = !!sessionMeta?.confidencePromptEnabled;
  const canSubmit = !!selected && (!confidenceRequired || confidence !== null) && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit || !selected) return;
    await submitAnswer(selected, confidence ?? undefined);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-navy">
      {/* radial mesh backdrop */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -left-1/4 -top-1/4 size-[60vw] rounded-full bg-indigo-600/[0.04] blur-[120px]" />
        <div className="absolute -right-1/4 -top-1/3 size-[55vw] rounded-full bg-pink-600/[0.03] blur-[120px]" />
        <div className="absolute bottom-0 left-1/3 size-[50vw] rounded-full bg-purple-600/[0.03] blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-[1200px] px-4 py-6 sm:px-6">
        {/* header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => void abandon().then(() => router.replace('/mock-tests'))}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-navy"
          >
            <ArrowLeft className="size-3.5" /> Exit quiz
          </button>
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Mock Quiz · Adaptive
          </span>
        </div>

        {/* hero */}
        <div className="mt-4 flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-2xl" style={{ background: AI_GRAD }}>
            <Brain className="size-6 text-white" />
          </span>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-indigo-600">
              Live · Adaptive engine
            </p>
            <h1 className="text-xl font-black tracking-tight">{sessionMeta?.title ?? 'Adaptive Mock Quiz'}</h1>
          </div>
        </div>

        {/* meta strip */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-full border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
          <span className="text-sm">
            Question <span className="font-extrabold">{answered + 1}</span>
            <span className="text-slate-400"> · ~{minQ}–{maxQ}</span>
          </span>
          <span className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400">AI&apos;s read:</span>
            <span className="font-bold" style={{ color: cert.color }}>{cert.label}</span>
          </span>
        </div>

        {/* difficulty pulse */}
        <div className="mt-3 flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <AIBeacon size={34} />
          <div className="min-w-0 flex-1">
            <p className="text-[12px] text-slate-600">
              Testing{' '}
              <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[11px] font-bold text-indigo-600">
                {prettySkill(q.targetSkill)}
              </span>{' '}
              · <span className="font-semibold" style={{ color: cert.color }}>{cert.label}</span> · ~
              {Math.round((q.predictedPCorrect ?? 0.5) * 100)}% chance you&apos;ll get this right
            </p>
            <div className="relative mt-2 h-2 rounded-full" style={{ background: 'linear-gradient(90deg,#10b981,#6366f1 50%,#ef4444)' }}>
              <motion.span
                className="absolute top-1/2 size-3.5 -translate-y-1/2 rounded-full bg-white shadow ring-2 ring-indigo-500"
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
          {/* LEFT — timer + skill confidence */}
          <aside className="space-y-4">
            <Glass>
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                <Clock className="size-3.5" /> On this question
              </div>
              <p className="mt-2 text-2xl font-black tabular-nums">
                {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}
              </p>
            </Glass>
            <Glass>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Skill confidence</p>
              <div className="mt-3 space-y-3">
                {Object.entries(abilityState).map(([skill, theta]) => {
                  const pct = masteryPct(theta);
                  const b = band(pct);
                  const targeting = skill === q.targetSkill;
                  return (
                    <div key={skill}>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className={cn('truncate', targeting ? 'font-bold text-indigo-600' : 'text-slate-600')}>
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
            </Glass>
          </aside>

          {/* CENTER — question card */}
          <motion.div
            key={q.questionId}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <Chip>Q{answered + 1} / ~{maxQ}</Chip>
                <span className={cn('rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ring-1 ring-inset', diff.text, diff.ring, diff.bg)}>
                  {q.difficultyLabel}
                </span>
                <Chip>{prettySkill(q.targetSkill)}</Chip>
              </div>
              {q.hintTokensRemaining > 0 && !hintState ? (
                <button
                  onClick={askHint}
                  disabled={hintLoading || submitting}
                  className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-purple-400/50 px-3 py-1.5 text-[11px] font-bold text-violet-600 hover:bg-purple-500/10 disabled:opacity-50"
                >
                  {hintLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Lightbulb className="size-3.5" />}
                  Ask for a hint · {q.hintTokensRemaining} left
                </button>
              ) : null}
            </div>

            <h2 className="mt-5 text-lg font-semibold leading-relaxed">{q.stem}</h2>

            <div className="mt-5 space-y-2.5">
              {q.options.map((opt: AdaptiveOption, i: number) => {
                const isSel = selected === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => !submitting && setSelected(opt.id)}
                    disabled={submitting}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-left text-sm transition-colors',
                      isSel
                        ? 'border-indigo-400 bg-indigo-500/10'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50',
                    )}
                  >
                    <span className={cn(
                      'grid size-7 shrink-0 place-items-center rounded-full text-[11px] font-bold ring-1 ring-inset',
                      isSel ? 'bg-indigo-500/20 text-indigo-600 ring-indigo-400/40' : 'text-slate-400 ring-slate-200',
                    )}>
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="text-slate-700">{opt.text}</span>
                  </button>
                );
              })}
            </div>

            {hintState ? (
              <div className="mt-4 rounded-2xl border border-purple-400/30 bg-purple-500/10 p-3.5">
                <p className="mb-1 flex items-center gap-1.5 text-[11px] font-bold text-violet-600">
                  <Lightbulb className="size-3.5" /> Hint
                </p>
                <p className="text-sm text-slate-700">{hintState.hint}</p>
              </div>
            ) : null}

            {confidenceRequired ? (
              <div className="mt-5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  How confident are you?
                </p>
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {CONFIDENCE.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setConfidence(c.value)}
                      className={cn(
                        'flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-[11px] font-semibold transition-colors',
                        confidence === c.value
                          ? 'border-indigo-400 bg-indigo-500/10 text-indigo-600'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
                      )}
                    >
                      <span className="text-lg">{c.emoji}</span>
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-6 flex justify-end">
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-extrabold text-white shadow-[0_12px_30px_-12px_rgba(99,102,241,0.9)] transition-transform enabled:hover:scale-[1.02] disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}
              >
                {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
                {submitting ? 'Scoring…' : 'Submit answer'}
              </button>
            </div>
          </motion.div>

          {/* RIGHT — AI tutor sidecar */}
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <Glass>
              <div className="flex items-center gap-2">
                <AIBeacon size={28} />
                <div>
                  <p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-violet-600">AI Tutor</p>
                  <p className="text-[11px] font-bold text-slate-600">Coaching this question</p>
                </div>
              </div>

              <Pill className="mt-4">Why you got this Q</Pill>
              <p className="mt-1.5 text-[12px] leading-relaxed text-slate-600">
                Testing <span className="font-semibold text-indigo-600">{prettySkill(q.targetSkill)}</span> at the{' '}
                <span className="font-semibold">{q.difficultyLabel.toLowerCase()}</span> level ·{' '}
                ~{Math.round((q.predictedPCorrect ?? 0.5) * 100)}% predicted.
              </p>

              {q.selectorRationale ? (
                <>
                  <Pill className="mt-4">What comes next</Pill>
                  <p className="mt-1.5 flex items-start gap-1.5 text-[12px] leading-relaxed text-slate-600">
                    <TrendingUp className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />
                    {q.selectorRationale}
                  </p>
                </>
              ) : null}

              {q.hintTokensRemaining > 0 && !hintState ? (
                <>
                  <Pill className="mt-4">Hint</Pill>
                  <button
                    onClick={askHint}
                    disabled={hintLoading || submitting}
                    className="mt-1.5 w-full rounded-xl border border-dashed border-purple-400/40 px-3 py-2 text-[11px] font-bold text-violet-600 hover:bg-purple-500/10 disabled:opacity-50"
                    style={{ background: 'transparent' }}
                  >
                    {hintLoading ? 'Thinking…' : `Spend 1 hint · ${q.hintTokensRemaining} left`}
                  </button>
                </>
              ) : null}

              <p className="mt-4 text-center text-[10px] italic text-slate-400">
                Powered by the ZSkillup Adaptive Engine
              </p>
            </Glass>
          </aside>
        </div>
      </div>
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

function Glass({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">{children}</div>
  );
}
function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-indigo-500/15 px-2.5 py-1 text-[10px] font-bold text-indigo-600">{children}</span>
  );
}
function Pill({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn('inline-block rounded-full px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-widest text-white', className)}
      style={{ background: AI_GRAD }}
    >
      {children}
    </span>
  );
}

function AdaptiveQuizLanding() {
  const router = useRouter();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 text-center text-navy">
      <AIBeacon size={48} />
      <h1 className="text-2xl font-black">Adaptive Mock Quiz</h1>
      <p className="max-w-sm text-sm text-slate-400">
        No mock quiz selected. Pick an adaptive mock quiz from the catalog.
      </p>
      <Button onClick={() => router.replace('/mock-tests')}>Browse mock quizzes</Button>
    </div>
  );
}

function AdaptivePage() {
  const searchParams = useSearchParams();
  const mockId = searchParams.get('mock');
  if (!mockId) return <AdaptiveQuizLanding />;
  return <AdaptiveQuizRunner mockId={mockId} />;
}

export default function AdaptiveQuizPage() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-screen place-items-center bg-[#0a0a14]">
          <Loader2 className="size-8 animate-spin text-white/40" />
        </div>
      }
    >
      <AdaptivePage />
    </Suspense>
  );
}
