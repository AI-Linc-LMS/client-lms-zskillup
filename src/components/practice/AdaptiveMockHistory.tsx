'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Brain, CheckCircle2, Clock, ExternalLink, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { listAdaptiveSessions, type AdaptiveSessionSummary } from '@/lib/api/adaptive';

function StatusPill({ status }: { status: string }) {
  if (status === 'completed') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
        <CheckCircle2 className="size-3" /> Completed
      </span>
    );
  }
  if (status === 'active') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
        <Clock className="size-3" /> In progress
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
      Abandoned
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
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-6">
        <Loader2 className="size-4 animate-spin text-orange" />
        <span className="text-sm text-slate-400">Loading adaptive history…</span>
      </div>
    );
  }

  if (sessions.length === 0) return null;

  return (
    <section>
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
        Your Adaptive Sessions
      </p>
      <div className="rounded-xl border bg-white overflow-hidden">
        <div className="divide-y divide-slate-100">
          {sessions.map((s) => (
            <div key={s.sessionId} className="flex items-center gap-4 px-5 py-4">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-orange/10 text-orange">
                <Brain className="size-4" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-navy truncate">
                  Adaptive Session
                </p>
                <p className="text-xs text-slate-400">
                  {s.questionCount} questions ·{' '}
                  {new Date(s.startedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <StatusPill status={s.status} />
                {s.status === 'completed' && (
                  <Link
                    href={`/dashboard/quiz/adaptive/results?session=${s.sessionId}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-orange hover:underline"
                  >
                    View report <ExternalLink className="size-3" />
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
