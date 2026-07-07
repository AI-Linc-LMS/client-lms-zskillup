'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  aiInterviewStatus,
  getInterview,
  nextInterviewQuestion,
  startInterview,
  submitInterview,
  transcribeAnswer,
} from '@/lib/api/mock-interviews';
import type { InterviewQuestionDto } from '@/shared/dto/mock-interview.dto';
import { describeError } from '@/lib/api/errors';
import { Bot, Keyboard, Loader2, Mic, RotateCcw, Send, Sparkles, Square, Volume2, VolumeX, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type RecState = 'idle' | 'recording' | 'transcribing';

/** Pick a natural English voice for the interviewer. */
function pickVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const en = voices.filter((v) => v.lang?.toLowerCase().startsWith('en'));
  const prefer = ['Google US English', 'Samantha', 'Microsoft Aria', 'Microsoft Jenny', 'Daniel', 'Karen'];
  for (const name of prefer) {
    const v = en.find((x) => x.name === name);
    if (v) return v;
  }
  return en[0] ?? voices[0];
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

  // voice
  const [voiceOn, setVoiceOn] = useState(true); // interviewer speaks
  const [interviewerSpeaking, setInterviewerSpeaking] = useState(false);
  const [answerMode, setAnswerMode] = useState<'voice' | 'text'>('voice');
  const [voiceCapable, setVoiceCapable] = useState(true); // Whisper (server key) available
  const [recState, setRecState] = useState<RecState>('idle');
  const [recElapsed, setRecElapsed] = useState(0);

  const responsesRef = useRef<Map<number, string>>(new Map());
  const submitRef = useRef<() => void>(() => {});
  const submittingRef = useRef(false);
  const totalSecondsRef = useRef(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const voiceOnRef = useRef(voiceOn);
  voiceOnRef.current = voiceOn;

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
        for (const r of detail.transcript.responses) responsesRef.current.set(r.question_id, r.answer);
        const t = await startInterview(id);
        if (!alive) return;
        setQuestion(t.question);
        setTurnNumber(t.turnNumber);
        setMaxTurns(t.maxTurns);
        setIsFinal(t.isFinal);
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

  // ── interviewer speaks the current question ──────────────────────────────
  const speak = useCallback((text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || !text.trim()) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      const v = pickVoice();
      if (v) u.voice = v;
      u.lang = v?.lang ?? 'en-US';
      u.rate = 1;
      u.pitch = 1;
      u.onstart = () => setInterviewerSpeaking(true);
      u.onend = () => setInterviewerSpeaking(false);
      u.onerror = () => setInterviewerSpeaking(false);
      window.speechSynthesis.speak(u);
    } catch {
      /* speech unavailable — the question is still shown as text */
    }
  }, []);

  // Warm TTS voices (async in some browsers) + probe voice-answer capability.
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      const onChange = () => window.speechSynthesis.getVoices();
      window.speechSynthesis.addEventListener?.('voiceschanged', onChange);
      cleanup = () => window.speechSynthesis.removeEventListener?.('voiceschanged', onChange);
    }
    // Voice answers need MediaRecorder + Whisper (server OPENAI key). Else: typing.
    const recorderOk =
      typeof window !== 'undefined' &&
      !!navigator.mediaDevices?.getUserMedia &&
      typeof MediaRecorder !== 'undefined';
    if (!recorderOk) {
      setVoiceCapable(false);
      setAnswerMode('text');
    } else {
      aiInterviewStatus().then((ok) => {
        if (!ok) {
          setVoiceCapable(false);
          setAnswerMode('text');
        }
      });
    }
    return cleanup;
  }, []);

  // Speak whenever a new (non-busy) question appears and voice is on.
  useEffect(() => {
    if (!question || busy || loading) return;
    if (voiceOnRef.current) speak(question.question_text);
    else if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question?.id, busy, loading]);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    setInterviewerSpeaking(false);
  }, []);

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

  // ── recording (MediaRecorder → Whisper) ──────────────────────────────────
  const releaseStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);
    stopSpeaking();
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError('Microphone access was blocked. Enable it, or switch to typing.');
      setAnswerMode('text');
      return;
    }
    streamRef.current = stream;
    chunksRef.current = [];
    const mime = ['audio/webm', 'audio/mp4', 'audio/ogg'].find((m) => MediaRecorder.isTypeSupported?.(m));
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    recorderRef.current = rec;
    rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
    rec.onstop = async () => {
      releaseStream();
      const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' });
      if (!blob.size) {
        setRecState('idle');
        return;
      }
      setRecState('transcribing');
      try {
        const mt = rec.mimeType || 'webm';
        const ext = mt.includes('mp4') ? 'mp4' : mt.includes('ogg') ? 'ogg' : 'webm';
        const text = await transcribeAnswer(blob, `answer.${ext}`);
        setAnswer((prev) => (prev.trim() ? `${prev.trim()} ${text}` : text).trim());
      } catch (err) {
        setError(describeError(err, 'Could not transcribe that. Try again or type your answer.'));
      } finally {
        setRecState('idle');
      }
    };
    rec.start();
    setRecState('recording');
    setRecElapsed(0);
  }, [releaseStream, stopSpeaking]);

  const stopRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop();
  }, []);

  // recording elapsed timer
  useEffect(() => {
    if (recState !== 'recording') return;
    const t = setInterval(() => setRecElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [recState]);

  // cleanup
  useEffect(
    () => () => {
      stopSpeaking();
      try {
        if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop();
      } catch {
        /* noop */
      }
      releaseStream();
    },
    [releaseStream, stopSpeaking],
  );

  // ── turn flow ────────────────────────────────────────────────────────────
  const doSubmit = useCallback(async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    stopSpeaking();
    stopRecording();
    setSubmitting(true);
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
  }, [answer, id, question, router, stopRecording, stopSpeaking]);
  submitRef.current = doSubmit;

  const doNext = async () => {
    if (!question || busy || recState !== 'idle') return;
    stopSpeaking();
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

  const quit = () => {
    if (!window.confirm('Leave this interview? Your progress is saved and you can resume it.')) return;
    stopSpeaking();
    stopRecording();
    router.push('/mock-interview');
  };

  const wordCount = useMemo(() => answer.trim().split(/\s+/).filter(Boolean).length, [answer]);
  const total = totalSecondsRef.current || 1;
  const timeFrac = secondsLeft !== null ? Math.max(0, Math.min(1, secondsLeft / total)) : 1;
  const low = secondsLeft !== null && secondsLeft < 30;
  const mm = secondsLeft !== null ? Math.floor(secondsLeft / 60) : 0;
  const ss = secondsLeft !== null ? secondsLeft % 60 : 0;
  const recMin = Math.floor(recElapsed / 60);
  const recSec = recElapsed % 60;
  const hasAnswer = answer.trim().length > 0;

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
            <button
              onClick={() => {
                const nv = !voiceOn;
                setVoiceOn(nv);
                if (!nv) stopSpeaking();
                else if (question) speak(question.question_text);
              }}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-semibold transition-colors',
                voiceOn ? 'border-navy/20 bg-navy/5 text-navy' : 'border-slate-200 text-slate-400 hover:bg-slate-50',
              )}
              title={voiceOn ? 'Interviewer voice on' : 'Interviewer voice off'}
            >
              {voiceOn ? <Volume2 className="size-3.5" /> : <VolumeX className="size-3.5" />}
              <span className="hidden sm:inline">Voice</span>
            </button>
            {secondsLeft !== null && <TimerRing frac={timeFrac} label={`${mm}:${String(ss).padStart(2, '0')}`} low={low} />}
            <button onClick={quit} className="rounded-lg border border-slate-200 p-2 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600" aria-label="Leave"><X className="size-4" /></button>
          </div>
        </div>
      </div>

      <div className="space-y-5">
        {/* Interviewer + question */}
        <div className="flex items-start gap-4">
          <Orb speaking={busy || interviewerSpeaking} />
          <div className="relative flex-1 overflow-hidden rounded-2xl rounded-tl-sm border border-slate-200 bg-white p-5 shadow-sm">
            <span aria-hidden className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-orange/5 blur-2xl" />
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                AI Interviewer{interviewerSpeaking ? ' · speaking' : isFinal ? ' · final question' : ''}
              </p>
              {question && !busy && (
                <button
                  onClick={() => speak(question.question_text)}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 transition-colors hover:text-navy"
                  title="Replay question"
                >
                  <Volume2 className="size-3.5" /> Replay
                </button>
              )}
            </div>
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
        <div className={cn('rounded-2xl border bg-white p-4 shadow-sm transition-colors', recState === 'recording' ? 'border-orange/60 ring-1 ring-orange/30' : 'border-slate-200')}>
          <div className="mb-3 flex items-center justify-between">
            <label className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Your answer</label>
            {voiceCapable && (
              <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-0.5 text-xs font-semibold">
                <button
                  onClick={() => setAnswerMode('voice')}
                  className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 transition-colors', answerMode === 'voice' ? 'bg-white text-navy shadow-sm' : 'text-slate-500')}
                >
                  <Mic className="size-3.5" /> Speak
                </button>
                <button
                  onClick={() => { stopRecording(); setAnswerMode('text'); }}
                  className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 transition-colors', answerMode === 'text' ? 'bg-white text-navy shadow-sm' : 'text-slate-500')}
                >
                  <Keyboard className="size-3.5" /> Type
                </button>
              </div>
            )}
          </div>

          {/* VOICE mode */}
          {answerMode === 'voice' ? (
            <div className="space-y-3">
              {recState === 'idle' && !hasAnswer ? (
                <button
                  onClick={startRecording}
                  className="group flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 py-8 transition-colors hover:border-orange/50 hover:bg-orange/5"
                >
                  <span className="grid size-14 place-items-center rounded-full bg-gradient-to-br from-orange to-[#f5872f] text-white shadow-lg transition-transform group-hover:scale-105">
                    <Mic className="size-6" />
                  </span>
                  <span className="text-sm font-bold text-navy">Tap to record your answer</span>
                  <span className="text-xs text-slate-400">Speak naturally — we&apos;ll transcribe it with Whisper</span>
                </button>
              ) : recState === 'recording' ? (
                <button
                  onClick={stopRecording}
                  className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-orange/50 bg-orange/5 py-8"
                >
                  <span className="grid size-14 place-items-center rounded-full bg-red-500 text-white shadow-lg">
                    <Square className="size-5 fill-current" />
                  </span>
                  <span className="flex items-center gap-2 text-sm font-bold text-navy">
                    <RecWave /> Recording · {recMin}:{String(recSec).padStart(2, '0')}
                  </span>
                  <span className="text-xs text-slate-400">Tap to stop</span>
                </button>
              ) : recState === 'transcribing' ? (
                <div className="flex w-full flex-col items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/60 py-8">
                  <Loader2 className="size-7 animate-spin text-orange" />
                  <span className="text-sm font-semibold text-slate-500">Transcribing with Whisper…</span>
                </div>
              ) : null}

              {/* transcript (editable) after recording */}
              {recState === 'idle' && hasAnswer && (
                <>
                  <textarea
                    ref={textareaRef}
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    rows={5}
                    className="w-full resize-none rounded-lg border border-slate-200 px-3.5 py-3 text-[15px] leading-relaxed shadow-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                  />
                  <button
                    onClick={startRecording}
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                  >
                    <RotateCcw className="size-3.5" /> Re-record / add more
                  </button>
                </>
              )}
            </div>
          ) : (
            /* TEXT fallback */
            <textarea
              ref={textareaRef}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); doNext(); } }}
              rows={6}
              placeholder="Type your answer…"
              className="w-full resize-none rounded-lg border border-slate-200 px-3.5 py-3 text-[15px] leading-relaxed shadow-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
            />
          )}

          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

          <div className="mt-3 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">{wordCount} word{wordCount === 1 ? '' : 's'}</span>
            <div className="flex items-center gap-3">
              {!isFinal && (
                <button onClick={doSubmit} disabled={submitting || busy || recState !== 'idle'} className="text-xs font-medium text-slate-400 transition-colors hover:text-slate-600 disabled:opacity-50">End early</button>
              )}
              <button
                onClick={doNext}
                disabled={busy || submitting || recState !== 'idle'}
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

        <p className="text-center text-xs text-slate-400">No camera, no proctoring — a calm space to practise out loud. Take your time.</p>
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

function RecWave() {
  return (
    <span className="flex items-end gap-0.5">
      {[0.5, 1, 0.7, 1, 0.6].map((h, i) => (
        <motion.span key={i} className="w-0.5 rounded-full bg-red-500" style={{ height: 12 }} animate={{ scaleY: [h * 0.4, h, h * 0.4] }} transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.08 }} />
      ))}
    </span>
  );
}
