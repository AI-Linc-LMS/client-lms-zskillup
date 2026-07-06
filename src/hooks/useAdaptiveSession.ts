'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  startAdaptiveSession,
  startAdaptiveSessionByTopic,
  startAdaptiveSessionByCompany,
  startAdaptiveAsWish,
  finishAdaptiveSession,
  requizSession,
  submitAdaptiveAnswer,
  requestHint,
  abandonSession,
  type AdaptiveSessionStart,
  type AdaptivePendingQuestion,
  type AdaptiveAnswerResult,
  type AdaptivePaywall,
  type AdaptiveHint,
} from '@/lib/api/adaptive';

export type SessionPhase = 'loading' | 'active' | 'complete' | 'error' | 'paywalled';

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
  /**
   * Per-question timer anchor (epoch ms). Derived from the pinned question's
   * server `servedAt` so the clock (and points decay) keep running across a
   * leave/return — this is what makes resume feel continuous.
   */
  questionStartMs: number;
  /** Running banked points this session (ai-linc parity). */
  sessionPoints: number;
  /** Last per-answer award, for the points-burst animation. `nonce` re-fires equal values. */
  lastPoints: { earned: number; base: number; nonce: number } | null;
  /** True when an in-progress session was resumed on load. */
  resumed: boolean;
  /** Set when the free question limit is reached and the scope isn't owned. */
  paywall: AdaptivePaywall | null;
}

interface UseAdaptiveSessionReturn extends AdaptiveSessionState {
  submitAnswer: (optionId: string, confidence?: number) => Promise<void>;
  askHint: () => Promise<void>;
  abandon: () => Promise<void>;
  finish: () => Promise<void>;
  /** Re-enter the session after a purchase — resumes and pins the next question. */
  continueAfterUnlock: () => Promise<void>;
  submitting: boolean;
}

export interface AdaptiveSessionParams {
  mockTestId?: string | null;
  topicSlug?: string | null;
  companySlug?: string | null;
  /** Free-text topic for an unbounded "Practice as-wish" session. */
  asWishTopic?: string | null;
  /** Source session id to spawn a targeted re-quiz from (weakest skill). */
  requizSourceId?: string | null;
  /** Optional PYQ year scope for topic/company practice. */
  year?: number | null;
}

/** Anchor the question timer on the server `servedAt` so resume is continuous. */
function anchorFrom(q: AdaptivePendingQuestion | null): number {
  const t = q?.servedAt ? Date.parse(q.servedAt) : NaN;
  return Number.isFinite(t) ? t : Date.now();
}

export function useAdaptiveSession(params: AdaptiveSessionParams): UseAdaptiveSessionReturn {
  const {
    mockTestId = null,
    topicSlug = null,
    companySlug = null,
    asWishTopic = null,
    requizSourceId = null,
    year = null,
  } = params;
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
    sessionPoints: 0,
    lastPoints: null,
    resumed: false,
    paywall: null,
  });

  const [submitting, setSubmitting] = useState(false);
  const sessionIdRef = useRef<string | null>(null);
  const nonceRef = useRef(0);
  // Guard against React double-invoke creating a duplicate re-quiz session.
  const startedRef = useRef(false);

  /** Start (or resume) the session. Also reused to re-enter after a paywall unlock:
   *  the backend resumes the same-scope session and re-pins the next question. */
  const beginSession = useCallback(async () => {
    setState((s) => ({ ...s, phase: 'loading', error: null }));
    try {
      const yr = year ?? undefined;
      const data = requizSourceId
        ? await requizSession(requizSourceId)
        : mockTestId
          ? await startAdaptiveSession(mockTestId)
          : asWishTopic
            ? await startAdaptiveAsWish(asWishTopic, companySlug ?? undefined)
            : topicSlug
              ? await startAdaptiveSessionByTopic(topicSlug, companySlug ?? undefined, yr)
              : companySlug
                ? await startAdaptiveSessionByCompany(companySlug, yr)
                : null;
      if (!data) {
        setState((s) => ({ ...s, phase: 'error', error: 'No practice scope selected' }));
        return;
      }
      sessionIdRef.current = data.sessionId;
      const { firstQuestion, paywall, ...meta } = data;
      if (!firstQuestion && paywall) {
        setState((s) => ({
          ...s,
          phase: 'paywalled',
          sessionId: data.sessionId,
          sessionMeta: meta,
          currentQuestion: null,
          paywall,
          resumed: !!data.resumed,
        }));
        return;
      }
      setState((s) => ({
        ...s,
        phase: 'active',
        sessionId: data.sessionId,
        sessionMeta: meta,
        currentQuestion: firstQuestion,
        paywall: null,
        questionStartMs: anchorFrom(firstQuestion),
        sessionPoints: data.sessionPoints ?? 0,
        resumed: !!data.resumed,
      }));
    } catch (err) {
      setState((s) => ({
        ...s,
        phase: 'error',
        error: err instanceof Error ? err.message : 'Failed to start session',
      }));
    }
  }, [mockTestId, topicSlug, companySlug, asWishTopic, requizSourceId, year]);

  // Start session on mount (guarded against React double-invoke).
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void beginSession();
  }, [beginSession]);

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
        nonceRef.current += 1;
        setState((s) => ({
          ...s,
          lastAnswer: { isCorrect: result.isCorrect, thetaDelta: result.thetaDelta },
          abilityState: result.abilityState,
          seState: result.seState,
          progress: result.progress,
          answeredCount: (s.answeredCount ?? 0) + 1,
          hintState: null,
          // nextQuestion set when continuing, null on complete or paywalled
          currentQuestion: result.nextQuestion,
          phase: result.paywall ? 'paywalled' : result.sessionComplete ? 'complete' : 'active',
          paywall: result.paywall ?? null,
          questionStartMs: anchorFrom(result.nextQuestion),
          sessionPoints: result.sessionPoints ?? s.sessionPoints,
          lastPoints: { earned: result.pointsEarned, base: result.pointsBase, nonce: nonceRef.current },
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

  const finish = useCallback(async () => {
    if (!sessionIdRef.current) return;
    await finishAdaptiveSession(sessionIdRef.current).catch(() => {});
    setState((s) => ({ ...s, phase: 'complete', currentQuestion: null }));
  }, []);

  return { ...state, submitAnswer, askHint, abandon, finish, continueAfterUnlock: beginSession, submitting };
}
