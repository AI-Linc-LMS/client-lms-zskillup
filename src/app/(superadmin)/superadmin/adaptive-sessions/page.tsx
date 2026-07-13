'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Brain, CheckCircle2, Clock, Loader2, XCircle } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { cn } from '@/lib/utils';
import { adminListAdaptiveSessions, type AdminAdaptiveSession } from '@/lib/api/adaptive';

const CRUMBS = [
  { label: 'Home', href: '/' },
  { label: 'Super-admin', href: '/superadmin/dashboard' },
  { label: 'Adaptive Sessions' },
];

function StatusBadge({ status }: { status: string }) {
  if (status === 'completed') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
        <CheckCircle2 className="size-3" /> Completed
      </span>
    );
  }
  if (status === 'abandoned') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
        <XCircle className="size-3" /> Abandoned
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
      <Clock className="size-3" /> Active
    </span>
  );
}

export default function AdminAdaptiveSessionsPage() {
  const [sessions, setSessions] = useState<AdminAdaptiveSession[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminListAdaptiveSessions()
      .then(setSessions)
      .catch((e: Error) => setError(e.message));
  }, []);

  return (
    <div className="space-y-6">
      <Breadcrumb items={CRUMBS} />

      <header>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Admin</p>
        <h1 className="mt-1 text-[28px] font-extrabold tracking-tight text-navy flex items-center gap-2">
          <Brain className="size-7 text-[#f5b400]" />
          Adaptive Sessions
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          All student adaptive mock quiz sessions with IRT-derived skill profiles.
        </p>
      </header>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {!sessions && !error && (
        <div className="flex items-center gap-3 rounded-xl border bg-white p-8 text-sm text-slate-400">
          <Loader2 className="size-5 animate-spin text-[#f5b400]" />
          Loading sessions…
        </div>
      )}

      {sessions && sessions.length === 0 && (
        <div className="rounded-xl border bg-white p-10 text-center">
          <p className="text-sm font-semibold text-navy">No adaptive sessions yet.</p>
          <p className="mt-1 text-xs text-slate-500">Sessions appear here once students start an adaptive mock.</p>
        </div>
      )}

      {sessions && sessions.length > 0 && (
        <div className="rounded-xl border bg-white overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b bg-slate-50">
              <tr>
                {['Student ID', 'Mock Test', 'Status', 'Questions', 'Accuracy', 'Started', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sessions.map((s) => (
                <tr key={s.sessionId} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{s.userId.slice(0, 8)}…</td>
                  <td className="px-4 py-3 font-medium text-navy">{s.mockTitle}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={s.status} />
                  </td>
                  <td className="px-4 py-3 text-slate-600">{s.questionCount}</td>
                  <td className="px-4 py-3">
                    {s.status === 'completed' ? (
                      <span
                        className={cn(
                          'font-bold',
                          s.accuracy >= 70 ? 'text-emerald-600' : s.accuracy >= 50 ? 'text-amber-600' : 'text-red-500',
                        )}
                      >
                        {s.accuracy}%
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {new Date(s.startedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/superadmin/adaptive-sessions/${s.sessionId}`}
                      className="text-xs font-semibold text-[#1a1d29] hover:underline"
                    >
                      View report
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}
