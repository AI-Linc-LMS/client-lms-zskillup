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
  /** `error` carries the failure code: `network`/`service-not-allowed` (cloud STT
   *  endpoint blocked — common on college/corporate Wi-Fi), `not-allowed`,
   *  `audio-capture`, or the benign `no-speech`/`aborted`. */
  onerror: ((e: { error: string }) => void) | null;
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
  const [sttFallback, setSttFallback] = useState(false); // browser SR dead/absent → server Whisper is doing the transcript

  const responsesRef = useRef<Map<number, string>>(new Map());
  const submitRef = useRef<() => void>(() => {});
  const submittingRef = useRef(false);
  const totalSecondsRef = useRef(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // NOTE: face proctoring (BlazeFace/FaceMesh) was removed here. Its continuous
  // main-thread ML inference starved the browser SpeechRecognition, so the live
  // "Whisper" transcript never updated and answers recorded as empty. The mock
  // interview is a self-practice tool ("nothing is uploaded, no strict proctoring"),
  // so the camera stays a plain self-view; tab/fullscreen proctoring lives in the
  // gate (useFocusGuard). Strict face proctoring belongs to the graded assessments.
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const whisperBusyRef = useRef(false);
  /** Committed Web-Speech transcript for the CURRENT answer (near-real-time, no server). */
  const srFinalRef = useRef('');
  const recognitionRef = useRef<SpeechRec | null>(null);
  const recordingRef = useRef(false); // sync flag so SR onend can auto-restart while recording
  const srDeadRef = useRef(false); // browser SR hit a fatal error (blocked cloud endpoint) THIS answer — stop restarting it
  const srEverDeadRef = useRef(false); // SR proved unusable earlier this session — seed fallback immediately (no "Listening…" flash)
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null); // server-Whisper fallback poll (self-scheduling, backs off)
  const whisperInFlightRef = useRef<Promise<unknown> | null>(null); // the current Whisper pass, so stopRecording can await it
  const whisperCtrlRef = useRef<AbortController | null>(null); // abort a stalled poll upload instead of blocking the stop
  const turnRef = useRef(0); // bumped on every stop; a Whisper pass whose captured turn is stale must not write
  const advancingRef = useRef(false); // re-entrancy latch for doNext (a double-click must not double-advance)
  const voiceOnRef = useRef(voiceOn);
  voiceOnRef.current = voiceOn;
  const answerRef = useRef('');
  answerRef.current = answer;
  const typingRef = useRef(typing); // sync mirror so an async Whisper pass never clobbers a manual edit
  typingRef.current = typing;
  const questionIdRef = useRef<number | null>(null); // latest question id, so a superseded TTS callback can't arm a stale answer
  questionIdRef.current = question?.id ?? null;

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

        // Camera + mic (self-view + Whisper source). Best-effort - falls back to typing.
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
            // Camera denied/absent - try audio-only so voice answers still work.
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
  // transcribing a 30s clip on repeat - the confirmed text lagged 15-30s behind speech
  // (bug 1), and the partial/near-silent passes are exactly what made Whisper hallucinate
  // repeated phrases into the answer (bug 3).
  //
  // Now: the LIVE transcript comes from the browser's SpeechRecognition (instant, no server
  // - see startRecording), and Whisper runs ONCE when the candidate stops, purely to refine
  // the full answer. If Whisper hallucinates or fails, the Web-Speech transcript stands.
  //
  // Whisper is ALSO the near-real-time fallback: on browsers where SpeechRecognition is
  // absent (Firefox) or its cloud endpoint is firewalled (Chrome/Edge on college Wi-Fi -
  // the audio never reaches Google so no words ever come back), a poll in startRecording
  // calls this every few seconds while the candidate speaks, so the transcript still fills
  // in from OUR server instead of showing nothing. Self-guarded by whisperBusyRef so passes
  // never overlap; only applies a clean, non-hallucinated result.
  // `final` = the single accurate pass fired by stopRecording (it drives the `transcribing`
  // spinner and is allowed to overwrite even committed SR text to refine it). A poll pass
  // (final=false) is silent (no spinner churn) and only writes while SR has produced nothing.
  // Returns the text it committed, or null — so stopRecording can hand the caller a definitive
  // answer instead of racing the async setAnswer → answerRef re-render.
  const runWhisper = useCallback(async (final = false): Promise<string | null> => {
    if (whisperBusyRef.current || !chunksRef.current.length) return null;
    whisperBusyRef.current = true;
    const turn = turnRef.current; // a pass that outlives its answer must not write into the next
    if (final) setTranscribing(true);
    // Bound every upload so a stalled request on a flaky/firewalled link (the target cohort)
    // can never wedge the pass — stopRecording awaits the in-flight pass, so an unbounded fetch
    // would hang Next / Finish forever. On abort, transcribeAnswer rejects → catch → finally.
    const ctrl = new AbortController();
    whisperCtrlRef.current = ctrl;
    const timeoutMs = final ? 30000 : 20000;
    const to = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const type = recorderRef.current?.mimeType || 'audio/webm';
      const ext = type.includes('mp4') ? 'mp4' : type.includes('ogg') ? 'ogg' : 'webm';
      const blob = new Blob(chunksRef.current, { type });
      if (blob.size > 1200) {
        const text = (await transcribeAnswer(blob, `answer.${ext}`, ctrl.signal)).trim();
        // Accept only a clean transcript for the CURRENT answer. Skip if: hallucinated/empty,
        // the answer already advanced (turn changed), or the user switched to typing. A
        // background poll pass also won't clobber LIVE SR words — but once SR has died
        // (srDead), the server transcript takes over (S1: the live box mustn't freeze). answerRef
        // is committed SYNCHRONOUSLY so a caller reading it right after the await sees this result.
        if (
          text &&
          !looksHallucinated(text) &&
          turn === turnRef.current &&
          !typingRef.current &&
          (final || srDeadRef.current || !srFinalRef.current)
        ) {
          answerRef.current = text;
          setAnswer(text);
          return text;
        }
      }
    } catch {
      /* transient/aborted - the live Web-Speech transcript already stands; typing is the fallback */
    } finally {
      clearTimeout(to);
      if (whisperCtrlRef.current === ctrl) whisperCtrlRef.current = null;
      whisperBusyRef.current = false;
      if (final) setTranscribing(false);
    }
    return null;
  }, []);

  const startRecording = useCallback(() => {
    const stream = streamRef.current;
    if (!stream || !voiceCapable || typing) return;
    const audio = new MediaStream(stream.getAudioTracks());
    if (!audio.getAudioTracks().length) return;
    // Tear down any still-live session first. Arming twice without a stop (e.g. clicking Next
    // to skip a question mid-readout) would otherwise leave the OLD MediaRecorder pushing into
    // the new answer's chunk buffer — two interleaved streams = garbage Whisper — and orphan an
    // auto-restarting recogniser.
    recordingRef.current = false;
    if (pollRef.current) {
      clearTimeout(pollRef.current);
      pollRef.current = null;
    }
    whisperInFlightRef.current = null;
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
    chunksRef.current = [];
    srFinalRef.current = '';
    srDeadRef.current = false;
    // Seed the fallback flag from session history: if SR already proved blocked earlier, skip
    // the misleading "Listening…" flash and show the server-transcribing note straight away.
    setSttFallback(srEverDeadRef.current);
    const mime = ['audio/webm', 'audio/mp4', 'audio/ogg'].find((m) => MediaRecorder.isTypeSupported?.(m));
    const rec = new MediaRecorder(audio, mime ? { mimeType: mime } : undefined);
    recorderRef.current = rec;
    rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
    rec.start(1000); // 1s chunks - accumulated for the Whisper pass(es)
    setRecording(true);
    recordingRef.current = true;

    // Near-real-time transcript via the browser's SpeechRecognition: FINAL segments are
    // committed to the answer as they're recognised (no server round-trip → no latency),
    // and non-final words show as a grey interim preview. Whisper refines the whole thing
    // once at the end.
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
          if (typingRef.current) return; // user switched to manual typing - don't fight the edit
          let live = '';
          for (let i = e.resultIndex; i < e.results.length; i++) {
            const seg = e.results[i][0].transcript;
            if (e.results[i].isFinal) srFinalRef.current = `${srFinalRef.current} ${seg}`.trim();
            else live += seg;
          }
          if (srFinalRef.current) setSttFallback(false); // SR is delivering - hide the server-fallback note
          answerRef.current = srFinalRef.current; // sync commit so a submit right now reads it
          setAnswer(srFinalRef.current);
          setInterim(live.trim());
        };
        sr.onend = () => {
          // Only auto-restart while recording AND the recogniser is still healthy. After a
          // fatal error (blocked cloud endpoint) restarting just hammers the firewall and
          // burns battery while never producing a word - let the Whisper poll carry it.
          if (recordingRef.current && !srDeadRef.current) {
            try {
              sr.start();
            } catch {
              /* already started / stopping */
            }
          }
        };
        sr.onerror = (ev) => {
          const code = ev?.error;
          // `no-speech`/`aborted` are benign (the user just paused) - let onend restart.
          // The rest are fatal for this session: the cloud STT endpoint is unreachable
          // (firewalled college/corporate Wi-Fi) or mic access broke. Stop restarting and
          // fall back to server Whisper so the answer still gets transcribed.
          if (code && code !== 'no-speech' && code !== 'aborted') {
            srDeadRef.current = true;
            srEverDeadRef.current = true;
            setSttFallback(true);
            setInterim(''); // drop stale grey words so they don't duplicate beside the Whisper answer
          }
        };
        recognitionRef.current = sr;
        sr.start();
      } catch {
        // SR construction failed - server Whisper is the transcript path.
        srDeadRef.current = true;
        srEverDeadRef.current = true;
        setSttFallback(true);
      }
    } else {
      // No SpeechRecognition at all (e.g. Firefox) - server Whisper is the only path.
      srEverDeadRef.current = true;
      setSttFallback(true);
    }

    // Server-Whisper fallback poll. Fires while SpeechRecognition has produced NOTHING
    // (srFinal empty) OR has died mid-answer (srDead) — i.e. SR is absent, blocked, or went
    // silent — so the transcript fills in from OUR backend instead of a dead "Listening…" box.
    // Whole-clip re-transcription is O(n²) in the worst case, so the interval BACKS OFF as the
    // clip grows: a long answer on a firewalled network won't hammer the backend or reintroduce
    // the very lag this fix removes. The moment SR commits a word, srFinal is non-empty and
    // (unless SR later dies) this backs off — SR wins, it's zero-latency. whisperInFlightRef
    // lets stopRecording await the pass in flight before its final accurate pass.
    const scheduleFallbackPoll = () => {
      const delay = Math.min(4000 + Math.floor(chunksRef.current.length / 10) * 2000, 15000);
      pollRef.current = setTimeout(() => {
        if (
          recordingRef.current &&
          (srDeadRef.current || !srFinalRef.current) &&
          chunksRef.current.length >= 3 &&
          !whisperBusyRef.current
        ) {
          whisperInFlightRef.current = runWhisper(false);
        }
        if (recordingRef.current) scheduleFallbackPoll();
      }, delay);
    };
    if (pollRef.current) clearTimeout(pollRef.current);
    scheduleFallbackPoll();
  }, [runWhisper, typing, voiceCapable]);

  // Returns the definitive final answer text so callers don't race the async setAnswer →
  // answerRef re-render (which, on the fallback path, would submit an empty/stale transcript).
  const stopRecording = useCallback(async (): Promise<string> => {
    recordingRef.current = false;
    turnRef.current += 1; // invalidate any in-flight poll pass from THIS answer
    if (pollRef.current) {
      clearTimeout(pollRef.current);
      pollRef.current = null;
    }
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
    if (rec && rec.state !== 'inactive') {
      await new Promise<void>((resolve) => {
        rec.onstop = () => resolve();
        rec.stop();
      });
    }
    setRecording(false);
    // Settle any in-flight fallback pass so whisperBusyRef clears, THEN run the single accurate
    // whole-clip pass over the complete post-stop audio (including the tail chunk flushed by
    // rec.stop()). We ABORT the in-flight pass rather than waiting out its (bounded) upload —
    // it captured the now-stale turn so its result is discarded anyway, and this keeps Next /
    // Finish snappy on a slow link. Awaiting the promise guarantees its finally has run
    // (whisperBusyRef=false) before the final pass, so the final pass is never a no-op.
    if (whisperInFlightRef.current) {
      whisperCtrlRef.current?.abort();
      try {
        await whisperInFlightRef.current;
      } catch {
        /* noop */
      }
      whisperInFlightRef.current = null;
    }
    const finalText = await runWhisper(true);
    return finalText ?? answerRef.current;
  }, [runWhisper]);

  // Speak each new question, then auto-arm recording when it finishes.
  useEffect(() => {
    if (!question || busy || loading) return;
    const qid = question.id;
    const armRecording = () => {
      // Bail if this callback was superseded: the answer already moved on (question changed) or
      // we're submitting. Prevents a cancelled utterance's onend from arming a stale recording.
      if (voiceCapable && !typing && !submittingRef.current && questionIdRef.current === qid) startRecording();
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
      turnRef.current += 1; // invalidate any in-flight Whisper pass so it can't setState post-unmount
      if (pollRef.current) {
        clearTimeout(pollRef.current);
        pollRef.current = null;
      }
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
    const finalAnswer = await stopRecording();
    setSubmitting(true);
    if (question) responsesRef.current.set(question.id, finalAnswer);
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
    // advancingRef latches synchronously: during stopRecording's await window busy/transcribing
    // are still false, so without it a double-click would start two stopRecordings + two
    // next-question calls and double-advance.
    if (!question || busy || transcribing || advancingRef.current) return;
    advancingRef.current = true;
    try {
      const finalAnswer = await stopRecording();
      responsesRef.current.set(question.id, finalAnswer);
      if (isFinal) {
        await doSubmit();
        return;
      }
      setBusy(true);
      setError(null);
      try {
        const t = await nextInterviewQuestion(id, question.id, finalAnswer);
        if (!t.question) {
          await doSubmit();
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
    } finally {
      advancingRef.current = false;
    }
  };

  const quit = () => {
    if (!window.confirm('Leave this interview? Your progress is saved and you can resume it.')) return;
    stopSpeaking();
    // Full teardown so a fallback-Whisper POST or an SR auto-restart can't fire after leaving.
    recordingRef.current = false;
    turnRef.current += 1;
    if (pollRef.current) {
      clearTimeout(pollRef.current);
      pollRef.current = null;
    }
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
        <div className="relative flex min-h-[240px] flex-col items-center justify-center gap-4 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#1f2d4d] via-[#16223f] to-[#0a0a0c] p-6 text-white shadow-sm">
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
          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-end gap-2 bg-gradient-to-b from-black/50 to-transparent p-2.5">
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
                <Mic className="size-3" /> {sttFallback ? 'live · server' : 'live'}
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
              <span className="flex items-center gap-2 text-slate-500">
                <EqBars />
                {sttFallback
                  ? 'Recording — transcribing on our server, your words appear here in a moment…'
                  : 'Listening - start speaking, your words appear here…'}
              </span>
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
              className={cn('inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold shadow-sm transition-all hover:shadow disabled:opacity-50', isFinal ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white hover:from-emerald-700' : 'bg-gradient-to-r from-orange to-[#f5b400] text-[#171717] hover:brightness-105')}
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
  const stroke = low ? '#ef4444' : '#f5b400';
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
