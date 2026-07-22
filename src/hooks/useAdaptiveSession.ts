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
  /** Post-submit reveal payload for the just-answered question (drives the inline solution). */
  lastAnswer: {
    isCorrect: boolean;
    thetaDelta: AdaptiveAnswerResult['thetaDelta'];
    correctOptionId: string | null;
    explanation: string;
    selectedOptionId: string;
    timeMs: number;
    speedLabel: 'fast' | 'on_par' | 'slow';
    pointsEarned: number;
    pointsBase: number;
  } | null;
  /** True while the answered question + its solution are shown, before advancing. */
  revealed: boolean;
  /** Next-question / completion / paywall transition, held until the student taps Next. */
  pendingNext: AdaptivePendingQuestion | null;
  pendingComplete: boolean;
  pendingPaywall: AdaptivePaywall | null;
  hintState: { teaser: string; hint: string; hintsRemaining: number } | null;
  hintLoading: boolean;
  error: string | null;
  /** Track answered question count for progress bar. */
  answeredCount: number;
  /**
   * Per-question timer anchor (epoch ms) = the moment the question is actually
   * SHOWN. Reset to `Date.now()` on start / advance / resume - deliberately NOT the
   * server `servedAt` (pin time, stamped during the previous submit), which would
   * start the clock mid-question. Drives the per-question timer AND the live points
   * meter, and is what the server scorer trusts via the client `timeMs`.
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
  /** Move past the reveal step to the next question, results, or paywall. */
  advance: () => void;
  askHint: () => Promise<void>;
  abandon: () => Promise<void>;
  finish: () => Promise<void>;
  /** Re-enter the session after a purchase - resumes and pins the next question. */
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
    revealed: false,
    pendingNext: null,
    pendingComplete: false,
    pendingPaywall: null,
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
        // Start the per-question clock when the question is actually SHOWN, not
        // when the server pinned it. The next question is pinned during the
        // previous submit, so anchoring to its `servedAt` counted the time spent
        // reading the previous solution - the timer looked pre-started + points
        // decayed before you saw the question. On resume this also restarts the
        // clock fairly instead of penalising time away.
        questionStartMs: Date.now(),
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
          // Reveal the solution IN PLACE - keep the answered question mounted and
          // hold the next-question / completion / paywall transition until the
          // student taps Next (advance()).
          lastAnswer: {
            isCorrect: result.isCorrect,
            thetaDelta: result.thetaDelta,
            correctOptionId: result.correctOptionId,
            explanation: result.explanation,
            selectedOptionId: optionId,
            timeMs: result.timeMs,
            speedLabel: result.speedLabel,
            pointsEarned: result.pointsEarned,
            pointsBase: result.pointsBase,
          },
          revealed: true,
          pendingNext: result.nextQuestion,
          pendingComplete: result.sessionComplete,
          pendingPaywall: result.paywall ?? null,
          // θ / points update immediately so the skill sidebar reflects the impact
          // while the solution is on screen.
          abilityState: result.abilityState,
          seState: result.seState,
          progress: result.progress,
          answeredCount: (s.answeredCount ?? 0) + 1,
          hintState: null,
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

  /** Leave the reveal step: show the held next question, or finish / paywall. */
  const advance = useCallback(() => {
    setState((s) => {
      if (!s.revealed) return s;
      const cleared = {
        revealed: false,
        lastAnswer: null,
        pendingNext: null,
        pendingComplete: false,
        pendingPaywall: null,
        // Reset the per-answer award too, or the "+N pts" burst keeps rendering
        // (it's driven off `lastPoints.earned`) and follows you into the next
        // question. `sessionPoints` - the running banked total - is NOT cleared.
        lastPoints: null,
      } as const;
      if (s.pendingPaywall) {
        return { ...s, ...cleared, phase: 'paywalled', paywall: s.pendingPaywall, currentQuestion: null };
      }
      if (s.pendingComplete || !s.pendingNext) {
        return { ...s, ...cleared, phase: 'complete', currentQuestion: null };
      }
      return {
        ...s,
        ...cleared,
        phase: 'active',
        currentQuestion: s.pendingNext,
        hintState: null,
        // Clock starts now - the moment the student taps Next and sees the
        // question - not when it was pinned during the previous submit.
        questionStartMs: Date.now(),
      };
    });
  }, []);

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

  return { ...state, submitAnswer, advance, askHint, abandon, finish, continueAfterUnlock: beginSession, submitting };
}
