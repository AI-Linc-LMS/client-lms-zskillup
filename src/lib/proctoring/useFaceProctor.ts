'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FaceProctor,
  type FaceStatus,
  type FaceViolation,
  type FaceViolationType,
} from '@/lib/proctoring/face-detection';
import type { ReportedViolation } from '@/lib/proctoring/useProctoring';

const FACE_VIOLATION_COOLDOWN_MS = 4_000;
const REPORT_EVERY_MS = 10_000;
const MAX_BATCH = 30;

export interface FaceProctorController {
  faceStatus: FaceStatus | 'OFF';
  faceCount: number;
  faceViolations: number;
  latestFaceViolation: FaceViolation | null;
  faceViolationsByType: Partial<Record<FaceViolationType, number>>;
}

/**
 * Runs the camera-intelligence engine over a video element the CALLER owns (e.g.
 * the AI mock interview, which manages its own camera). A lean sibling of
 * useProctoring's face path for surfaces that don't use the full assessment
 * controller. Same cooldown + ~10s report cadence, so it reports into the same
 * server-stamped log shape. Advisory only - never blocks the surface.
 */
export function useFaceProctor(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  enabled: boolean,
  options?: { onReport?: (batch: { violations: ReportedViolation[] }) => void },
): FaceProctorController {
  const proctorRef = useRef<FaceProctor | null>(null);
  const cooldownRef = useRef<Map<FaceViolationType, number>>(new Map());
  const countsRef = useRef<Partial<Record<FaceViolationType, number>>>({});
  const pendingRef = useRef<ReportedViolation[]>([]);
  const reportTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const onReportRef = useRef(options?.onReport);
  onReportRef.current = options?.onReport;

  const [faceStatus, setFaceStatus] = useState<FaceStatus | 'OFF'>('OFF');
  const [faceCount, setFaceCount] = useState(0);
  const [faceViolations, setFaceViolations] = useState(0);
  const [latestFaceViolation, setLatestFaceViolation] = useState<FaceViolation | null>(null);

  const onFrame = useCallback(
    (result: { faceCount: number; violations: FaceViolation[]; status: FaceStatus }) => {
      setFaceCount(result.faceCount);
      setFaceStatus(result.status);
      setLatestFaceViolation(result.violations[0] ?? null);
      const now = Date.now();
      for (const violation of result.violations) {
        const last = cooldownRef.current.get(violation.type) ?? 0;
        if (now - last < FACE_VIOLATION_COOLDOWN_MS) continue;
        cooldownRef.current.set(violation.type, now);
        countsRef.current[violation.type] = (countsRef.current[violation.type] ?? 0) + 1;
        setFaceViolations((n) => n + 1);
        const snapshot =
          violation.severity === 'high' ? (proctorRef.current?.snapshot() ?? undefined) : undefined;
        pendingRef.current.push({
          type: `face:${violation.type}`,
          severity: violation.severity,
          message: violation.message,
          confidence: violation.confidence,
          occurredAt: new Date().toISOString(),
          snapshot,
        });
        if (pendingRef.current.length > MAX_BATCH) pendingRef.current.shift();
      }
    },
    [],
  );

  useEffect(() => {
    const video = videoRef.current;
    if (!enabled || !video) return;
    const proctor = new FaceProctor();
    proctorRef.current = proctor;
    setFaceStatus('NORMAL');
    void proctor.start(video, { onFrame }).catch(() => setFaceStatus('OFF'));
    reportTimer.current = setInterval(() => {
      const drained = pendingRef.current.splice(0, MAX_BATCH);
      onReportRef.current?.({ violations: drained });
    }, REPORT_EVERY_MS);

    return () => {
      proctor.stop();
      proctorRef.current = null;
      if (reportTimer.current) clearInterval(reportTimer.current);
      reportTimer.current = null;
      const finalBatch = pendingRef.current.splice(0, MAX_BATCH);
      if (finalBatch.length) onReportRef.current?.({ violations: finalBatch });
      setFaceStatus('OFF');
    };
  }, [enabled, videoRef, onFrame]);

  return {
    faceStatus,
    faceCount,
    faceViolations,
    latestFaceViolation,
    faceViolationsByType: countsRef.current,
  };
}
