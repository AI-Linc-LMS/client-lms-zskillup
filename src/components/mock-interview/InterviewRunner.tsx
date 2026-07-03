'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  getInterview,
  nextInterviewQuestion,
  startInterview,
  submitInterview,
} from '@/lib/api/mock-interviews';
import type { InterviewQuestionDto } from '@/shared/dto/mock-interview.dto';
import { describeError } from '@/lib/api/errors';
import { Bot, Loader2, Mic, Send, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SR {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> & { length: number } }) => void) | null;
  onend: (() => void) | null;
}

export function InterviewRunner({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [question, setQuestion] = useState<InterviewQuestionDto | null>(null);
  const [answer, setAnswer] = useState('');
  const [turnNumber, setTurnNumber] = useState(1);
  const [maxTurns, setMaxTurns] = useState(6);
  const [isFinal, setIsFinal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [listening, setListening] = useState(false);

  const responsesRef = useRef<Map<number, string>>(new Map());
  const recognitionRef = useRef<SR | null>(null);
  const baseAnswerRef = useRef('');
  const submitRef = useRef<() => void>(() => {});
  const submittingRef = useRef(false); // synchronous guard against double-submit
  const totalSecondsRef = useRef(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── init: resume or start ────────────────────────────────────────────────
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const detail = await getInterview(id);
        if (!alive) return;
        if (detail.status === 'completed') {
          router.replace(`/mock-interview/${id}/result`);
          return;
        }
        setMaxTurns(detail.maxTurns);
        // Prime any answers already recorded (resume).
        for (const r of detail.transcript.responses) responsesRef.current.set(r.question_id, r.answer);
        const t = await startInterview(id);
        if (!alive) return;
        setQuestion(t.question);
        setTurnNumber(t.turnNumber);
        setMaxTurns(t.maxTurns);
        setIsFinal(t.isFinal);
        // Resume: restore any answer already recorded for the current question so
        // it isn't lost/overwritten (esp. the final question).
        if (t.question && responsesRef.current.has(t.question.id)) {
          setAnswer(responsesRef.current.get(t.question.id) ?? '');
        }
        totalSecondsRef.current = detail.durationMinutes * 60;
        setSecondsLeft(detail.durationMinutes * 60);
      } catch (err) {
        if (alive) setError(describeError(err, 'Could not load the interview.'));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id, router]);

  // ── countdown ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (secondsLeft === null) return;
    if (secondsLeft <= 0) {
      submitRef.current();
      return;
    }
    const t = setTimeout(() => setSecondsLeft((s) => (s === null ? null : s - 1)), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft]);

  // ── auto-grow textarea ────────────────────────────────────────────────────
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 340)}px`;
  }, [answer]);

  const stopVoice = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const doSubmit = useCallback(async () => {
    if (submittingRef.current) return; // synchronous — beats the async state guard
    submittingRef.current = true;
    stopVoice();
    setSubmitting(true);
    // Capture the in-progress answer for the current question.
    if (question) responsesRef.current.set(question.id, answer);
    const responses = [...responsesRef.current.entries()].map(([questionId, a]) => ({ questionId, answer: a }));
    try {
      await submitInterview(id, responses);
      router.replace(`/mock-interview/${id}/result`);
    } catch (err) {
      setError(describeError(err, 'Submit failed. Please retry.'));
      setSubmitting(false);
      submittingRef.current = false;
    }
  }, [answer, id, question, router, stopVoice]);
  submitRef.current = doSubmit;

  const doNext = async () => {
    if (!question || busy) return;
    stopVoice();
    responsesRef.current.set(question.id, answer);
    if (isFinal) {
      doSubmit();
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const t = await nextInterviewQuestion(id, question.id, answer);
      if (!t.question) {
        doSubmit();
        return;
      }
      setQuestion(t.question);
      setTurnNumber(t.turnNumber);
      setIsFinal(t.isFinal);
      setAnswer('');
    } catch (err) {
      setError(describeError(err, 'Could not fetch the next question.'));
    } finally {
      setBusy(false);
    }
  };

  // ── browser voice (optional; no server audio) ────────────────────────────
  const toggleVoice = () => {
    if (listening) {
      stopVoice();
      return;
    }
    const Ctor =
      (window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR })
        .SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: new () => SR }).webkitSpeechRecognition;
    if (!Ctor) {
      setError('Voice input is not supported in this browser — please type your answer.');
      return;
    }
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';
    baseAnswerRef.current = answer ? answer + ' ' : '';
    rec.onresult = (e) => {
      let text = '';
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
      setAnswer(baseAnswerRef.current + text);
    };
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  };

  useEffect(() => () => recognitionRef.current?.stop(), []);

  const quit = () => {
    if (!window.confirm('Leave this interview? Your progress is saved and you can resume it.')) return;
    stopVoice();
    router.push('/mock-interview');
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      doNext();
    }
  };

  const wordCount = useMemo(() => answer.trim().split(/\s+/).filter(Boolean).length, [answer]);
  const total = totalSecondsRef.current || 1;
  const timeFrac = secondsLeft !== null ? Math.max(0, Math.min(1, secondsLeft / total)) : 1;
  const low = secondsLeft !== null && secondsLeft < 30;
  const mm = secondsLeft !== null ? Math.floor(secondsLeft / 60) : 0;
  const ss = secondsLeft !== null ? secondsLeft % 60 : 0;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-28">
        <Orb speaking />
        <p className="text-sm text-slate-500">Setting up your interview…</p>
      </div>
    );
  }
  if (error && !question) {
    return <div className="py-24 text-center text-sm text-red-500">{error}</div>;
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* Sticky top bar: progress + timer */}
      <div className="sticky top-0 z-20 -mx-4 mb-5 border-b border-slate-100 bg-gradient-to-b from-white via-white to-white/85 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-navy">Question {turnNumber}</span>
            <TurnDots current={turnNumber} total={maxTurns} />
          </div>
          <div className="flex items-center gap-2">
            {secondsLeft !== null && <TimerRing frac={timeFrac} label={`${mm}:${String(ss).padStart(2, '0')}`} low={low} />}
            <button onClick={quit} className="rounded-lg border border-slate-200 p-2 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600" aria-label="Leave"><X className="size-4" /></button>
          </div>
        </div>
      </div>

      <div className="space-y-5">
        {/* Interviewer + question */}
        <div className="flex items-start gap-4">
          <Orb speaking={busy} />
          <div className="relative flex-1 overflow-hidden rounded-2xl rounded-tl-sm border border-slate-200 bg-white p-5 shadow-sm">
            <span aria-hidden className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-orange/5 blur-2xl" />
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
              AI Interviewer{isFinal ? ' · final question' : ''}
            </p>
            <div className="relative mt-1 min-h-[2.5rem]">
              <AnimatePresence mode="wait">
                {busy ? (
                  <motion.div key="thinking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2 text-slate-400">
                    <span className="text-[15px]">Thinking</span><ThinkingDots />
                  </motion.div>
                ) : (
                  <motion.p
                    key={question?.id ?? 'q'}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.28 }}
                    className="text-[16px] font-medium leading-relaxed text-navy"
                  >
                    {question?.question_text}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Answer */}
        <div className={cn('rounded-2xl border bg-white p-4 shadow-sm transition-colors', listening ? 'border-orange/60 ring-1 ring-orange/30' : 'border-slate-200')}>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Your answer</label>
            <button
              onClick={toggleVoice}
              className={cn('inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors', listening ? 'border-red-300 bg-red-50 text-red-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50')}
            >
              {listening ? <><Waveform /> Listening…</> : <><Mic className="size-3.5" /> Speak</>}
            </button>
          </div>
          <textarea
            ref={textareaRef}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={onKeyDown}
            rows={6}
            placeholder="Type your answer, or tap Speak to dictate…"
            className="w-full resize-none rounded-lg border border-slate-200 px-3.5 py-3 text-[15px] leading-relaxed shadow-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
          />
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-3 text-[11px] text-slate-400">
              <span>{wordCount} word{wordCount === 1 ? '' : 's'}</span>
              <span className="hidden sm:inline">·</span>
              <span className="hidden sm:inline">⌘/Ctrl + Enter to continue</span>
            </div>
            <div className="flex items-center gap-3">
              {!isFinal && (
                <button onClick={doSubmit} disabled={submitting || busy} className="text-xs font-medium text-slate-400 transition-colors hover:text-slate-600 disabled:opacity-50">End early</button>
              )}
              <button
                onClick={doNext}
                disabled={busy || submitting}
                className={cn(
                  'inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:shadow disabled:opacity-50',
                  isFinal ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700' : 'bg-gradient-to-r from-orange to-[#f5872f] hover:brightness-105',
                )}
              >
                {busy || submitting ? <Loader2 className="size-4 animate-spin" /> : isFinal ? <Sparkles className="size-4" /> : <Send className="size-4" />}
                {isFinal ? 'Finish & get feedback' : 'Next question'}
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400">No camera, no proctoring — a calm space to practise. Take your time.</p>
      </div>

      {/* Evaluating overlay */}
      <AnimatePresence>
        {submitting && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-white/90 backdrop-blur-sm">
            <Orb speaking />
            <div className="text-center">
              <p className="text-lg font-bold text-navy">Reviewing your interview…</p>
              <p className="mt-1 text-sm text-slate-500">Scoring your answers and writing feedback.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── presentational bits ──────────────────────────────────────────────────────

function Orb({ speaking }: { speaking?: boolean }) {
  return (
    <div className="relative grid size-11 shrink-0 place-items-center">
      <motion.span
        aria-hidden
        className="absolute inset-0 rounded-full bg-navy/20"
        animate={speaking ? { scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] } : { scale: 1, opacity: 0.3 }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className="relative grid size-11 place-items-center rounded-full bg-gradient-to-br from-[#1f2d4d] to-[#0b1220] text-white shadow-md ring-2 ring-white">
        <Bot className="size-5" />
      </div>
    </div>
  );
}

function TurnDots({ current, total }: { current: number; total: number }) {
  const n = Math.min(total, 12);
  return (
    <div className="hidden items-center gap-1 sm:flex">
      {Array.from({ length: n }).map((_, i) => (
        <span key={i} className={cn('size-1.5 rounded-full transition-colors', i < current ? 'bg-orange' : 'bg-slate-200')} />
      ))}
    </div>
  );
}

function TimerRing({ frac, label, low }: { frac: number; label: string; low: boolean }) {
  const stroke = low ? '#ef4444' : '#f37021';
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-bold tabular-nums', low ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-700')}>
      <svg viewBox="0 0 36 36" className="size-4 -rotate-90">
        <circle cx="18" cy="18" r="15" fill="none" stroke="#e2e8f0" strokeWidth="5" />
        <circle cx="18" cy="18" r="15" fill="none" stroke={stroke} strokeWidth="5" strokeLinecap="round" strokeDasharray={`${frac * 94.2} 94.2`} />
      </svg>
      {label}
    </span>
  );
}

function ThinkingDots() {
  return (
    <span className="flex gap-1">
      {[0, 1, 2].map((i) => (
        <motion.span key={i} className="size-1.5 rounded-full bg-slate-400" animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.18 }} />
      ))}
    </span>
  );
}

function Waveform() {
  return (
    <span className="flex items-end gap-0.5">
      {[0.5, 1, 0.7, 1, 0.6].map((h, i) => (
        <motion.span key={i} className="w-0.5 rounded-full bg-red-500" style={{ height: 10 }} animate={{ scaleY: [h * 0.4, h, h * 0.4] }} transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.08 }} />
      ))}
    </span>
  );
}
