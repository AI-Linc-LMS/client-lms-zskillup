'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FaceProctor,
  type FaceStatus,
  type FaceViolation,
  type FaceViolationType,
} from '@/lib/proctoring/face-detection';
import { AudioProctor } from '@/lib/proctoring/audio-detection';

/** Proctoring summary sent to the backend at submit (Phase 4 + v2 camera signals). */
export interface ProctoringSummary {
  proctored: boolean;
  tabSwitches: number;
  fullscreenExits: number;
  /** Total logged incidents (browser + camera). */
  violations: number;
  faceViolations: number;
  faceViolationsByType: Partial<Record<FaceViolationType, number>>;
  snapshotCount: number;
  cameraGranted: boolean;
  micGranted: boolean;
  events: Array<{ type: string; at: string }>;
}

/** A captured frame awaiting upload to the server-side violation log (Phase 3). */
export interface PendingSnapshot {
  type: FaceViolationType | 'heartbeat';
  dataUrl: string;
  at: string;
}

/** One violation shipped to the server-stamped log (mirrors ProctorViolationReport). */
export interface ReportedViolation {
  type: string;
  severity?: string;
  message?: string;
  confidence?: number;
  occurredAt?: string;
  snapshot?: string;
}

export interface UseProctoringOptions {
  /** Called every REPORT_EVERY_MS with violations since the last flush (heartbeat
   *  even when empty). The consumer POSTs these to the server-stamped log. */
  onReport?: (batch: { violations: ReportedViolation[] }) => void;
}

export interface ProctoringController {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  active: boolean;
  cameraGranted: boolean;
  micGranted: boolean;
  tabSwitches: number;
  fullscreenExits: number;
  inFullscreen: boolean;
  enterFullscreen: () => void;
  windowBlurs: number;
  clipboardEvents: number;
  snapshotCount: number;
  faceStatus: FaceStatus | 'OFF';
  faceCount: number;
  faceViolations: number;
  latestFaceViolation: FaceViolation | null;
  lastWarning: string | null;
  start: () => Promise<void>;
  stop: () => void;
  summary: () => ProctoringSummary;
}

const SNAPSHOT_EVERY_MS = 15_000;
/** A blur within this long after a detected stall is the browser's doing, not the
 *  candidate's, and is not logged. */
const STALL_GRACE_MS = 5000;
/** One window_blur per this window, at most. */
const BLUR_COOLDOWN_MS = 3000;
/** Watchdog cadence; a gap materially longer than this means the thread was blocked. */
const STALL_WATCHDOG_MS = 1000;
/** Gap above which we call it a stall. */
const STALL_THRESHOLD_MS = 3000;

const MAX_EVENTS = 120;
const MAX_PENDING_SNAPSHOTS = 20;
/** Don't re-log/re-warn the same face-violation type more often than this. Tightened
 *  for stricter proctoring (#7) so a sustained violation re-flags sooner. */
const FACE_VIOLATION_COOLDOWN_MS = 2_500;
/** Cadence of the server-stamped heartbeat + violation flush. */
const REPORT_EVERY_MS = 10_000;
/** Cap violations carried in a single batch so the POST stays well under the body limit. */
const MAX_BATCH = 30;

declare global {
  interface Window {
    __assessmentStream?: MediaStream | null;
  }
}

/**
 * Browser + camera proctoring for the assessment lifecycle. Tracks tab-switch and
 * fullscreen-exit counts, and - new in v2 - runs BlazeFace over the self-view to
 * flag no-face / multiple-faces / obstruction / off-screen / too-close-far / poor
 * light. Warn-only (never auto-submits). Camera / model failures are non-fatal -
 * the assessment continues; the server-stamped log is the authoritative record.
 */
