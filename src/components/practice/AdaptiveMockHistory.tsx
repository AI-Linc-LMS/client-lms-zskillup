'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowUpRight, Brain, Calendar, CheckCircle2, Clock, FileText, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Stagger, StaggerItem } from '@/components/motion/primitives';
import { listAdaptiveSessions, type AdaptiveSessionSummary } from '@/lib/api/adaptive';

const STATUS_STYLES: Record<
  string,
  { label: string; className: string; icon: typeof CheckCircle2 }
> = {
  completed: {
    label: 'Completed',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    icon: CheckCircle2,
  },
  active: {
    label: 'In progress',
    className: 'border-amber-200 bg-amber-50 text-amber-700',
    icon: Clock,
  },
};

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_STYLES[status];
  if (!cfg) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[10px] font-semibold text-slate-500">
        Abandoned
      </span>
    );
  }
  const Icon = cfg.icon;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold',
        cfg.className,
      )}
    >
      <Icon className="size-3" aria-hidden="true" /> {cfg.label}
    </span>
  );
}

export function AdaptiveMockHistory() {
  const [sessions, setSessions] = useState<AdaptiveSessionSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listAdaptiveSessions()
      .then(setSessions)
      .catch((e: Error) => setError(e.message));
  }, []);

  if (error) return null;

  if (!sessions) {
    return (
      <div className="flex items-center gap-3 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <Loader2 className="size-4 animate-spin text-orange" aria-hidden="true" />
        <span className="text-sm text-slate-400">Loading adaptive history…</span>
      </div>
    );
  }

  if (sessions.length === 0) return null;

  return (
    <section>
      <header className="mb-4">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-[#5b3bf5]">
          <Brain className="size-3.5" aria-hidden="true" /> AI Adaptive
        </p>
        <h2 className="mt-1 text-xl font-extrabold tracking-tight text-navy">
          Your Adaptive Sessions
        </h2>
      </header>

      <Stagger className="space-y-3">
        {sessions.map((s) => {
          const completed = s.status === 'completed';
          const date = new Date(s.startedAt).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          });
          return (
            <StaggerItem key={s.sessionId}>
              <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
                <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_-20px_rgba(15,23,42,0.35)] transition-shadow duration-300 hover:shadow-[0_18px_50px_-24px_rgba(15,23,42,0.45)]">
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#6d3bf5]/[0.04] via-transparent to-transparent"
                  />
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -right-10 -top-12 size-32 rounded-full bg-[#6d3bf5] opacity-[0.06] blur-2xl transition-opacity duration-500 group-hover:opacity-20"
                  />
                  <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
                    <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#7c6cf5] to-[#5b3bf5] text-white shadow-sm transition-transform duration-300 group-hover:scale-105">
                      <Brain className="size-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-navy">Adaptive Session</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <FileText className="size-3.5" aria-hidden="true" />
                          {s.questionCount} questions
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="size-3.5" aria-hidden="true" />
                          {date}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-3 sm:justify-end">
                      <StatusPill status={s.status} />
                      {completed && (
                        <Link
                          href={`/dashboard/quiz/adaptive/results?session=${s.sessionId}`}
                          className="flex items-center gap-1 text-xs font-bold text-[#5b3bf5] transition-colors hover:text-[#4827d4]"
                        >
                          View report
                          <ArrowUpRight
                            className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                            aria-hidden="true"
                          />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            </StaggerItem>
          );
        })}
      </Stagger>
    </section>
  );
}
