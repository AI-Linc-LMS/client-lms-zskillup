'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Clock, ShieldCheck, Video } from 'lucide-react';
import { getMySchedule, type ApiScheduledAssessment } from '@/lib/api/scheduling';

/**
 * Live-assessment banner — pinned to the very top of the dashboard. Renders ONLY
 * when the student has an assessment inside its live window (now between start
 * and start+duration); otherwise it returns null and stays out of the way.
 * Highlighted with an emerald glow + pulsing LIVE and a one-tap Start.
 */
export function LiveAssessmentBanner() {
  const [schedule, setSchedule] = useState<ApiScheduledAssessment[] | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getMySchedule()
      .then((s) => !cancelled && setSchedule(s))
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

  const a = live[0];
  const endMs = new Date(a.scheduledAt).getTime() + a.durationMinutes * 60_000;
  const minsLeft = Math.max(0, Math.round((endMs - now) / 60_000));

  return (
    <motion.section
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="relative overflow-hidden rounded-2xl border border-emerald-300 bg-gradient-to-r from-emerald-50 via-white to-emerald-50/40 p-4 shadow-[0_18px_50px_-24px_rgba(16,185,129,0.6)] sm:p-5"
    >
      <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-emerald-400 to-emerald-600" />
      <span aria-hidden className="pointer-events-none absolute -right-12 -top-12 size-44 rounded-full bg-emerald-400/15 blur-3xl" />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3.5">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-[0_10px_24px_-10px_rgba(16,185,129,0.9)]">
            <ShieldCheck className="size-6" />
          </span>
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-emerald-700">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
              </span>
              Live now
            </span>
            <h3 className="mt-1 truncate text-lg font-black tracking-tight text-navy sm:text-xl">{a.title}</h3>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs font-semibold text-slate-500">
              <span className="truncate">{a.companyName}</span>
              <span className="flex items-center gap-1"><Clock className="size-3" /> {a.durationMinutes}m</span>
              {a.proctored ? (
                <span className="flex items-center gap-1 text-violet-600"><Video className="size-3" /> Proctored</span>
              ) : null}
              <span className="font-bold text-emerald-600">· closes in {minsLeft}m</span>
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {live.length > 1 ? (
            <Link href="/calendar" className="text-xs font-bold text-slate-500 hover:text-navy">
              +{live.length - 1} more live
            </Link>
          ) : null}
          <Link
            href={`/dashboard/quiz?mock=${a.mockTestId}${a.proctored ? '&proctored=1' : ''}`}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-3 text-sm font-extrabold text-white shadow-[0_12px_28px_-10px_rgba(16,185,129,0.9)] transition-transform hover:-translate-y-0.5 active:scale-[0.98]"
          >
            Start now <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </motion.section>
  );
}
