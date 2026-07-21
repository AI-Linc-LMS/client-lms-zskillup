'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FaceProctor,
  type FaceStatus,
  type FaceViolation,
  type FaceViolationType,
} from '@/lib/proctoring/face-detection';

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

export interface ProctoringController {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  active: boolean;
  cameraGranted: boolean;
  micGranted: boolean;
  tabSwitches: number;
  fullscreenExits: number;
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
const MAX_EVENTS = 120;
const MAX_PENDING_SNAPSHOTS = 20;
/** Don't re-log/re-warn the same face-violation type more often than this. */
const FACE_VIOLATION_COOLDOWN_MS = 4_000;

declare global {
  interface Window {
    __assessmentStream?: MediaStream | null;
  }
}

/**
 * Browser + camera proctoring for the assessment lifecycle. Tracks tab-switch and
 * fullscreen-exit counts, and — new in v2 — runs BlazeFace over the self-view to
 * flag no-face / multiple-faces / obstruction / off-screen / too-close-far / poor
 * light. Warn-only (never auto-submits). Camera / model failures are non-fatal —
 * the assessment continues; the server-stamped log is the authoritative record.
 */
export function useProctoring(enabled: boolean): ProctoringController {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const snapTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const eventsRef = useRef<Array<{ type: string; at: string }>>([]);
  const faceProctorRef = useRef<FaceProctor | null>(null);
  const faceCooldownRef = useRef<Map<FaceViolationType, number>>(new Map());
  const faceCountsRef = useRef<Partial<Record<FaceViolationType, number>>>({});
  const pendingSnapshotsRef = useRef<PendingSnapshot[]>([]);

  const [active, setActive] = useState(false);
  const [cameraGranted, setCameraGranted] = useState(false);
  const [micGranted, setMicGranted] = useState(false);
  const [tabSwitches, setTabSwitches] = useState(0);
  const [fullscreenExits, setFullscreenExits] = useState(0);
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
      warn('You switched away from the assessment - this is logged.');
    }
  }, [logEvent, warn]);

  const onFullscreenChange = useCallback(() => {
    if (!document.fullscreenElement) {
      setFullscreenExits((n) => n + 1);
      logEvent('fullscreen_exit');
      warn('You exited fullscreen - please return to fullscreen.');
    }
  }, [logEvent, warn]);

  /** Process one detection frame: update live status, and log/warn/snapshot new
   *  violations (cooldown-gated so a sustained state logs once, not every frame). */
  const onFrame = useCallback(
    (result: { faceCount: number; violations: FaceViolation[]; status: FaceStatus }) => {
      setFaceCount(result.faceCount);
      setFaceStatus(result.status);
      setLatestFaceViolation(result.violations[0] ?? null);

      const now = Date.now();
      for (const violation of result.violations) {
        const last = faceCooldownRef.current.get(violation.type) ?? 0;
        if (now - last < FACE_VIOLATION_COOLDOWN_MS) continue;
        faceCooldownRef.current.set(violation.type, now);

        faceCountsRef.current[violation.type] = (faceCountsRef.current[violation.type] ?? 0) + 1;
        setFaceViolations((n) => n + 1);
        logEvent(`face:${violation.type}`);
        if (violation.severity !== 'low') warn(violation.message);

        // Capture evidence on serious events for the server-side log (Phase 3).
        if (violation.severity === 'high') {
          const dataUrl = faceProctorRef.current?.snapshot();
          if (dataUrl) {
            pendingSnapshotsRef.current.push({
              type: violation.type,
              dataUrl,
              at: new Date().toISOString(),
            });
            if (pendingSnapshotsRef.current.length > MAX_PENDING_SNAPSHOTS) {
              pendingSnapshotsRef.current.shift();
            }
            setSnapshotCount((n) => n + 1);
          }
        }
      }
    },
    [logEvent, warn],
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
      // Kick off camera analysis (non-blocking — the exam starts even while the
      // model downloads; detection begins once it's ready).
      if (hasCamera && videoRef.current) {
        setFaceStatus('NORMAL');
        const proctor = new FaceProctor();
        faceProctorRef.current = proctor;
        void proctor.start(videoRef.current, { onFrame }).catch(() => {
          setFaceStatus('OFF');
        });
      }
    }
    // Fullscreen (non-fatal).
    try {
      await document.documentElement.requestFullscreen?.();
    } catch {
      /* ignore */
    }
    document.addEventListener('visibilitychange', onVisibility);
    document.addEventListener('fullscreenchange', onFullscreenChange);
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
  }, [enabled, onVisibility, onFullscreenChange, onFrame, logEvent]);

  const stop = useCallback(() => {
    setActive(false);
    setFaceStatus('OFF');
    faceProctorRef.current?.stop();
    faceProctorRef.current = null;
    if (snapTimer.current) clearInterval(snapTimer.current);
    snapTimer.current = null;
    document.removeEventListener('visibilitychange', onVisibility);
    document.removeEventListener('fullscreenchange', onFullscreenChange);
    // Stop EVERY acquired track — the hook's stream AND any globally-stashed one
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
  }, [onVisibility, onFullscreenChange]);

  // Re-attach the stream if the <video> mounts after start.
  useEffect(() => {
    if (active && streamRef.current && videoRef.current && !videoRef.current.srcObject) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  });

  useEffect(() => () => stop(), [stop]);

  const summary = useCallback(
    (): ProctoringSummary => ({
      proctored: true,
      tabSwitches,
      fullscreenExits,
      violations: tabSwitches + fullscreenExits + faceViolations,
      faceViolations,
      faceViolationsByType: { ...faceCountsRef.current },
      snapshotCount,
      cameraGranted,
      micGranted,
      events: eventsRef.current.slice(-MAX_EVENTS),
    }),
    [tabSwitches, fullscreenExits, faceViolations, snapshotCount, cameraGranted, micGranted],
  );

  return {
    videoRef,
    active,
    cameraGranted,
    micGranted,
    tabSwitches,
    fullscreenExits,
    snapshotCount,
    faceStatus,
    faceCount,
    faceViolations,
    latestFaceViolation,
    lastWarning,
    start,
    stop,
    summary,
  };
}
