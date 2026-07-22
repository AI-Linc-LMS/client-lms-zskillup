'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { getMock, getMockHistory, type ApiMockSummary } from '@/lib/api/mocks';
import {
  getMySchedule,
  getScheduledAssessment,
  type ApiScheduledAssessment,
} from '@/lib/api/scheduling';
import { MockRunner } from '@/components/practice/MockRunner';
import { AssessmentInstructionsGate } from './AssessmentInstructionsGate';

/**
 * Orchestrates a SCHEDULED assessment launch (`/dashboard/quiz?mock=X&assessment=Y`):
 * fetch the mock + drive metadata, pre-check for an existing attempt, then show the
 * instructions + system-check gate (#29). Only on "Begin" does it mount the runner
 * with `startImmediately`, so the server timer starts exactly then. Degrades to
 * mock-only metadata if the drive can't be resolved.
 */
export function AssessmentInstructionsHost({
  mockId,
  scheduledId,
  proctored,
}: {
  mockId: string;
  scheduledId: string;
  proctored: boolean;
}) {
  const [mock, setMock] = useState<ApiMockSummary | null>(null);
  const [sched, setSched] = useState<ApiScheduledAssessment | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [began, setBegan] = useState(false);

  // Release the camera/mic if the gate is abandoned BEFORE "Begin". SystemCheck opens
  // the stream (for proctored) and deliberately leaves it live on window.__assessmentStream
  // so the runner can reuse it without a second prompt. But if we leave the gate without
  // starting - "Maybe later", "Exit", or any soft-nav away - the runner never mounts, so
  // useProctoring.stop() never runs and the webcam light would stay on. Stop it here.
  const beganRef = useRef(false);
  beganRef.current = began;
  useEffect(() => {
    return () => {
      if (beganRef.current) return; // the runner took over the stream and will stop it
      const s = typeof window !== 'undefined' ? window.__assessmentStream : null;
      if (s) {
        s.getTracks().forEach((t) => t.stop());
        window.__assessmentStream = null;
      }
    };
  }, []);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const [m, s, hist] = await Promise.all([
        getMock(mockId).catch(() => null),
        getScheduledAssessment(scheduledId).catch(() =>
          getMySchedule()
            .then((list) => list.find((a) => a.id === scheduledId) ?? null)
            .catch(() => null),
        ),
        getMockHistory('assessment').catch(() => [] as Array<{ mockTestId: string; attemptId: string }>),
      ]);
      if (!alive) return;
      setMock(m);
      setSched(s);
      const done = hist.find((h) => h.mockTestId === mockId);
      setAttemptId(done?.attemptId ?? null);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [mockId, scheduledId]);

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-navy text-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-7 animate-spin text-[#f5b400]" />
          <p className="text-sm text-white/70">Loading your assessment…</p>
        </div>
      </div>
    );
  }

  // Already taken - only one attempt per assessment. Offer the result, don't re-start.
  if (attemptId) {
    return (
      <div className="grid min-h-screen place-items-center bg-navy px-4 text-white">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-7 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-emerald-500/20 text-emerald-300">
            <CheckCircle2 className="size-6" />
          </span>
          <h1 className="mt-4 text-lg font-bold">You&apos;ve completed this assessment</h1>
          <p className="mt-1.5 text-sm text-white/65">Only one attempt is allowed. You can review your result.</p>
          <div className="mt-5 flex flex-col gap-2">
            <Link href={`/dashboard/quiz?report=${attemptId}`} className="rounded-full bg-gradient-to-r from-[#ffd24d] to-[#f5b400] px-4 py-2.5 text-sm font-extrabold text-[#171717]">
              View my result
            </Link>
            <Link href="/assessments" className="rounded-full border border-white/20 bg-white/[0.06] px-4 py-2.5 text-sm font-semibold text-white/85">
              Back to assessments
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (began) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-background">
        <div className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6">
          <MockRunner mockId={mockId} proctored={proctored} startImmediately />
        </div>
      </div>
    );
  }

  return (
    <AssessmentInstructionsGate mock={mock} sched={sched} proctored={proctored} onBegin={() => setBegan(true)} />
  );
}
