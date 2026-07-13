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
import { Bot, Keyboard, Loader2, Mic, Send, Sparkles, Video, VideoOff, Volume2, VolumeX, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Whisper hallucinates a short phrase repeated over and over when it's fed silence or
 * background noise ("angry bird sounds angry bird sounds …", "Thank you. Thank you. …").
 * That garbage was being committed as the candidate's answer even when they said nothing.
 * Reject a transcript that is mostly one short phrase repeated.
 */
function looksHallucinated(raw: string): boolean {
  const text = raw.trim();
  if (!text) return false;
  const words = text.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter(Boolean);
  if (words.length < 6) return false;
  // Try phrase lengths 1..4: is the text just this phrase repeated back-to-back?
  for (let n = 1; n <= 4; n++) {
    const first = words.slice(0, n).join(' ');
    let reps = 0;
    for (let i = 0; i + n <= words.length; i += n) {
      if (words.slice(i, i + n).join(' ') === first) reps++;
      else break;
    }
    if (reps * n >= words.length * 0.8 && reps >= 3) return true;
  }
  // Also catch low lexical diversity (e.g. the same 2 words filling the whole thing).
  const unique = new Set(words).size;
  return words.length >= 10 && unique / words.length < 0.25;
}

/** Minimal browser SpeechRecognition typing (Web Speech API) for instant interim words. */
interface SpeechRec {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}

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

  // media + voice
  const [voiceOn, setVoiceOn] = useState(true);
  const [interviewerSpeaking, setInterviewerSpeaking] = useState(false);
  const [voiceCapable, setVoiceCapable] = useState(true); // Whisper key present
  const [camOn, setCamOn] = useState(false);
  const [camError, setCamError] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [typing, setTyping] = useState(false); // typed fallback
  const [interim, setInterim] = useState(''); // live browser-SR words (instant preview)

  const responsesRef = useRef<Map<number, string>>(new Map());
  const submitRef = useRef<() => void>(() => {});
  const submittingRef = useRef(false);
  const totalSecondsRef = useRef(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const whisperBusyRef = useRef(false);
  /** Committed Web-Speech transcript for the CURRENT answer (near-real-time, no server). */
  const srFinalRef = useRef('');
  const recognitionRef = useRef<SpeechRec | null>(null);
  const recordingRef = useRef(false); // sync flag so SR onend can auto-restart while recording
  const voiceOnRef = useRef(voiceOn);
  voiceOnRef.current = voiceOn;
  const answerRef = useRef('');
  answerRef.current = answer;

  // ── init: interview + camera/mic ─────────────────────────────────────────
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

        // Camera + mic (self-view + Whisper source). Best-effort — falls back to typing.
        const recorderOk = !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';
        const whisperOk = recorderOk && (await aiInterviewStatus().catch(() => false));
        if (recorderOk && whisperOk) {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
              audio: { echoCancellation: true, noiseSuppression: true },
            });
            if (!alive) {
              stream.getTracks().forEach((t) => t.stop());
              return;
            }
            streamRef.current = stream;
            setCamOn(stream.getVideoTracks().length > 0);
          } catch {
            // Camera denied/absent — try audio-only so voice answers still work.
            try {
              const audioOnly = await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, noiseSuppression: true },
              });
              if (!alive) {
                audioOnly.getTracks().forEach((t) => t.stop());
                return;
              }
              streamRef.current = audioOnly;
              setCamError(true);
            } catch {
              setCamError(true);
              setVoiceCapable(false);
              setTyping(true);
            }
          }
        } else {
          setVoiceCapable(false);
          setTyping(true);
        }

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

  // attach camera stream to the video element
  useEffect(() => {
    if (videoRef.current && streamRef.current) videoRef.current.srcObject = streamRef.current;
  }, [camOn, loading]);

  // ── interviewer TTS ──────────────────────────────────────────────────────
  const speak = useCallback((text: string, onDone?: () => void) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || !text.trim()) {
      onDone?.();
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      const v = pickVoice();
      if (v) u.voice = v;
      u.lang = v?.lang ?? 'en-US';
      u.rate = 1;
      u.onstart = () => setInterviewerSpeaking(true);
      u.onend = () => {
        setInterviewerSpeaking(false);
        onDone?.();
      };
      u.onerror = () => {
        setInterviewerSpeaking(false);
        onDone?.();
      };
      window.speechSynthesis.speak(u);
    } catch {
      onDone?.();
    }
  }, []);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    setInterviewerSpeaking(false);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      const onChange = () => window.speechSynthesis.getVoices();
      window.speechSynthesis.addEventListener?.('voiceschanged', onChange);
      return () => window.speechSynthesis.removeEventListener?.('voiceschanged', onChange);
    }
  }, []);

  // ── final Whisper refinement (ONE pass, on stop) ─────────────────────────
  //
  // The old pipeline re-transcribed the ENTIRE growing recording every 3.5s. Each pass
  // re-uploaded and re-processed all prior audio, so at 30s into an answer it was
  // transcribing a 30s clip on repeat — the confirmed text lagged 15-30s behind speech
  // (bug 1), and the partial/near-silent passes are exactly what made Whisper hallucinate
  // repeated phrases into the answer (bug 3).
  //
  // Now: the LIVE transcript comes from the browser's SpeechRecognition (instant, no server
  // — see startRecording), and Whisper runs ONCE when the candidate stops, purely to refine
  // the full answer. If Whisper hallucinates or fails, the Web-Speech transcript stands.
  const runWhisper = useCallback(async () => {
    if (whisperBusyRef.current || !chunksRef.current.length) return;
    whisperBusyRef.current = true;
    setTranscribing(true);
    try {
      const type = recorderRef.current?.mimeType || 'audio/webm';
      const ext = type.includes('mp4') ? 'mp4' : type.includes('ogg') ? 'ogg' : 'webm';
      const blob = new Blob(chunksRef.current, { type });
      if (blob.size > 1200) {
        const text = (await transcribeAnswer(blob, `answer.${ext}`)).trim();
        // Accept only a clean transcript. A hallucinated repeat, or empty text, leaves the
        // live Web-Speech answer untouched rather than overwriting it with garbage.
        if (text && !looksHallucinated(text)) setAnswer(text);
      }
    } catch {
      /* transient — the live Web-Speech transcript already stands; typing is the fallback */
    } finally {
      whisperBusyRef.current = false;
      setTranscribing(false);
    }
  }, []);

  const startRecording = useCallback(() => {
    const stream = streamRef.current;
    if (!stream || !voiceCapable || typing) return;
    const audio = new MediaStream(stream.getAudioTracks());
    if (!audio.getAudioTracks().length) return;
    chunksRef.current = [];
    srFinalRef.current = '';
    const mime = ['audio/webm', 'audio/mp4', 'audio/ogg'].find((m) => MediaRecorder.isTypeSupported?.(m));
    const rec = new MediaRecorder(audio, mime ? { mimeType: mime } : undefined);
    recorderRef.current = rec;
    rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
    rec.start(1000); // 1s chunks - buffered for ONE Whisper pass at the end
    setRecording(true);
    recordingRef.current = true;

    // Near-real-time transcript via the browser's SpeechRecognition: FINAL segments are
    // committed to the answer as they're recognised (no server round-trip → no latency),
    // and non-final words show as a grey interim preview. Whisper refines the whole thing
    // once at the end. On browsers without SpeechRecognition, the answer fills in on stop
    // from the single Whisper pass — still far better than the old 15-30s progressive lag.
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRec;
      webkitSpeechRecognition?: new () => SpeechRec;
    };
    const SRCtor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (SRCtor) {
      try {
        const sr = new SRCtor();
        sr.continuous = true;
        sr.interimResults = true;
        sr.lang = 'en-US';
        sr.onresult = (e) => {
          let live = '';
          for (let i = e.resultIndex; i < e.results.length; i++) {
            const seg = e.results[i][0].transcript;
            if (e.results[i].isFinal) srFinalRef.current = `${srFinalRef.current} ${seg}`.trim();
            else live += seg;
          }
          setAnswer(srFinalRef.current);
          setInterim(live.trim());
        };
        sr.onend = () => {
          if (recordingRef.current) {
            try {
              sr.start();
            } catch {
              /* already started / stopping */
            }
          }
        };
        sr.onerror = () => {};
        recognitionRef.current = sr;
        sr.start();
      } catch {
        /* SR unavailable — Whisper still fills the transcript every ~3.5s */
      }
    }
  }, [runWhisper, typing, voiceCapable]);

  const stopRecording = useCallback(async () => {
    recordingRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        /* noop */
      }
      recognitionRef.current = null;
    }
    setInterim('');
    const rec = recorderRef.current;
    if (!rec || rec.state === 'inactive') {
      setRecording(false);
      return;
    }
    await new Promise<void>((resolve) => {
      rec.onstop = () => resolve();
      rec.stop();
    });
    setRecording(false);
    await runWhisper(); // single accurate refinement pass
  }, [runWhisper]);

  // Speak each new question, then auto-arm recording when it finishes.
  useEffect(() => {
    if (!question || busy || loading) return;
    const armRecording = () => {
      if (voiceCapable && !typing) startRecording();
    };
    if (voiceOnRef.current) speak(question.question_text, armRecording);
    else {
      stopSpeaking();
      armRecording();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question?.id, busy, loading]);

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

  // cleanup: stop camera + mic + speech + interim recognition on unmount
  useEffect(
    () => () => {
      stopSpeaking();
      recordingRef.current = false;
      try {
        recognitionRef.current?.stop();
      } catch {
        /* noop */
      }
      recognitionRef.current = null;
      try {
        if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop();
      } catch {
        /* noop */
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
    },
    [stopSpeaking],
  );

  // ── turn flow ────────────────────────────────────────────────────────────
  const doSubmit = useCallback(async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    stopSpeaking();
    await stopRecording();
    setSubmitting(true);
    if (question) responsesRef.current.set(question.id, answerRef.current);
    const responses = [...responsesRef.current.entries()].map(([questionId, a]) => ({ questionId, answer: a }));
    try {
      await submitInterview(id, responses);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      router.replace(`/mock-interview/${id}/result`);
    } catch (err) {
      setError(describeError(err, 'Submit failed. Please retry.'));
      setSubmitting(false);
      submittingRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, question, router, stopRecording, stopSpeaking]);
  submitRef.current = doSubmit;

  const doNext = async () => {
    if (!question || busy || transcribing) return;
    await stopRecording();
    const finalAnswer = answerRef.current;
    responsesRef.current.set(question.id, finalAnswer);
    if (isFinal) {
      doSubmit();
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const t = await nextInterviewQuestion(id, question.id, finalAnswer);
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
    try {
      if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop();
    } catch {
      /* noop */
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    router.push('/mock-interview');
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
        <InterviewerBlob speaking />
        <p className="text-sm text-slate-600">Setting up your interview - enabling camera &amp; mic…</p>
      </div>
    );
  }
  if (error && !question) {
    return <div className="py-24 text-center text-sm text-red-500">{error}</div>;
  }

  return (
    <div className="mx-auto max-w-5xl">
      {/* Top bar */}
      <div className="sticky top-0 z-20 -mx-4 mb-5 border-b border-slate-100 bg-white/90 px-4 py-3 backdrop-blur">
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
              className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-semibold transition-colors', voiceOn ? 'border-navy/20 bg-navy/5 text-navy' : 'border-slate-200 text-slate-500 hover:bg-slate-50')}
              title={voiceOn ? 'Interviewer voice on' : 'Interviewer voice off'}
            >
              {voiceOn ? <Volume2 className="size-3.5" /> : <VolumeX className="size-3.5" />}
              <span className="hidden sm:inline">Voice</span>
            </button>
            {secondsLeft !== null && <TimerRing frac={timeFrac} label={`${mm}:${String(ss).padStart(2, '0')}`} low={low} />}
            <button onClick={quit} className="rounded-lg border border-slate-200 p-2 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-600" aria-label="Leave"><X className="size-4" /></button>
          </div>
        </div>
      </div>

      {/* Calibration stage: interviewer + candidate camera */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Interviewer */}
        <div className="relative flex min-h-[240px] flex-col items-center justify-center gap-4 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#1f2d4d] via-[#16223f] to-[#0b1220] p-6 text-white shadow-sm">
          <span aria-hidden className="pointer-events-none absolute -left-10 -top-10 size-40 rounded-full bg-[#8b5cf6]/25 blur-3xl" />
          <InterviewerBlob speaking={interviewerSpeaking || busy} big />
          <div className="text-center">
            <p className="text-[11px] font-bold uppercase tracking-widest text-white/50">AI Interviewer</p>
            <p className="text-sm font-semibold text-white/80">
              {busy ? 'Thinking…' : interviewerSpeaking ? 'Speaking…' : 'Listening'}
            </p>
          </div>
        </div>

        {/* Candidate camera */}
        <div className="relative min-h-[240px] overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-sm">
          {camOn ? (
            <video ref={videoRef} autoPlay muted playsInline className="size-full object-cover" style={{ transform: 'scaleX(-1)' }} />
          ) : (
            <div className="flex size-full flex-col items-center justify-center gap-2 text-slate-500">
              <VideoOff className="size-8" />
              <p className="text-xs">{camError ? 'Camera unavailable' : 'Camera off'}</p>
            </div>
          )}
          {/* overlays */}
          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between gap-2 bg-gradient-to-b from-black/50 to-transparent p-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-black/40 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white/80 backdrop-blur">
              <span className="size-1.5 rounded-full bg-emerald-400" /> Monitoring
            </span>
            {recording && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/90 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                <motion.span className="size-1.5 rounded-full bg-white" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.2, repeat: Infinity }} /> Rec
              </span>
            )}
          </div>
          <div className="pointer-events-none absolute bottom-2 left-2.5 inline-flex items-center gap-1.5 rounded-full bg-black/40 px-2 py-1 text-[10px] font-semibold text-white/80 backdrop-blur">
            {camOn ? <Video className="size-3" /> : <VideoOff className="size-3" />} You
          </div>
        </div>
      </div>

      {/* Question */}
      <div className="relative mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
            Question{isFinal ? ' · final' : ''}
          </p>
          {question && !busy && (
            <button onClick={() => speak(question.question_text)} className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 transition-colors hover:text-navy" title="Replay">
              <Volume2 className="size-3.5" /> Replay
            </button>
          )}
        </div>
        <div className="mt-1 min-h-[2rem]">
          <AnimatePresence mode="wait">
            {busy ? (
              <motion.div key="thinking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2 text-slate-500"><span className="text-[15px]">Thinking</span><ThinkingDots /></motion.div>
            ) : (
              <motion.p key={question?.id ?? 'q'} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.28 }} className="text-[16px] font-medium leading-relaxed text-navy">
                {question?.question_text}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Live transcript */}
      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <label className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
            Your answer
            {recording && (
              <span className="inline-flex items-center gap-1 rounded-full bg-orange/10 px-2 py-0.5 text-[10px] font-bold text-orange">
                <Mic className="size-3" /> live · Whisper
              </span>
            )}
            {transcribing && <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500"><Loader2 className="size-3 animate-spin" /> finalising</span>}
          </label>
          {voiceCapable && (
            <button onClick={() => setTyping((t) => !t)} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50">
              {typing ? <><Mic className="size-3.5" /> Use voice</> : <><Keyboard className="size-3.5" /> Type</>}
            </button>
          )}
        </div>

        {typing || !voiceCapable ? (
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); doNext(); } }}
            rows={5}
            placeholder="Type your answer…"
            className="w-full resize-none rounded-lg border border-slate-200 px-3.5 py-3 text-[15px] leading-relaxed shadow-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
          />
        ) : (
          <div className="min-h-[6rem] rounded-lg border border-slate-100 bg-slate-50/60 px-3.5 py-3 text-[15px] leading-relaxed text-navy">
            {answer || interim ? (
              // Confirmed text (navy, from Whisper) with the browser's instant
              // interim words trailing in grey until Whisper finalises them.
              <p className="whitespace-pre-wrap">
                {answer}
                {interim && (
                  <span className="text-slate-500">
                    {answer ? ' ' : ''}
                    {interim}
                  </span>
                )}
              </p>
            ) : recording ? (
              <span className="flex items-center gap-2 text-slate-500"><EqBars /> Listening - start speaking, your words appear here…</span>
            ) : (
              <span className="text-slate-500">The interviewer will speak, then your answer records automatically.</span>
            )}
          </div>
        )}
        {answer && !typing && voiceCapable && (
          <button onClick={() => setTyping(true)} className="mt-2 text-xs font-medium text-slate-500 transition-colors hover:text-navy">Edit transcript</button>
        )}

        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        <div className="mt-3 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">{wordCount} word{wordCount === 1 ? '' : 's'}</span>
          <div className="flex items-center gap-3">
            {!isFinal && (
              <button onClick={doSubmit} disabled={submitting || busy || transcribing} className="text-xs font-medium text-slate-500 transition-colors hover:text-slate-600 disabled:opacity-50">End early</button>
            )}
            <button
              onClick={doNext}
              disabled={busy || submitting || transcribing}
              className={cn('inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:shadow disabled:opacity-50', isFinal ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700' : 'bg-gradient-to-r from-orange to-[#f5872f] hover:brightness-105')}
            >
              {busy || submitting || transcribing ? <Loader2 className="size-4 animate-spin" /> : isFinal ? <Sparkles className="size-4" /> : <Send className="size-4" />}
              {isFinal ? 'Finish & get feedback' : 'Next question'}
            </button>
          </div>
        </div>
      </div>

      <p className="mt-3 text-center text-xs text-slate-500">
        Your camera is a self-view for a real interview feel - nothing is uploaded, and there&apos;s no strict proctoring.
      </p>

      {/* Evaluating overlay */}
      <AnimatePresence>
        {submitting && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-white/90 backdrop-blur-sm">
            <InterviewerBlob speaking big />
            <div className="text-center">
              <p className="text-lg font-bold text-navy">Reviewing your interview…</p>
              <p className="mt-1 text-sm text-slate-600">Scoring your answers and writing feedback.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── presentational bits ──────────────────────────────────────────────────────

/** Interviewer "blob": an organic morphing gradient shape that pulses + morphs while speaking. */
function InterviewerBlob({ speaking, big }: { speaking?: boolean; big?: boolean }) {
  const wrap = big ? 'size-24' : 'size-14';
  const inner = big ? 'size-20' : 'size-12';
  const icon = big ? 'size-8' : 'size-5';
  return (
    <div className={cn('relative grid shrink-0 place-items-center', wrap)}>
      <motion.span
        aria-hidden
        className="absolute inset-0 rounded-full blur-xl"
        style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6,#ec4899)' }}
        animate={speaking ? { opacity: [0.4, 0.7, 0.4], scale: [1, 1.2, 1] } : { opacity: 0.28, scale: 1 }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className={cn('relative grid place-items-center text-white shadow-[0_12px_36px_-8px_rgba(124,58,237,0.6)] ring-2 ring-white/70', inner)}
        style={{ background: 'linear-gradient(135deg,#6366f1 0%,#8b5cf6 50%,#ec4899 100%)' }}
        animate={
          speaking
            ? {
                borderRadius: ['58% 42% 40% 60% / 55% 45% 55% 45%', '42% 58% 65% 35% / 40% 60% 40% 60%', '60% 40% 45% 55% / 60% 40% 55% 45%', '58% 42% 40% 60% / 55% 45% 55% 45%'],
                scale: [1, 1.06, 0.98, 1],
              }
            : { borderRadius: '56% 44% 47% 53% / 52% 48% 52% 48%', scale: 1 }
        }
        transition={{ duration: speaking ? 2.6 : 6, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Bot className={cn('opacity-90', icon)} />
      </motion.div>
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

function EqBars() {
  return (
    <span className="flex items-end gap-0.5">
      {[0.5, 1, 0.7, 1, 0.6].map((h, i) => (
        <motion.span key={i} className="w-0.5 rounded-full bg-orange" style={{ height: 12 }} animate={{ scaleY: [h * 0.4, h, h * 0.4] }} transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.08 }} />
      ))}
    </span>
  );
}
