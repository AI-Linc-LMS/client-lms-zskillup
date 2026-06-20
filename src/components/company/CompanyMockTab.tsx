'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Brain, CalendarClock, Clock, ShieldCheck, Video } from 'lucide-react';
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
    <div className="space-y-4">
      {/* Adaptive mock quiz */}
      <Link
        href="/mock-tests"
        className="group flex items-center justify-between gap-4 rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50/60 to-transparent p-5 transition-shadow hover:shadow-md"
      >
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-[#6366f1] to-[#a855f7] text-white">
            <Brain className="size-5" />
          </span>
          <div>
            <p className="text-sm font-bold text-navy">Adaptive Mock Quiz</p>
            <p className="text-xs text-slate-500">AI-evaluated, non-proctored practice that adapts to you.</p>
          </div>
        </div>
        <span className="flex items-center gap-1 text-sm font-bold text-indigo-600">
          Practice <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </Link>

      {/* Scheduled proctored assessments for this company */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="flex items-center gap-2 text-sm font-bold text-navy">
          <ShieldCheck className="size-4 text-orange" /> Proctored assessments — {name}
        </h3>
        {scheduled === null ? (
          <p className="mt-2 text-xs text-slate-400">Loading…</p>
        ) : scheduled.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">
            No assessment scheduled yet.{' '}
            <Link href={`/dashboard/company/${slug}`} className="font-semibold text-orange hover:underline">
              Register
            </Link>{' '}
            to be notified when {name} schedules one — it&apos;ll appear on your calendar.
          </p>
        ) : (
          <ul className="mt-3 space-y-2.5">
            {scheduled.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-navy">{s.title}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] font-medium text-slate-500">
                    <span className="flex items-center gap-1">
                      <CalendarClock className="size-3" />
                      {new Date(s.scheduledAt).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </span>
                    <span className="flex items-center gap-1"><Clock className="size-3" /> {s.durationMinutes}m</span>
                    {s.proctored ? <span className="flex items-center gap-1 text-violet-600"><Video className="size-3" /> Proctored</span> : null}
                  </p>
                </div>
                <Link href="/calendar" className="shrink-0 text-xs font-bold text-orange hover:underline">
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
