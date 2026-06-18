'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  startAdaptiveSession,
  submitAdaptiveAnswer,
  requestHint,
  abandonSession,
  type AdaptiveSessionStart,
  type AdaptivePendingQuestion,
  type AdaptiveAnswerResult,
  type AdaptiveHint,
} from '@/lib/api/adaptive';

export type SessionPhase = 'loading' | 'active' | 'complete' | 'error';

interface AdaptiveSessionState {
  phase: SessionPhase;
  sessionId: string | null;
  sessionMeta: Omit<AdaptiveSessionStart, 'firstQuestion'> | null;
  currentQuestion: AdaptivePendingQuestion | null;
  progress: AdaptiveAnswerResult['progress'] | null;
  abilityState: Record<string, number>;
  seState: Record<string, number>;
  lastAnswer: { isCorrect: boolean; thetaDelta: AdaptiveAnswerResult['thetaDelta'] } | null;
  hintState: { teaser: string; hint: string; hintsRemaining: number } | null;
  hintLoading: boolean;
  error: string | null;
  /** Track answered question count for progress bar. */
  answeredCount: number;
  /** Per-question timer: ms elapsed since question was shown. */
  questionStartMs: number;
}

interface UseAdaptiveSessionReturn extends AdaptiveSessionState {
  submitAnswer: (optionId: string, confidence?: number) => Promise<void>;
  askHint: () => Promise<void>;
  abandon: () => Promise<void>;
  submitting: boolean;
}

export function useAdaptiveSession(mockTestId: string): UseAdaptiveSessionReturn {
  const [state, setState] = useState<AdaptiveSessionState>({
    phase: 'loading',
    sessionId: null,
    sessionMeta: null,
    currentQuestion: null,
    progress: null,
    abilityState: {},
    seState: {},
    lastAnswer: null,
    hintState: null,
    hintLoading: false,
    error: null,
    answeredCount: 0,
    questionStartMs: Date.now(),
  });

  const [submitting, setSubmitting] = useState(false);
  const sessionIdRef = useRef<string | null>(null);

  // Start session on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await startAdaptiveSession(mockTestId);
        if (cancelled) return;
        sessionIdRef.current = data.sessionId;
        setState((s) => ({
          ...s,
          phase: 'active',
          sessionId: data.sessionId,
          sessionMeta: {
            sessionId: data.sessionId,
            mockTestId: data.mockTestId,
            title: data.title,
            minQuestions: data.minQuestions,
            maxQuestions: data.maxQuestions,
            confidencePromptEnabled: data.confidencePromptEnabled,
            hintTokens: data.hintTokens,
          },
          currentQuestion: data.firstQuestion,
          questionStartMs: Date.now(),
        }));
      } catch (err) {
        if (cancelled) return;
        setState((s) => ({
          ...s,
          phase: 'error',
          error: err instanceof Error ? err.message : 'Failed to start session',
        }));
      }
    })();
    return () => { cancelled = true; };
  }, [mockTestId]);

  const submitAnswer = useCallback(
    async (optionId: string, confidence?: number) => {
      if (!state.currentQuestion || !sessionIdRef.current || submitting) return;
      setSubmitting(true);
      const timeMs = Date.now() - state.questionStartMs;
      try {
        const result = await submitAdaptiveAnswer(
          sessionIdRef.current,
          state.currentQuestion.questionId,
          optionId,
          confidence,
          timeMs,
        );
        setState((s) => ({
          ...s,
          lastAnswer: { isCorrect: result.isCorrect, thetaDelta: result.thetaDelta },
          abilityState: result.abilityState,
          seState: result.seState,
          progress: result.progress,
          answeredCount: (s.answeredCount ?? 0) + 1,
          hintState: null,
          // nextQuestion set when continuing, null on complete
          currentQuestion: result.nextQuestion,
          phase: result.sessionComplete ? 'complete' : 'active',
          questionStartMs: Date.now(),
        }));
      } catch (err) {
        setState((s) => ({
          ...s,
          error: err instanceof Error ? err.message : 'Failed to submit answer',
        }));
      } finally {
        setSubmitting(false);
      }
    },
    [state.currentQuestion, state.questionStartMs, submitting],
  );

  const askHint = useCallback(async () => {
    if (!sessionIdRef.current || state.hintLoading) return;
    setState((s) => ({ ...s, hintLoading: true }));
    try {
      const hint: AdaptiveHint = await requestHint(sessionIdRef.current!);
      setState((s) => ({ ...s, hintState: hint, hintLoading: false }));
    } catch {
      setState((s) => ({ ...s, hintLoading: false }));
    }
  }, [state.hintLoading]);

  const abandon = useCallback(async () => {
    if (!sessionIdRef.current) return;
    await abandonSession(sessionIdRef.current).catch(() => {});
    setState((s) => ({ ...s, phase: 'complete' }));
  }, []);

  return { ...state, submitAnswer, askHint, abandon, submitting };
}
