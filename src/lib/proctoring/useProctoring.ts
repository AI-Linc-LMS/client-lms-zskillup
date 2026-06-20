'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/** Lenient proctoring summary sent to the backend at submit (Phase 4). */
export interface ProctoringSummary {
  proctored: boolean;
  tabSwitches: number;
  fullscreenExits: number;
  violations: number;
  snapshotCount: number;
  cameraGranted: boolean;
  micGranted: boolean;
  events: Array<{ type: string; at: string }>;
}

export interface ProctoringController {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  active: boolean;
  cameraGranted: boolean;
  micGranted: boolean;
  tabSwitches: number;
  fullscreenExits: number;
  snapshotCount: number;
  lastWarning: string | null;
  start: () => Promise<void>;
  stop: () => void;
  summary: () => ProctoringSummary;
}

const SNAPSHOT_EVERY_MS = 15_000;
const MAX_EVENTS = 60;

declare global {
  interface Window {
    __assessmentStream?: MediaStream | null;
  }
}

/**
 * Lightweight, LENIENT browser proctoring (assessment lifecycle, Phase 4).
 * Camera + mic self-view, tab-switch + fullscreen-exit counters (warn-only,
 * never auto-submits), and periodic snapshot heartbeats. No face-AI. Camera /
 * fullscreen failures are non-fatal — the assessment continues.
 */
export function useProctoring(enabled: boolean): ProctoringController {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const snapTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const eventsRef = useRef<Array<{ type: string; at: string }>>([]);

  const [active, setActive] = useState(false);
  const [cameraGranted, setCameraGranted] = useState(false);
  const [micGranted, setMicGranted] = useState(false);
  const [tabSwitches, setTabSwitches] = useState(0);
  const [fullscreenExits, setFullscreenExits] = useState(0);
  const [snapshotCount, setSnapshotCount] = useState(0);
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
      warn('You switched away from the assessment — this is logged.');
    }
  }, [logEvent, warn]);

  const onFullscreenChange = useCallback(() => {
    if (!document.fullscreenElement) {
      setFullscreenExits((n) => n + 1);
      logEvent('fullscreen_exit');
      warn('You exited fullscreen — please return to fullscreen.');
    }
  }, [logEvent, warn]);

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
        // Lenient: camera denied → continue without it.
        setCameraGranted(false);
        setMicGranted(false);
      }
    }
    if (stream) {
      streamRef.current = stream;
      window.__assessmentStream = stream;
      setCameraGranted(stream.getVideoTracks().length > 0);
      setMicGranted(stream.getAudioTracks().length > 0);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
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
      setSnapshotCount((n) => n + 1);
      logEvent('snapshot');
    }, SNAPSHOT_EVERY_MS);
  }, [enabled, onVisibility, onFullscreenChange, logEvent]);

  const stop = useCallback(() => {
    setActive(false);
    if (snapTimer.current) clearInterval(snapTimer.current);
    snapTimer.current = null;
    document.removeEventListener('visibilitychange', onVisibility);
    document.removeEventListener('fullscreenchange', onFullscreenChange);
    streamRef.current?.getTracks().forEach((t) => t.stop());
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
      violations: tabSwitches + fullscreenExits,
      snapshotCount,
      cameraGranted,
      micGranted,
      events: eventsRef.current.slice(-MAX_EVENTS),
    }),
    [tabSwitches, fullscreenExits, snapshotCount, cameraGranted, micGranted],
  );

  return {
    videoRef,
    active,
    cameraGranted,
    micGranted,
    tabSwitches,
    fullscreenExits,
    snapshotCount,
    lastWarning,
    start,
    stop,
    summary,
  };
}
