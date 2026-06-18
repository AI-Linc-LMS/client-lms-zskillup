'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Brain, HelpCircle, Loader2, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAdaptiveSession } from '@/hooks/useAdaptiveSession';
import type { AdaptiveOption } from '@/lib/api/adaptive';

function AdaptiveQuizRunner({ mockId }: { mockId: string }) {
  const router = useRouter();
  const {
    phase,
    sessionId,
    sessionMeta,
    currentQuestion,
    progress,
    abilityState,
    lastAnswer,
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
  const [showConfirm, setShowConfirm] = useState(false);

  // Reset selection when question changes
  const prevQuestionId = useRef<string | null>(null);
  useEffect(() => {
    if (currentQuestion && currentQuestion.questionId !== prevQuestionId.current) {
      prevQuestionId.current = currentQuestion.questionId;
      setSelected(null);
      setConfidence(null);
      setShowConfirm(false);
    }
  }, [currentQuestion]);

  // Navigate to results when complete
  useEffect(() => {
    if (phase === 'complete' && sessionId) {
      router.replace(`/dashboard/quiz/adaptive/results?session=${sessionId}`);
    }
  }, [phase, sessionId, router]);

  const handleOptionClick = (optId: string) => {
    if (submitting) return;
    setSelected(optId);
  };

  const handleSubmit = async () => {
    if (!selected || submitting) return;
    const confidencePrompt = sessionMeta?.confidencePromptEnabled;
    if (confidencePrompt && confidence === null) {
      setShowConfirm(true);
      return;
    }
    await submitAnswer(selected, confidence ?? undefined);
    setShowConfirm(false);
  };

  if (phase === 'loading' || phase === 'complete') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-navy">
        <Loader2 className="size-8 animate-spin text-white/50" />
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-navy text-white">
        <p className="text-red-300">{error ?? 'Something went wrong.'}</p>
        <Button variant="secondary" onClick={() => router.replace('/mock-tests')}>
          Back to mock tests
        </Button>
      </div>
    );
  }

  const maxQ = sessionMeta?.maxQuestions ?? 20;
  const minQ = sessionMeta?.minQuestions ?? 5;
  const answered = progress?.answered ?? answeredCount;
  const progressPct = Math.min((answered / maxQ) * 100, 100);
  const confidenceLevels = [
    { value: 1, label: 'Guessing', color: 'text-red-400' },
    { value: 2, label: 'Unsure', color: 'text-amber-400' },
    { value: 3, label: 'Fairly sure', color: 'text-blue-400' },
    { value: 4, label: 'Certain', color: 'text-emerald-400' },
  ];

  const difficultyColor = {
    EASY: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
    MEDIUM: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
    HARD: 'text-red-400 border-red-500/30 bg-red-500/10',
  } as const;

  return (
    <div className="relative min-h-screen overflow-hidden bg-navy text-white">
      {/* Background gradient */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_50%_at_50%_-5%,rgba(243,112,33,0.10),transparent)]"
      />

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-white/10">
        <button
          onClick={() => { setShowConfirm(false); void abandon().then(() => router.replace('/mock-tests')); }}
          className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          Exit quiz
        </button>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-orange/30 bg-orange/10 px-3 py-1 text-[11px] font-semibold text-orange">
            <Sparkles className="size-3" />
            Adaptive AI
          </span>
          <span className="text-[11px] text-white/50">
            {sessionMeta?.title}
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs text-white/60">
          <span>Q{answered + 1}</span>
          <span className="text-white/30">min {minQ} / max {maxQ}</span>
        </div>
      </header>

      {/* Progress bar */}
      <div className="relative z-10 h-1 bg-white/10">
        <div
          className="h-full bg-orange transition-all duration-700"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Main content */}
      <main className="relative z-10 mx-auto max-w-2xl px-6 pb-24 pt-10">
        {currentQuestion && (
          <>
            {/* Skill + difficulty tags */}
            <div className="mb-4 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/70">
                <Brain className="size-3" />
                {currentQuestion.targetSkill}
              </span>
              <span
                className={cn(
                  'inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider',
                  difficultyColor[currentQuestion.difficultyLabel] ?? 'text-white/50',
                )}
              >
                {currentQuestion.difficultyLabel}
              </span>
            </div>

            {/* Question stem */}
            <h2 className="text-lg font-bold leading-snug text-white md:text-xl">
              {currentQuestion.stem}
            </h2>

            {/* Options */}
            <div className="mt-6 space-y-3">
              {currentQuestion.options.map((opt: AdaptiveOption) => {
                const isSelected = selected === opt.id;
                const isCorrect = lastAnswer !== null && opt.id === selected && lastAnswer.isCorrect;
                const isWrong = lastAnswer !== null && opt.id === selected && !lastAnswer.isCorrect;
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleOptionClick(opt.id)}
                    disabled={submitting || lastAnswer !== null}
                    className={cn(
                      'w-full rounded-xl border px-5 py-4 text-left text-sm transition-all',
                      isCorrect && 'border-emerald-400 bg-emerald-500/15 text-emerald-200',
                      isWrong && 'border-red-400 bg-red-500/15 text-red-200',
                      !isCorrect && !isWrong && isSelected && 'border-orange bg-orange/15 text-white',
                      !isSelected && !isCorrect && !isWrong &&
                        'border-white/15 bg-white/5 text-white/85 hover:border-white/30 hover:bg-white/10',
                    )}
                  >
                    {opt.text}
                  </button>
                );
              })}
            </div>

            {/* Hint section */}
            {currentQuestion.hintTokensRemaining > 0 && !hintState && (
              <button
                onClick={askHint}
                disabled={hintLoading || submitting}
                className="mt-5 inline-flex items-center gap-2 text-xs text-white/50 hover:text-amber-400 transition-colors"
              >
                {hintLoading ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <HelpCircle className="size-3.5" />
                )}
                Ask for a hint ({currentQuestion.hintTokensRemaining} remaining)
              </button>
            )}

            {hintState && (
              <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                <p className="text-xs font-semibold text-amber-400 mb-1">💡 Hint</p>
                <p className="text-sm text-amber-100">{hintState.hint}</p>
                <p className="mt-1 text-[10px] text-amber-400/70">{hintState.hintsRemaining} hint(s) remaining</p>
              </div>
            )}

            {/* Confidence prompt */}
            {showConfirm && sessionMeta?.confidencePromptEnabled && (
              <div className="mt-6 rounded-xl border border-white/15 bg-white/5 p-4">
                <p className="text-xs font-semibold text-white/70 mb-3">How confident are you?</p>
                <div className="flex gap-2 flex-wrap">
                  {confidenceLevels.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => {
                        setConfidence(c.value);
                        void submitAnswer(selected!, c.value);
                        setShowConfirm(false);
                      }}
                      className={cn(
                        'flex-1 min-w-[80px] rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold transition-colors hover:bg-white/10',
                        c.color,
                      )}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setShowConfirm(false)}
                  className="mt-2 text-[10px] text-white/40 hover:text-white/60"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Submit button */}
            {!showConfirm && (
              <div className="mt-8">
                <Button
                  size="lg"
                  disabled={!selected || submitting}
                  onClick={handleSubmit}
                  className="w-full"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin mr-2" />
                      Processing…
                    </>
                  ) : (
                    'Submit answer'
                  )}
                </Button>
              </div>
            )}

            {/* Skill ability sidebar (compact) */}
            {Object.keys(abilityState).length > 0 && (
              <div className="mt-8 rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40 mb-3">
                  Live skill estimate
                </p>
                <div className="space-y-2">
                  {Object.entries(abilityState).map(([skill, theta]) => {
                    const pct = Math.round((1 / (1 + Math.exp(-1.3 * theta))) * 100);
                    return (
                      <div key={skill}>
                        <div className="flex justify-between text-[10px] text-white/60 mb-1">
                          <span>{skill}</span>
                          <span>{pct}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-orange transition-all duration-700"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function AdaptiveQuizLanding() {
  const router = useRouter();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-navy text-white text-center px-6">
      <Sparkles className="size-10 text-orange" />
      <h1 className="text-2xl font-extrabold">Adaptive Mock Quiz</h1>
      <p className="text-sm text-white/60 max-w-sm">
        No mock test selected. Please pick an adaptive mock from the catalog.
      </p>
      <Button onClick={() => router.replace('/mock-tests')}>Browse mock tests</Button>
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
        <div className="flex min-h-screen items-center justify-center bg-navy">
          <Loader2 className="size-8 animate-spin text-white/50" />
        </div>
      }
    >
      <AdaptivePage />
    </Suspense>
  );
}