export function useProctoring(
  enabled: boolean,
  options?: UseProctoringOptions,
): ProctoringController {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const snapTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const reportTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const eventsRef = useRef<Array<{ type: string; at: string }>>([]);
  const faceProctorRef = useRef<FaceProctor | null>(null);
  const faceCooldownRef = useRef<Map<FaceViolationType, number>>(new Map());
  const faceCountsRef = useRef<Partial<Record<FaceViolationType, number>>>({});
  const pendingSnapshotsRef = useRef<PendingSnapshot[]>([]);
  const pendingReportRef = useRef<ReportedViolation[]>([]);
  const audioProctorRef = useRef<AudioProctor | null>(null);
  const audioTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCooldownRef = useRef(0);
  /** When the main thread last recovered from a stall (0 = never). */
  const lastStallEndRef = useRef(0);
  const lastBlurRef = useRef(0);
  /** True once camera analysis has been reported as not running. */
  const analysisOffRef = useRef(false);
  const onReportRef = useRef<UseProctoringOptions['onReport']>(options?.onReport);
  onReportRef.current = options?.onReport;

  const queueReport = useCallback((v: ReportedViolation) => {
    pendingReportRef.current.push(v);
    if (pendingReportRef.current.length > MAX_BATCH) pendingReportRef.current.shift();
  }, []);

  const [active, setActive] = useState(false);
  const [cameraGranted, setCameraGranted] = useState(false);
  const [micGranted, setMicGranted] = useState(false);
  const [tabSwitches, setTabSwitches] = useState(0);
  const [fullscreenExits, setFullscreenExits] = useState(0);
  const [inFullscreen, setInFullscreen] = useState(false);
  // Strict-proctoring signals (#7): window blur/minimize + copy/paste/cut.
  const [windowBlurs, setWindowBlurs] = useState(0);
  const [clipboardEvents, setClipboardEvents] = useState(0);
  const [snapshotCount, setSnapshotCount] = useState(0);
  const [faceStatus, setFaceStatus] = useState<FaceStatus | 'OFF'>('OFF');
  const [faceCount, setFaceCount] = useState(0);
  const [faceViolations, setFaceViolations] = useState(0);
  const [latestFaceViolation, setLatestFaceViolation] = useState<FaceViolation | null>(null);
  const [lastWarning, setLastWarning] = useState<string | null>(null);

  const logEvent = useCallback((type: string) => {
    eventsRef.current.push({ type, at: new Date().toISOString() });
    if (eventsRef.current.length > MAX_EVENTS) eventsRef.current.shift();
  }, []);

  const warn = useCallback((msg: string) => {
    setLastWarning(msg);
    window.setTimeout(() => setLastWarning((m) => (m === msg ? null : m)), 4000);
  }, []);

  const onVisibility = useCallback(() => {
    if (document.visibilityState === 'hidden') {
      setTabSwitches((n) => n + 1);
      logEvent('tab_switch');
      queueReport({
        type: 'tab_switch',
        severity: 'medium',
        message: 'Switched away from the assessment',
        occurredAt: new Date().toISOString(),
      });
      warn('You switched away from the assessment - this is logged.');
    }
  }, [logEvent, queueReport, warn]);

  const onFullscreenChange = useCallback(() => {
    const fs = !!document.fullscreenElement;
    // ALWAYS track the real state: this drives the "Return to fullscreen" enforcer, and
    // suppressing it would leave the overlay claiming fullscreen while the candidate
    // sits outside it. Only the VIOLATION is forgiven below.
    setInFullscreen(fs);
    // Same forgiveness as window_blur: when the main thread stalls the BROWSER drops
    // fullscreen - the candidate did nothing. Without this the freeze logs an exit
    // against them, which is exactly what happened on 2026-08-15. The enforcer still
    // appears, so the exam is still protected; it simply is not held against them.
    if (Date.now() - lastStallEndRef.current < STALL_GRACE_MS) return;
    if (!fs) {
      setFullscreenExits((n) => n + 1);
      logEvent('fullscreen_exit');
      queueReport({
        type: 'fullscreen_exit',
        severity: 'medium',
        message: 'Exited fullscreen',
        occurredAt: new Date().toISOString(),
      });
      warn('You exited fullscreen - please return to fullscreen.');
    }
  }, [logEvent, queueReport, warn]);

  /** Re-enter fullscreen from a user gesture (the runner's "Return to fullscreen"
   *  button). Fullscreen requests are rejected without an activation, so this must
   *  be called from a click handler - not programmatically. */
  const enterFullscreen = useCallback(() => {
    document.documentElement.requestFullscreen?.().catch(() => {});
  }, []);

  // Losing window focus WITHOUT the tab going hidden = minimized / alt-tabbed to
  // another app (a tab switch fires visibilitychange, handled above). Defer a tick
  // and only count it when the tab is still visible, so the two never double-count.
  // Main-thread stall watchdog. A timer that fires far later than scheduled means the
  // thread was blocked - the condition that manufactured the 2026-08-15 violations.
  // Recording when it ENDED lets the blur/fullscreen handlers forgive the aftermath.
  useEffect(() => {
    if (!enabled) return;
    let last = Date.now();
    const id = window.setInterval(() => {
      const now = Date.now();
      const drift = now - last - STALL_WATCHDOG_MS;
      if (drift > STALL_THRESHOLD_MS) lastStallEndRef.current = now;
      last = now;
    }, STALL_WATCHDOG_MS);
    return () => window.clearInterval(id);
  }, [enabled]);

  /**
   * Camera analysis is not running (no WebGL, model failed, or this device was too
   * slow and it stood down). NOT misconduct - but it must never pass for a clean,
   * monitored sitting. Recorded once, server-stamped, and surfaced to the candidate.
   */
  const reportAnalysisOff = useCallback(
    (reason: string) => {
      if (analysisOffRef.current) return; // once per attempt
      analysisOffRef.current = true;
      setFaceStatus('OFF');
      logEvent('camera_analysis_off');
      queueReport({
        type: 'camera_analysis_off',
        severity: 'medium',
        message: `Camera analysis not running: ${reason}`,
        occurredAt: new Date().toISOString(),
      });
      warn('Camera analysis is not running on this device. Your assessment continues and this has been logged.');
    },
    [logEvent, queueReport, warn],
  );

  const onWindowBlur = useCallback(() => {
    window.setTimeout(() => {
      if (document.visibilityState === 'hidden') return;
      // A blur the PAGE did not cause is not misconduct. When the main thread stalls,
      // the browser itself drops focus (and fullscreen), and on 2026-08-15 that got
      // logged as "Left the assessment window" at HIGH severity against candidates who
      // had done nothing. Two guards: ignore a blur that lands within the stall window
      // just observed, and rate-limit the rest so one wobble is one event, not a burst.
      const now = Date.now();
      if (now - lastStallEndRef.current < STALL_GRACE_MS) return;
      if (now - lastBlurRef.current < BLUR_COOLDOWN_MS) return;
      lastBlurRef.current = now;
      setWindowBlurs((n) => n + 1);
      logEvent('window_blur');
      queueReport({
        type: 'window_blur',
        severity: 'medium',
        message: 'Left the assessment window (minimized or switched app)',
        occurredAt: new Date().toISOString(),
      });
      warn('You left the assessment window - this is logged.');
    }, 0);
  }, [logEvent, queueReport, warn]);

  // Copy / cut / paste during the assessment. Detected + logged (not blocked, so a
  // legitimate coding-editor paste still works) and clearly warned.
  const onClipboard = useCallback(
    (e: Event) => {
      const kind = e.type; // 'copy' | 'cut' | 'paste'
      const label = kind.charAt(0).toUpperCase() + kind.slice(1);
      setClipboardEvents((n) => n + 1);
      logEvent(`clipboard_${kind}`);
      queueReport({
        type: `clipboard_${kind}`,
        severity: kind === 'paste' ? 'high' : 'medium',
        message: `${label} detected during the assessment`,
        occurredAt: new Date().toISOString(),
      });
      warn(`${label} is flagged during a proctored assessment - this is logged.`);
    },
    [logEvent, queueReport, warn],
  );

  /** Process one detection frame: update live status, and log/warn/snapshot new
   *  violations (cooldown-gated so a sustained state logs once, not every frame). */
  const onFrame = useCallback(
    (result: { faceCount: number; violations: FaceViolation[]; status: FaceStatus }) => {
      setFaceCount(result.faceCount);
      setFaceStatus(result.status);
      // Only swap the object when the violation actually CHANGES. v() allocates a
      // fresh object every frame, so storing it unconditionally changed the
      // controller's identity on every detection tick during any sustained
      // violation - which is precisely what the memo above exists to prevent, and
      // what kept rebuilding MockRunner's countdown interval.
      const next = result.violations[0] ?? null;
      setLatestFaceViolation((prev) =>
        prev?.type === next?.type && prev?.message === next?.message ? prev : next,
      );

      const now = Date.now();
      for (const violation of result.violations) {
        const last = faceCooldownRef.current.get(violation.type) ?? 0;
        if (now - last < FACE_VIOLATION_COOLDOWN_MS) continue;
        faceCooldownRef.current.set(violation.type, now);

        faceCountsRef.current[violation.type] = (faceCountsRef.current[violation.type] ?? 0) + 1;
        setFaceViolations((n) => n + 1);
        logEvent(`face:${violation.type}`);
        if (violation.severity !== 'low') warn(violation.message);

        // Capture evidence on serious events for the server-stamped log.
        const dataUrl =
          violation.severity === 'high' ? (faceProctorRef.current?.snapshot() ?? undefined) : undefined;
        if (dataUrl) {
          pendingSnapshotsRef.current.push({ type: violation.type, dataUrl, at: new Date().toISOString() });
          if (pendingSnapshotsRef.current.length > MAX_PENDING_SNAPSHOTS) {
            pendingSnapshotsRef.current.shift();
          }
          setSnapshotCount((n) => n + 1);
        }
        queueReport({
          type: `face:${violation.type}`,
          severity: violation.severity,
          message: violation.message,
          confidence: violation.confidence,
          occurredAt: new Date().toISOString(),
          snapshot: dataUrl,
        });
      }
    },
    [logEvent, queueReport, warn],
  );

  const start = useCallback(async () => {
    if (!enabled) return;
    setActive(true);
    // Reuse a stream stashed by the device-check page to avoid a 2nd prompt.
    let stream = window.__assessmentStream ?? null;
    if (!stream) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'user' },
          audio: true,
        });
      } catch {
        setCameraGranted(false);
        setMicGranted(false);
      }
    }
    if (stream) {
      streamRef.current = stream;
      window.__assessmentStream = stream;
      const hasCamera = stream.getVideoTracks().length > 0;
      setCameraGranted(hasCamera);
      setMicGranted(stream.getAudioTracks().length > 0);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      // NOTE: the FaceProctor is NOT started here. When a stream is reused from the
      // device-check (window.__assessmentStream) start() runs synchronously, BEFORE
      // the <video> (in ProctorOverlay, rendered only once phase==='running') mounts,
      // so videoRef.current is null and detection would silently never begin (the
      // "Camera check: off" bug). It's started from the effect below, which fires on
      // the render where the <video> actually exists.
      // Audio-presence watch (dictation / background voices). Advisory, medium.
      if (stream.getAudioTracks().length > 0) {
        const audio = new AudioProctor();
        if (audio.start(stream)) {
          audioProctorRef.current = audio;
          audioTimer.current = setInterval(() => {
            if (!audio.sampleVoiceActive()) return;
            const now = Date.now();
            if (now - audioCooldownRef.current < 8_000) return;
            audioCooldownRef.current = now;
            logEvent('voice_detected');
            queueReport({
              type: 'voice_detected',
              severity: 'medium',
              message: 'Talking or voices detected',
              occurredAt: new Date().toISOString(),
            });
            warn('Voices detected - please stay quiet during the assessment.');
          }, 1_000);
        }
      }
    }
    // Fullscreen (non-fatal). May reject silently in the scheduled path (no user
    // activation left after the network round-trip) - the runner's re-entry button
    // recovers it from a real gesture.
    try {
      await document.documentElement.requestFullscreen?.();
    } catch {
      /* ignore */
    }
    setInFullscreen(!!document.fullscreenElement);
    document.addEventListener('visibilitychange', onVisibility);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    window.addEventListener('blur', onWindowBlur);
    document.addEventListener('copy', onClipboard);
    document.addEventListener('cut', onClipboard);
    document.addEventListener('paste', onClipboard);
    logEvent('session_start');
    snapTimer.current = setInterval(() => {
      const dataUrl = faceProctorRef.current?.snapshot();
      if (dataUrl) {
        pendingSnapshotsRef.current.push({ type: 'heartbeat', dataUrl, at: new Date().toISOString() });
        if (pendingSnapshotsRef.current.length > MAX_PENDING_SNAPSHOTS) {
          pendingSnapshotsRef.current.shift();
        }
      }
      setSnapshotCount((n) => n + 1);
      logEvent('snapshot');
    }, SNAPSHOT_EVERY_MS);
    // Server-stamped heartbeat + violation flush. Fires on the cadence even with an
    // empty batch, so the server can detect "monitoring lost" from missing pings.
    reportTimer.current = setInterval(() => {
      const drained = pendingReportRef.current.splice(0, MAX_BATCH);
      onReportRef.current?.({ violations: drained });
    }, REPORT_EVERY_MS);
  }, [enabled, onVisibility, onFullscreenChange, onWindowBlur, onClipboard, onFrame, logEvent, queueReport, warn]);

  const stop = useCallback(() => {
    setActive(false);
    setFaceStatus('OFF');
    faceProctorRef.current?.stop();
    faceProctorRef.current = null;
    if (snapTimer.current) clearInterval(snapTimer.current);
    snapTimer.current = null;
    if (reportTimer.current) clearInterval(reportTimer.current);
    reportTimer.current = null;
    audioProctorRef.current?.stop();
    audioProctorRef.current = null;
    if (audioTimer.current) clearInterval(audioTimer.current);
    audioTimer.current = null;
    // Final flush so the last few seconds of violations reach the server log.
    const finalBatch = pendingReportRef.current.splice(0, MAX_BATCH);
    if (finalBatch.length) onReportRef.current?.({ violations: finalBatch });
    document.removeEventListener('visibilitychange', onVisibility);
    document.removeEventListener('fullscreenchange', onFullscreenChange);
    window.removeEventListener('blur', onWindowBlur);
    document.removeEventListener('copy', onClipboard);
    document.removeEventListener('cut', onClipboard);
    document.removeEventListener('paste', onClipboard);
    // Stop EVERY acquired track - the hook's stream AND any globally-stashed one
    // (opened by the device-check) which can diverge. Nulling the global alone
    // does NOT release the device, so its tracks must be stopped explicitly or
    // the laptop camera light stays on after the assessment.
    const stopped = new Set<MediaStreamTrack>();
    [streamRef.current, window.__assessmentStream].forEach((s) =>
      s?.getTracks().forEach((t) => {
        if (!stopped.has(t)) {
          t.stop();
          stopped.add(t);
        }
      }),
    );
    streamRef.current = null;
    window.__assessmentStream = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  }, [onVisibility, onFullscreenChange, onWindowBlur, onClipboard]);

  // The <video> mounts AFTER start() (phase flips to 'running'), so both the
  // self-view srcObject AND the FaceProctor must be (re)wired here, on the render
  // where the element first exists. Guarded refs => each runs exactly once.
  useEffect(() => {
    if (!active || !streamRef.current || !videoRef.current) return;
    if (!videoRef.current.srcObject) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
    if (cameraGranted && !faceProctorRef.current) {
      setFaceStatus('NORMAL');
      const proctor = new FaceProctor();
      faceProctorRef.current = proctor;
      void proctor
        .start(videoRef.current, { onFrame, onDegraded: reportAnalysisOff })
        .catch(() => reportAnalysisOff('Camera analysis could not start on this device (no WebGL / model unavailable).'));
    }
  });

  useEffect(() => () => stop(), [stop]);

  const summary = useCallback(
    (): ProctoringSummary => ({
      proctored: true,
      tabSwitches,
      fullscreenExits,
      // Total incidents across all channels. window-blur + clipboard are folded into
      // the count and the events[] log (NOT new top-level fields) so the whitelisted
      // ProctoringSummaryDto still accepts the payload.
      // The analysis-off marker is COUNTED, not just logged. Otherwise an attempt the
      // camera never watched scores violations=0 and renders as "Clean" - strictly
      // more trustworthy-looking than one that was actually monitored. Disabling
      // WebGL is a one-flag bypass; it must not also be an invisible one.
      violations:
        tabSwitches +
        fullscreenExits +
        faceViolations +
        windowBlurs +
        clipboardEvents +
        (analysisOffRef.current ? 1 : 0),
      faceViolations,
      faceViolationsByType: { ...faceCountsRef.current },
      snapshotCount,
      cameraGranted,
      micGranted,
      events: eventsRef.current.slice(-MAX_EVENTS),
    }),
    [tabSwitches, fullscreenExits, faceViolations, windowBlurs, clipboardEvents, snapshotCount, cameraGranted, micGranted],
  );

  // Memoised. This object is a dependency of MockRunner.finishAttempt, which is in turn
  // a dependency of the 1-second countdown effect: returning a fresh literal on every
  // render tore down and rebuilt the exam timer ~1.7 times a second (three setStates per
  // detection frame), on the same main thread the models were saturating.
  return useMemo(
    () => ({
    videoRef,
    active,
    cameraGranted,
    micGranted,
    tabSwitches,
    fullscreenExits,
    inFullscreen,
    enterFullscreen,
    windowBlurs,
    clipboardEvents,
    snapshotCount,
    faceStatus,
    faceCount,
    faceViolations,
    latestFaceViolation,
    lastWarning,
    start,
    stop,
    summary,
    }),
    [
      active, cameraGranted, micGranted, tabSwitches, fullscreenExits, inFullscreen,
      enterFullscreen, windowBlurs, clipboardEvents, snapshotCount, faceStatus,
      faceCount, faceViolations, latestFaceViolation, lastWarning, start, stop, summary,
    ],
  );
}
