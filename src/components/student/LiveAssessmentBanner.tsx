'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, CircleCheck, Clock, ShieldCheck, Video } from 'lucide-react';
import { getMySchedule, type ApiScheduledAssessment } from '@/lib/api/scheduling';
import { getMockHistory } from '@/lib/api/mocks';

/**
 * Live-assessment banner - pinned to the very top of the dashboard. Renders ONLY
 * when the student has an assessment inside its live window (now between start
 * and start+duration); otherwise it returns null and stays out of the way.
 * Highlighted with an emerald glow + pulsing LIVE and a one-tap Start.
 */
export function LiveAssessmentBanner() {
  const [schedule, setSchedule] = useState<ApiScheduledAssessment[] | null>(null);
  // mockTestId → latest finalized attemptId, so a drive the student has already
  // completed flips from "Start now" to "View result" (the backend allows only
  // one attempt per assessment and rejects a re-start).
  const [attempts, setAttempts] = useState<Map<string, string>>(new Map());
  const [, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getMySchedule()
      .then((s) => !cancelled && setSchedule(s))
      .catch(() => {});
    getMockHistory('assessment')
      .then((rows) => {
        if (cancelled) return;
        // Newest-first, so the first row per mock is the latest attempt.
        const map = new Map<string, string>();
        for (const r of rows) if (!map.has(r.mockTestId)) map.set(r.mockTestId, r.attemptId);
        setAttempts(map);
      })
      .catch(() => {});
    // Re-evaluate the live window periodically so the banner appears/disappears
    // as a window opens or closes without a page refresh.
    const h = window.setInterval(() => setTick((t) => t + 1), 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(h);
    };
  }, []);

  const now = Date.now();
  const live = (schedule ?? [])
    .filter((a) => a.isActive && a.mockTestId)
    .filter((a) => {
      const start = new Date(a.scheduledAt).getTime();
      return now >= start && now <= start + a.durationMinutes * 60_000;
    })
    .sort((a, b) => +new Date(a.scheduledAt) - +new Date(b.scheduledAt));

  if (live.length === 0) return null;

  // Surface a drive the student can still take before one they've finished, so
  // the banner keeps nudging toward the actionable assessment.
  const a = live.find((x) => x.mockTestId && !attempts.has(x.mockTestId)) ?? live[0];
  const doneAttemptId = a.mockTestId ? attempts.get(a.mockTestId) : undefined;
  const endMs = new Date(a.scheduledAt).getTime() + a.durationMinutes * 60_000;
  const minsLeft = Math.max(0, Math.round((endMs - now) / 60_000));

  return (
    <motion.section
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="relative overflow-hidden rounded-2xl border border-emerald-300 bg-gradient-to-r from-emerald-50 via-white to-emerald-50/40 p-4 sm:p-5"
    >
      <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-emerald-400 to-emerald-600" />
      <span aria-hidden className="pointer-events-none absolute -right-12 -top-12 size-44 rounded-full bg-emerald-400/15 blur-3xl" />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3.5">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-[0_10px_24px_-10px_rgba(16,185,129,0.9)]">
            {doneAttemptId ? <CircleCheck className="size-6" /> : <ShieldCheck className="size-6" />}
          </span>
          <div className="min-w-0">
            {doneAttemptId ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-emerald-700">
                <CircleCheck className="size-3" /> Submitted
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-emerald-700">
                <span className="relative flex size-1.5">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
                </span>
                Live now
              </span>
            )}
            <h3 className="mt-1 truncate text-lg font-black tracking-tight text-navy sm:text-xl">{a.title}</h3>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs font-semibold text-slate-600">
              <span className="truncate">{a.companyName}</span>
              <span className="flex items-center gap-1"><Clock className="size-3" /> {a.durationMinutes}m</span>
              {a.proctored ? (
                <span className="flex items-center gap-1 text-violet-600"><Video className="size-3" /> Proctored</span>
              ) : null}
              {doneAttemptId ? (
                <span className="font-bold text-emerald-600">· you&apos;ve completed this</span>
              ) : (
                <span className="font-bold text-emerald-600">· closes in {minsLeft}m</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {live.length > 1 ? (
            <Link href="/assessments" className="text-xs font-bold text-slate-600 hover:text-navy">
              +{live.length - 1} more live
            </Link>
          ) : null}
          {doneAttemptId ? (
            <Link
              href={`/dashboard/quiz?report=${doneAttemptId}`}
              className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-white px-6 py-3 text-sm font-extrabold text-emerald-700 shadow-sm transition-transform hover:-translate-y-0.5 active:scale-[0.98]"
            >
              <CircleCheck className="size-4" /> View result
            </Link>
          ) : (
            <Link
              href={`/dashboard/quiz?mock=${a.mockTestId}${a.proctored ? '&proctored=1' : ''}`}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-3 text-sm font-extrabold text-white shadow-[0_12px_28px_-10px_rgba(16,185,129,0.9)] transition-transform hover:-translate-y-0.5 active:scale-[0.98]"
            >
              Start now <ArrowRight className="size-4" />
            </Link>
          )}
        </div>
      </div>
    </motion.section>
  );
}
