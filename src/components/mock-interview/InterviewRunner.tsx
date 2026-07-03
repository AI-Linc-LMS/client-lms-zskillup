'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  abandonInterview,
  getInterview,
  nextInterviewQuestion,
  startInterview,
  submitInterview,
} from '@/lib/api/mock-interviews';
import type { InterviewQuestionDto } from '@/shared/dto/mock-interview.dto';
import { describeError } from '@/lib/api/errors';
import { Bot, Loader2, Mic, MicOff, Send, X } from 'lucide-react';
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

  const quit = async () => {
    if (!window.confirm('Leave this interview? Your progress is saved and you can resume it.')) return;
    stopVoice();
    router.push('/mock-interview');
  };

  const mm = secondsLeft !== null ? Math.floor(secondsLeft / 60) : 0;
  const ss = secondsLeft !== null ? secondsLeft % 60 : 0;

  if (loading) {
    return <div className="flex items-center justify-center py-24"><Loader2 className="size-7 animate-spin text-slate-400" /></div>;
  }
  if (error && !question) {
    return <div className="py-24 text-center text-sm text-red-500">{error}</div>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span className="font-semibold text-navy">Question {turnNumber}</span>
          <span>of ~{maxTurns}</span>
        </div>
        <div className="flex items-center gap-3">
          {secondsLeft !== null && (
            <span className={cn('rounded-full px-3 py-1 text-sm font-bold tabular-nums', secondsLeft < 30 ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600')}>
              {mm}:{String(ss).padStart(2, '0')}
            </span>
          )}
          <button onClick={quit} className="rounded-lg border border-slate-200 p-2 text-slate-400 hover:bg-slate-50" aria-label="Leave"><X className="size-4" /></button>
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-slate-100">
        <div className="h-1.5 rounded-full bg-orange transition-all" style={{ width: `${Math.min((turnNumber / maxTurns) * 100, 100)}%` }} />
      </div>

      {/* Question */}
      <div className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid size-10 shrink-0 place-items-center rounded-full bg-navy text-white"><Bot className="size-5" /></div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Interviewer{isFinal ? ' · final question' : ''}</p>
          <p className="mt-1 text-[15px] font-medium leading-relaxed text-navy">{question?.question_text}</p>
        </div>
      </div>

      {/* Answer */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <label className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Your answer</label>
          <button onClick={toggleVoice} className={cn('inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold', listening ? 'border-red-300 bg-red-50 text-red-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50')}>
            {listening ? <><MicOff className="size-3.5" /> Stop</> : <><Mic className="size-3.5" /> Speak</>}
          </button>
        </div>
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          rows={7}
          placeholder="Type your answer, or use the Speak button…"
          className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm shadow-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
        />
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <div className="mt-3 flex items-center justify-between">
          <button onClick={doSubmit} disabled={submitting} className="text-xs font-medium text-slate-400 hover:text-slate-600">End &amp; evaluate now</button>
          <button onClick={doNext} disabled={busy || submitting} className="inline-flex items-center gap-2 rounded-lg bg-orange px-5 py-2.5 text-sm font-bold text-white hover:bg-orange/90 disabled:opacity-50">
            {busy || submitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            {isFinal ? 'Finish & evaluate' : 'Next question'}
          </button>
        </div>
      </div>
      <p className="text-center text-xs text-slate-400">Answers are text-only — no camera, no proctoring. Take your time.</p>
    </div>
  );
}

export { abandonInterview };
