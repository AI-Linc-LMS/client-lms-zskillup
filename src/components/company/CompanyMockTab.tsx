'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Brain, CalendarClock, Clock, ShieldCheck, Sparkles, Trophy, Video } from 'lucide-react';
import type { HubContent } from '@/lib/hub-data';
import { getCompanyScheduledAssessments, type ApiScheduledAssessment } from '@/lib/api/scheduling';

/** Full Mock Assessment tab — real: this company's scheduled proctored drives +
 *  a path into the adaptive (non-proctored) Mock Quiz. */
export function CompanyMockTab({ content }: { content: HubContent }) {
  const { slug, name } = content.company;
  const [scheduled, setScheduled] = useState<ApiScheduledAssessment[] | null>(null);

  useEffect(() => {
    getCompanyScheduledAssessments(slug)
      .then((rows) =>
        setScheduled(
          rows
            .filter((r) => new Date(r.scheduledAt).getTime() >= Date.now() - 86400000)
            .sort((a, b) => +new Date(a.scheduledAt) - +new Date(b.scheduledAt)),
        ),
      )
      .catch(() => setScheduled([]));
  }, [slug]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-violet-600 ring-1 ring-inset ring-violet-100">
          <Trophy className="size-3.5" /> Full mock assessment
        </span>
        <h2 className="mt-3 text-lg font-extrabold tracking-tight text-navy sm:text-xl">
          {name} mock assessments
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-600 sm:text-base">
          Warm up with adaptive practice, then sit the real proctored drives this company schedules.
        </p>
      </div>

      {/* Adaptive mock quiz - standout violet card */}
      <Link
        href="/mock-assessment"
        className="group relative flex items-center justify-between gap-3 overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_18px_50px_-30px_rgba(124,58,237,0.22)] transition-shadow hover:shadow-[0_24px_60px_-28px_rgba(124,58,237,0.35)] sm:gap-4 sm:p-6"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-50/70 via-transparent to-transparent"
        />
        <div className="relative flex min-w-0 items-center gap-3 sm:gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-violet-600 text-white shadow-[0_12px_30px_-10px_rgba(124,58,237,0.7)] sm:size-14">
            <Brain className="size-5 sm:size-6" />
          </span>
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-base font-extrabold tracking-tight text-navy sm:text-lg">
              Adaptive Mock Quiz
              <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet-600 ring-1 ring-inset ring-violet-100">
                <Sparkles className="size-3" /> AI
              </span>
            </p>
            <p className="mt-0.5 text-sm text-slate-600">AI-evaluated, non-proctored practice that adapts to you.</p>
          </div>
        </div>
        <span className="relative flex shrink-0 items-center gap-1 text-sm font-extrabold text-violet-600">
          Practice <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </Link>

      {/* Scheduled proctored assessments for this company - standout violet card */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_18px_50px_-30px_rgba(124,58,237,0.22)] sm:p-6">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-500/0 via-violet-500/70 to-violet-500/0"
        />
        <h3 className="flex items-center gap-2 text-base font-extrabold tracking-tight text-navy sm:text-lg">
          <span className="grid size-8 place-items-center rounded-xl bg-violet-50 text-violet-600 ring-1 ring-inset ring-violet-100">
            <ShieldCheck className="size-4" />
          </span>
          Proctored assessments - {name}
        </h3>
        {scheduled === null ? (
          <p className="mt-3 text-xs text-slate-500">Loading…</p>
        ) : scheduled.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">
            No assessment scheduled yet.{' '}
            <Link href={`/dashboard/company/${slug}`} className="font-semibold text-violet-600 hover:underline">
              Register
            </Link>{' '}
            to be notified when {name} schedules one - it&apos;ll appear on your calendar.
          </p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {scheduled.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 transition-colors hover:border-violet-300 hover:bg-violet-50/40">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-navy">{s.title}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] font-medium text-slate-600">
                    <span className="flex items-center gap-1">
                      <CalendarClock className="size-3" />
                      {new Date(s.scheduledAt).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                    </span>
                    <span className="flex items-center gap-1"><Clock className="size-3" /> {s.durationMinutes}m</span>
                    {s.proctored ? <span className="flex items-center gap-1 text-violet-600"><Video className="size-3" /> Proctored</span> : null}
                  </p>
                </div>
                <Link href="/assessments" className="shrink-0 text-xs font-bold text-violet-600 hover:underline">
                  Calendar →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
